"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useTranslation } from '../hooks/useTranslation';
import { ChevronRight, Zap, Target, LineChart, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
    const { t } = useTranslation();
    const { setHasCompletedOnboarding } = useStore();
    const [step, setStep] = useState(1);
    const router = useRouter();

    const handleNext = () => {
        if (step < 3) {
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
            color: "from-[var(--zenith-active)]/20 to-transparent"
        },
        {
            icon: <Target className="w-12 h-12 text-blue-400" />,
            title: t.onboarding.step2.title,
            desc: t.onboarding.step2.desc,
            color: "from-blue-500/20 to-transparent",
            action: {
                label: t.habit.create,
                onClick: handleCreateHabit
            }
        },
        {
            icon: <LineChart className="w-12 h-12 text-purple-400" />,
            title: t.onboarding.step3.title,
            desc: t.onboarding.step3.desc,
            color: "from-purple-500/20 to-transparent"
        }
    ];

    const currentStep = steps[step - 1];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center"
        >
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-gradient-to-b ${currentStep.color} opacity-30 transition-colors duration-700`} />
            
            <button 
                onClick={handleComplete}
                className="absolute top-12 right-8 p-3 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="relative w-full max-w-sm space-y-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        className="flex flex-col items-center"
                    >
                        <div className="mb-8 p-6 bg-white/5 rounded-[32px] border border-white/10 shadow-2xl">
                            {currentStep.icon}
                        </div>
                        
                        <h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">
                            {currentStep.title}
                        </h2>
                        
                        <p className="text-white/50 leading-relaxed max-w-[280px]">
                            {currentStep.desc}
                        </p>
                    </motion.div>
                </AnimatePresence>

                <div className="space-y-6">
                    {currentStep.action ? (
                        <button
                            onClick={currentStep.action.onClick}
                            className="w-full h-16 bg-white text-black font-bold rounded-[24px] flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-xl"
                        >
                            {currentStep.action.label}
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="w-full h-16 bg-white/10 border border-white/10 text-white font-bold rounded-[24px] flex items-center justify-center gap-2 transition-all hover:bg-white/15 active:scale-95"
                        >
                            {step === 3 ? t.onboarding.finish : t.onboarding.next}
                            {step < 3 && <ChevronRight className="w-5 h-5 opacity-40" />}
                        </button>
                    )}

                    {/* Stepper Dots */}
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3].map((i) => (
                            <div 
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    step === i ? 'w-8 bg-white' : 'w-1.5 bg-white/20'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <button 
                onClick={handleComplete}
                className="mt-12 text-[10px] uppercase tracking-[0.2em] font-black text-white/20 hover:text-white/40 transition-colors"
            >
                {t.onboarding.skip}
            </button>
        </motion.div>
    );
}
