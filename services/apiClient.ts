import { API_URL } from '@/utils/constants';

type ApiClientOptions = Omit<RequestInit, 'body'> & {
    authToken?: string | null;
    body?: BodyInit | Record<string, unknown> | unknown[] | null;
    retries?: number;
    timeoutMs?: number;
};

export class ApiError extends Error {
    status: number;
    payload: unknown;

    constructor(message: string, status: number, payload?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

const DEFAULT_TIMEOUT_MS = 12_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function isJsonBody(body: ApiClientOptions['body']): body is Record<string, unknown> | unknown[] {
    return !!body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams);
}

async function parseResponse(response: Response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json().catch(() => null);
    }
    return response.text().catch(() => '');
}

function getErrorMessage(payload: unknown, fallback: string) {
    if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
        return payload.error;
    }
    if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
        return payload.message;
    }
    return fallback;
}

function joinUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<T> {
    const {
        authToken,
        body,
        headers,
        retries = 1,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        ...init
    } = options;

    const requestHeaders = new Headers(headers);
    if (authToken) requestHeaders.set('Authorization', `Bearer ${authToken}`);
    if (isJsonBody(body) && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
    }

    const serializedBody = isJsonBody(body) ? JSON.stringify(body) : body ?? undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(joinUrl(path), {
                ...init,
                headers: requestHeaders,
                body: serializedBody as BodyInit | undefined,
                signal: controller.signal,
            });
            const payload = await parseResponse(response);

            if (response.ok) return payload as T;

            const message = getErrorMessage(payload, `Pedido falhou (${response.status}).`);
            const apiError = new ApiError(message, response.status, payload);
            if (attempt < retries && RETRYABLE_STATUS.has(response.status)) {
                await new Promise((resolve) => globalThis.setTimeout(resolve, 250 * (attempt + 1)));
                continue;
            }
            throw apiError;
        } catch (error) {
            lastError = error;
            const isAbort = error instanceof DOMException && error.name === 'AbortError';
            if (attempt < retries && (isAbort || !(error instanceof ApiError))) {
                await new Promise((resolve) => globalThis.setTimeout(resolve, 250 * (attempt + 1)));
                continue;
            }
            throw error;
        } finally {
            globalThis.clearTimeout(timeout);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Erro de rede.');
}

export const apiClient = {
    get: <T = unknown>(path: string, options?: ApiClientOptions) => apiRequest<T>(path, { ...options, method: 'GET' }),
    post: <T = unknown>(path: string, body?: ApiClientOptions['body'], options?: ApiClientOptions) => apiRequest<T>(path, { ...options, method: 'POST', body }),
    patch: <T = unknown>(path: string, body?: ApiClientOptions['body'], options?: ApiClientOptions) => apiRequest<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T = unknown>(path: string, options?: ApiClientOptions) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
