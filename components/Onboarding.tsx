"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useTranslation } from '../hooks/useTranslation';
import { ChevronRight, Zap, Target, LineChart, X, ArrowLeftRight, ShieldCheck, BellRing, Cloud, Plus, Settings, Trash2, MessageSquare } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface Step {
    targetId: string | null;
    route: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    color: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export default function Onboarding() {
    const { t } = useTranslation();
    const { setHasCompletedOnboarding, habits, hasCompletedOnboarding } = useStore();
    const [step, setStep] = useState(1);
    const router = useRouter();
    const pathname = usePathname();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const allActiveHabits = habits.filter(h => h.isActive);
    
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

    const handleComplete = () => {
        setHasCompletedOnboarding(true);
    };

    const handleCreateHabit = () => {
        setHasCompletedOnboarding(true);
        router.push('/habit/new');
    };

    const steps: Step[] = [
        {
            targetId: null,
            route: '/',
            icon: <Zap className="w-10 h-10 text-[var(--zenith-active)]" />,
            title: t.onboarding.step1.title,
            desc: t.onboarding.step1.desc,
            color: "from-[var(--zenith-active)]/20 to-transparent",
        },
        {
            targetId: habits.length === 0 ? 'add-habit-empty' : 'top-plus',
            route: '/',
            icon: <Plus className="w-10 h-10 text-blue-400" />,
            title: t.onboarding.step2.title,
            desc: t.onboarding.step2.desc,
            color: "from-blue-500/20 to-transparent",
        },
        {
            targetId: 'top-settings',
            route: '/',
            icon: <Settings className="w-10 h-10 text-gray-400" />,
            title: t.onboarding.step3.title,
            desc: t.onboarding.step3.desc,
            color: "from-gray-500/20 to-transparent",
        },
        {
            targetId: null,
            route: '/',
            icon: <ArrowLeftRight className="w-10 h-10 text-emerald-400" />,
            title: t.onboarding.step4.title,
            desc: t.onboarding.step4.desc,
            color: "from-emerald-500/20 to-transparent",
        },
        {
            targetId: null,
            route: '/',
            icon: <ShieldCheck className="w-10 h-10 text-red-400" />,
            title: t.onboarding.step5.title,
            desc: t.onboarding.step5.desc,
            color: "from-red-500/20 to-transparent",
        },
        {
            targetId: 'settings-cloud',
            route: '/settings',
            icon: <Cloud className="w-10 h-10 text-sky-400" />,
            title: t.onboarding.step6.title,
            desc: t.onboarding.step6.desc,
            color: "from-sky-500/20 to-transparent",
        },
        {
            targetId: 'nav-stats',
            route: '/stats',
            icon: <LineChart className="w-10 h-10 text-purple-400" />,
            title: t.onboarding.step7.title,
            desc: t.onboarding.step7.desc,
            color: "from-purple-500/20 to-transparent",
        },
        {
            targetId: 'view-trash',
            route: '/',
            icon: <Trash2 className="w-10 h-10 text-orange-400" />,
            title: t.onboarding.step8.title,
            desc: t.onboarding.step8.desc,
            color: "from-orange-500/20 to-transparent",
        },
        {
            targetId: 'beta-feedback-fab',
            route: '/',
            icon: <MessageSquare className="w-10 h-10 text-pink-400" />,
            title: t.onboarding.step9.title,
            desc: t.onboarding.step9.desc,
            color: "from-pink-500/20 to-transparent",
            action: {
                label: t.habit.create,
                onClick: handleCreateHabit
            }
        }
    ];

    const currentStep = steps[step - 1];

    // Tracking logic
    const updateTargetRect = useCallback(() => {
        if (currentStep.targetId) {
            const el = document.getElementById(currentStep.targetId);
            if (el) {
                // Auto-scroll to ensure the element is visible
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTargetRect(el.getBoundingClientRect());
            } else {
                setTargetRect(null);
            }
        } else {
            setTargetRect(null);
        }
    }, [currentStep.targetId]);

    useEffect(() => {
        if (!mounted || hasCompletedOnboarding || allActiveHabits.length > 0 || isAuthRoute) return;

        // Handle auto-routing
        if (pathname !== currentStep.route) {
            router.push(currentStep.route);
        }

        // Delay tracking slightly to allow for page transitions and hydration
        const timer = setTimeout(updateTargetRect, 250);
        window.addEventListener('resize', updateTargetRect);
        
        // Polling for layout shifts (minimal performance impact)
        const interval = setInterval(updateTargetRect, 500);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('resize', updateTargetRect);
        };
    }, [step, currentStep.route, pathname, router, updateTargetRect, mounted, hasCompletedOnboarding, allActiveHabits.length, isAuthRoute]);

    const handleNext = () => {
        if (step < steps.length) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    if (!mounted || hasCompletedOnboarding || allActiveHabits.length > 0 || isAuthRoute) return null;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden"
        >
            {/* SVG Mask for crystal clear spotlight */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[101]">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <AnimatePresence mode="wait">
                            {targetRect && (
                                <motion.rect
                                    key={currentStep.targetId}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    x={targetRect.left - 8}
                                    y={targetRect.top - 8}
                                    width={targetRect.width + 16}
                                    height={targetRect.height + 16}
                                    rx={Math.min(targetRect.width, targetRect.height) / 2 + 8}
                                    fill="black"
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            )}
                        </AnimatePresence>
                    </mask>
                </defs>
                <rect 
                    x="0" y="0" width="100%" height="100%" 
                    fill="rgba(0,0,0,0.8)" 
                    mask="url(#spotlight-mask)" 
                    className="backdrop-blur-[2px]"
                />
            </svg>

            {/* Pulsing Highlight Ring */}
            <AnimatePresence>
                {targetRect && (
                    <motion.div
                        key={`ring-${step}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="absolute z-[105] pointer-events-none"
                        style={{
                            left: targetRect.left + targetRect.width / 2,
                            top: targetRect.top + targetRect.height / 2,
                            x: '-50%',
                            y: '-50%',
                            width: targetRect.width + 24,
                            height: targetRect.height + 24,
                        }}
                    >
                        <motion.div 
                            className="absolute inset-0 rounded-[inherit] border-2 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                            style={{ borderRadius: Math.min(targetRect.width, targetRect.height) / 2 + 12 }}
                            animate={{ scale: [1, 1.05, 1], opacity: [1, 0.6, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Skip Button */}
            <button 
                onClick={handleComplete}
                className="absolute top-12 left-6 text-[10px] font-bold tracking-[0.25em] text-white/30 hover:text-white transition-colors z-[110] p-2 uppercase"
            >
                {t.onboarding.skip}
            </button>

            {/* Bottom Sheet Card */}
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="relative z-[110] w-full px-6 pb-12 pt-8 rounded-t-[40px] bg-[#080808] border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.9)] flex flex-col items-center"
            >
                {/* Visual Indicator of Step */}
                <div className="flex justify-center gap-1.5 mb-10">
                    {steps.map((_, i) => (
                        <div 
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                step === (i + 1) ? 'w-8 bg-white' : 'w-1.5 bg-white/10'
                            }`}
                        />
                    ))}
                </div>

                <div className="w-full max-w-sm">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35 }}
                        >
                            <div className="flex items-center gap-4 mb-5">
                                <div className="p-3.5 bg-white/[0.04] rounded-2xl border border-white/5 shadow-inner">
                                    {currentStep.icon}
                                </div>
                                <h2 className="text-[26px] font-bold tracking-tight text-white/90">
                                    {currentStep.title}
                                </h2>
                            </div>
                            
                            <p className="text-white/50 leading-relaxed text-[15px] mb-10 w-full pr-4 font-light tracking-wide">
                                {currentStep.desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    <div className="w-full flex items-center justify-end mt-4">
                        {currentStep.action ? (
                            <button
                                onClick={currentStep.action.onClick}
                                className="w-full h-14 bg-white text-black font-bold rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_8px_32px_rgba(255,255,255,0.1)] uppercase text-[11px] tracking-widest"
                            >
                                {currentStep.action.label}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 h-14 px-8 bg-white/5 border border-white/20 text-white font-bold rounded-full transition-all active:scale-95 hover:bg-white/10"
                            >
                                <span className="uppercase text-[11px] tracking-widest opacity-80">{t.onboarding.next}</span>
                                <ChevronRight className="w-5 h-5 opacity-40 ml-1" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
