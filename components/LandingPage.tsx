'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    ChevronRight, 
    Trophy, 
    Zap, 
    Users, 
    Shield, 
    Smartphone, 
    Globe, 
    CheckCircle2,
    Plus,
    BarChart3
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
        <div ref={containerRef} className="bg-black text-white overflow-x-hidden selection:bg-emerald-500/30">
            {/* Navigation Header */}
            <nav className="fixed top-0 left-0 w-full z-[100] backdrop-blur-xl border-b border-white/[0.05] bg-black/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black italic">Z</div>
                        <span className="text-xl font-medium tracking-tight">Zenith</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Entrar</Link>
                        <Link href="/register" className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all">Começar Agora</Link>
                    </div>
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
                        <span className="inline-block px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-black tracking-[0.2em] mb-8">
                            A Nova Era da Disciplina
                        </span>
                        <h1 className="text-6xl md:text-8xl font-medium tracking-tighter leading-[0.9] mb-8">
                            Forja a tua <br />
                            <span className="text-white/40">disciplina.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
                            A app de hábitos minimalista desenhada para indivíduos que valorizam a estética e exigem alta performance.
                        </p>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <Link href="/register" className="group bg-white text-black px-10 py-5 rounded-full text-lg font-bold flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-2xl shadow-white/5">
                                Aceder à Beta Social
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <span className="text-sm text-white/30">Livre para os primeiros 50 utilizadores</span>
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
                    {/* Placeholder for the Generated Image */}
                    <div className="relative group">
                        <Image
                            src="/iphone_mockup_zenith_dashboard_1774820690954.png"
                            alt="Zenith Dashboard Mockup"
                            width={1600}
                            height={1085}
                            priority
                            className="w-full h-auto rounded-[3rem] shadow-2xl shadow-white/5 border border-white/5"
                        />
                        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                        
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

            {/* Beta Access CTA Section */}
            <section className="py-48 px-6">
                <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-tr from-emerald-500/20 to-orange-500/5 p-12 md:p-24 border border-white/5 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-7xl font-medium tracking-tight mb-8">Junta-te à elite.</h2>
                        <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Reserva o teu lugar na fase pioneira e ajuda a moldar o futuro da disciplina profissional.
                        </p>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                            <Link href="/register" className="w-full md:w-auto bg-white text-black px-12 py-5 rounded-full text-xl font-bold hover:scale-105 transition-transform active:scale-95 shadow-glow-white">
                                Solicitar Acesso Beta
                            </Link>
                            <Link href="/register?channel=testflight" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
                                <Smartphone size={18} />
                                Pedir convite TestFlight
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
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
                            <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
                            <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
                            <a href="mailto:hello@dronee.blog" className="hover:text-white transition-colors">Contacto</a>
                        </div>
                        <div className="text-sm text-white/30">
                            © 2026 Zenith. Mastery through Consistency.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
