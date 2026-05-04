import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <main className="min-h-[100dvh] bg-black px-6 py-16 text-white">
            <article className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-bold text-white/45 transition-colors hover:text-white">Voltar</Link>
                <p className="app-kicker mt-12">Zenith</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">Privacidade</h1>
                <p className="mt-6 text-white/55">Guardamos apenas os dados necessários para autenticação, sincronização de hábitos, progresso e funcionalidades sociais como amigos, grupos e Arena.</p>
                <section className="mt-10 space-y-5 text-sm leading-7 text-white/50">
                    <p>Passwords são armazenadas com hash. Tokens de sessão são usados para manter a tua conta sincronizada entre dispositivos.</p>
                    <p>Não vendemos dados pessoais. Dados técnicos e feedback beta podem ser usados para corrigir erros e melhorar o produto.</p>
                    <p>Para pedidos de remoção ou privacidade, contacta-nos em <a href="mailto:hello@dronee.blog" className="text-white underline decoration-white/30 underline-offset-4">hello@dronee.blog</a>.</p>
                </section>
            </article>
        </main>
    );
}
