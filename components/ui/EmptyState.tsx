import type { ReactNode } from 'react';

type EmptyStateProps = {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
};

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
    return (
        <div className={['flex flex-col items-center justify-center rounded-2xl border border-white/6 bg-white/[0.025] px-6 py-12 text-center', className].filter(Boolean).join(' ')}>
            {icon ? <div className="mb-4 text-white/30">{icon}</div> : null}
            <h2 className="text-base font-semibold text-white/82">{title}</h2>
            {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/42">{description}</p> : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}
