// services/ai.ts
// IMPORTANTE: Adicionado o prefixo NEXT_PUBLIC_ para que a chave seja lida no iPhone
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

interface WeatherData {
  temp: number;
  wind: number;
  aqi: number;
  description: string;
  uv?: number;
}

interface WeatherChange {
  tempChange: number;
  windChange: number;
  aqiChange: number;
  significant: boolean;
}

export async function generateAITips(weatherData: WeatherData, previousWeather?: WeatherData | null): Promise<string[]> {
  // Se não há chave do Gemini configurada com NEXT_PUBLIC_, retorna dicas básicas
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('Gemini API key not configured or missing NEXT_PUBLIC_ prefix, using basic tips');
    return generateBasicTips(weatherData);
  }

  try {
    const change = previousWeather ? detectSignificantChange(weatherData, previousWeather) : null;
    
    // Captura o horário atual para enviar à LLM
    const hour = new Date().getHours();
    const timeOfDay = getTimeOfDayContext(hour);

    const prompt = createAIPrompt(weatherData, timeOfDay, change);

    // Utilizando o modelo gemini-1.5-flash para maior rapidez no telemóvel
  const response = await fetch(
  // URL corrigido para a versão 1.5 estável
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, 
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    }),
  }
);

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429 || errorData.error?.code === 429) {
        return generateBasicTips(weatherData);
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return processAIResponse(aiResponse);

  } catch (error) {
    console.error('Erro ao gerar dicas com Gemini:', error);
    return generateBasicTips(weatherData);
  }
}

// Nova função para dar contexto temporal à LLM
function getTimeOfDayContext(hour: number): string {
  if (hour >= 5 && hour < 12) return "manhã (foco em energia e aquecimento)";
  if (hour >= 12 && hour < 18) return "tarde (foco em hidratação e proteção solar)";
  if (hour >= 18 && hour < 22) return "final de tarde/noite (foco em visibilidade e segurança)";
  return "madrugada (foco em visibilidade total e baixas temperaturas e segurança)";
}

function detectSignificantChange(current: WeatherData, previous: WeatherData): WeatherChange {
  const tempChange = Math.abs(current.temp - previous.temp);
  const windChange = Math.abs(current.wind - previous.wind);
  const aqiChange = Math.abs(current.aqi - previous.aqi);

  const significant = tempChange >= 5 || windChange >= 10 || aqiChange >= 2;

  return { tempChange, windChange, aqiChange, significant };
}

function createAIPrompt(weatherData: WeatherData, timeContext: string, change?: WeatherChange | null): string {
  let prompt = `Contexto: O utilizador vai correr agora durante a ${timeContext}.
Condições climáticas atuais:
- Temperatura: ${Math.round(weatherData.temp)}°C
- Vento: ${Math.round(weatherData.wind)} km/h
- Qualidade do ar: ${weatherData.aqi}/5
- Descrição: ${weatherData.description}`;

  if (weatherData.uv) {
    prompt += `\n- Índice UV: ${weatherData.uv}`;
  }

  if (change?.significant) {
    prompt += `\n\nMudanças significativas recentes: A temperatura variou ${change.tempChange.toFixed(1)}°C.`;
  }

  prompt += `\n\nGere 3 dicas de corrida muito curtas e práticas considerando o clima e especificamente o horário do dia. Use emojis e foque em roupa, hidratação e segurança.`;

  return prompt;
}

function processAIResponse(response: string): string[] {
  const tips = response
    .split(/[•\-\n\d.]/)
    .map(tip => tip.trim())
    .filter(tip => tip.length > 10 && tip.length < 180)
    .slice(0, 3);

  return tips.length > 0 ? tips : ["Mantenha-se hidratado durante o treino."];
}

function generateBasicTips(weatherData: WeatherData): string[] {
  const tips = [];
  if (weatherData.temp > 30) tips.push("Calor intenso! Hidrata-te constantemente.");
  else if (weatherData.temp < 5) tips.push("Frio rigoroso. Agasalha-te em camadas.");
  else tips.push("Temperatura agradável para um treino confortável.");

  if (weatherData.wind > 20) tips.push("Vento forte! Cuidado com a resistência extra.");
  if (weatherData.aqi > 3) tips.push("Qualidade do ar baixa. Reduz a intensidade.");
  
  tips.push("Ouve sempre o teu corpo e aproveita o treino.");
  return tips.slice(0, 3);
}

// Funções de Storage mantidas como no original
export function savePreviousWeather(weatherData: WeatherData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('previousWeather', JSON.stringify({ ...weatherData, timestamp: Date.now() }));
  }
}

export function getPreviousWeather(): WeatherData | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('previousWeather');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) return data;
      } catch (e) { console.error(e); }
    }
  }
  return null;
}