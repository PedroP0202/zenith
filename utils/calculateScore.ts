// Placeholder for mathematical logic to calculate weather score
export const calculateScore = (temperature: number, humidity: number, windSpeed: number): number => {
  // Example calculation: a simple score based on comfort
  // Lower score is better (more comfortable)
  const tempScore = Math.abs(temperature - 22); // Ideal temp 22°C
  const humidityScore = Math.abs(humidity - 50); // Ideal humidity 50%
  const windScore = windSpeed * 0.5; // Wind penalty

  return tempScore + humidityScore + windScore;
};