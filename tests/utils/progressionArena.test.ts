import { describe, expect, it } from 'vitest';
import { getArenaPodiumRankName, getArenaTierFromScore } from '@/api/src/domain/arena';
import { getLevelFromXp, getLevelProgress, getRankForLevel, getXPNeededForLevel, getXpToNextLevel } from '@/utils/progression';

describe('progression and arena ranking', () => {
  it('uses linear XP levels with clamped progress', () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(99)).toBe(1);
    expect(getLevelFromXp(100)).toBe(2);
    expect(getXPNeededForLevel(5)).toBe(400);
    expect(getXpToNextLevel(9)).toBe(100);
    expect(getLevelProgress(275, 3)).toBe(0.75);
    expect(getLevelProgress(-20, 1)).toBe(0);
  });

  it('maps level and arena score thresholds to rank names', () => {
    expect(getRankForLevel(1).name).toBe('Spark');
    expect(getRankForLevel(45).name).toBe('Nova');
    expect(getArenaTierFromScore(-10).name).toBe('Spark');
    expect(getArenaTierFromScore(550).name).toBe('Astre');
    expect(getArenaTierFromScore(2500).name).toBe('Zenith');
  });

  it('labels podium positions deterministically', () => {
    expect(getArenaPodiumRankName(1)).toBe('Arena Champion');
    expect(getArenaPodiumRankName(2)).toBe('Arena Vanguard');
    expect(getArenaPodiumRankName(3)).toBe('Arena Sentinel');
    expect(getArenaPodiumRankName(10)).toBe('Arena Finalist');
  });
});
