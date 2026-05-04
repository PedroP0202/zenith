import type { ButtonHTMLAttributes, ReactNode } from 'react';

type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: AppButtonVariant;
    fullWidth?: boolean;
    icon?: ReactNode;
};

const variantClasses: Record<AppButtonVariant, string> = {
    primary: 'bg-white text-black shadow-glow-white hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(255,255,255,0.22)]',
    secondary: 'border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.09]',
    danger: 'border border-red-500/30 bg-red-500/12 text-red-100 hover:bg-red-500/18',
    ghost: 'bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05]',
};

export default function AppButton({
    children,
    className = '',
    variant = 'primary',
    fullWidth = false,
    icon,
    disabled,
    ...props
}: AppButtonProps) {
    return (
        <button
            className={[
                'inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
                fullWidth ? 'w-full' : '',
                variantClasses[variant],
                className,
            ].filter(Boolean).join(' ')}
            disabled={disabled}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}
