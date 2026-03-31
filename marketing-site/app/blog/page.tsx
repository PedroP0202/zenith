'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
    ChevronLeft, 
    ArrowRight,
    Calendar,
    Clock,
    Tag
} from 'lucide-react';

const POSTS = [
    {
        id: 1,
        title: "A Psicologia por trás da Disciplina Inabalável",
        excerpt: "Como pequenos hábitos diários moldam os caminhos neurais para o sucesso a longo prazo.",
        date: "28 Mar, 2026",
        readTime: "5 min",
        tag: "Mindset",
        image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: 2,
        title: "Zenith v2.0: Lançamento da Arena Social",
        excerpt: "Apresentamos a maior atualização de sempre, com rankings globais e desafios entre amigos.",
        date: "25 Mar, 2026",
        readTime: "3 min",
        tag: "Novidades",
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: 3,
        title: "Otimiza a tua Rotina Matinal como um Pro",
        excerpt: "Descobre como os atletas de elite utilizam o Zenith para dominar as primeiras horas do dia.",
        date: "20 Mar, 2026",
        readTime: "8 min",
        tag: "Performance",
        image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=800"
    }
];

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 font-sans">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 w-full z-[100] backdrop-blur-xl border-b border-white/[0.05] bg-black/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ChevronLeft size={20} className="text-white/50 group-hover:text-white transition-colors" />
                        <span className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">Voltar</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center font-black italic text-[10px]">Z</div>
                        <span className="text-sm font-bold tracking-tight">Novidades</span>
                    </div>
                    <div className="w-20" /> {/* Spacer */}
                </div>
            </nav>

            <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-24 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-medium tracking-tight mb-6">
                            Novidades & <br />
                            <span className="text-white/40">Conhecimento.</span>
                        </h1>
                        <p className="text-xl text-white/50 max-w-2xl leading-relaxed">
                            O hub oficial do Zenith para atualizações da app, guias de performance e ciência comportamental.
                        </p>
                    </motion.div>
                </header>

                {/* Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {POSTS.map((post, i) => (
                        <motion.article
                            key={post.id}
                            className="group cursor-pointer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                        >
                            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl mb-6 bg-neutral-900 border border-white/5">
                                <img 
                                    src={post.image} 
                                    alt={post.title}
                                    className="object-cover w-full h-full grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out opacity-60 group-hover:opacity-100"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] uppercase font-bold tracking-widest text-emerald-500">
                                        {post.tag}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 text-xs text-white/40 font-medium">
                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {post.date}</span>
                                    <span className="flex items-center gap-1.5"><Clock size={14} /> {post.readTime}</span>
                                </div>
                                <h2 className="text-2xl font-bold leading-tight group-hover:text-emerald-500 transition-colors">
                                    {post.title}
                                </h2>
                                <p className="text-white/50 leading-relaxed text-sm line-clamp-2">
                                    {post.excerpt}
                                </p>
                                <div className="pt-2 flex items-center gap-2 text-emerald-500 font-bold text-sm">
                                    Ler Artigo <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>

                {/* Newsletter CTA */}
                <motion.section 
                    className="mt-48 p-12 md:p-24 rounded-[3rem] bg-emerald-500 text-black text-center relative overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Fica a par do progresso.</h2>
                        <p className="text-black/70 mb-10 max-w-xl mx-auto font-medium">
                            Recebe as últimas atualizações da Arena Social e dicas de performance diretamente no teu email.
                        </p>
                        <div className="flex flex-col md:flex-row gap-3 max-w-md mx-auto">
                            <input 
                                type="email" 
                                placeholder="teu@email.com" 
                                className="flex-1 px-6 py-4 rounded-full bg-black/5 border-black/10 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 font-bold"
                            />
                            <button className="px-8 py-4 rounded-full bg-black text-white font-bold hover:scale-105 active:scale-95 transition-transform">
                                Subscrever
                            </button>
                        </div>
                    </div>
                </motion.section>
            </main>

            {/* Footer */}
            <footer className="py-24 border-t border-white/5 bg-black/50 text-center text-white/30 text-xs uppercase tracking-[0.2em] font-black">
                Zenith • Mastery through Consistency • dronee.blog
            </footer>
        </div>
    );
}
