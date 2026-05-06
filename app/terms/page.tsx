import Link from 'next/link';

const sections = [
    {
        title: 'Conta e autenticação',
        body: 'És responsável por manter acesso seguro à tua conta. Ao usar email, Apple ou Google, autorizas o Zenith a usar esses dados para autenticação, recuperação de acesso e sincronização.',
    },
    {
        title: 'Hábitos, cloud sync e dados',
        body: 'A app ajuda-te a registar hábitos, logs, streaks, XP, estatísticas e preferências. A cloud sync pode criar, atualizar ou restaurar dados entre dispositivos; conflitos e falhas de rede podem afetar o estado mais recente.',
    },
    {
        title: 'Social, grupos e Arena',
        body: 'Ao usar amigos, grupos, rankings ou Arena, concordas em interagir com respeito e em não publicar spam, assédio, conteúdo abusivo ou dados de terceiros sem autorização.',
    },
    {
        title: 'Ranking e integridade',
        body: 'Não podes tentar manipular XP, streaks, rankings, reports, convites, sincronização, pedidos API ou qualquer sistema competitivo. Podemos corrigir pontuações, remover entradas e limitar acesso quando houver abuso.',
    },
    {
        title: 'Reports, bloqueios e moderação',
        body: 'Reports e bloqueios existem para proteger a comunidade. Reports falsos, assédio via grupos ou tentativas de contornar bloqueios podem levar a restrições de funcionalidades sociais ou remoção da conta.',
    },
    {
        title: 'Beta, alterações e disponibilidade',
        body: 'O Zenith pode alterar, suspender ou remover funcionalidades durante a fase beta para melhorar segurança, estabilidade, qualidade e conformidade. O serviço pode ter interrupções ou perda temporária de acesso.',
    },
    {
        title: 'Limitação de uso',
        body: 'Não deves usar a app para fins ilegais, engenharia reversa abusiva, scraping, ataques, exploração técnica, revenda não autorizada ou violação de direitos de outras pessoas.',
    },
];

export default function TermsPage() {
    return (
        <main className="min-h-[100dvh] bg-black px-6 py-16 text-white">
            <article className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-bold text-white/45 transition-colors hover:text-white">Voltar</Link>
                <p className="app-kicker mt-12">Zenith</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">Termos de utilização</h1>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/35">Atualizado em 6 de maio de 2026</p>
                <p className="mt-6 text-white/55">
                    O Zenith ajuda-te a acompanhar hábitos, streaks, progresso social e competição saudável. Ao usar a app, aceitas estes termos e a política de privacidade.
                </p>
                <section className="mt-10 space-y-6 text-sm leading-7 text-white/50">
                    {sections.map((section) => (
                        <div key={section.title} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                            <h2 className="text-base font-bold text-white/84">{section.title}</h2>
                            <p className="mt-3">{section.body}</p>
                        </div>
                    ))}
                    <p>
                        Para questões legais ou suporte, contacta-nos em{' '}
                        <a href="mailto:hello@dronee.blog" className="text-white underline decoration-white/30 underline-offset-4">hello@dronee.blog</a>.
                    </p>
                </section>
            </article>
        </main>
    );
}
