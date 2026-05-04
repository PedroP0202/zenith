import Link from 'next/link';

export default function TermsPage() {
    return (
        <main className="min-h-[100dvh] bg-black px-6 py-16 text-white">
            <article className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-bold text-white/45 transition-colors hover:text-white">Voltar</Link>
                <p className="app-kicker mt-12">Zenith</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">Termos de utilização</h1>
                <p className="mt-6 text-white/55">O Zenith ajuda-te a acompanhar hábitos, streaks e progresso social. Ao usar a app, concordas em manter os teus dados de conta corretos, usar a plataforma com respeito e não tentar manipular rankings, sincronização ou funcionalidades sociais.</p>
                <section className="mt-10 space-y-5 text-sm leading-7 text-white/50">
                    <p>Podemos alterar ou remover funcionalidades durante a fase beta para melhorar estabilidade, segurança e qualidade da experiência.</p>
                    <p>Conteúdo abusivo, spam, assédio ou tentativas de exploração técnica podem levar à limitação ou remoção de acesso.</p>
                    <p>Para questões legais ou suporte, contacta-nos em <a href="mailto:hello@dronee.blog" className="text-white underline decoration-white/30 underline-offset-4">hello@dronee.blog</a>.</p>
                </section>
            </article>
        </main>
    );
}
