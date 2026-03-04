# Fluxo do Utilizador (User Flow): Zenith

## 1. Princípio de Design: Intuição Antes da Estética
O objetivo central é que qualquer utilizador saiba o que fazer em **menos de 5 segundos**. Sem tutoriais, sem *tooltips*, sem *onboarding* complexo. 

A linguagem da aplicação será **curta, crua e direta**. Sem floreados motivacionais.

---

## 2. Perguntas-Chave & UX Core

### O que o user vê ao abrir a app?
**Apenas o que importa hoje.**
Ao abrir a Zenith, o ecrã inicial ("O Hoje") mostra imediatamente as suas responsabilidades em forma de lista.
- Se a lista estiver vazia: Um botão grande e claro no centro "Criar um Hábito".
- Se houver hábitos: Lista em formato de *cards*. Cada *card* tem o nome do hábito, o número do *streak* atual bem visível, e um botão claro de ação.

### Qual é a ação principal do dia?
**Fazer o check-in.**
A única ação que o utilizador precisa de fazer por dia é tocar na área de *check-in* do hábito. É a fricção mais baixa possível. 1 Hábito = 1 Toque.

### O que acontece quando ele cumpre?
**O contador sobe, a resistência visual desaparece.**
1. O número do *streak* passa de `X` para `X+1`.
2. O botão de ação altera-se visualmente (ex: de botão clicável para estado de preenchido/sucesso), indicando que o trabalho diário daquele hábito está feito.
3. Não há confetis, não há *modals* ("Parabéns!"). Apenas o número cresce e a tarefa desaparece visualmente das "pendentes".
*(Se o utilizador voltar à app no mesmo dia, o hábito aparece marcado como já concluído).*

---

## 3. O Fluxo Principal (Mínimo de Cliques)

### Cenário A: Nova Instalação (Primeiro Hábito)
1. **Abrir a app.** (Ecrã Inicial vazio com CTAs claros)
2. **Tocar em "Criar Hábito".** (Vai para o ecrã 2)
3. **Escrever o nome do hábito** (Ex: "Ler 10 páginas") e tocar em "Confirmar".
   *-> Volta ao Ecrã Inicial. O novo hábito está lá, com o contador a `0` e pronto a ser feito hoje.*
*(Cliques até ao valor: 3)*

### Cenário B: Uso Diário (Ação Sucesso)
1. **Abrir a app.** (Ecrã Inicial mostra os hábitos, ex: "Ler 10 páginas")
2. **Tocar no botão "Feito"** (ou na checkbox do card).
   *-> O contador sobe para `1`, o botão fica marcado. O utilizador fecha a app.*
*(Cliques até ao valor: 1)*

### Cenário C: A Falha (Consequência Silenciosa)
1. O utilizador **não abre a aplicação** ou não clica em "Feito" até o ciclo diário terminar (ex: meia-noite).
2. No dia seguinte, **ao abrir a app**:
   *-> O *card* do hábito ("Ler 10 páginas") mostra o contador novamente a `0`. O estado volta a estar não-concluído.*
*(Cliques: 0. O sistema lida com a falha automaticamente).*

---

## 4. Linguagem e Tom (Copywriting)

A linguagem reforça o peso do compromisso sem embelezar. É quase como um contrato assinado consigo mesmo.

- **Botão Criar:** "Novo Hábito" ou "+"
- **Input Nome:** "O que te comprometes a fazer todos os dias?"
- **Botão Ação Hábito (Pendente):** Círculo vazio ou botão invisível aguardando check
- **Botão Ação Hábito (Feito):** Círculo preenchido ou "Feito Hoje"
- **Contador:** "8 dias seguidos" -> "8" (Apenas o número gigante. O contexto já é claro).
- **Sem Dados:** "Não tens hábitos."

## 5. Eliminação de Ruído
Para garantir a percepção em 5 segundos:
- Sem ícones complexos associados aos hábitos (é apenas texto).
- Sem cores de categorias.
- Sem *hamburguer menu* de navegação complexo.
- Sem *settings* complexas além das vitais.
