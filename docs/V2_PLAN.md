# Zenith V2.0 - Vision & Implementation Plan

A documentação das fundações e otimizações arquiteturais da versão 1.0 foi concluída com sucesso. Todo o código está estritamente tipado, modularizado, comentado através do standard JSDoc/TSDoc e otimizado para tolerância a falhas (por exemplo, com lógicas estritas de recuperação 'Trash' e cálculo temporal exato com 'date-fns').

Ao pensar numa **Versão 2.0**, mantendo o pilar inquebrável do *Minimalismo Radical* e fluidez de navegação com 0 atrasos, os próximos passos do produto devem alavancar o ecossistema iOS e focar-se em automação comportamental:

## Propostas Tecnológicas e Funcionais (V2.0)

### 1. Sincronização iCloud / CloudKit Auth (Sem Ecrãs de Login)
Para manter o princípio "Zero Fricção" e "Zero UI Inútil", a versão 2.0 abandonará o `localStorage` nativo isolado do telemóvel e avançará com uma ponte Capacitor nativa através do `CloudKit` da Apple. 
- **O que faz:** Permite que os dados migrem magicamente se o utilizador trocar de iPhone, *sem nunca* lhe pedir para inserir um email ou password. O estado Zustand é hidratado instantaneamente e em background.

### 2. Notificações Inteligentes Local-First
Em vez de depender de servidores externos, agendar as notificações ("Daily Briefing" ou Alertas de Hábito) localmente através do Capacitor Local Notifications Plugin.
- **Micro-Interações:** Podes "marcar como feito" diretamente na Notificação Push no ecrã bloqueado do iPhone sem sequer ter de abrir a app. Isto reforça radicalmente o lado funcional - quanto menos tempo passas na app, mais eficiente ela provou ser.

### 3. Home Screen iOS Widgets (Interactive)
Utilizar a interoperabilidade web-native para desenvolver Widgets de Ecrã Inicial no iOS 17+. O utilizador pode ter o seu principal hábito bloqueador de consistência num Widget interativo 1x1, clicando para fazer "Check" diretamente na home screen do iPhone.

### 4. Micro-Gamificação Atmosférica
Evoluir a UI através de cor em vez de ruído gráfico extra:
- Quando o utilizador ultrapassa um *"Milestone"* na Streak (ex: 30, 90 ou 365 dias), a aura `box-shadow` ou o acento cromático daquele hábito específico muda. Passa do branco/laranja base para, por exemplo, um ciano suave translúcido. Mantém-se minimalista, mas o estatuto "Legendário" é claramente distinto e galardoado.
- *Haptic Engine Feedback:* Expandir a biblioteca `@capacitor/haptics` para criar vibrações diferentes mediante a dificuldade do hábito (vibração leve vs. profunda).

### 5. Edição Avançada Contextual
De vez em quando o utilizador esquece-se do check-in no dia anterior, mas não quer perder a streak. 
- **Grace Period (Perdão Tático):** Implementação opcional no código que permite criar 1 "Curinga" por mês. Se falharem 1 vez, não quebra imediatamente caso usem o curinga.
- **Histórico Retroativo:** Permitir clicar no `<HabitCalendar />` da secção de estatísticas e adicionar LogEntries de dias passados. Isto exige apenas uma atualização simples no action method do `useStore.ts` com seleção de data.

## Processo de Transição Técnica
Para manter o fluxo intocável, qualquer feature destas deve seguir a arquitetura atual:
1. Começar sempre pelo modelo de dados (`types/index.ts`).
2. Criar a interface e a lógica crua (`store/useStore.ts`).
3. Construir os Componentes Visuais (sem estados isolados, todos ligados à store global Zustand).
4. Sincronização final Xcode `npx cap sync ios`.
