"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
    className?: string;
    variant?: "rect" | "circle";
    style?: React.CSSProperties;
}

export default function Skeleton({ className = "", variant = "rect", style }: SkeletonProps) {
    return (
        <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            className={`bg-white/[0.07] ${variant === "circle" ? "rounded-full" : "rounded-xl"} ${className}`}
            style={style}
        />
    );
}
