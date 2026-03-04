// services/weather.ts
const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

export async function getWeatherData(lat: number, lon: number) {
  // Se a chave for a de exemplo ou não existir, devolve dados vazios
  if (!API_KEY || API_KEY === 'TUA_CHAVE_REAL_DA_OPENWEATHER') {
    console.log('A usar dados mock - Chave API não configurada corretamente');
    return {
      temp: 0,
      wind: 0,
      description: '--/--',
      aqi: 0,
      uv: 0,
      city: '--/--' 
    };
  }

  try {
    // Fazemos os 3 pedidos em paralelo (mais rápido)
    const [weatherRes, pollutionRes, uvRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
      fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
    ]);

    const weatherData = await weatherRes.json();
    const pollutionData = await pollutionRes.json();
    const uvData = await uvRes.json();

    return {
      temp: weatherData.main.temp,
      // Converte m/s para km/h (OpenWeather envia m/s em metric)
      wind: weatherData.wind.speed * 3.6, 
      description: weatherData.weather[0].description,
      aqi: pollutionData.list[0].main.aqi,
      // Na OpenWeather o campo correto é 'value' e não 'now.uvi'
      uv: uvData.value || 0, 
      city: weatherData.name, // Nome da região/cidade
    };
  } catch (error) {
    console.error("Erro ao buscar dados meteorológicos:", error);
    return {
      temp: 0,
      wind: 0,
      description: 'Erro de conexão',
      aqi: 0,
      uv: 0,
      city: 'Desconhecido'
    };
  }
}