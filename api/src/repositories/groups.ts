export const getGroupMembership = async (db: D1Database, groupId: string, userId: string) => {
    return db.prepare(`
        SELECT gm.id, gm.role, sg.owner_user_id
        FROM group_members gm
        JOIN social_groups sg ON sg.id = gm.group_id
        WHERE gm.group_id = ? AND gm.user_id = ?
    `).bind(groupId, userId).first<{ id: string; role: string; owner_user_id: string }>();
};
