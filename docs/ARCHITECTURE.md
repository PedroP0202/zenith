# Arquitetura e Modelo de Dados: Zenith

## 1. Princípio Arquitetural: Separação Clara (MVC-like)
Para garantir que a base de código pode crescer sem refatorizações massivas em meses futuros, a arquitetura deve separar estritamente a Lógica de Negócio, a Camada de Dados e a UI.

- **Camada de Dados (Data Layer)**: Onde a informação vive (banco de dados/armazenamento local). Sabe *como* guardar, mas não *o que* a informação significa no contexto da app.
- **Camada Lógica (Domain/Service Layer)**: As regras de negócio puros. É aqui que o cálculo de "falhar um streak = 0" acontece. A UI nunca deve calcular um streak; apenas pede o cálculo a esta camada.
- **Camada UI (Presentation Layer)**: Estúpida e reativa. Apenas mostra o estado atual que a camada lógica lhe entrega, e envia as ações do utilizador (cliques) para baixo. Não conhece regras de negócio nem sabe aceder a bases de dados diretamente.

---

## 2. O Modelo Mental dos Dados (Data Model)
Para antecipar o crescimento sem implementar features fantasmas agora, o modelo tem de ser imutável nos eventos. Não vamos sobrepor o número do streak a cada dia; vamos ver *quando* os eventos aconteceram e calcular o streak com base nisso.

### Entidades Core:

**Entidade: `Habit` (O Compromisso)**
O que o utilizador criou.
- `id`: UUID
- `title`: String (ex: "Ler 10 páginas")
- `createdAt`: Timestamp (quando foi criado)
- `isActive`: Boolean (permite "soft delete" ou arquivar no futuro, em vez de destruir dados)

**Entidade: `LogEntry` (O Ponto de Prova)**
A ação imutável diária. A verdadeira fundação do sistema.
- `id`: UUID
- `habitId`: Referência ao Hábito
- `completedAt`: Timestamp (quando o utilizador clicou no botão "Feito")
*(Isto permite que no futuro possamos desenhar gráficos de "A que horas costumo fazer isto?" ou provar calendários passados. O streak atual é apenas um cálculo derivado destas entradas).*

### 3. As Decisões Chave

**Onde vivem os streaks? (O Cálculo)**
O número numérico do Streak **não é guardado na base de dados** como uma coluna tipo `currentStreak: 12`. O Streak é um **estado derivado**. A camada lógica pega no `Habit` e consulta a lista de `LogEntry` para esse hábito ordenado por data e avalia, até ao dia de hoje, a cadência ininterrupta. 
Isto significa que se o código de cálculo mudar no futuro (ex: para introduzir *streak freezes* se o decidires mudar), não terás de re-escrever os dados inteiros da base de dados; a re-interpretação do histórico passa a dar o novo valor. É resiliente.

**O que é o Estado Global?**
Apenas o estritamente necessário para que a UI reaja instantaneamente.
O que deverá viver na Store de Estado Global (ex: Zustand, Redux ou Context Provider dependendo da stack):
- A lista de `Habits` ativos.
- O mapeamento (`Map` ou cache) do Streak Atual calculado para cada Hábito no dia corrente (para evitar recalcular o streak em todas as re-renderizações das listas).
- O estado de Carregamento (`isLoading`).

**O que pode mudar no futuro? (E como estamos preparados)**
1. **Passar de Local Storage para Cloud (Sincronização)**: Como passamos as requisições pelos "Services", a UI não sabe se os dados estão num SQLite, no AsyncStorage ou num servidor Supabase/Firebase. Mudarmos o *backend* não tocará num único componente de UI.
2. **Novas frequências ("3x por semana")**: Como guardamos registos de `LogEntry` imutáveis que dizem "Eu fiz isto às X horas", o sistema no futuro poderá aplicar funções de avaliação de *streak* diferentes. A UI pedirá apenas "Qual é o streak deste hábito com as novas regras?", e a camada Lógica tratará dessa nova matemática nos logs antigos.
3. **Mudar de Fusos Horários ("Midnight problem")**: Ao guardar o `completedAt` como UTC Timestamp na `LogEntry`, amanhã podemos facilmente ter funções lógicas mais complexas para "cálculo de fim do dia" baseado na localização do utilizador.

---

## Critério de Adição Sem Medo
Este modelo permite que, se amanhã quiseres adicionar "Estatísticas Mensais" ao ecrã de detalhes, não precises de alterar a estrutura da base de dados principal. Basta criar um novo componente de UI que pergunta à Camada Lógica: "Pega neste HabitID, vai buscar as LogEntries de Janeiro e desenha este gráfico". Tudo o resto continuará intocado.
