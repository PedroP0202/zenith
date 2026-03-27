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
    { name: 'Stardust', minLevel: 1, description: 'Dawning of a new journey.' },
    { name: 'Satellite', minLevel: 11, description: 'Maintaining a steady orbit.' },
    { name: 'Planet', minLevel: 21, description: 'A world of solid discipline.' },
    { name: 'Nebula', minLevel: 36, description: 'Clouds of dense potential.' },
    { name: 'Galaxy', minLevel: 51, description: 'A vast system of consistency.' },
    { name: 'Universe', minLevel: 76, description: 'Limitless potential unlocked.' },
    { name: 'Zenith', minLevel: 100, description: 'The absolute apex of being.' }
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
