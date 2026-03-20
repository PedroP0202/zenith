"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useTranslation } from '../hooks/useTranslation';
import { ChevronRight, Zap, Target, LineChart, X, ArrowLeftRight, ShieldCheck, BellRing, Cloud, Plus, Settings, Trash2, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
    const { t } = useTranslation();
    const { setHasCompletedOnboarding } = useStore();
    const [step, setStep] = useState(1);
    const router = useRouter();

    const handleNext = () => {
        if (step < 9) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setHasCompletedOnboarding(true);
    };

    const handleCreateHabit = () => {
        setHasCompletedOnboarding(true);
        router.push('/habit/new');
    };

    const steps = [
        {
            icon: <Zap className="w-12 h-12 text-[var(--zenith-active)]" />,
            title: t.onboarding.step1.title,
            desc: t.onboarding.step1.desc,
            color: "from-[var(--zenith-active)]/20 to-transparent",
            spotlight: null
        },
        {
            icon: <Plus className="w-12 h-12 text-blue-400" />,
            title: t.onboarding.step2.title,
            desc: t.onboarding.step2.desc,
            color: "from-blue-500/20 to-transparent",
            spotlight: { x: '50%', y: '55%', r: '60px' } // Center Plus button
        },
        {
            icon: <Settings className="w-12 h-12 text-gray-400" />,
            title: t.onboarding.step3.title,
            desc: t.onboarding.step3.desc,
            color: "from-gray-500/20 to-transparent",
            spotlight: { x: 'calc(100% - 44px)', y: '72px', r: '32px' } // Top Right Settings
        },
        {
            icon: <ArrowLeftRight className="w-12 h-12 text-emerald-400" />,
            title: t.onboarding.step4.title,
            desc: t.onboarding.step4.desc,
            color: "from-emerald-500/20 to-transparent",
            spotlight: null
        },
        {
            icon: <ShieldCheck className="w-12 h-12 text-red-400" />,
            title: t.onboarding.step5.title,
            desc: t.onboarding.step5.desc,
            color: "from-red-500/20 to-transparent",
            spotlight: null
        },
        {
            icon: <Cloud className="w-12 h-12 text-sky-400" />,
            title: t.onboarding.step6.title,
            desc: t.onboarding.step6.desc,
            color: "from-sky-500/20 to-transparent",
            spotlight: { x: 'calc(100% - 44px)', y: '72px', r: '32px' } // Points to settings again for sync logic
        },
        {
            icon: <LineChart className="w-12 h-12 text-purple-400" />,
            title: t.onboarding.step7.title,
            desc: t.onboarding.step7.desc,
            color: "from-purple-500/20 to-transparent",
            spotlight: { x: '70%', y: 'calc(100% - 50px)', r: '40px' } // Bottom Nav Stats
        },
        {
            icon: <Trash2 className="w-12 h-12 text-orange-400" />,
            title: t.onboarding.step8.title,
            desc: t.onboarding.step8.desc,
            color: "from-orange-500/20 to-transparent",
            spotlight: { x: '50%', y: 'calc(100% - 130px)', r: '60px' } // Trash link
        },
        {
            icon: <MessageSquare className="w-12 h-12 text-pink-400" />,
            title: t.onboarding.step9.title,
            desc: t.onboarding.step9.desc,
            color: "from-pink-500/20 to-transparent",
            spotlight: { x: 'calc(100% - 44px)', y: 'calc(100% - 110px)', r: '36px' }, // Feedback button
            action: {
                label: t.habit.create,
                onClick: handleCreateHabit
            }
        }
    ];

    const currentStep = steps[step - 1];

    // Smooth feathered spotlight mask
    const currentMask = currentStep.spotlight 
        ? `radial-gradient(circle ${currentStep.spotlight.r} at ${currentStep.spotlight.x} ${currentStep.spotlight.y}, transparent 20%, rgba(0,0,0,0.8) 80%, black 120%)`
        : 'radial-gradient(circle 0px at 50% 50%, transparent 0%, black 10px)';

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 sm:p-8 text-center overflow-hidden"
        >
            {/* Dark Mask with Soft Spotlight */}
            <motion.div 
                className="absolute inset-0 bg-black/90 backdrop-blur-[4px] pointer-events-none"
                animate={({
                    WebkitMaskImage: currentMask,
                    maskImage: currentMask
                } as any)}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // smooth apple-like spring curve
            />

            {/* Ambient Background Glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${currentStep.color} opacity-20 mix-blend-screen transition-colors duration-1000 pointer-events-none`} />
            
            <button 
                onClick={handleComplete}
                className="absolute top-12 right-8 p-3 bg-white/5 backdrop-blur-md rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all z-[110] active:scale-90 border border-white/5"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="relative w-full max-w-[380px] z-[110] mt-auto mb-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.96 }}
                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        className="flex flex-col items-center bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]"
                    >
                        {/* Icon Container with Inner Glow */}
                        <div className="relative mb-8">
                            <div className={`absolute inset-0 bg-gradient-to-b ${currentStep.color} blur-2xl opacity-40`} />
                            <div className="relative p-5 bg-white/5 rounded-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center">
                                {currentStep.icon}
                            </div>
                        </div>
                        
                        <h2 className="text-[28px] font-black mb-3 tracking-tight leading-tight text-white/90">
                            {currentStep.title}
                        </h2>
                        
                        <p className="text-white/50 leading-relaxed text-[15px] mb-10 w-full px-2">
                            {currentStep.desc}
                        </p>

                        <div className="w-full space-y-4">
                            {currentStep.action ? (
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={currentStep.action.onClick}
                                        className="w-full h-14 bg-white text-black font-bold rounded-[20px] flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                    >
                                        {currentStep.action.label}
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleComplete}
                                        className="w-full h-12 bg-transparent text-white/40 font-semibold rounded-[16px] transition-colors hover:bg-white/5 hover:text-white/80"
                                    >
                                        {t.onboarding.finish}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="w-full h-14 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold rounded-[20px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-inner"
                                >
                                    {t.onboarding.next}
                                    <ChevronRight className="w-5 h-5 opacity-50" />
                                </button>
                            )}
                        </div>

                        {/* Elegant Stepper */}
                        <div className="flex justify-center gap-1.5 mt-8">
                            {steps.map((_, i) => (
                                <div 
                                    key={i}
                                    className={`h-1 rounded-full transition-all duration-500 ease-out ${
                                        step === (i + 1) ? 'w-6 bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'w-2 bg-white/20'
                                    }`}
                                />
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <button 
                onClick={handleComplete}
                className="absolute bottom-8 text-[11px] uppercase tracking-[0.25em] font-bold text-white/20 hover:text-white/50 transition-colors z-[110]"
            >
                {t.onboarding.skip}
            </button>
        </motion.div>
    );
}
