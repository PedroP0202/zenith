const ARENA_TIERS = [
    { name: 'Zenith', minScore: 2500 },
    { name: 'Avatar', minScore: 1500 },
    { name: 'Soberano', minScore: 900 },
    { name: 'Astre', minScore: 550 },
    { name: 'Pulsar', minScore: 350 },
    { name: 'Nova', minScore: 200 },
    { name: 'Núcleo', minScore: 120 },
    { name: 'Órbita', minScore: 70 },
    { name: 'Vetor', minScore: 40 },
    { name: 'Flux', minScore: 20 },
    { name: 'Vácuo', minScore: 5 },
    { name: 'Spark', minScore: 0 },
] as const;

export const getArenaTierFromScore = (score: number) => {
    const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    return ARENA_TIERS.find((tier) => normalizedScore >= tier.minScore) || ARENA_TIERS[ARENA_TIERS.length - 1];
};

export const getArenaPodiumRankName = (position: number) => {
    if (position === 1) return 'Arena Champion';
    if (position === 2) return 'Arena Vanguard';
    if (position === 3) return 'Arena Sentinel';
    return 'Arena Finalist';
};
