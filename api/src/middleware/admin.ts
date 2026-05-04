import type { Bindings } from '../types';

const LOCAL_ADMIN_SECRET = 'zenith-admin';

export const requireAdminSecret = (c: { env: Bindings; req: { header: (name: string) => string | undefined }; json: (body: unknown, status?: number) => Response }) => {
    const authHeader = c.req.header('Authorization');
    const adminSecret = c.env.ADMIN_SECRET || LOCAL_ADMIN_SECRET;

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
        return c.json({ error: 'Acesso Restrito Admnistrativo.' }, 401);
    }

    return null;
};
