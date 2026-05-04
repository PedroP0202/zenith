import type { ReactNode } from 'react';

type MetricCardProps = {
    icon?: ReactNode;
    label: string;
    value: ReactNode;
    detail?: ReactNode;
    tone?: 'default' | 'accent';
    className?: string;
};

export default function MetricCard({ icon, label, value, detail, tone = 'default', className = '' }: MetricCardProps) {
    return (
        <div
            className={[
                tone === 'accent' ? 'border-[var(--zenith-active)]/20 bg-[var(--zenith-active)]/10' : 'border-white/5 bg-white/[0.05]',
                'rounded-[28px] border p-6 transition-colors hover:bg-white/[0.07] lg:p-8',
                className,
            ].filter(Boolean).join(' ')}
        >
            <div className={['mb-3 flex items-center gap-3', tone === 'accent' ? 'text-[var(--zenith-active)]' : 'text-white/42'].join(' ')}>
                {icon}
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span>
            </div>
            <div className={['text-3xl font-black lg:text-4xl', tone === 'accent' ? 'text-[var(--zenith-active)]' : 'text-white'].join(' ')}>
                {value}
            </div>
            {detail ? <div className="mt-1 text-[10px] font-bold text-white/35">{detail}</div> : null}
        </div>
    );
}
