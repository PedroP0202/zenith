export const isAcceptedFriend = async (db: D1Database, userId: string, friendId: string) => {
    const friendship = await db.prepare(`
        SELECT id FROM friendships
        WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
          AND status = 'accepted'
    `).bind(userId, friendId, friendId, userId).first();

    return !!friendship;
};
