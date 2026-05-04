import { verify } from 'hono/jwt';
import type { AuthPayload, Bindings } from '../types';

export const getTokenSecret = (c: { env: Bindings }) => {
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        throw new Error('MISSING_JWT_SECRET');
    }
    return secret || 'zenith-local-dev-secret';
};

export const authenticateRequest = async (
    c: any
): Promise<{ payload: AuthPayload; error?: never } | { error: any; payload?: never }> => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: c.json({ error: 'Não autorizado' }, 401) };
    }

    try {
        const payload = await verify(authHeader.replace('Bearer ', ''), getTokenSecret(c), 'HS256') as AuthPayload;
        return { payload };
    } catch (error: any) {
        if (error?.message === 'MISSING_JWT_SECRET') {
            console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
            return { error: c.json({ error: 'Erro de configuração do servidor.' }, 500) };
        }
        return { error: c.json({ error: 'Token inválido' }, 401) };
    }
};
