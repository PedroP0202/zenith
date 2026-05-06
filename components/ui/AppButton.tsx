import type { ButtonHTMLAttributes, ReactNode } from 'react';

type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: AppButtonVariant;
    fullWidth?: boolean;
    icon?: ReactNode;
};

const variantClasses: Record<AppButtonVariant, string> = {
    primary: 'bg-white text-black hover:bg-white/90',
    secondary: 'border border-white/10 bg-white/[0.035] text-white hover:bg-white/[0.07]',
    danger: 'border border-red-500/24 bg-red-500/10 text-red-100 hover:bg-red-500/14',
    ghost: 'bg-transparent text-white/50 hover:text-white hover:bg-white/[0.04]',
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
                'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors active:opacity-80 disabled:pointer-events-none disabled:opacity-60',
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
