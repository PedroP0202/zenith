/**
 * Progression logic for Zenith.
 * Levels are LINEAR: each level requires exactly 100 XP.
 * Formula: Level = floor(totalXP / 100) + 1
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

/** XP per level — simple constant. Each level is exactly 100 XP. */
const XP_PER_LEVEL = 100;

/**
 * Calculates the total XP needed to START a specific level.
 * e.g. Level 1 starts at 0 XP, Level 2 at 100 XP, Level 3 at 200 XP...
 */
export const getXPNeededForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return (level - 1) * XP_PER_LEVEL;
};

/**
 * Calculates the XP required specifically for the next level from the current one.
 * Since it's linear, this is always XP_PER_LEVEL.
 */
export const getXpToNextLevel = (_currentLevel: number): number => {
    return XP_PER_LEVEL;
};

/**
 * Calculates current progress within the current level (0 to 1).
 */
export const getLevelProgress = (totalXp: number, level: number): number => {
    const xpInThisLevel = totalXp - getXPNeededForLevel(level);
    return Math.max(0, Math.min(1, xpInThisLevel / XP_PER_LEVEL));
};

/**
 * Determines what the level should be for a given total XP.
 * Linear: Level = floor(totalXP / 100) + 1
 */
export const getLevelFromXp = (totalXp: number): number => {
    return Math.max(1, Math.floor(totalXp / XP_PER_LEVEL) + 1);
};
