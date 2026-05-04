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
        <div className={['flex flex-col items-center justify-center rounded-[28px] border border-white/5 bg-white/[0.04] px-6 py-14 text-center', className].filter(Boolean).join(' ')}>
            {icon ? <div className="mb-4 text-white/35">{icon}</div> : null}
            <h2 className="text-base font-bold text-white/80">{title}</h2>
            {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/38">{description}</p> : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}
