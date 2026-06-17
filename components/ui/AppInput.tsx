import type { InputHTMLAttributes, ReactNode } from 'react';

type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
    error?: string;
    trailing?: ReactNode;
    inputClassName?: string;
};

export default function AppInput({
    id,
    label,
    hint,
    error,
    trailing,
    className = '',
    inputClassName = '',
    ...props
}: AppInputProps) {
    const inputId = id || `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
        <div className={className}>
            <label htmlFor={inputId} className="mb-2 ml-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
                {label}
            </label>
            <div className="relative">
                <input
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
                    className={[
                        'w-full rounded-xl border border-white/10 bg-white/[0.032] px-4 py-3.5 text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.05]',
                        trailing ? 'pr-14' : '',
                        inputClassName,
                    ].filter(Boolean).join(' ')}
                    {...props}
                />
                {trailing ? <div className="absolute right-4 top-1/2 -translate-y-1/2">{trailing}</div> : null}
            </div>
            {hint ? <p id={hintId} className="mt-2 px-1 text-[11px] leading-relaxed text-white/40">{hint}</p> : null}
            {error ? <p id={errorId} className="mt-2 px-1 text-xs font-medium text-red-300">{error}</p> : null}
        </div>
    );
}
