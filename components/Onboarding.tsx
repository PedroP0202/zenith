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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center overflow-hidden"
        >
            {/* Dark Mask with Spotlight */}
            <motion.div 
                className="absolute inset-0 bg-black/80 backdrop-blur-[2px] pointer-events-none"
                animate={{
                    WebkitMaskImage: currentStep.spotlight 
                        ? `radial-gradient(circle ${currentStep.spotlight.r} at ${currentStep.spotlight.x} ${currentStep.spotlight.y}, transparent 100%, black 100%)`
                        : 'radial-gradient(circle 0px at 50% 50%, transparent 100%, black 100%)',
                    maskImage: currentStep.spotlight 
                        ? `radial-gradient(circle ${currentStep.spotlight.r} at ${currentStep.spotlight.x} ${currentStep.spotlight.y}, transparent 100%, black 100%)`
                        : 'radial-gradient(circle 0px at 50% 50%, transparent 100%, black 100%)'
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />

            {/* Background Glow */}
            <div className={`absolute inset-0 bg-gradient-to-b ${currentStep.color} opacity-20 transition-colors duration-700 pointer-events-none`} />
            
            <button 
                onClick={handleComplete}
                className="absolute top-12 right-8 p-3 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors z-[110]"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="relative w-full max-w-sm space-y-12 z-[110]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        className="flex flex-col items-center"
                    >
                        <div className="mb-8 p-6 bg-white/5 rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-md">
                            {currentStep.icon}
                        </div>
                        
                        <h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">
                            {currentStep.title}
                        </h2>
                        
                        <p className="text-white/60 leading-relaxed max-w-[280px] text-sm">
                            {currentStep.desc}
                        </p>
                    </motion.div>
                </AnimatePresence>

                <div className="space-y-6">
                    {currentStep.action ? (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={currentStep.action.onClick}
                                className="w-full h-16 bg-white text-black font-bold rounded-[24px] flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-xl"
                            >
                                {currentStep.action.label}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleComplete}
                                className="w-full h-14 bg-white/5 text-white/60 font-medium rounded-[20px] transition-all hover:bg-white/10"
                            >
                                {t.onboarding.finish}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="w-full h-16 bg-white/10 border border-white/10 text-white font-bold rounded-[24px] flex items-center justify-center gap-2 transition-all hover:bg-white/15 active:scale-95 backdrop-blur-md"
                        >
                            {t.onboarding.next}
                            <ChevronRight className="w-5 h-5 opacity-40" />
                        </button>
                    )}

                    {/* Stepper Dots */}
                    <div className="flex justify-center gap-2">
                        {steps.map((_, i) => (
                            <div 
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    step === (i + 1) ? 'w-8 bg-white' : 'w-1.5 bg-white/20'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <button 
                onClick={handleComplete}
                className="mt-12 text-[10px] uppercase tracking-[0.2em] font-black text-white/20 hover:text-white/40 transition-colors z-[110]"
            >
                {t.onboarding.skip}
            </button>
        </motion.div>
    );
}
