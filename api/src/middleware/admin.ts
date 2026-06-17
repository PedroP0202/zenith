import type { Bindings } from '../types';

export const requireAdminSecret = (c: { env: Bindings; req: { header: (name: string) => string | undefined }; json: (body: unknown, status?: number) => Response }) => {
    const adminSecret = c.env.ADMIN_SECRET;
    if (!adminSecret) {
        console.error('[ADMIN] ADMIN_SECRET env var is not set!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const authHeader = c.req.header('Authorization');

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
        return c.json({ error: 'Acesso Restrito Admnistrativo.' }, 401);
    }

    return null;
};
