import Link from 'next/link';

const sections = [
    {
        title: 'Dados que usamos',
        body: 'Guardamos os dados necessários para criar conta, autenticar sessão, sincronizar hábitos, calcular streaks, XP, estatísticas, progresso, rankings e funcionalidades sociais como amigos, grupos e Arena.',
    },
    {
        title: 'Autenticação Apple/Google',
        body: 'Quando entras com Apple ou Google, recebemos os identificadores e dados autorizados pelo fornecedor, como email ou nome quando disponível. Não recebemos a tua password Apple/Google.',
    },
    {
        title: 'Social, grupos e ranking',
        body: 'Username, nome público, pontos, nível, posição na Arena, amigos, grupos e algumas métricas de progresso podem ficar visíveis para outros utilizadores quando participas nessas funcionalidades. Podes controlar a participação competitiva nas definições da conta.',
    },
    {
        title: 'Reports e segurança',
        body: 'Reports, bloqueios, sinais de abuso, logs técnicos e metadados de segurança podem ser usados para investigar spam, assédio, manipulação de ranking, falhas de sincronização e incidentes de segurança.',
    },
    {
        title: 'Cloud sync',
        body: 'A sincronização cloud permite manter hábitos, logs, preferências, progresso e estado social entre dispositivos. Tokens de sessão são usados para autorizar pedidos; passwords são armazenadas com hash.',
    },
    {
        title: 'Partilha e retenção',
        body: 'Não vendemos dados pessoais. Podemos usar serviços de infraestrutura, autenticação, analytics ou crash reporting para operar a app. Mantemos dados enquanto a conta existir ou enquanto forem necessários para segurança, obrigações legais e integridade do serviço.',
    },
    {
        title: 'Os teus direitos',
        body: 'Podes pedir exportação, correção ou remoção dos teus dados. Algumas remoções podem preservar registos mínimos quando forem necessários para segurança, fraude, disputas ou obrigações legais.',
    },
];

export default function PrivacyPage() {
    return (
        <main className="min-h-[100dvh] bg-black px-6 py-16 text-white">
            <article className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-bold text-white/45 transition-colors hover:text-white">Voltar</Link>
                <p className="app-kicker mt-12">Zenith</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">Privacidade</h1>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/35">Atualizado em 6 de maio de 2026</p>
                <p className="mt-6 text-white/55">
                    Esta política explica como o Zenith trata dados para hábitos, cloud sync, social, grupos, Arena, reports e autenticação por email, Apple ou Google.
                </p>
                <section className="mt-10 space-y-6 text-sm leading-7 text-white/50">
                    {sections.map((section) => (
                        <div key={section.title} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                            <h2 className="text-base font-bold text-white/84">{section.title}</h2>
                            <p className="mt-3">{section.body}</p>
                        </div>
                    ))}
                    <p>
                        Para pedidos de remoção, exportação ou privacidade, contacta-nos em{' '}
                        <a href="mailto:hello@dronee.blog" className="text-white underline decoration-white/30 underline-offset-4">hello@dronee.blog</a>.
                    </p>
                </section>
            </article>
        </main>
    );
}
