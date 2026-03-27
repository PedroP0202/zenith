/**
 * Progression logic for Zenith.
 * Levels are logarithmic to represent increasing difficulty.
 * Ranks are space-themed to maintain a minimal, premium aesthetic.
 */

export interface RankInfo {
    name: string;
    minLevel: number;
    description: string;
}

export const RANKS: RankInfo[] = [
    { name: 'Spark', minLevel: 1, description: 'A pequena centelha do início.' },
    { name: 'Vácuo', minLevel: 4, description: 'A moldar o teu próprio vazio.' },
    { name: 'Flux', minLevel: 8, description: 'A energia começa a fluir.' },
    { name: 'Vetor', minLevel: 13, description: 'Direção e força definidas.' },
    { name: 'Órbita', minLevel: 20, description: 'Estabilidade e ritmo orbital.' },
    { name: 'Núcleo', minLevel: 30, description: 'O centro sólido da tua disciplina.' },
    { name: 'Nova', minLevel: 45, description: 'Uma explosão de novos hábitos.' },
    { name: 'Pulsar', minLevel: 65, description: 'Frequência constante e imparável.' },
    { name: 'Astre', minLevel: 90, description: 'Brilho que ilumina o teu cosmos.' },
    { name: 'Soberano', minLevel: 125, description: 'O comando total do teu tempo.' },
    { name: 'Avatar', minLevel: 175, description: 'Em harmonia com o Infinito.' },
    { name: 'Zenith', minLevel: 250, description: 'O estado supremo da consciência.' }
];

export const getRankForLevel = (level: number): RankInfo => {
    return [...RANKS].reverse().find(rank => level >= rank.minLevel) || RANKS[0];
};

/**
 * Calculates the total XP needed to reach a specific level.
 * Formula: 100 * (1.35 ^ (level - 1))
 */
export const getXPNeededForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(1.35, level - 1));
};

/**
 * Calculates the XP required specifically for the next level from the current one.
 */
export const getXpToNextLevel = (currentLevel: number): number => {
    return getXPNeededForLevel(currentLevel + 1) - getXPNeededForLevel(currentLevel);
};

/**
 * Calculates current progress within the current level (0 to 1).
 */
export const getLevelProgress = (totalXp: number, level: number): number => {
    const xpForThisLevelStart = getXPNeededForLevel(level);
    const xpForNextLevelStart = getXPNeededForLevel(level + 1);
    const xpInThisLevel = totalXp - xpForThisLevelStart;
    const totalXpRequiredInLevel = xpForNextLevelStart - xpForThisLevelStart;
    
    return Math.max(0, Math.min(1, xpInThisLevel / totalXpRequiredInLevel));
};

/**
 * Determines what the level should be for a given total XP.
 */
export const getLevelFromXp = (totalXp: number): number => {
    let level = 1;
    while (totalXp >= getXPNeededForLevel(level + 1)) {
        level++;
    }
    return level;
};
