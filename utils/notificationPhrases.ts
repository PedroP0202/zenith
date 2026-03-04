/**
 * Varied phrases for Zenith habit notifications.
 * Option D: A balanced mix of mindful, incisive, and minimalist personality,
 * designed to avoid monotony while remaining clean and premium.
 */

const incisivePhrases = [
    "A disciplina liberta. Tempo de fazer: [Hábito].",
    "Sem desculpas. [Hábito] agora.",
    "O momento ideal é agora. Foco em: [Hábito].",
    "Menos scroll, mais ação. Vai fazer: [Hábito].",
    "A tua streak precisa de ti. [Hábito].",
    "O progresso não espera. Está na hora de [Hábito]."
];

const mindfulPhrases = [
    "É tempo de cuidar de ti. [Hábito].",
    "Constrói a tua rotina com calma. Foco em [Hábito].",
    "Investe em ti hoje. Faz: [Hábito].",
    "Pausa o ruído. Hora do teu [Hábito].",
    "Pequenos passos importam. [Hábito] espera por ti."
];

const minimalistPhrases = [
    "O teu Lembrete: [Hábito].",
    "É hora: [Hábito].",
    "Não te esqueças: [Hábito].",
    "Agendado para agora: [Hábito].",
    "Pendente: [Hábito]."
];

const allPhrases = [...incisivePhrases, ...mindfulPhrases, ...minimalistPhrases];

/**
 * Returns a random stylized notification body for a given habit name.
 * The `[Hábito]` placeholder is replaced by the actual habit title.
 * 
 * @param habitTitle The name of the habit (e.g. "Ler 10 Páginas")
 * @returns A randomized string with personality
 */
export function getRandomNotificationPhrase(habitTitle: string): string {
    const randomIndex = Math.floor(Math.random() * allPhrases.length);
    const phrase = allPhrases[randomIndex];
    return phrase.replace("[Hábito]", habitTitle);
}
