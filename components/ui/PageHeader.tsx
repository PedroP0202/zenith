import type { ReactNode } from 'react';

type PageHeaderProps = {
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
};

export default function PageHeader({ eyebrow, title, description, action, className = '' }: PageHeaderProps) {
    return (
        <header className={['flex items-start justify-between gap-4', className].filter(Boolean).join(' ')}>
            <div>
                {eyebrow ? <p className="app-kicker mb-3">{eyebrow}</p> : null}
                <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
                {description ? <p className="mt-2 text-sm leading-relaxed text-white/48">{description}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </header>
    );
}
