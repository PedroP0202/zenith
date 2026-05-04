import { Hono } from 'hono';
import { getArenaPodiumRankName, getArenaTierFromScore } from '../domain/arena';
import { authenticateRequest } from '../middleware/auth';
import type { Bindings } from '../types';

const leaderboardRoutes = new Hono<{ Bindings: Bindings }>();

leaderboardRoutes.get('/', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const db = c.env.DB;
    const now = Date.now();
    const period = c.req.query('period') === 'historical' ? 'historical' : 'seasonal';

    try {
        let activeSeason = await db.prepare(
            'SELECT * FROM arena_seasons WHERE is_finalized = 0 AND start_at <= ? AND end_at > ? ORDER BY end_at ASC LIMIT 1'
        ).bind(now, now).first<any>();

        if (!activeSeason) {
            const expiredSeason = await db.prepare(
                'SELECT * FROM arena_seasons WHERE is_finalized = 0 AND end_at <= ? ORDER BY end_at DESC LIMIT 1'
            ).bind(now).first<any>();

            if (expiredSeason) {
                const topPlayers = await db.prepare(`
                    SELECT u.id, u.name, u.username, u.arena_points as score
                    FROM users u
                    WHERE u.opt_in_leaderboard = 1 AND u.arena_points > 0
                    ORDER BY u.arena_points DESC, u.total_xp DESC, u.created_at ASC, u.id ASC
                    LIMIT 3
                `).all<any>();

                if (topPlayers.results && topPlayers.results.length > 0) {
                    for (let i = 0; i < topPlayers.results.length; i++) {
                        const winner = topPlayers.results[i];
                        const winnerId = crypto.randomUUID();
                        await db.prepare(
                            'INSERT INTO arena_winners (id, user_id, season_id, rank_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                        )
                            .bind(
                                winnerId,
                                winner.id,
                                expiredSeason.id,
                                getArenaPodiumRankName(i + 1),
                                i + 1,
                                now
                            )
                            .run();
                    }
                }

                await db.prepare('UPDATE arena_seasons SET is_finalized = 1 WHERE id = ?').bind(expiredSeason.id).run();
                await db.prepare('UPDATE users SET arena_points = 0').run();
            }

            const currentDate = new Date();
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0).getTime();
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

            const nextSeasonId = `SEASON-${startOfMonth}`;
            const monthName = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(currentDate);

            await db.prepare(
                'INSERT OR IGNORE INTO arena_seasons (id, name, start_at, end_at, is_finalized, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
                .bind(nextSeasonId, `Arena ${monthName}`, startOfMonth, endOfMonth, 0, now)
                .run();

            activeSeason = await db.prepare('SELECT * FROM arena_seasons WHERE id = ?').bind(nextSeasonId).first<any>();
        }

        if (period === 'historical') {
            const historicalQuery = `
                SELECT
                    w.id,
                    w.user_id as userId,
                    w.season_id as season_id,
                    w.rank_name as rank_name,
                    w.position,
                    w.created_at as created_at,
                    u.name,
                    u.username,
                    s.name as season_name,
                    s.start_at as season_start_at,
                    s.end_at as season_end_at
                FROM arena_winners w
                JOIN users u ON w.user_id = u.id
                LEFT JOIN arena_seasons s ON w.season_id = s.id
                ORDER BY s.end_at DESC, w.position ASC, w.created_at DESC
            `;
            const { results: winners } = await db.prepare(historicalQuery).all<any>();

            const uniqueSeasons = new Set((winners || []).map((winner: any) => String(winner.season_id || 'unknown')));

            return c.json({
                leaderboard: winners || [],
                type: 'historical',
                meta: {
                    seasonsCount: uniqueSeasons.size,
                    totalWinners: (winners || []).length,
                },
            });
        }

        const seasonalRes = await db.prepare(`
            SELECT u.id, u.name, u.username, u.arena_points as score
            FROM users u
            WHERE u.opt_in_leaderboard = 1
            ORDER BY u.arena_points DESC, u.total_xp DESC, u.created_at ASC, u.id ASC
            LIMIT 100
        `).all<any>();

        const leaderboard = seasonalRes.results || [];

        const participantsRow = await db.prepare(
            'SELECT COUNT(*) as total FROM users WHERE opt_in_leaderboard = 1'
        ).first<{ total: number }>();
        const statsRow = await db.prepare(
            'SELECT MAX(arena_points) as topScore, AVG(arena_points) as averageScore FROM users WHERE opt_in_leaderboard = 1'
        ).first<{ topScore: number | null; averageScore: number | null }>();

        const participantsCount = Number(participantsRow?.total || 0);
        const topScore = Number(statsRow?.topScore || 0);
        const averageScore = Number(statsRow?.averageScore || 0);

        const meRow = await db.prepare(`
            SELECT id, name, username, opt_in_leaderboard as optedIn, arena_points as score
            FROM users
            WHERE id = ?
        `).bind(userId).first<{ id: string; name: string; username: string; optedIn: number; score: number }>();

        let me: {
            userId: string;
            name: string;
            username: string;
            score: number;
            position: number;
            percentile: number;
            pointsToNext: number;
            tier: string;
            isInTop: boolean;
        } | null = null;

        if (meRow && Number(meRow.optedIn) === 1) {
            const myScore = Number(meRow.score || 0);

            const aheadRow = await db.prepare(`
                SELECT COUNT(*) as ahead
                FROM users
                WHERE opt_in_leaderboard = 1
                  AND (arena_points > ? OR (arena_points = ? AND id < ?))
            `).bind(myScore, myScore, userId).first<{ ahead: number }>();

            const position = Number(aheadRow?.ahead || 0) + 1;

            const nextHigherRow = await db.prepare(`
                SELECT arena_points as score
                FROM users
                WHERE opt_in_leaderboard = 1 AND arena_points > ?
                ORDER BY arena_points ASC
                LIMIT 1
            `).bind(myScore).first<{ score: number }>();

            const pointsToNext = nextHigherRow ? Math.max(0, Number(nextHigherRow.score) - myScore + 1) : 0;
            const percentile = participantsCount > 0
                ? Math.max(1, Math.round(((participantsCount - position + 1) / participantsCount) * 100))
                : 0;

            me = {
                userId: meRow.id,
                name: meRow.name,
                username: meRow.username,
                score: myScore,
                position,
                percentile,
                pointsToNext,
                tier: getArenaTierFromScore(myScore).name,
                isInTop: leaderboard.some((entry: any) => String(entry.id) === meRow.id),
            };
        }

        return c.json({
            leaderboard,
            type: 'seasonal',
            season: activeSeason
                ? {
                    id: activeSeason.id,
                    name: activeSeason.name,
                    endsAt: activeSeason.end_at,
                    startsAt: activeSeason.start_at,
                }
                : null,
            meta: {
                participantsCount,
                topScore,
                averageScore: Math.round(averageScore),
            },
            me,
        });
    } catch (e: any) {
        console.error('Leaderboard error:', e);
        return c.json({ error: 'Erro ao carregar arena: ' + e.message }, 500);
    }
});

export default leaderboardRoutes;
