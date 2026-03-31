'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    ChevronRight, 
    Trophy, 
    Zap, 
    Users, 
    Globe, 
    Smartphone, 
    BarChart3,
    ArrowUpRight
} from 'lucide-react';

const FEATURE_CARDS = [
    {
        title: "Arena Social",
        desc: "Compete com indivíduos de alta performance em rankings globais.",
        icon: Users,
        color: "bg-emerald-500/10",
        textColor: "text-emerald-500"
    },
    {
        title: "Mural de Troféus",
        desc: "Gamificação integrada para recompensar a tua consistência diária.",
        icon: Trophy,
        color: "bg-amber-500/10",
        textColor: "text-amber-500"
    },
    {
        title: "Zenith Cloud",
        desc: "Sincronização instantânea entre dispositivos com latência zero.",
        icon: Globe,
        color: "bg-blue-500/10",
        textColor: "text-blue-500"
    },
    {
        title: "Foco Absoluto",
        desc: "Interface minimalista desenhada para eliminar distrações e ruído.",
        icon: Zap,
        color: "bg-purple-500/10",
        textColor: "text-purple-500"
    }
];

export default function LandingPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const APP_URL = "https://zenith-rsnv.vercel.app";

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
    const mockupY = useTransform(scrollYProgress, [0, 0.5], [100, 0]);
    const mockupRotate = useTransform(scrollYProgress, [0, 0.5], [10, 0]);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="min-h-screen bg-black" />;

    return (
        <div ref={containerRef} className="bg-black text-white overflow-x-hidden selection:bg-emerald-500/30 font-sans">
            {/* Navigation Header */}
            <nav className="fixed top-0 left-0 w-full z-[100] backdrop-blur-xl border-b border-white/[0.05] bg-black/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black italic">Z</div>
                        <span className="text-xl font-medium tracking-tight">Zenith</span>
                    </div>
                    <div className="hidden md:flex items-center gap-10">
                        <Link href="/blog" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Novidades</Link>
                        <a href={`${APP_URL}/login`} className="text-sm font-medium text-white/50 hover:text-white transition-colors">Login</a>
                        <a href={`${APP_URL}/register`} className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all">Começar Agora</a>
                    </div>
                    <Link href="/blog" className="md:hidden text-white/50"><Globe size={20} /></Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 px-6">
                <motion.div 
                    style={{ opacity: heroOpacity, scale: heroScale }}
                    className="max-w-4xl text-center z-10"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <Link href="/blog" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-black tracking-[0.2em] mb-8 hover:bg-emerald-500/20 transition-colors">
                            Novidade: Arena Social v2.0
                            <ArrowUpRight size={12} />
                        </Link>
                        <h1 className="text-6xl md:text-8xl font-medium tracking-tighter leading-[0.9] mb-8">
                            Forja a tua <br />
                            <span className="text-white/40">disciplina.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
                            A app de hábitos minimalista desenhada para indivíduos que valorizam a estética e exigem alta performance.
                        </p>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <a href={`${APP_URL}/register`} className="group bg-white text-black px-10 py-5 rounded-full text-lg font-bold flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-2xl shadow-white/5">
                                Solicitar Acesso Beta
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                            </a>
                            <span className="text-sm text-white/30">Hospedado em dronee.blog</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Floating Orb Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none opacity-50" />
            </section>

            {/* Visual Showcase Section */}
            <section className="relative py-32 flex justify-center px-6 overflow-visible">
                <motion.div 
                    className="relative max-w-5xl w-full"
                    style={{ y: mockupY, rotate: mockupRotate }}
                >
                    <div className="relative group overflow-hidden rounded-[3rem] border border-white/5 bg-white/[0.02]">
                        <div className="aspect-[16/9] w-full bg-gradient-to-tr from-neutral-900 to-black flex items-center justify-center">
                            <Smartphone className="text-white/10" size={120} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                                <span className="text-emerald-500 font-bold mb-4">MOCKUP REQUERIDO</span>
                                <p className="text-white/40 max-w-md">Insira aqui o ficheiro: <br /> `/public/iphone_mockup_...`</p>
                            </div>
                        </div>
                        
                        {/* Interactive floating indicator */}
                        <motion.div 
                            className="absolute -top-10 -right-10 glass p-5 rounded-2xl hidden md:block"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <BarChart3 className="text-emerald-500" size={20} />
                                </div>
                                <div>
                                    <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Ritmo diário</div>
                                    <div className="text-lg font-bold">+24% Consistente</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* Features Section (Bento Grid) */}
            <section className="py-48 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-32">
                    <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">Tudo o que precisas para <br /><span className="text-white/40">atingir o domínio.</span></h2>
                    <p className="text-white/50 text-lg">Sem distrações. Apenas resultados de alto nível.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {FEATURE_CARDS.map((card, i) => (
                        <motion.div
                            key={card.title}
                            className="p-8 rounded-[2rem] border border-white/[0.03] bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className={`w-12 h-12 rounded-2xl ${card.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <card.icon className={card.textColor} size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                            <p className="text-white/40 leading-relaxed text-sm">
                                {card.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-24 border-t border-white/5 bg-black/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black italic">Z</div>
                            <span className="text-xl font-medium tracking-tight">Zenith</span>
                        </div>
                        <div className="flex gap-12 text-sm text-white/30 uppercase font-black tracking-widest">
                            <Link href="/blog" className="hover:text-white transition-colors">Novidades</Link>
                            <a href="#" className="hover:text-white transition-colors">Termos</a>
                            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                        </div>
                        <div className="text-sm text-white/30">
                            © 2026 Zenith. Proporcionado por dronee.blog
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
