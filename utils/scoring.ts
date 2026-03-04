// utils/scoring.ts

export interface WeatherScore {
  score: number;
  message: string;
  color: string; // Para usarmos no Tailwind: 'bg-green-500', etc.
  tips: string[];
}

export function calculateRunScore(temp: number, wind: number, aqi: number, uv: number, aiTips?: string[]): WeatherScore {
  let score = 100;
  let tips = aiTips || []; // Usa dicas de IA se fornecidas, senão começa vazio

  // --- 1. CÁLCULO DO SCORE (Independente das dicas) ---
  
  // Qualidade do Ar (AQI de 1 a 5)
  if (aqi >= 4) score -= 60;
  else if (aqi >= 3) score -= 40;

  // Temperatura
  if (temp > 35) score -= 50;
  else if (temp > 30) score -= 30;
  else if (temp > 25) score -= 15;
  else if (temp < 0) score -= 40;
  else if (temp < 5) score -= 20;
  else if (temp < 10) score -= 10;

  // Vento
  if (wind > 40) score -= 40;
  else if (wind > 25) score -= 20;
  else if (wind > 15) score -= 10;

  // Índice UV (Nova Lógica)
  if (uv >= 8) score -= 40;
  else if (uv >= 6) score -= 20;


  // --- 2. GERAÇÃO DE DICAS MANUAIS (Se não houver IA) ---
  if (!aiTips || aiTips.length === 0) {
    // Dicas de Qualidade do Ar
    if (aqi >= 4) {
      tips.push("Ar muito poluído! Evita treinos ao ar livre e usa máscara se saíres.");
      tips.push("Poluição elevada pode causar problemas respiratórios. Considera treinar indoor.");
    } else if (aqi >= 3) {
      tips.push("Qualidade do ar moderada. Reduz a intensidade do treino se sentires desconforto.");
    } else {
      tips.push("Qualidade do ar excelente. Respira fundo e aproveita!");
    }

    // Dicas de Temperatura
    if (temp > 35) {
      tips.push("Calor extremo! Treino só de manhã cedo ou à noite. Hidratação constante.");
    } else if (temp > 30) {
      tips.push("Muito calor. Bebe água a cada 15-20 minutos, mesmo sem sede.");
    } else if (temp < 5) {
      tips.push("Muito frio. Agasalha-te em camadas e aquece bem antes de sair.");
    } else if (temp >= 10 && temp <= 25) {
      tips.push("Temperatura perfeita! Condições ideais para qualquer tipo de treino.");
    }

    // Dicas de Vento
    if (wind > 25) {
      tips.push("Vento forte. Pode afetar o ritmo. Planeia a rota a favor do vento no regresso.");
    }

    // Dicas de Índice UV (Novo)
    if (uv >= 8) {
      tips.push("⚠️ UV Extremo: Risco elevado. Use proteção máxima, chapéu e evite o sol direto.");
    } else if (uv >= 6) {
      tips.push("☀️ UV Alto: Use protetor solar e óculos de sol obrigatoriamente.");
    } else if (uv >= 3) {
      tips.push("🌤️ UV Moderado: Protetor solar é recomendado para treinos longos.");
    }

    // Dicas baseadas no Score Final
    if (score >= 80) {
      tips.push("Dia perfeito para bater recordes pessoais!");
    } else if (score < 50) {
      tips.push("Condições muito adversas. Prioriza a tua saúde e treina indoor.");
    }
  }

  // --- 3. DEFINIÇÃO DE CORES E MENSAGENS ---
  let color = "from-emerald-400 to-emerald-600";
  let message = "VAI TREINAR!";

  if (score < 80) {
    color = "from-amber-400 to-orange-500";
    message = "TREINA COM CAUTELA";
  }
  if (score < 50) {
    color = "from-rose-500 to-red-700";
    message = "MELHOR FICAR POR CASA";
  }

  return { 
    score: Math.max(0, score), 
    message, 
    color: `bg-gradient-to-br ${color}`, 
    tips 
  };
}