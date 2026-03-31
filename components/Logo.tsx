import React from 'react';

interface LogoProps {
    className?: string;
    iconClassName?: string;
}

export default function Logo({ className = "text-2xl", iconClassName = "" }: LogoProps) {
    return (
        <div className={`flex items-start font-sans font-extrabold tracking-tight ${className} leading-none`}>
            <span>Zzen</span>
            <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`w-[0.8em] h-[0.8em] ml-[0.05em] translate-y-[0.1em] ${iconClassName}`}
            >
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
        </div>
    );
}
