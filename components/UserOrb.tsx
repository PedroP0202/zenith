import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface UserOrbProps {
    seed: string;
    size?: number;
    className?: string;
    animate?: boolean;
}

export default function UserOrb({ seed, size = 48, className = "", animate = false }: UserOrbProps) {
    const { color1, color2, color3, rotationDuration } = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = Math.abs(hash) % 360;
        
        // Ensure colors are vibrant and "sci-fi"
        return {
            color1: `hsl(${hue}, 85%, 65%)`,
            color2: `hsl(${(hue + 45) % 360}, 90%, 50%)`,
            color3: `hsl(${(hue - 35 + 360) % 360}, 100%, 70%)`,
            // Randomize rotation speed slightly based on seed (between 10s and 20s)
            rotationDuration: 10 + (Math.abs(hash) % 10)
        };
    }, [seed]);

    return (
        <div 
            className={`relative rounded-full flex-shrink-0 flex items-center justify-center ${className}`}
            style={{ 
                width: size, 
                height: size,
                // Outer glow
                filter: `drop-shadow(0 ${size/8}px ${size/4}px ${color2}40)`
            }}
        >
            {/* Base gradient sphere */}
            <div 
                className="absolute inset-0 rounded-full"
                style={{
                    background: `linear-gradient(135deg, ${color1}, ${color2})`,
                    boxShadow: `inset 0 0 ${size/3}px rgba(0,0,0,0.5), inset 0 ${size/10}px ${size/10}px rgba(255,255,255,0.4)`
                }}
            />

            {/* Internal rotating energy */}
            <motion.div 
                className="absolute inset-x-0 inset-y-0 rounded-full opacity-70 mix-blend-overlay"
                style={{
                    background: `radial-gradient(ellipse at 30% 30%, ${color3} 0%, transparent 60%),
                                 radial-gradient(circle at 70% 80%, ${color1} 0%, transparent 50%)`
                }}
                animate={animate ? { rotate: 360 } : {}}
                transition={{ duration: rotationDuration, repeat: Infinity, ease: "linear" }}
            />

            {/* Core light (creates depth) */}
            <div 
                className="absolute inset-1 rounded-full bg-gradient-to-tr from-transparent via-transparent to-white/30 mix-blend-lighten"
            />
            
            {/* Top Gloss */}
            <div 
                className="absolute top-[5%] left-[15%] right-[15%] h-[30%] rounded-[50%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none"
            />
        </div>
    );
}
