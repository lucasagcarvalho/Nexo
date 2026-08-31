# Plano de Evolução UX — NEXO Financeiro

## Objetivo

Transformar a experiência atual do NEXO em um painel financeiro mais simples, claro e fácil de interpretar.

O sistema já possui uma base financeira robusta, com regras centralizadas, projeções, alertas, cartões, dívidas, orçamento por categoria, saúde financeira e auditoria de cálculos.

A partir deste ponto, o foco **não é adicionar mais informação**.

O foco é:

- reduzir poluição visual;
- priorizar o que realmente importa;
- facilitar a leitura em poucos segundos;
- diminuir repetição de números;
- explicar indicadores de forma mais natural;
- mover detalhes para locais apropriados;
- melhorar hierarquia visual;
- criar navegação progressiva entre resumo e detalhe;
- manter a tela inicial leve;
- preservar integralmente o motor financeiro já validado.

A regra principal deste plano é:

> A Home deve ajudar o usuário a decidir.  
> Os detalhes devem existir, mas não precisam disputar atenção na tela inicial.

---

# INSTRUÇÕES DE EXECUÇÃO PARA O CODEX

## Regra principal

Execute **uma etapa por vez**.

Não implemente duas etapas simultaneamente.

Não antecipe etapas futuras.

Ao iniciar uma etapa:

1. Leia completamente a etapa atual.
2. Analise o código existente relacionado.
3. Identifique os componentes e arquivos afetados.
4. Reutilize o motor financeiro já existente.
5. Não recrie regras financeiras dentro da UI.
6. Implemente somente o necessário para a etapa atual.
7. Rode:
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
8. Faça validação visual/manual dos critérios de aceite.
9. Atualize a seção `Notas de implementação`.
10. Atualize o `Histórico de execução`.
11. Marque a etapa como concluída somente se todos os critérios forem atendidos.
12. Pare a execução.
13. Informe ao usuário:

> Etapa XX concluída. Alterações implementadas e validadas. Aguardando autorização para iniciar a próxima etapa.

**Nunca comece automaticamente a próxima etapa.**

---

# REGRA DE SEGURANÇA DO PLANO

Este plano é de UX, organização e apresentação.

Portanto:

- não alterar fórmulas financeiras sem necessidade explícita;
- não mudar regras de projeção;
- não mudar regras de cartão;
- não mudar regras de dívidas;
- não mudar regras de previsto/realizado/pago;
- não alterar comportamento de snapshots;
- não recriar cálculos nas páginas;
- sempre reutilizar o motor em `src/lib/finance`.

Se alguma etapa revelar erro financeiro real:

1. não corrigir silenciosamente;
2. marcar a etapa como `[!]`;
3. registrar o problema;
4. explicar o impacto;
5. aguardar decisão antes de prosseguir.

---

# CONVENÇÕES

Status:

- `[ ]` Pendente
- `[~]` Em andamento
- `[x]` Concluído
- `[!]` Bloqueado / precisa de decisão

Prioridades:

- **P0 — Clareza crítica:** a interface atual pode induzir interpretação errada.
- **P1 — Alto:** reduz muito a complexidade e melhora tomada de decisão.
- **P2 — Médio:** melhora leitura, navegação e experiência.
- **P3 — Refinamento:** acabamento visual e conveniência.

---

# PRINCÍPIOS DE UX DO NEXO

## 1. A Home não é relatório completo

A Home deve responder rapidamente:

1. Quanto entrou?
2. Quanto saiu?
3. Quanto ainda falta pagar?
4. Quanto sobra?
5. Existe algum problema urgente?
6. Onde estou gastando mais?
7. Os próximos meses estão seguros?

Tudo que não ajuda diretamente nessas respostas deve:

- ser resumido;
- ficar recolhido;
- ou ser movido para uma página específica.

## 2. Informação principal deve ser entendida em até 3 segundos

Indicadores principais devem:

- ter nome curto;
- ter valor principal grande;
- ter no máximo uma linha de contexto;
- evitar fórmulas no card principal;
- evitar textos longos.

## 3. Detalhes devem ser progressivos

Preferir:

```text
Resumo
↓
Detalhe
↓
Lançamentos
```

Evitar mostrar todos os níveis ao mesmo tempo.

## 4. Uma informação = um lugar principal

Evitar repetir:

- saldo;
- fatura;
- comprometimento;
- cartões;
- projeção;
- saúde financeira;

em diversos blocos da mesma página.

## 5. Rótulos devem ser naturais

Preferir:

```text
Entradas
Saídas
A pagar
Saldo do mês
Saldo em contas
Cartões no mês
Próximos meses
Reserva
```

Evitar termos excessivamente técnicos quando não forem necessários.

## 6. Cor indica prioridade, não decoração

- Verde: situação saudável/positiva.
- Amarelo: atenção.
- Vermelho: crítico.
- Azul/neutro: informação.

Não usar muitas cores simultaneamente sem função clara.

## 7. A Home deve funcionar sem gráficos

Os gráficos complementam a leitura.

Eles não devem ser necessários para entender a situação financeira principal.

---

# FASE 1 — REDEFINIR A HOME

## ETAPA 01 — Reduzir os cards principais do Dashboard

**Status:** [x]  
**Prioridade:** P0

### Problema

O topo atual apresenta muitos cards com o mesmo peso visual:

- Receita prevista;
- Despesas previstas;
- Despesas realizadas;
- Ainda a pagar;
- Saldo previsto;
- Saldo projetado em contas.

Isso exige interpretação demais logo no primeiro contato.

### Objetivo

Reduzir o topo para **quatro indicadores principais**:

```text
Entradas
Saídas
A pagar
Saldo
```

### Regra proposta

#### Entradas

Valor principal:

```text
Receita prevista do mês
```

Contexto secundário opcional:

```text
Recebido / previsto
```

Somente se existir informação útil para isso.

#### Saídas

Valor principal:

```text
Despesas realizadas
```

Contexto:

```text
Previsto: R$ X
```

Se realizado ainda não existir de forma confiável para algum item, usar o comportamento do motor financeiro já definido.

#### A pagar

Valor principal:

```text
unpaidExpenses
```

Contexto:

```text
X% das saídas ainda pendentes
```

#### Saldo

Valor principal:

```text
Saldo do mês
```

Contexto secundário:

```text
Saldo em contas: R$ X
```

Não criar dois cards separados para valores que podem ser apresentados juntos.

### Critérios de aceite

- [x] Apenas 4 cards principais no topo.
- [x] Nenhum cálculo novo criado na UI.
- [x] Saldo previsto e saldo em contas não competem como cards separados.
- [x] Valores continuam iguais aos do motor financeiro.
- [x] Layout funciona em desktop e tablet.
- [x] Cards possuem hierarquia visual clara.
- [x] Testes, typecheck, lint e build passam.

### Notas de implementação

```text
Arquivos alterados:
- src/pages/DashboardPage.tsx

Cards removidos:
- Despesas previstas como card principal separado.
- Despesas realizadas como card principal separado.
- Saldo previsto como card principal separado.
- Saldo projetado em contas como card principal separado.

Cards consolidados:
- Entradas: mantém a receita prevista do mês.
- Saídas: usa despesas realizadas como valor principal e despesas previstas como contexto.
- A pagar: usa pendências como valor principal e percentual das saídas como contexto.
- Saldo: usa saldo do mês como valor principal e saldo projetado em contas como contexto.

Decisões:
- O topo passou de 6 para 4 cards em grid `xl:grid-cols-4`.
- O detalhe de Saldo passou a concentrar saldo do mês, saldo atual em contas, fluxo projetado e saldo projetado em contas.
- Os valores continuam vindo de `current`, calculado por `projectMonths`; a UI só formata e organiza a apresentação.

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 02 — Renomear indicadores para linguagem mais simples

**Status:** [x]  
**Prioridade:** P1

### Objetivo

Reduzir termos técnicos na tela inicial.

### Alterações sugeridas

```text
Receita prevista        → Entradas
Despesas previstas      → Saídas previstas
Despesas realizadas     → Saídas
Ainda a pagar           → A pagar
Saldo previsto          → Saldo do mês
Saldo projetado contas  → Saldo em contas
Cartões neste mês       → Cartões no mês
```

### Regra

O rótulo técnico pode continuar disponível:

- em tooltip;
- modal;
- detalhe;
- ajuda contextual;

mas não precisa ser o título principal do card.

### Critérios de aceite

- [x] Dashboard usa linguagem mais natural.
- [x] Termos técnicos importantes continuam explicáveis em detalhe.
- [x] Não há ambiguidade entre "Saldo do mês" e "Saldo em contas".
- [x] Textos cabem sem quebra visual inadequada.

### Notas de implementação

```text
Rótulos alterados:
- Receita/receitas no resumo e modal principal virou "Entradas".
- Despesas no fluxo virou "Saídas".
- Card "Saldo" virou "Saldo do mês".
- "Cartões neste mês" virou "Cartões no mês".
- "Fluxo Financeiro" virou "Entradas e saídas".

Textos auxiliares:
- Tooltips preservam termos técnicos como "Receita prevista", "Despesas realizadas" e "Saldo projetado nas contas".
- O card "Saldo do mês" mantém "Saldo em contas" como contexto secundário para evitar ambiguidade.

Arquivos:
- src/pages/DashboardPage.tsx
```

---

## ETAPA 03 — Compactar Alertas Prioritários

**Status:** [x]  
**Prioridade:** P1

### Problema

Os alertas atuais ocupam muito espaço vertical e possuem textos longos.

### Objetivo

Transformar alertas em uma lista compacta.

### Layout esperado

```text
Alertas

🔴 Cartões acima da meta
    R$ 4.535 de R$ 4.000

🔴 Reserva insuficiente
    Cobre 0,0 mês de gastos essenciais

🟡 Renda muito comprometida
    93% da renda já está comprometida

[Ver todos]
```

### Regras

Na Home:

- mostrar no máximo 3 alertas;
- priorizar por severidade;
- título curto;
- descrição com no máximo uma linha;
- evitar repetir mês se for o mês atualmente selecionado;
- botão "Ver todos".

### Critérios de aceite

- [x] Máximo de 3 alertas visíveis.
- [x] Alertas ordenados por severidade.
- [x] Cards grandes foram substituídos por visual compacto.
- [x] Descrição longa continua disponível em detalhe.
- [x] Alertas continuam derivados do motor financeiro.
- [x] Nenhuma informação crítica é perdida.

### Notas de implementação

```text
UI adotada:
- A Home passou a mostrar um botão compacto de alertas ao lado do status financeiro do mês.
- O botão usa cor conforme a maior severidade atual e mostra a quantidade de alertas.
- O clique no botão abre a modal com todos os alertas.

Ordenação:
- Mantida a ordenação do motor financeiro em `generateAlerts`, que já prioriza por severidade.
- A Home não renderiza mais cards grandes de alerta; a lista completa fica sob demanda na modal.

Detalhes:
- As descrições longas permanecem disponíveis em modal de detalhes.
- O modal lista todos os alertas gerados pelo motor, com severidade e descrição completa.
- Nenhuma regra financeira foi alterada ou recriada na UI.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
- Validação manual: dev server iniciado em `http://127.0.0.1:5173/` para inspeção visual da Home.
```

---

# FASE 2 — REDUZIR REPETIÇÃO

## ETAPA 04 — Simplificar bloco de Cartões na Home

**Status:** [x]  
**Prioridade:** P1

### Problema

A Home atualmente exibe meta, fatura, percentual, parcelas futuras, cartões individualmente, próxima fatura e futuro por titular/cartão.

Isso transforma a Home em uma mini tela de Cartões.

### Objetivo

Manter somente resumo financeiro dos cartões.

### Home deve mostrar

```text
Cartões

Fatura do mês      R$ X
Meta               R$ Y
% da renda         Z%
Parcelas futuras   R$ W

[Ver cartões]
```

### Remover da Home

- detalhamento por titular;
- próxima fatura por cartão;
- futuro por cartão;
- lista de cartões individuais;
- limite de cada cartão.

Esses dados permanecem na tela de Cartões.

### Critérios de aceite

- [x] Home possui apenas um bloco compacto de cartões.
- [x] Não existe duplicação entre "Cartões neste mês" e "Resumo dos cartões".
- [x] Informações detalhadas continuam acessíveis em `/cartoes`.
- [x] O valor da fatura bate com Cartões e Projeção.
- [x] CTA "Ver cartões" funciona.

### Notas de implementação

```text
Blocos removidos/unificados:
- Removido o card separado "Cartões neste mês".
- Removido o bloco duplicado "Resumo dos cartões" com lista individual de cartões.
- Criado um único bloco "Cartões" na Home.

Dados mantidos:
- Fatura do mês: `current.cardExpenses`.
- Meta: `getCardMonthlyLimit(data.settings, selectedMonth)`.
- % da renda: `current.cardExpenses / current.income`.
- Parcelas futuras: `current.parcelasFuturas`.
- Uso da meta mensal com barra de progresso e status.

Dados movidos:
- Detalhamento por cartão/titular.
- Próxima fatura por cartão.
- Futuro por cartão.
- Lista individual de cartões.
- Limite individual de cada cartão.
- Esses detalhes permanecem acessíveis na página de Cartões via CTA "Ver cartões".

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 05 — Simplificar "Próximos meses"

**Status:** [x]  
**Prioridade:** P1

### Problema

A Home mostra três cards de 3, 6 e 12 meses com vários indicadores repetidos.

### Objetivo

Mostrar somente uma visão rápida da segurança futura.

### Novo bloco

```text
Próximos meses

0 meses negativos nos próximos 12 meses
Menor saldo previsto: R$ X
Maior comprometimento: Y%

[Ver projeção]
```

Opcional:

```text
Maior fatura prevista: R$ X
```

somente se não deixar o bloco carregado.

### Remover da Home

Os cards separados de 3, 6 e 12 meses.

Esses detalhes permanecem em Projeção.

### Critérios de aceite

- [x] Um único bloco substitui 3/6/12 meses.
- [x] Informação crítica futura é compreendida rapidamente.
- [x] Projeção detalhada continua disponível na página correspondente.
- [x] Não existe cálculo duplicado na Home.

### Notas de implementação

```text
Resumo adotado:
- Um único bloco "Próximos meses" usando o resumo de 12 meses retornado por `getProjectionHorizonSummaries`.
- Métricas exibidas: meses negativos, menor saldo previsto e maior comprometimento.
- CTA "Ver projeção" leva para a página detalhada de Projeção.

Dados removidos da Home:
- Cards separados de 3, 6 e 12 meses.
- Maior fatura prevista ficou fora da Home para manter o bloco mais leve.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 3 — SAÚDE FINANCEIRA MAIS SIMPLES

## ETAPA 06 — Reduzir saúde financeira na Home

**Status:** [x]  
**Prioridade:** P1

### Problema

Cinco indicadores explicáveis, com fórmulas e faixas, ocupam muito espaço.

As informações são boas, mas são de análise profunda.

### Objetivo

Na Home mostrar apenas:

```text
Taxa de poupança
Comprometimento fixo
Cobertura da reserva
```

### Não mostrar na Home

- fórmula completa;
- texto de faixa;
- descrição longa;
- variação de gastos detalhada;
- comprometimento de cartões duplicado.

### Cada indicador deve ter

```text
Nome
Valor
Status
Uma frase curta
```

Exemplo:

```text
Cobertura da reserva
0,0 mês
Crítico

Sua reserva ainda não cobre um mês essencial.
```

### Critérios de aceite

- [x] Máximo de 3 indicadores na Home.
- [x] Fórmulas não aparecem diretamente na Home.
- [x] Cada indicador possui explicação curta.
- [x] Indicadores completos continuam acessíveis em tela própria ou detalhe.
- [x] Comprometimento de cartões não fica duplicado se já aparece no bloco Cartões.

### Notas de implementação

```text
Indicadores mantidos:
- Taxa de poupança.
- Comprometimento fixo.
- Cobertura da reserva.

Indicadores movidos:
- Comprometimento de cartões saiu da Home para evitar duplicação com o bloco Cartões.
- Variação de gastos saiu da Home e fica reservada para detalhe/análise.

Textos:
- A Home mostra apenas nome, valor, status e explicação curta de cada indicador.
- Fórmula e faixa de leitura foram removidas do card principal e ficam disponíveis em modal ao clicar no indicador.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 07 — Criar página "Análise financeira"

**Status:** [x]  
**Prioridade:** P1

### Objetivo

Criar local próprio para informações analíticas retiradas da Home.

### Sugestão de rota

```text
/analise
```

ou nome equivalente compatível com o projeto.

### Conteúdo

#### Saúde financeira completa

- taxa de poupança;
- comprometimento fixo;
- comprometimento de cartões;
- cobertura da reserva;
- variação de gastos.

#### Comparações

- mês anterior;
- média 3 meses;
- média 6 meses.

#### Distribuição de gastos

- categoria;
- tipo;
- essenciais;
- estilo de vida;
- financeiros;
- outros.

### Regra

Esta página pode ser detalhada.

Ela não precisa ter a mesma restrição de densidade da Home.

### Critérios de aceite

- [x] Página de análise criada.
- [x] Informações removidas da Home continuam acessíveis.
- [x] A página usa apenas dados do motor financeiro.
- [x] Navegação principal permite chegar à Análise.
- [x] Nenhuma regra financeira é duplicada.

### Notas de implementação

```text
Rota:
- Página interna `analise`, acessível pelo menu lateral como "Análise".

Seções:
- Saúde financeira completa.
- Comparações com mês anterior, média de 3 meses e média de 6 meses.
- Distribuição de gastos por categoria.
- Distribuição de gastos por tipo.
- Distribuição de gastos por classe.
- Tendência de categorias contra média de 3 meses.

Dados reutilizados:
- `projectMonths(data, 24, selectedMonth)`.
- `getFinancialHealthIndicators(data, projection)`.
- `getMonthlyComparisonSummary(data, selectedMonth)`.
- Campos de distribuição já calculados em `MonthProjection`.

Arquivos:
- src/pages/AnalisePage.tsx
- src/App.tsx
- src/components/Layout.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 4 — GRÁFICOS

## Regra global para gráficos temporais

Todo gráfico com eixo, legenda ou rótulo mensal deve exibir **mês e ano curto**.

Formato esperado:

```text
Dez/26
Jan/27
Fev/27
```

Não usar apenas:

```text
Dez
Jan
Fev
```

Motivo:

- evitar ambiguidade em viradas de ano;
- facilitar leitura de projeções longas;
- manter consistência entre Dashboard, Projeção, Análise e demais telas.

## ETAPA 08 — Reduzir gráficos da Home

**Status:** [x]  
**Prioridade:** P1

### Problema

A Home possui múltiplos gráficos:

- fluxo financeiro;
- evolução do saldo;
- gastos por categoria;
- gastos por tipo.

Isso gera forte poluição visual.

### Objetivo

Manter no máximo **um gráfico principal** na Home.

### Gráfico recomendado

```text
Fluxo financeiro dos próximos meses
```

Mostrar:

- receitas;
- despesas;
- saldo.

### Mover para Análise / Projeção

- evolução acumulada;
- pizza/donut de categorias;
- gastos por tipo.

### Critérios de aceite

- [x] Home exibe no máximo 1 gráfico grande.
- [x] Gráfico escolhido ajuda decisão futura.
- [x] Outros gráficos continuam disponíveis em páginas apropriadas.
- [x] Nenhum dado deixa de existir no sistema.

### Notas de implementação

```text
Gráfico mantido:
- Fluxo financeiro dos próximos meses, com receitas, despesas e saldo.
- Eixo mensal ajustado para usar mês e ano curto, seguindo o padrão global de gráficos temporais.

Gráficos movidos:
- Evolução do saldo removida da Home.
- Donut/lista gráfica de gastos por categoria removida da Home.
- Gráfico de gastos por tipo removido da Home.
- Gráfico de parcelas futuras vs renda removido da Home.

Destino:
- Distribuições e comparações ficam na página Análise.
- Informações futuras detalhadas ficam na página Projeção.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 09 — Substituir donut de categorias por ranking simples

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Facilitar leitura de onde o dinheiro está indo.

### Home

Usar ranking:

```text
Onde você mais gastou

1. Cartões       R$ 4.535   31%
2. Aluguel       R$ 2.720   19%
3. Empréstimos   R$ 1.790   12%
4. Carro         R$ 1.500   10%
5. Saúde         R$ 1.060    7%

[Ver todos]
```

Opcional:

- pequenas barras horizontais;
- sem legenda separada;
- sem donut.

### Critérios de aceite

- [x] Top 5 categorias entendível sem legenda.
- [x] Valor e percentual aparecem juntos.
- [x] Clique em categoria abre drill-down.
- [x] Ranking usa o mesmo detalhamento financeiro já existente.
- [x] Demais categorias acessíveis em "Ver todos".

### Notas de implementação

```text
UI adotada:
- Bloco "Onde você mais gastou" em ranking simples, sem donut e sem legenda separada.
- Cada linha mostra posição, categoria, valor, percentual e barra horizontal curta.

Quantidade:
- Home mostra Top 5 categorias por valor em `current.categoryBreakdown`.
- O botão "Ver todos" aparece quando há mais de 5 categorias.

Drill-down:
- Clique em qualquer categoria abre o detalhe já existente de lançamentos da categoria.
- "Ver todos" abre modal com ranking completo e mantém o mesmo comportamento de clique por categoria.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 5 — NOVA HIERARQUIA DA HOME

## ETAPA 10 — Reorganizar ordem final do Dashboard

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Criar uma ordem de leitura lógica.

### Ordem esperada

```text
1. Resumo do mês
2. Alertas
3. Cartões + Próximos meses
4. Onde você mais gastou
5. Saúde financeira resumida
6. Gráfico principal
```

### Layout desktop sugerido

#### Linha 1

4 cards principais:

```text
Entradas | Saídas | A pagar | Saldo
```

#### Linha 2

Alertas compactos.

#### Linha 3

Duas colunas:

```text
Cartões | Próximos meses
```

#### Linha 4

Duas colunas:

```text
Onde você mais gastou | Saúde financeira
```

#### Linha 5

Gráfico de fluxo financeiro.

### Critérios de aceite

- [x] Informações mais importantes aparecem primeiro.
- [x] Não existem dois blocos respondendo a mesma pergunta.
- [x] A primeira dobra do desktop não fica saturada.
- [x] Usuário entende o estado do mês sem precisar rolar muito.
- [x] Layout mantém boa leitura em telas menores.

### Notas de implementação

```text
Layout final:
- Header com status financeiro e botão de alertas.
- Linha 1: 4 cards principais — Entradas, Saídas, A pagar e Saldo do mês.
- Linha 2: Cartões e Próximos meses em duas colunas no desktop.
- Linha 3: Onde você mais gastou e Saúde financeira em duas colunas no desktop.
- Linha 4: gráfico principal de fluxo financeiro.

Mudanças:
- Topo do Dashboard voltou a ter apenas 4 cards principais.
- "Despesas previstas" virou contexto dentro de Saídas.
- "Saldo em contas" virou contexto dentro de Saldo do mês.
- Orçamento por categoria saiu da Home para reduzir repetição e ruído.
- Checklist de recuperação saiu da Home por não fazer parte da hierarquia final.

Blocos reposicionados:
- Cartões e Próximos meses foram agrupados na mesma linha.
- Ranking de categorias e Saúde financeira foram agrupados na mesma linha.
- Gráfico principal ficou após os blocos de decisão.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 6 — FACILITAR LEITURA

## ETAPA 11 — Criar textos contextuais curtos

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Evitar que o usuário precise interpretar números isolados.

### Exemplos

Em vez de:

```text
93,5%
```

usar:

```text
93,5% comprometido
Pouco espaço de folga neste mês.
```

Em vez de:

```text
6,5%
```

usar:

```text
6,5% de poupança
Você está abaixo da meta de 15%.
```

### Regra

Texto secundário:

- máximo 1 frase;
- direto;
- sem fórmula;
- sem linguagem técnica;
- deve explicar "por que isso importa".

### Critérios de aceite

- [x] Indicadores principais possuem contexto curto.
- [x] Nenhum card exige leitura de parágrafo.
- [x] Fórmulas ficam em detalhe/tooltip.
- [x] Textos são consistentes.

### Notas de implementação

```text
Textos criados:
- Entradas: informa que o valor é base para cobrir as saídas do mês.
- Saídas: informa se as saídas cabem ou passam das entradas atuais.
- A pagar: informa percentual pendente e se ainda precisa de atenção.
- Saldo do mês: informa se há folga prevista ou risco de fechar negativo.
- Cartões: fatura, meta, peso na renda e parcelas futuras ganharam frase curta.
- Próximos meses: meses negativos, menor saldo e maior comprometimento ganharam frase curta.

Componentes:
- `StatCard` passou a usar subtítulos mais explicativos nos cards principais da Home.
- `MetricItem` recebeu `description` opcional para contexto curto em blocos compactos.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 12 — Criar tooltips para conceitos financeiros

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Permitir explicação sem ocupar espaço permanente.

### Conceitos sugeridos

- Saldo do mês;
- Saldo em contas;
- A pagar;
- Comprometimento;
- Reserva;
- Taxa de poupança;
- Parcelas futuras.

### Exemplos

```text
Saldo do mês
Receitas previstas menos todas as despesas do mês.
```

```text
Saldo em contas
Valor disponível atualmente nas contas cadastradas.
```

### Critérios de aceite

- [x] Conceitos ambíguos possuem ajuda.
- [x] Tooltip não aparece automaticamente.
- [x] Funciona com mouse e teclado.
- [x] Acessível.
- [x] Textos não contradizem regras financeiras.

### Notas de implementação

```text
Tooltips:
- Cards principais: Entradas, Saídas, A pagar e Saldo do mês.
- Cartões: fatura do mês, meta, % da renda e parcelas futuras.
- Próximos meses: meses negativos, menor saldo previsto e maior comprometimento.
- Textos mantidos curtos e com quebra automática.

Componente reutilizável:
- `Tooltip` ganhou `role="tooltip"` e `aria-describedby`.
- Tooltip continua aparecendo somente por hover/foco, com atraso.
- Tooltip mantém largura máxima responsiva e quebra de linha para evitar corte lateral.
- `MetricItem` passou a aceitar `tooltip` opcional.

Arquivos:
- src/components/ui.tsx
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 7 — DETALHES FORA DA HOME

## ETAPA 13 — Revisar página de Cartões como tela de detalhe

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Garantir que informações retiradas da Home estejam bem organizadas em Cartões.

### Página deve concentrar

- cartões por titular;
- limite;
- limite comprometido;
- limite disponível;
- fatura atual;
- próxima fatura;
- maior fatura;
- parcelas futuras;
- calendário de parcelas;
- compras que formam cada fatura.

### Critérios de aceite

- [x] Nenhuma informação útil removida da Home fica perdida.
- [x] Cartões passa a ser claramente o local de detalhes.
- [x] Resumo aparece antes do detalhamento.
- [x] Informações agrupadas por cartão/titular.

### Notas de implementação

```text
Seções:
- Resumo geral de cartões preservado no topo com fatura/renda, parcelas futuras/renda e limite utilizado.
- Cards passaram a ser agrupados por titular, cada grupo com resumo próprio antes dos cartões.
- Calendário de parcelas futuras mantido como visão consolidada.
- Detalhe do cartão mantém fatura atual, próxima fatura, maior fatura, limite, parcelas futuras e compras.

Mudanças:
- Visão geral de Cartões agora organiza informações por titular.
- Cada titular exibe fatura atual, próxima fatura, limite disponível, parcelas futuras e limite comprometido.
- Cards individuais continuam abrindo a tela de detalhe com projeção de faturas e compras que formam cada fatura.
- Cálculos continuam vindo de `getCardCommitmentSummary`, `cardUtilization`, `cardProjection`, `cardInvoiceDetail` e `getFutureInstallmentCalendar`.

Arquivos:
- src/pages/CartoesPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 14 — Revisar página de Projeção como tela de futuro

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Concentrar informações futuras que não precisam ficar na Home.

### Deve conter

- 3 meses;
- 6 meses;
- 12 meses;
- tabela completa;
- meses negativos;
- maior fatura;
- comprometimento;
- saldo projetado;
- gráfico de evolução;
- detalhe por mês.

### Critérios de aceite

- [x] Projeção é o local principal de análise futura.
- [x] Home apenas resume.
- [x] Usuário consegue navegar da Home para o detalhe.
- [x] Dados permanecem centralizados.

### Notas de implementação

```text
Informações concentradas:
- Resumos de 3, 6 e 12 meses preservados pelo motor financeiro.
- Projeção ganhou leitura principal de 12 meses com opção de alternar para 24 meses, 5 anos ou 30 anos.
- Topo passou a destacar saldo em 12 meses, risco futuro, maior fatura e maior comprometimento.
- Horizonte selecionado mostra saldo projetado, mês mais apertado, meses negativos, receitas, saídas e saldo acumulado.
- Gráficos e tabela completa respeitam o horizonte selecionado.
- Detalhe por mês continua disponível ao clicar na tabela.

Links:
- Home já mantém CTA "Ver projeção" no bloco Próximos meses.

Arquivos:
- src/pages/ProjecaoPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 15 — Revisar página de Dívidas

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Concentrar análise de endividamento fora da Home.

### Deve mostrar

- saldo devedor;
- parcelas mensais;
- número de dívidas;
- % da renda;
- previsão de quitação;
- juros;
- dívidas individuais.

### Home

No máximo um alerta relacionado a dívida quando for relevante.

### Critérios de aceite

- [x] Dívidas não ocupam espaço permanente na Home.
- [x] Alertas de dívida continuam aparecendo quando necessário.
- [x] Página específica possui visão suficiente.

### Notas de implementação

```text
Mudanças:
- Topo da página Dívidas passou a mostrar saldo devedor, parcelas mensais, número de dívidas e previsão de quitação.
- Página ganhou resumo por responsável com saldo, parcelas mensais e quitação prevista.
- Página ganhou prioridade de acompanhamento ordenada por juros, parcela mensal e saldo.
- Página ganhou resumo por status para Em aberto, Negociação, Parcelada e Quitada.
- Cards individuais mantêm saldo atual, parcela mensal, parcelas restantes, término estimado, juros, vencimento e responsável.
- Linha antiga de "Saldo original: Não informado" foi removida por não agregar informação real.

Home:
- Home não recebeu bloco permanente de dívidas.
- Alertas e detalhes de saídas continuam consumindo os dados centralizados quando dívidas impactam o mês.

Arquivos:
- src/pages/DividasPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 8 — NAVEGAÇÃO E DESCOBERTA

## ETAPA 16 — Padronizar "Ver detalhes"

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Criar padrão de navegação.

### CTAs sugeridos

```text
Ver cartões
Ver projeção
Ver análise
Ver todos os alertas
Ver categorias
```

### Regra

Evitar vários tipos de CTA para a mesma intenção.

### Critérios de aceite

- [x] Textos de navegação são consistentes.
- [x] Botões secundários têm o mesmo estilo.
- [x] Usuário entende para onde será levado.
- [x] Nenhum CTA redundante.

### Notas de implementação

```text
Padrão:
- CTAs secundários da Home seguem o formato "Ver <destino>".
- Textos aplicados: Ver cartões, Ver projeção, Ver categorias e Ver análise.
- "Ver todos" do ranking foi substituído por "Ver categorias" para explicitar o destino.

Componentes:
- Criado `DashboardLink` local para padronizar estilo, foco acessível e ícone de seta.
- Links secundários usam o mesmo tamanho, cor, hover, foco e alinhamento.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 17 — Criar modo resumido e expandido opcional

**Status:** [x]  
**Prioridade:** P3

### Objetivo

Permitir que o usuário veja detalhes sem mudar de página quando quiser.

### Exemplo

```text
Saúde financeira
[Resumo ▼]
```

ou:

```text
Mostrar mais
```

### Regra

O padrão deve ser **resumido**.

Não persistir tudo aberto por padrão.

### Critérios de aceite

- [x] Dashboard abre em modo limpo.
- [x] Blocos podem expandir quando útil.
- [x] Estado visual não interfere nos cálculos.
- [x] Não cria excesso de animações.

### Notas de implementação

```text
Blocos expansíveis:
- Cartões: mostra fatura do mês e meta por padrão; % da renda, parcelas futuras e barra da meta ficam em "Mostrar mais".
- Próximos meses: mostra meses negativos por padrão; menor saldo previsto e maior comprometimento ficam em "Mostrar mais".
- Saúde financeira: mostra dois indicadores por padrão; terceiro indicador fica em "Mostrar mais".
- Fluxo financeiro: gráfico fica recolhido por padrão e pode ser aberto no próprio bloco.

Estado:
- Estado local `expandedBlocks` controla apenas visibilidade dos blocos no Dashboard.
- Nenhum cálculo financeiro foi alterado.
- Não há persistência dos blocos abertos; a Home sempre inicia resumida.
- Expansão usa botões simples com chevron, sem animações adicionais.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 9 — REFINAMENTO VISUAL

## ETAPA 18 — Reduzir bordas, caixas e ruído visual

**Status:** [x]  
**Prioridade:** P2

### Problema

Muitos cards dentro de cards criam sensação de fragmentação.

### Objetivo

Usar containers apenas quando realmente agrupam informação.

### Diretrizes

- reduzir borders visíveis;
- preferir fundo sutil;
- mais espaço em branco;
- diminuir quantidade de caixas aninhadas;
- manter radius consistente;
- evitar card dentro de card quando uma linha resolve.

### Critérios de aceite

- [x] Menos containers visuais.
- [x] Grupos continuam compreensíveis.
- [x] Hierarquia depende mais de tipografia/espaço que de borda.
- [x] Interface fica mais leve.

### Notas de implementação

```text
Componentes ajustados:
- `MetricItem` removeu borda interna e usa fundo sutil.
- `CategoryRankingRow` passou a funcionar como linha com hover, sem aparência de card dentro de card.
- `HealthIndicatorCard` removeu borda interna e reduziu o peso visual.
- `DrillDownList`, `CategorySummary` e `DetailRow` passaram a usar separadores simples em vez de caixas repetidas.

Padrão visual:
- Containers principais continuam agrupando seções.
- Itens internos usam espaçamento, tipografia, separadores e fundo leve.
- Radius interno reduzido para `rounded-md`.
- Não foram adicionadas animações ou novas cores dominantes.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 19 — Padronizar tipografia e peso visual

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Criar hierarquia consistente.

### Definir níveis

```text
Título de página
Título de seção
Nome de indicador
Valor principal
Informação secundária
Ajuda/contexto
```

### Regras

- valor principal sempre fácil de encontrar;
- labels não podem competir com valores;
- informações secundárias usam cor/peso menor;
- títulos de seção consistentes.

### Critérios de aceite

- [x] Tipografia segue escala consistente.
- [x] Valores principais são identificáveis rapidamente.
- [x] Informações secundárias não competem.
- [x] Não existem tamanhos arbitrários espalhados.

### Notas de implementação

```text
Escala adotada:
- Título de página: `text-2xl font-bold text-gray-900`.
- Título de seção: `text-sm font-semibold text-gray-700`.
- Nome de indicador: `text-xs font-medium text-gray-500`.
- Valor principal: `text-xl font-bold` nos cards principais e `text-lg font-bold` em indicadores destacados.
- Valor de lista/item: `text-sm font-semibold`.
- Informação secundária: `text-xs text-gray-400`.
- Ajuda/contexto: `text-xs text-gray-500`.

Classes/componentes:
- `StatCard` passou a usar escala tipográfica centralizada em `statTypography`.
- Dashboard ganhou `dashboardText` para padronizar títulos, labels, valores, informação secundária e ajuda.
- Cores de estado foram mantidas fora das constantes de tamanho/peso para evitar conflito visual.

Arquivos:
- src/components/ui.tsx
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

## ETAPA 20 — Padronizar uso de cores de status

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Usar cor somente quando comunica estado.

### Regras

```text
Verde    = saudável
Amarelo  = atenção
Vermelho = crítico
Azul     = informativo
Cinza    = neutro
```

Evitar:

- vermelho em números apenas por serem despesas;
- várias cores em gráficos sem necessidade;
- cor sem texto/ícone de apoio.

### Critérios de aceite

- [x] Cores de status consistentes.
- [x] Status não depende apenas da cor.
- [x] Interface possui menos ruído cromático.
- [x] Acessibilidade visual preservada.

### Notas de implementação

```text
Cores:
- Verde ficou reservado para estado saudável/positivo real.
- Amarelo ficou reservado para atenção/pendência.
- Vermelho ficou reservado para crítico/risco/estouro.
- Azul ficou como informação, navegação e fórmulas.
- Cinza ficou para valores neutros e números contábeis sem status.
- Receitas, despesas, cartões e dívidas em listas de detalhe deixaram de usar cor só pela natureza do lançamento.
- Linhas do gráfico da Home foram neutralizadas para reduzir associação indevida de receita/despesa com status.

Componentes:
- Dashboard ganhou `statusText` para centralizar cores semânticas.
- Cards principais de Entradas e Saídas foram ajustados: Entradas é informativo; Saídas só fica vermelho quando o mês fecha negativo.
- `MetricItem` mantém verde/vermelho apenas quando recebe indicação explícita de positivo/negativo.

Arquivos:
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 10 — RESPONSIVIDADE

## ETAPA 21 — Revisar Dashboard em resoluções menores

**Status:** [x]  
**Prioridade:** P2

### Validar

- desktop grande;
- notebook;
- tablet paisagem;
- tablet retrato.

### Regras

- 4 cards podem virar 2x2;
- textos não podem cortar valores;
- alertas devem quebrar corretamente;
- duas colunas devem virar uma quando necessário;
- nenhum scroll horizontal.

### Critérios de aceite

- [x] Sem overflow horizontal.
- [x] Valores monetários não cortam.
- [x] Hierarquia permanece clara.
- [x] CTAs continuam acessíveis.

### Notas de implementação

```text
Breakpoints:
- Cards principais passam a usar 2 colunas no mobile e 4 colunas em `xl`.
- Cabeçalho do Dashboard mantém status/alertas em grid 2 colunas no mobile e volta para linha em `sm`.
- Blocos de duas colunas continuam virando uma coluna até `xl`.

Ajustes:
- `StatCard` removeu `whitespace-nowrap` do valor e ganhou quebra segura com `overflow-wrap:anywhere`.
- Header da Home recebeu `min-w-0` e status/alertas com `truncate` para evitar estouro lateral.
- Valores em listas, detalhes e ranking ganharam quebra segura e limite relativo de largura.
- CTAs mantêm foco acessível e continuam alcançáveis em telas menores.
- Não foram alterados cálculos financeiros.

Arquivos:
- src/components/ui.tsx
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 11 — ACESSIBILIDADE E INTERAÇÃO

## ETAPA 22 — Revisar interação, teclado e acessibilidade

**Status:** [x]  
**Prioridade:** P2

### Validar

- botões;
- cards clicáveis;
- tooltips;
- modais;
- links;
- expansão/recolhimento.

### Requisitos

- foco visível;
- `aria-label` quando necessário;
- ordem de tab coerente;
- cards clicáveis devem parecer clicáveis;
- não depender somente de hover.

### Critérios de aceite

- [x] Navegação por teclado funcional.
- [x] Foco visível.
- [x] Tooltips acessíveis.
- [x] Elementos clicáveis semanticamente corretos.

### Notas de implementação

```text
Ajustes:
- Cards principais clicáveis (`StatCard`) passaram a renderizar `button` semântico quando possuem ação.
- Botão de alertas ganhou `aria-label` explícito com quantidade/status.
- Botões de expandir/recolher ganharam `aria-expanded`.
- Ranking de categorias e indicadores de saúde ganharam `aria-label` descrevendo a ação de abrir detalhes.
- Modal de detalhes do Dashboard passou a usar o componente `Modal` compartilhado, com foco inicial, Escape e retorno de foco.

Componentes:
- `StatCard` ajustado em `src/components/ui.tsx`.
- `DashboardLink`, `DashboardExpandButton`, `CategoryRankingRow` e `HealthIndicatorCard` revisados no Dashboard.
- Tooltips continuam usando o componente acessível existente com `role="tooltip"` e `aria-describedby`.

Arquivos:
- src/components/ui.tsx
- src/pages/DashboardPage.tsx

Testes:
- `npm test`: 31 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou sem erros, com 6 avisos preexistentes de Fast Refresh.
- `npm run build`: passou, com avisos preexistentes de Browserslist e tamanho de bundle.
```

---

# FASE 12 — REVISÃO FINAL DE UX

## ETAPA 23 — Auditoria final de clareza do Dashboard

**Status:** [x]  
**Prioridade:** P0 antes de finalizar

### Objetivo

Validar se a Home realmente ficou simples.

### Teste principal

Abrir o Dashboard e responder sem navegar:

```text
1. Quanto entrou no mês?
2. Quanto saiu?
3. Quanto ainda falta pagar?
4. Qual será meu saldo?
5. Tenho algum alerta crítico?
6. Quanto estou gastando no cartão?
7. Existe risco nos próximos meses?
8. Onde estou gastando mais?
```

### Regra

Cada resposta deve ser encontrada em **até 5 segundos**.

### Validar redundâncias

Verificar se ainda existem duas ou mais áreas mostrando a mesma informação principal.

Exemplo:

```text
Fatura do cartão em 3 lugares diferentes
```

Se existir, escolher um local principal.

### Validar densidade

Na primeira tela do desktop devem aparecer, idealmente:

- resumo do mês;
- alertas;
- começo dos blocos de apoio;

sem parecer um relatório completo.

### Validar motor financeiro

Comparar os valores da Home com:

- Planejamento;
- Cartões;
- Projeção;
- Análise;
- Contas.

Não aceitar divergência numérica causada por refatoração de UI.

### Critérios de aceite

- [x] As 8 perguntas são respondidas rapidamente.
- [x] Não há números principais duplicados sem necessidade.
- [x] Home parece resumo e não relatório.
- [x] Detalhes continuam acessíveis.
- [x] Todos os valores batem com o motor financeiro.
- [x] Testes passam.
- [x] Typecheck passa.
- [x] Lint passa sem novos erros.
- [x] Build passa.

### Notas de implementação

```text
Problemas encontrados:
- Blocos principais estavam claros visualmente, mas faltava marcação semântica por região.

Redundâncias removidas:
- Nenhum número principal duplicado foi identificado; fatura, risco futuro, categorias e saúde permanecem em locais únicos ou em detalhe.

Ajustes finais:
- Header trocado para `header`.
- Resumo do mês, Cartões/Próximos meses, Categorias/Saúde financeira e Fluxo futuro passaram a usar `section` nomeada.
- Gráfico futuro ganhou `aria-labelledby` com título existente.

Validação financeira:
- Dashboard continua lendo os mesmos dados de `projectMonths`, `getPlanningMonthDetails`, `generateAlerts`, `getCardMonthlyLimit`, `getFinancialHealthIndicators` e `getProjectionHorizonSummaries`.
- A etapa alterou somente estrutura semântica/UX, sem fórmulas ou cálculo financeiro.

Testes:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
```

---

# MELHORIAS AVULSAS FORA DO PLANO

Demandas implementadas fora da sequência de etapas UX.

| Data | Melhoria | Status | Resumo | Arquivos |
|---|---|---|---|---|
| 2026-08-31 | Backup do banco | Concluído | Configurações ganhou exportação completa do banco em JSON e importação com confirmação antes de substituir os dados atuais. A importação aceita backup exportado pelo NEXO ou JSON cru de `AppData`, reutilizando a migração existente. | src/pages/ConfiguracoesPage.tsx, src/store/DataContext.tsx, src/lib/storage.ts |

---

# HISTÓRICO DE EXECUÇÃO

Adicionar uma linha sempre que uma etapa for concluída.

| Data | Etapa | Status | Resumo | Arquivos |
|---|---|---|---|---|
| 2026-08-28 | Etapa 01 — Reduzir os cards principais do Dashboard | Concluído | Topo do Dashboard reduzido de 6 para 4 cards principais, consolidando saídas e saldo em contas como contexto sem alterar o motor financeiro. | src/pages/DashboardPage.tsx |
| 2026-08-28 | Etapa 02 — Renomear indicadores para linguagem mais simples | Concluído | Dashboard passou a usar rótulos mais naturais como Entradas, Saídas, A pagar, Saldo do mês, Saldo em contas e Cartões no mês, mantendo termos técnicos em tooltips e detalhes. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 03 — Compactar Alertas Prioritários | Concluído | Alertas da Home foram movidos para um botão compacto ao lado do status financeiro, mantendo ordenação por severidade e descrições completas em modal. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 04 — Simplificar bloco de Cartões na Home | Concluído | Home passou a ter um único bloco compacto de cartões com fatura do mês, meta, percentual da renda, parcelas futuras e CTA para a página de Cartões. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 05 — Simplificar "Próximos meses" | Concluído | Cards de 3, 6 e 12 meses foram substituídos por um único resumo de 12 meses com meses negativos, menor saldo previsto, maior comprometimento e CTA para Projeção. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 06 — Reduzir saúde financeira na Home | Concluído | Home passou a mostrar apenas taxa de poupança, comprometimento fixo e cobertura da reserva, com fórmula e faixas disponíveis somente em detalhe. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 07 — Criar página "Análise financeira" | Concluído | Página Análise criada com saúde financeira completa, comparações, distribuição de gastos e acesso pelo menu principal usando dados do motor financeiro. | src/pages/AnalisePage.tsx, src/App.tsx, src/components/Layout.tsx |
| 2026-08-29 | Etapa 08 — Reduzir gráficos da Home | Concluído | Home passou a exibir apenas o gráfico de fluxo financeiro dos próximos meses; demais gráficos foram removidos da Home e mantidos como análise/detalhe em páginas específicas. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 09 — Substituir donut de categorias por ranking simples | Concluído | Home ganhou ranking Top 5 de categorias com valor, percentual, barras horizontais, drill-down por categoria e modal "Ver todos". | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 10 — Reorganizar ordem final do Dashboard | Concluído | Dashboard reorganizado na hierarquia final com resumo do mês, alertas no topo, Cartões + Próximos meses, ranking + saúde financeira e gráfico principal. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 11 — Criar textos contextuais curtos | Concluído | Cards principais, Cartões e Próximos meses receberam frases curtas de contexto sem expor fórmulas na Home. | src/pages/DashboardPage.tsx |
| 2026-08-29 | Etapa 12 — Criar tooltips para conceitos financeiros | Concluído | Tooltips financeiros foram padronizados com textos curtos, quebra de linha, limite responsivo, suporte a foco e semântica acessível. | src/components/ui.tsx, src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 13 — Revisar página de Cartões como tela de detalhe | Concluído | Página Cartões passou a organizar cartões por titular com resumo agregado antes dos detalhes individuais, mantendo faturas, limites, parcelas futuras, calendário e compras no fluxo de detalhe. | src/pages/CartoesPage.tsx |
| 2026-08-31 | Etapa 14 — Revisar página de Projeção como tela de futuro | Concluído | Projeção passou a concentrar análise futura com resumo de 12 meses, risco futuro, maior fatura, maior comprometimento e seletor de horizonte para gráficos e tabela. | src/pages/ProjecaoPage.tsx |
| 2026-08-31 | Etapa 15 — Revisar página de Dívidas | Concluído | Página Dívidas passou a concentrar análise de endividamento com resumo por responsável, prioridade de acompanhamento, status das dívidas e cards individuais mais completos. | src/pages/DividasPage.tsx |
| 2026-08-31 | Etapa 16 — Padronizar "Ver detalhes" | Concluído | CTAs secundários da Home foram padronizados como "Ver <destino>" com estilo único, seta e foco acessível. | src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 17 — Criar modo resumido e expandido opcional | Concluído | Dashboard passou a abrir mais limpo, com Cartões, Próximos meses, Saúde financeira e gráfico em modo resumido e expansão opcional por bloco. | src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 18 — Reduzir bordas, caixas e ruído visual | Concluído | Itens internos do Dashboard perderam bordas/caixas redundantes e passaram a usar fundo sutil, espaçamento e separadores simples. | src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 19 — Padronizar tipografia e peso visual | Concluído | Dashboard e StatCard passaram a usar escalas tipográficas centralizadas para títulos, labels, valores, textos secundários e ajuda/contexto. | src/components/ui.tsx, src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 20 — Padronizar uso de cores de status | Concluído | Cores do Dashboard foram ajustadas para comunicar estado, deixando números contábeis neutros e mantendo verde/amarelo/vermelho para saudável/atenção/crítico. | src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 21 — Revisar Dashboard em resoluções menores | Concluído | Dashboard recebeu ajustes de grid, quebra de valores, header e ranking para evitar overflow horizontal e manter CTAs acessíveis em telas menores. | src/components/ui.tsx, src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 22 — Revisar interação, teclado e acessibilidade | Concluído | Cards clicáveis, botões de expansão, alertas, ranking, saúde financeira e modal de detalhes foram revisados com semântica, foco e atributos ARIA. | src/components/ui.tsx, src/pages/DashboardPage.tsx |
| 2026-08-31 | Etapa 23 — Auditoria final de clareza do Dashboard | Concluído | Dashboard foi auditado para responder rapidamente às 8 perguntas principais, manter números sem duplicidade desnecessária e preservar detalhes por modal/navegação, com regiões semânticas nos blocos finais. | src/pages/DashboardPage.tsx |

---

# FORMATO DE RESPOSTA OBRIGATÓRIO AO FINALIZAR CADA ETAPA

Quando concluir:

```text
✅ Etapa XX — <nome> concluída.

Implementado:
- ...
- ...

Removido/simplificado:
- ...
- ...

Validado:
- npm test
- npm run typecheck
- npm run lint
- npm run build
- validação visual/manual

Notas registradas em PLANO_EVOLUCAO_UX_NEXO.md.

Aguardando autorização para iniciar a Etapa XX+1.
```

Quando houver bloqueio:

```text
⚠️ Etapa XX bloqueada.

Motivo:
...

Impacto:
...

Decisão necessária:
...

Nenhuma etapa seguinte foi iniciada.
```

---

# REGRA FINAL PARA O AGENTE

Este plano não é um pedido para redesenhar tudo.

O objetivo é **reduzir**, **organizar** e **facilitar**.

Antes de adicionar qualquer elemento novo, perguntar internamente:

```text
Isso realmente precisa estar na Home?
```

Se a resposta for não:

- resumir;
- mover;
- esconder sob detalhe;
- ou remover.

A prioridade máxima deste plano é:

> O usuário deve entender a situação financeira antes de começar a analisar os detalhes.

A segunda prioridade é:

> Nenhuma simplificação visual pode comprometer a confiabilidade dos números já validados.
