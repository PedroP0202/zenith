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

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden"
        >
            {/* Minimal Dark Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] pointer-events-none transition-all duration-700" />

            {/* Pulsing Focus Ring (Instead of mask hole, we highlight via a sleek animated ring) */}
            <AnimatePresence>
                {currentStep.spotlight && (
                    <motion.div
                        key={`ring-${step}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute z-[105] pointer-events-none"
                        style={{
                            left: currentStep.spotlight.x,
                            top: currentStep.spotlight.y,
                            x: '-50%',
                            y: '-50%',
                            width: parseFloat(currentStep.spotlight.r as string) * 2,
                            height: parseFloat(currentStep.spotlight.r as string) * 2,
                        }}
                    >
                        {/* Outer Glow */}
                        <motion.div 
                            className="absolute inset-0 rounded-full bg-white/10"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Crisp Inner Ring */}
                        <div className="absolute inset-0 rounded-full border-[1.5px] border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
                        {/* Connecting Line to Bottom Sheet (optional abstract touch) */}
                        {parseFloat(currentStep.spotlight.y as string) < 500 && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 100, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="absolute left-1/2 bottom-[-100px] w-px bg-gradient-to-b from-white/30 to-transparent" 
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Skip Button - positioned minimalistically at top left */}
            <button 
                onClick={handleComplete}
                className="absolute top-12 left-6 text-[10px] font-medium tracking-[0.2em] text-white/40 hover:text-white transition-colors z-[110] p-2 -ml-2 rounded-full active:scale-95 uppercase"
            >
                {t.onboarding.skip}
            </button>

            {/* Elegant Bottom Sheet */}
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 200 }}
                className="relative z-[110] w-full px-6 pb-12 pt-10 rounded-t-[40px] bg-[#050505] border-t border-white/[0.08] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col items-center"
            >
                {/* Discrete Stepper */}
                <div className="flex justify-center gap-2 mb-10 w-full">
                    {steps.map((_, i) => (
                        <div 
                            key={i}
                            className={`h-1 rounded-full transition-all duration-500 ease-out ${
                                step === (i + 1) ? 'w-8 bg-white' : 'w-2 bg-white/[0.08]'
                            }`}
                        />
                    ))}
                </div>

                <div className="w-full max-w-sm flex flex-col items-start px-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                                    {currentStep.icon}
                                </div>
                                <h2 className="text-[26px] font-medium tracking-tight text-white leading-none">
                                    {currentStep.title}
                                </h2>
                            </div>
                            
                            <p className="text-white/50 leading-relaxed text-[15px] max-w-[90%] font-light mb-10 tracking-wide">
                                {currentStep.desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    <div className="w-full flex items-center justify-between">
                        {currentStep.action ? (
                            <button
                                onClick={currentStep.action.onClick}
                                className="w-full h-14 bg-white text-black font-semibold rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                {currentStep.action.label}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="ml-auto flex items-center gap-3 h-14 px-8 bg-white text-black font-semibold rounded-full transition-all active:scale-95 hover:bg-white/90"
                            >
                                {t.onboarding.next}
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
