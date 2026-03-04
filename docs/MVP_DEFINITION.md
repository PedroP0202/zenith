# Definição do MVP (Minimum Viable Product): Zenith

## 1. Escopo Restrito
O objetivo desta fase é criar a versão mais elementar e funcional possível da aplicação, garantindo que a proposta de valor principal (accountability e consistência cega) é testada sem distrações.

- **Apenas 1 tipo de streak**: Diário, com sucesso binário (Feito/Não Feito). Sem variações.
- **Ecossistema fechado (Zero "nice to haves")**: Se não for essencial para o ato de marcar um streak, não entra nesta versão.

## 2. Interface: Apenas 3 Ecrãs
Para garantir que a jornada é direta e que o utilizador consegue usar a aplicação sem qualquer tipo de tutorial ou explicação:

1. **Ecrã Principal (Dashboard dos Streaks)**
   - Lista de todos os streaks ativos.
   - Visibilidade imediata do contador de cada streak.
   - Ação central de cada item: botão para "Marcar como feito hoje".

2. **Ecrã de Criação de Streak**
   - Um input de texto claro ("O que te comprometes a fazer todos os dias?").
   - Um botão de "Criar".
   - (Apenas isto, sem opções de frequência ou etiquetas).

3. **Ecrã de Detalhe do Streak**
   - Nome do streak.
   - Contador atual em grande destaque.
   - Uma visão muito simples do calendário do mês atual para provas visuais (opcional na implementação super restrita, mas o mínimo viável de ter o contador visível de forma clara).
   - Opção para "Apagar" o streak se o utilizador desistir ou quiser limpar a lista.

## 3. O que o MVP INCLUI (Funcionalidades Core)
- Criar um novo streak.
- Ver a lista de streaks criados.
- Marcar o streak como "feito" hoje (sucesso binário).
- Ver o contador numérico de dias consecutivos.

## 4. O que o MVP **NÃO INCLUI** (Anti-features da Fase 1)
- ❌ **Login / Autenticação**: Todos os dados ficam guardados localmente no dispositivo numa primeira fase. Foco na barreira de entrada zero.
- ❌ **Estatísticas e Gráficos**: Sem médias semanais, rácios de conclusão ou gráficos de barras complexos.
- ❌ **Notificações e Lembretes**: O utilizador tem que abrir a app por vontade própria, reforçando o fator de compromisso pessoal.
- ❌ **Gamification e Recompensas**: Sem badges, conquistas, níveis ou animações exuberantes.
- ❌ **Social e Partilha**: Sem integração de contas de amigos, rankings ou opções de partilha direta para Instagram/Twitter.

---

## Critério de Sucesso do MVP
A prova de conceito é atingida quando **"Um utilizador consegue descarregar a app, abri-la e usá-la de forma consistente sem qualquer necessidade de explicação ou tutorial em menos de 1 minuto."**
