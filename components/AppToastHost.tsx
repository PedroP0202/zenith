'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { APP_TOAST_EVENT, type AppToastPayload } from '@/utils/toast';

type ToastItem = AppToastPayload & {
    id: number;
};

const toneStyles = {
    default: {
        icon: Info,
        className: 'border-white/10 bg-zinc-950/95 text-white',
        iconClassName: 'text-white/55',
    },
    success: {
        icon: CheckCircle2,
        className: 'border-emerald-500/20 bg-emerald-950/95 text-emerald-50',
        iconClassName: 'text-emerald-300',
    },
    error: {
        icon: XCircle,
        className: 'border-red-500/25 bg-red-950/95 text-red-50',
        iconClassName: 'text-red-300',
    },
};

export default function AppToastHost() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const onToast = (event: Event) => {
            const detail = (event as CustomEvent<AppToastPayload>).detail;
            const id = Date.now() + Math.random();
            setToasts((current) => [...current.slice(-2), { id, tone: 'default', ...detail }]);
            window.setTimeout(() => {
                setToasts((current) => current.filter((toast) => toast.id !== id));
            }, 4200);
        };

        window.addEventListener(APP_TOAST_EVENT, onToast);
        return () => window.removeEventListener(APP_TOAST_EVENT, onToast);
    }, []);

    return (
        <div className="pointer-events-none fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[120] mx-auto flex max-w-md flex-col gap-3">
            <AnimatePresence initial={false}>
                {toasts.map((toast) => {
                    const tone = toneStyles[toast.tone || 'default'];
                    const Icon = tone.icon;
                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${tone.className}`}
                            role="status"
                        >
                            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClassName}`} />
                            <div>
                                <p className="text-sm font-bold">{toast.title}</p>
                                {toast.description ? <p className="mt-1 text-xs leading-relaxed opacity-70">{toast.description}</p> : null}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
