export type AppToastTone = 'default' | 'success' | 'error';

export type AppToastPayload = {
    title: string;
    description?: string;
    tone?: AppToastTone;
};

export const APP_TOAST_EVENT = 'zenith:toast';

export function showAppToast(payload: AppToastPayload) {
    if (typeof window === 'undefined') {
        console.info(`[ZENITH_TOAST] ${payload.title}${payload.description ? ` - ${payload.description}` : ''}`);
        return;
    }

    window.dispatchEvent(new CustomEvent<AppToastPayload>(APP_TOAST_EVENT, { detail: payload }));
}
