# Plano de Evolução — Fluxo de Caixa por Conta no NEXO

## Objetivo

Evoluir o NEXO para que receitas, despesas, faturas, dívidas, transferências e movimentações financeiras reflitam corretamente **onde o dinheiro entra, de onde ele sai, quanto existe de fato em cada conta e como esse saldo evolui ao longo do tempo**, sem dupla contagem e sem quebrar o motor financeiro existente.

Este documento substitui a organização anterior do plano a partir da Etapa 11.

As Etapas 01 a 10 já concluídas permanecem válidas e não devem ser refeitas, salvo se uma etapa futura exigir ajuste explícito e documentado.

A partir desta revisão, a área de Contas deve funcionar de forma semelhante à experiência de aplicativos bancários:

```text
Lista de contas
      ↓
Abrir conta
      ↓
Dados da conta no topo
      ↓
Saldo / ações
      ↓
Extrato completo abaixo
```

Não utilizar modal como experiência principal para visualizar ou editar uma conta.

---

# DEFINIÇÕES DE DOMÍNIO

## 1. Receita/despesa são fluxo; conta é estoque de dinheiro

Exemplo:

```text
Saldo inicial Itaú: R$ 10
Receita recebida:  +R$ 10

Saldo atual Itaú:   R$ 20
```

No Dashboard:

```text
Entradas do mês:    R$ 10
Saldo disponível:   R$ 20
```

Nunca:

```text
Entradas = R$ 20
```

porque os R$ 10 iniciais não pertencem à receita do mês.

---

## 2. Resultado do mês é diferente de saldo disponível

```text
Resultado do mês
= receitas - despesas
```

```text
Saldo disponível
= soma dos saldos atuais das contas
```

O Dashboard deve mostrar os dois conceitos de forma clara.

---

## 3. Saldo negativo da conta não vira despesa automaticamente

Uma conta em:

```text
-R$ 2.000
```

representa posição bancária negativa.

Não significa automaticamente:

```text
Despesa do mês = R$ 2.000
```

---

## 4. Transferências são neutras globalmente

```text
Itaú   -R$ 1.000
Nubank +R$ 1.000
```

Resultado global:

```text
Receita: 0
Despesa: 0
Patrimônio bancário total: sem alteração
```

---

## 5. Toda alteração real de saldo deve ser explicável pelo extrato

O saldo deve ser reconstruível por:

```text
Saldo inicial
+ recebimentos
- pagamentos
+ transferências recebidas
- transferências enviadas
+ ajustes
+ estornos
= saldo atual
```

---

# REGRAS DE UX PARA CONTAS

## Conta deve possuir página própria

A tela principal de Contas mostra apenas resumo e lista.

Ao selecionar uma conta, abrir uma tela dedicada, por exemplo:

```text
/contas/:accountId
```

A página da conta deve concentrar:

- dados bancários;
- saldo;
- conciliação;
- edição;
- extrato;
- movimentações;
- estornos;
- histórico.

Editar a conta não deve abrir modal principal.

Fluxo:

```text
Contas
→ abrir conta
→ página da conta
→ Editar
→ edição na própria tela
```

---

## Dados da conta

### Obrigatórios

- Banco
- Titular
- Saldo

### Opcionais

- Tipo de conta
- Agência
- Número da conta
- Observação

### Remover

O campo:

```text
Nome da conta
```

não deve mais ser obrigatório nem fazer parte da experiência principal.

A conta deve ser identificada principalmente por:

```text
Banco
Titular
```

Se for necessário manter `name` temporariamente por compatibilidade, ele deve ser tratado como legado/interno até migration segura.

---

## Tipos de conta

O campo é opcional.

Sugestões iniciais:

```text
Conta Corrente (C.C.)
Conta Poupança (C.P.)
Conta de Pagamento
Conta Salário
Conta Digital
Conta Investimento
Outra
```

Não limitar arquitetura somente a essas opções se o projeto já permitir enum extensível.

---

## Privacidade dos valores

Deve existir botão global:

```text
👁 Olho aberto  → valores visíveis
👁 Olho fechado → valores ocultos
```

Quando fechado, **todos os valores financeiros visíveis na aplicação** devem ficar ocultos, não apenas o saldo das contas.

Exemplo:

```text
Saldo
R$ ••••••
```

Deve ocultar:

- saldos;
- receitas;
- despesas;
- faturas;
- dívidas;
- projeções;
- objetivos futuros;
- valores em extratos;
- totais e subtotais.

Não esconder:

- nomes;
- datas;
- categorias;
- status;
- textos.

A preferência deve ser consistente durante a sessão e, se a arquitetura permitir com segurança, persistida por usuário/dispositivo.

---

## Tema claro e escuro

O NEXO deve suportar:

```text
Claro
Escuro
Sistema
```

Todas as telas novas e alteradas neste plano devem funcionar nos dois temas.

Não criar cores hardcoded que funcionem apenas no tema claro.

---

## Tooltips

Corrigir comportamento observado nos ícones de edição:

```text
hover/focus → tooltip aparece
click       → tooltip fecha imediatamente
modal/tela  → tooltip anterior não permanece sobreposto
```

Nenhum tooltip pode ficar visível por cima de modal, drawer ou navegação depois da ação ter sido executada.

---

# INSTRUÇÕES DE EXECUÇÃO PARA O CODEX

## Regra principal

Execute **uma etapa por vez**.

Não implemente duas etapas simultaneamente.

Não antecipe etapas futuras.

Ao iniciar uma etapa:

1. Leia completamente a etapa atual.
2. Analise o código existente relacionado.
3. Identifique arquivos e dependências.
4. Reutilize o motor financeiro atual.
5. Não recrie cálculo financeiro na UI.
6. Preserve dados já existentes.
7. Implemente somente a etapa atual.
8. Rode:
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
9. Faça validação visual/manual.
10. Validar tema claro e escuro quando houver UI.
11. Atualize `Notas de implementação`.
12. Atualize `Histórico de execução`.
13. Marque `[x]` somente quando todos os critérios forem atendidos.
14. Pare.
15. Aguarde autorização.

Resposta:

> Etapa XX concluída. Alterações implementadas e validadas. Aguardando autorização para iniciar a próxima etapa.

**Nunca iniciar automaticamente a etapa seguinte.**

---

# REGRA DE SEGURANÇA

- Não transformar saldo bancário em receita.
- Não transformar saldo negativo em despesa.
- Não duplicar movimentações.
- Não gerar pagamento duas vezes.
- Não gerar recebimento duas vezes.
- Não gerar estorno duas vezes.
- Não contar transferência como receita/despesa.
- Não apagar histórico para simular estorno.
- Não remover campos legados sem migration.
- Toda ação que altera saldo deve ser confirmada.
- Operações devem ser idempotentes.
- Dashboard não deve somar saldo atual novamente às receitas.
- Objetivos Financeiros permanecem fora deste plano até a preparação final.

Se houver divergência:

```text
[!] BLOQUEADO
```

Documentar e aguardar decisão.

---

# CONVENÇÕES

Status:

- `[ ]` Pendente
- `[~]` Em andamento
- `[x]` Concluído
- `[!]` Bloqueado

Prioridade:

- **P0** — integridade financeira
- **P1** — fluxo principal
- **P2** — experiência/automação
- **P3** — refinamento

---

# ETAPAS JÁ CONCLUÍDAS

## ETAPA 01 — Criar o modelo de movimentações bancárias

**Status:** [x]

Concluído:

- `AccountTransaction`;
- tipos de movimentação;
- `AppData.accountTransactions`;
- migration compatível;
- persistência local/Supabase;
- testes.

---

## ETAPA 02 — Formalizar saldo inicial por conta

**Status:** [x]

Concluído:

- `initial_balance`;
- compatibilidade com `BankAccount.balance`;
- migration idempotente;
- novas contas com origem contábil.

---

## ETAPA 03 — Criar funções centrais do ledger

**Status:** [x]

Concluído:

- filtros;
- soma;
- saldo;
- busca por entidade;
- reversões;
- idempotência;
- proteção contra valores inválidos.

---

## ETAPA 04 — Calcular saldo por ledger

**Status:** [x]

Concluído:

- saldo reconstruível por conta;
- saldo total por ledger;
- comparação com `BankAccount.balance`;
- detecção de divergências.

---

## ETAPA 05 — Criar conciliação de saldo

**Status:** [x]

Concluído:

- saldo informado;
- saldo calculado;
- diferença;
- `manual_adjustment`;
- snapshot;
- atualização compatível de `BankAccount.balance`.

Observação:

A experiência visual desta funcionalidade será reorganizada na página própria da conta em etapa futura.

---

## ETAPA 06 — Vincular receita à conta destino

**Status:** [x]

Concluído:

- `Income.defaultAccountId`;
- UI de conta destino;
- migration;
- alerta para conta removida.

---

## ETAPA 07 — Criar recebimento mensal de receita

**Status:** [x]

Concluído:

- `IncomeReceipt`;
- conta;
- data;
- valor;
- `income_receipt`;
- saldo bancário atualizado;
- idempotência.

---

## ETAPA 08 — Permitir desfazer recebimento

**Status:** [x]

Concluído:

- reversão;
- saldo restaurado;
- histórico preservado;
- proteção contra estorno duplicado.

---

## ETAPA 09 — Vincular pagamento de gasto à conta

**Status:** [x]

Concluído:

- `ExpensePayment`;
- conta;
- data;
- valor;
- `expense_payment`;
- redução do saldo;
- compatibilidade com `paidMonths`.

---

## ETAPA 10 — Estornar pagamento de gasto

**Status:** [x]

Concluído:

- reversão do pagamento;
- saldo devolvido;
- status mensal restaurado;
- histórico preservado;
- idempotência.

---

# FASE 5 — REESTRUTURAÇÃO DA ÁREA DE CONTAS

## ETAPA 11 — Evoluir o model cadastral de conta

**Status:** [x]
**Prioridade:** P1

### Objetivo

Adequar `BankAccount` à nova experiência.

### Dados

Obrigatórios:

```text
Banco
Titular
Saldo
```

Opcionais:

```text
Tipo de conta
Agência
Número da conta
Observação
```

### Remover da experiência

```text
Nome da conta
```

### Compatibilidade

Se atualmente existir:

```ts
name: string
```

não remover de forma destrutiva sem avaliar migration.

Pode:

- manter como legado temporário;
- preencher valor compatível em migration;
- parar de exigir/exibir na UI;
- remover definitivamente somente após auditoria.

### Sugestão conceitual

```ts
interface BankAccount {
  id: string;
  bank: string;
  holder: string;
  balance: number;

  accountType?: BankAccountType | null;
  agency?: string | null;
  accountNumber?: string | null;
  note?: string;

  name?: string; // legado temporário, se necessário
}
```

### Critérios de aceite

- [x] Banco obrigatório.
- [x] Titular obrigatório.
- [x] Saldo obrigatório.
- [x] Tipo opcional.
- [x] Agência opcional.
- [x] Número da conta opcional.
- [x] Observação opcional.
- [x] Nome da conta não é solicitado na UI.
- [x] Dados existentes continuam abrindo.
- [x] Migration segura.

### Notas de implementação

```text
Model:
- `BankAccount` passa a ter banco, titular, saldo, tipo, agência, número da conta e observação; `name` permanece opcional como legado.
- `BankAccountType` centraliza os tipos aceitos.

Migration:
- `migrateBankAccount` preserva dados antigos com `name` e preenche um rótulo compatível quando o backup não possui nome.
- Novos campos opcionais recebem fallback seguro para `null`.

UI:
- Cadastro/edição de contas não solicita mais "Nome da conta".
- Banco, titular e saldo são obrigatórios; tipo, agência, número da conta e observação são opcionais.
- Listas, histórico, conciliação e seletores usam rótulo gerado por banco/titular.

Arquivos:
- `src/lib/types.ts`
- `src/lib/storage.ts`
- `src/lib/finance/accountRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/ContasPage.tsx`
- `src/pages/ReceitasPage.tsx`
- `src/pages/PlanejamentoPage.tsx`
- `src/pages/GastosPage.tsx`
- `test/finance.test.ts`

Testes:
- `npm run typecheck`
- `npm test`
- `npm run lint` (sem erros; warnings existentes de Fast Refresh)
- `npm run build` (sucesso; warning existente de chunk grande/Browserslist)
```

---

## ETAPA 12 — Criar página de detalhe da conta

**Status:** [x]
**Prioridade:** P1

### Objetivo

Substituir a experiência baseada em modal por página dedicada.

### Navegação

```text
Contas
→ selecionar uma conta
→ /contas/:accountId
```

### Topo da tela

Mostrar:

```text
Banco
Titular
Tipo (se houver)
Agência (se houver)
Conta (se houver)
Observação (se houver)

Saldo atual
Saldo por ledger
Status de conciliação
```

### Ações

```text
Editar
Atualizar/Conciliar saldo
```

Transferência **não deve ficar como ação exclusiva interna da conta**.

Ela será ação global da área de Contas.

### Edição

Ao clicar em `Editar`:

- permanecer no contexto da página da conta;
- usar modo de edição na própria página ou rota equivalente;
- não depender de modal central.

### Critérios de aceite

- [x] Cada conta possui URL/tela própria.
- [x] Card/lista abre a página.
- [x] Dados aparecem no topo.
- [x] Edição ocorre no contexto da página.
- [x] Conta inexistente é tratada.
- [x] Responsivo.
- [x] Tema claro.
- [x] Tema escuro.
- [x] Navegação por teclado.

### Notas de implementação

```text
Rota:
- `/contas` abre a lista de contas.
- `/contas/:accountId` abre a página dedicada da conta.
- A navegação interna preserva histórico do navegador e trata `popstate`.

Layout:
- Lista permanece como resumo/cards, sem ações de editar, excluir ou atualizar saldo nos cards.
- O card inteiro atua como entrada para a página dedicada da conta.
- Página de detalhe mostra banco, titular, tipo, agência, conta, observação, saldo atual, saldo por ledger e status de conciliação no topo.
- Conta inexistente exibe estado vazio com retorno para a lista.

Edição:
- Edição acontece dentro da página dedicada, sem modal principal.
- Exclusão e atualização/conciliação de saldo ficam dentro da página dedicada da conta.
- Criação de nova conta permanece no fluxo existente.

Arquivos:
- `src/App.tsx`
- `src/pages/ContasPage.tsx`
```

---

## ETAPA 13 — Criar extrato dentro da página da conta

**Status:** [x]
**Prioridade:** P1

### Objetivo

O extrato deve ficar **abaixo dos dados da conta**, como em aplicativo bancário.

### Exemplo

```text
Itaú
Lucas
C.C. • Ag 1234 • Conta 56789-0

Saldo atual
R$ 8.300,00

--------------------------------

Extrato

15/09  Salário Lucas
        Recebimento
        + R$ 10.000

16/09  Aluguel
        Pagamento
        - R$ 2.000

17/09  Transferência para Nubank
        - R$ 1.000

18/09  Estorno Energia
        + R$ 300
```

### Cada movimentação deve mostrar

- data;
- descrição;
- tipo;
- valor;
- origem relacionada;
- destino/origem quando transferência;
- sinal de estorno;
- saldo após a movimentação quando tecnicamente confiável.

### Filtros

- mês;
- tipo;
- entradas/saídas;
- busca simples, se já houver infraestrutura adequada.

### Regra

Não criar uma página global de extrato como experiência principal.

A origem principal do extrato é:

```text
Conta → Extrato
```

Uma visão global poderá existir futuramente como complemento.

### Critérios de aceite

- [x] Extrato abaixo dos dados.
- [x] Ordem cronológica correta.
- [x] Movimentações explicáveis.
- [x] Estornos visíveis.
- [x] Transferências mostram contraparte.
- [x] Filtro mensal.
- [x] Tema claro/escuro.
- [~] Valores respeitam modo oculto.

### Notas de implementação

```text
Extrato:
- Extrato renderizado abaixo do topo da página dedicada da conta.
- Movimentações usam o ledger central ordenado cronologicamente.
- Cada linha mostra data, título, tipo, valor, origem relacionada e saldo após a movimentação.
- Estornos recebem identificação visual própria e referência da transação estornada quando disponível.
- Transferências buscam contraparte pelo identificador relacionado e exibem origem/destino quando houver a segunda perna.

Filtros:
- Mês.
- Tipo de movimentação.
- Entradas/saídas.
- Busca simples por descrição, origem, tipo ou data.

Arquivos:
- `src/pages/ContasPage.tsx`

Observação:
- A aplicação ainda não possui o modo global de ocultação de valores; esse estado será criado na Etapa 14. O extrato concentra seus valores em pontos explícitos de renderização para integração direta com esse modo.
```

---

## ETAPA 14 — Criar privacidade global de valores

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Adicionar controle global com ícone de olho.

### Estados

```text
VISIBLE
HIDDEN
```

### Regra

Olho aberto:

```text
R$ 8.300,00
```

Olho fechado:

```text
R$ ••••••
```

### Escopo

Ocultar valores em toda a aplicação:

- Dashboard;
- Contas;
- extrato;
- Receitas;
- Gastos;
- Planejamento;
- Cartões;
- Dívidas;
- Projeção;
- Análise;
- módulos futuros.

### Arquitetura

Não espalhar condições manuais em cada valor se puder existir um componente/helper central, por exemplo:

```text
MoneyValue
PrivacyAmount
useMoneyVisibility
```

### Critérios de aceite

- [x] Um único controle altera toda a aplicação.
- [x] Estado visual do olho é claro.
- [x] Valores ficam realmente ocultos.
- [x] Labels permanecem visíveis.
- [x] Não há flash indevido de valores ao navegar.
- [x] Funciona em desktop/tablet/mobile.
- [x] Acessível por teclado.
- [x] `aria-label` informa Mostrar/Ocultar valores.

### Notas de implementação

```text
State:
- Estado global carregado no início da aplicação por `areMoneyValuesHidden`.
- Alternância centralizada em `AppContent`, provocando nova renderização da aplicação.

Componente:
- Botão global no topo do layout com `Eye` / `EyeOff`.
- `formatCurrency` e `formatCurrencyShort` mascaram valores como `R$ ••••••`.
- `CurrencyInput` mostra `••••••` e fica somente leitura quando a privacidade está ativa.
- Textos financeiros do motor de projeção usam o formatador central para respeitar a privacidade.

Persistência:
- Preferência persistida por dispositivo em `localStorage`.
- Leitura inicial ocorre antes da primeira renderização autenticada para evitar flash indevido.

Arquivos:
- `src/lib/format.ts`
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/components/ui.tsx`
- `src/lib/finance/projection.ts`
```

---

## ETAPA 15 — Implementar tema claro, escuro e sistema

**Status:** [x]  
**Prioridade:** P2

### Objetivo

Suportar:

```text
Claro
Escuro
Sistema
```

### Escopo

Aplicar a toda a aplicação, começando pelas páginas e componentes alterados neste plano.

Revisar:

- backgrounds;
- cards;
- modais;
- inputs;
- tabelas;
- extrato;
- gráficos;
- tooltips;
- estados de erro;
- alertas;
- hover/focus.

### Regra

Não usar cores fixas que prejudiquem o tema oposto.

### Critérios de aceite

- [x] Claro funciona.
- [x] Escuro funciona.
- [x] Sistema acompanha preferência do SO/navegador.
- [x] Contraste adequado.
- [x] Gráficos continuam legíveis.
- [x] Tooltips legíveis.
- [x] Preferência persistida.

### Notas de implementação

```text
Theme:
- Criado modo `light`, `dark` e `system`.
- Preferência lida no início da aplicação e aplicada no `documentElement`.
- Modo `system` acompanha `prefers-color-scheme` enquanto ativo.
- `color-scheme` acompanha o tema resolvido.

Tokens/classes:
- Overrides globais para utilitários Tailwind de fundo, texto, borda, hover, divisão, sombras, inputs e tooltips/gráficos.
- Seletor segmentado no topo com ícones para claro, escuro e sistema.
- Controle fica acessível em desktop/tablet/mobile.

Arquivos:
- `src/lib/theme.ts`
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/index.css`
```

---

## ETAPA 16 — Corrigir lifecycle e sobreposição de tooltips

**Status:** [x]  
**Prioridade:** P2

### Problema confirmado

Tooltip do ícone de edição permanece visível após o clique e aparece por cima da modal/tela aberta.

### Regra global

```text
hover/focus → abre
mouseleave/blur → fecha
click → fecha antes da ação
modal/dialog/navigation → tooltip anterior fechado
```

### Validar

- lápis;
- excluir;
- olho;
- ações de cards;
- demais tooltips compartilhados.

### Critérios de aceite

- [x] Tooltip nunca fica preso.
- [x] Tooltip não aparece sobre modal após ação.
- [x] Click fecha tooltip.
- [x] Escape/modal não deixa tooltip órfão.
- [x] Mouse e teclado funcionam.
- [x] Tema claro/escuro.

### Notas de implementação

```text
Causa:
- Tooltip era renderizado em portal com `z-[9999]`, ficando acima de modais.
- Clique no elemento filho não limpava timer/estado do tooltip antes da ação abrir modal ou navegar.

Correção:
- `Tooltip` central passou a limpar timer e estado em `mouseleave`, `blur`, `pointerdown`, `Escape`, `scroll`, `resize`, `popstate` e evento global `nexo:close-tooltips`.
- `Modal` dispara `nexo:close-tooltips` ao abrir.
- Portal do tooltip passou para `z-40`, abaixo do modal (`z-50`).

Componentes:
- `Tooltip`
- `Modal`
- `IconButton` herda o comportamento pelo tooltip compartilhado.

Arquivos:
- `src/components/ui.tsx`
```

---

# FASE 6 — CONFIRMAÇÕES DE MOVIMENTAÇÕES

## ETAPA 17 — Padronizar confirmação antes de alterar saldo

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Toda ação que altera saldo deve mostrar confirmação antes de efetivar.

### Recebimento

```text
Confirmar recebimento?

Salário Lucas
R$ 10.000
Conta: Itaú
Data: 05/09/2026

Saldo atual: R$ 2.000
Saldo após:  R$ 12.000
```

### Pagamento

```text
Confirmar pagamento?

Energia
R$ 300
Conta: Nubank

Saldo atual: R$ 500
Saldo após:  R$ 200
```

### Estorno

```text
Desfazer pagamento?

O valor de R$ 300 retornará para Nubank.
```

### Saldo insuficiente

Não bloquear obrigatoriamente.

Mostrar:

```text
Atenção
Este pagamento deixará a conta em -R$ 100.
```

Oferecer:

```text
Cancelar
Escolher outra conta
Continuar mesmo assim
```

### Critérios de aceite

- [x] Recebimento exige confirmação final.
- [x] Pagamento exige confirmação final.
- [x] Estorno exige confirmação.
- [x] Saldo antes/depois aparece quando aplicável.
- [x] Valor negativo gera alerta.
- [x] Nada é gravado antes da confirmação.
- [x] Duplo clique não duplica evento.

### Notas de implementação

```text
Componente:
- Criado `BalanceChangeConfirmDialog` para padronizar confirmação de alterações de saldo.
- O componente mostra item, valor, conta, data, saldo atual, saldo após e alerta opcional.
- Pagamento com saldo após negativo exibe alerta e oferece `Cancelar`, `Escolher outra conta` e `Continuar mesmo assim`.

Fluxos:
- Recebimento de receita coleta dados no modal existente e só grava após confirmação final.
- Estorno de recebimento exige confirmação antes de chamar `undoIncomeReceipt`.
- Pagamento de gasto em `Gastos` coleta dados no modal existente e só grava após confirmação final.
- Estorno de pagamento em `Gastos` exige confirmação antes de chamar `undoExpensePayment`.
- Pagamento/estorno de gastos em `Planejamento` passam pelo mesmo fluxo de confirmação.
- Idempotência permanece protegida nas funções centrais do `DataContext`.

Arquivos:
- `src/components/ui.tsx`
- `src/pages/ReceitasPage.tsx`
- `src/pages/GastosPage.tsx`
- `src/pages/PlanejamentoPage.tsx`
```

---

# FASE 7 — FATURAS DE CARTÃO

## ETAPA 18 — Registrar conta pagadora da fatura

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Ao pagar:

```text
Fatura Nubank
R$ 2.500
Conta pagadora: Itaú
Data: 10/09/2026
```

Gerar:

```text
card_invoice_payment -R$ 2.500
```

### Regra

A fatura já faz parte das despesas.

O ledger apenas informa de onde o dinheiro saiu.

### Critérios de aceite

- [x] Conta obrigatória.
- [x] Confirmação antes do pagamento.
- [x] Valor correto.
- [x] Saldo antes/depois.
- [x] Saldo reduz.
- [x] Sem dupla contagem.
- [x] Movimento aparece no extrato da conta.

### Notas de implementação

```text
Model:
- CardInvoicePayment vincula cartão, mês da fatura, conta, data, valor e transação do ledger.
- AppData ganhou `cardInvoicePayments`, migration e seed com array vazio.

Fluxo:
- Detalhe do cartão abre modal "Pagar fatura" com conta obrigatória e data.
- Confirmação mostra valor da fatura, conta, saldo atual e saldo após.
- `payCardInvoice` cria transação `card_invoice_payment` negativa, reduz saldo da conta e marca a fatura como paga.
- Listagem inicial de cartões mantém apenas abertura do detalhe; ações ficam dentro do cartão.

Arquivos:
- `src/lib/types.ts`
- `src/lib/seed.ts`
- `src/lib/storage.ts`
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/CartoesPage.tsx`
- `test/finance.test.ts`
```

---

## ETAPA 19 — Estornar pagamento de fatura

**Status:** [x]  
**Prioridade:** P0

### Critérios de aceite

- [x] Confirmação antes de estornar.
- [x] Fatura volta a pendente.
- [x] Valor retorna à conta.
- [x] Movimento original preservado.
- [x] `reversal` aparece no extrato.
- [x] Limite do cartão continua correto.
- [x] Idempotência.

### Notas de implementação

```text
Fluxo:
- Detalhe do cartão troca fatura paga para ação "Desfazer pagamento".
- Confirmação reutiliza `BalanceChangeConfirmDialog`, mostrando conta, saldo atual e saldo após devolução.
- `undoCardInvoicePayment` remove o vínculo `CardInvoicePayment`, desmarca a fatura e cria transação `reversal`.
- Faturas legadas marcadas como pagas sem vínculo bancário podem ser desmarcadas sem gerar movimento.
- Reversão é idempotente: pagamento já estornado não cria nova reversão.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/CartoesPage.tsx`
- `test/finance.test.ts`
```

---

# FASE 8 — DÍVIDAS

## ETAPA 20 — Criar pagamento mensal de dívida por conta

**Status:** [x]  
**Prioridade:** P0

### Objetivo

```text
Empréstimo
Parcela R$ 700
Conta: Santander
Data: 15/09
```

Gerar:

```text
debt_payment -R$ 700
```

### Critérios de aceite

- [x] Estado mensal.
- [x] Conta.
- [x] Data.
- [x] Valor real.
- [x] Confirmação.
- [x] Saldo reduz.
- [x] Extrato recebe movimento.
- [x] Projeção de dívida continua coerente.

### Notas de implementação

```text
Model:
- DebtPayment vincula dívida, competência, conta, data, valor previsto, valor pago e transação.
- AppData ganhou `debtPayments`, migration e seed com array vazio.

Fluxo:
- Dívidas ativas exibem ação "Pagar parcela" quando há parcela prevista e ainda não paga no mês.
- Pagamento abre modal com data, valor real e conta obrigatória.
- Confirmação mostra conta, saldo atual e saldo após, com alerta se o saldo ficar negativo.
- `payDebt` cria transação `debt_payment` negativa, reduz saldo da conta e registra estado mensal.
- Projeção e resumo mensal continuam contando a parcela da dívida uma única vez.

Arquivos:
- `src/lib/types.ts`
- `src/lib/seed.ts`
- `src/lib/storage.ts`
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/DividasPage.tsx`
- `test/finance.test.ts`
```

---

## ETAPA 21 — Estornar pagamento mensal de dívida

**Status:** [x]  
**Prioridade:** P0

### Critérios de aceite

- [x] Confirmação.
- [x] Parcela retorna a pendente.
- [x] Saldo retorna.
- [x] Estorno no extrato.
- [x] Histórico preservado.
- [x] Idempotência.

### Notas de implementação

```text
Fluxo:
- Dívida paga no mês exibe ação "Desfazer pagamento".
- Confirmação mostra conta, saldo atual e saldo após devolução.
- `undoDebtPayment` remove o `DebtPayment`, preserva a transação original e cria `reversal`.
- Parcela volta a ficar pendente porque o estado mensal é removido.
- Reversão é idempotente: pagamento já estornado não gera nova reversão.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/DividasPage.tsx`
- `test/finance.test.ts`
```

---

# FASE 9 — TRANSFERÊNCIAS ENTRE CONTAS

## ETAPA 22 — Criar transferência global entre contas

**Status:** [x]  
**Prioridade:** P1

### UX

Na tela principal `Contas`:

```text
[Transferir saldo] [+ Nova conta]
```

A transferência é ação **global**, não ação escondida dentro de uma conta específica.

### Formulário

```text
Conta de origem
Conta de destino
Valor
Data
Observação opcional
```

### Preview

```text
Itaú
Atual: R$ 3.000
Depois: R$ 2.000

Nubank
Atual: R$ 500
Depois: R$ 1.500
```

### Ledger

```text
Itaú   transfer_out -R$ 1.000
Nubank transfer_in  +R$ 1.000
```

### Regras

- origem != destino;
- valor > 0;
- confirmação obrigatória;
- saldo negativo permitido apenas após alerta explícito;
- não altera receita/despesa global.

### Critérios de aceite

- [x] Botão global.
- [x] Duas pernas.
- [x] Mesmo identificador de transferência.
- [x] Confirmação.
- [x] Preview antes/depois.
- [x] Extrato de ambas as contas.
- [x] Total bancário não muda.
- [x] Sem receita/despesa.

### Notas de implementação

```text
Model:
- Transferência usa duas `AccountTransaction` com `relatedEntityType: transfer` e mesmo `relatedEntityId`.
- Não cria receita, despesa ou entidade separada nesta etapa.

UI:
- Botão global "Transferir saldo" na tela principal de Contas, ao lado de "Nova conta".
- Modal coleta origem, destino, valor, data e observação opcional.
- Confirmação mostra preview antes/depois das duas contas.
- Saldo negativo na origem exibe alerta explícito antes de confirmar.
- `transferBalance` grava `transfer_out` e `transfer_in` em uma única atualização.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/ContasPage.tsx`
- `test/finance.test.ts`
```

---

## ETAPA 23 — Permitir estorno de transferência

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Desfazer uma transferência deve gerar reversão nas duas contas.

Não apagar as pernas originais.

### Critérios de aceite

- [x] Confirmação.
- [x] Duas reversões consistentes.
- [x] Saldos restaurados.
- [x] Histórico preservado em ambas.
- [x] Sem efeito em receita/despesa.
- [x] Idempotência.

### Notas de implementação

```text
Fluxo:
- Extrato das contas mostra ação "Estornar transferência" para pernas originais ainda não estornadas.
- Confirmação informa que as pernas originais serão preservadas e mostra o impacto de retorno nas duas contas.
- `undoTransfer` localiza as duas pernas pelo `relatedEntityId` compartilhado e cria duas transações `reversal`.
- Saldos das duas contas são restaurados em uma única atualização.
- Estorno é idempotente: transferência já estornada não gera novas reversões.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/ContasPage.tsx`
- `test/finance.test.ts`
```

---

# FASE 10 — DASHBOARD E LEITURA DE CAIXA

## ETAPA 24 — Separar Resultado do mês de Saldo disponível

**Status:** [x]
**Prioridade:** P0

### Objetivo

Eliminar ambiguidade do atual `Saldo do mês`.

### Conceitos

```text
Entradas do mês
= receitas do mês
```

```text
Saídas do mês
= despesas do mês conforme regra oficial do motor
```

```text
Resultado do mês
= receitas - despesas
```

```text
Saldo disponível
= soma atual dos saldos das contas
```

### Exemplo

```text
Saldo inicial em contas: R$ 3.000
Entradas do mês:        R$ 10.000
Saídas do mês:          R$  2.300
Resultado do mês:       R$  7.700
Saldo disponível:       R$ 10.700
```

### Importante

Nunca:

```text
Entradas = saldo das contas + receitas
```

### Dashboard

Revisar hierarquia para que o usuário encontre:

- Entradas;
- Saídas;
- A pagar;
- Resultado do mês;
- Saldo disponível.

Não necessariamente todos como cards de mesmo peso.

Manter Home simples conforme plano de UX já concluído.

### Critérios de aceite

- [x] Saldo inicial considerado no caixa.
- [x] Receita recebida já presente na conta não é duplicada.
- [x] Resultado e saldo disponível são distintos.
- [x] Transferências não alteram resultado.
- [x] Estornos alteram saldo corretamente.
- [x] Valores batem com Contas.
- [x] Tooltips explicam diferença.

### Notas de implementação

```text
Layout:
- Dashboard troca "Saldo do mês" por "Resultado do mês".
- Novo card "Saldo disponível" mostra a soma atual das contas.
- Drilldown de resultado mostra entradas, saídas e resultado.
- Drilldown de saldo disponível lista as contas e seus saldos.
- Gráfico troca série "Saldo" por "Resultado".

Conceitos:
- Resultado do mês = receitas do mês - saídas do mês.
- Saldo disponível = soma atual dos saldos das contas.
- Tooltips explicam que entradas não incluem saldo inicial/dinheiro já existente.
- Transferências internas seguem fora de receitas/despesas e não alteram resultado.

Arquivos:
- `src/pages/DashboardPage.tsx`
- `test/finance.test.ts`
```

---

# FASE 11 — PROJEÇÃO POR CONTA

## ETAPA 25 — Criar projeção mensal por conta

**Status:** [x]
**Prioridade:** P0

### Fórmula por conta

```text
Saldo inicial
+ receitas previstas destinadas à conta
- pagamentos previstos pela conta
+ transferências previstas recebidas
- transferências previstas enviadas
= saldo final
```

### Encadeamento

```text
Saldo final Setembro
→ Saldo inicial Outubro
```

### Critérios de aceite

- [x] Cada conta tem projeção.
- [x] Saldo final encadeia mês seguinte.
- [x] Agregado = soma das contas.
- [x] Transferências anulam no agregado.
- [x] Sem dupla contagem.

### Notas de implementação

```text
Engine:
- Criado `projectAccountsByMonth` em `accountRules`.
- Cada conta recebe saldo inicial, receitas destinadas, pagamentos registrados por conta, transferências e saldo final.
- Saldo final de cada conta encadeia como saldo inicial do mês seguinte.
- Agregado mensal soma os saldos/fluxos das contas.
- Transferências entram nas duas contas e anulam no agregado.

Arquivos:
- `src/lib/finance/accountRules.ts`
- `test/finance.test.ts`
```

---

## ETAPA 26 — Evoluir `projectMonths` preservando compatibilidade

**Status:** [x]
**Prioridade:** P0

### Preservar

```text
income
totalExpenses
balance
```

Adicionar conceitos novos, sem mudar silenciosamente os antigos.

### Possíveis campos

```ts
accountCashflow
openingAccountsBalance
closingAccountsBalance
availableAccountsBalance
```

### Critérios de aceite

- [x] Dashboard funciona.
- [x] Planejamento funciona.
- [x] Projeção funciona.
- [x] Análise funciona.
- [x] Testes antigos continuam passando.
- [x] Novos campos centralizados.

### Notas de implementação

```text
Campos:
- `accountCashflow`
- `openingAccountsBalance`
- `closingAccountsBalance`
- `availableAccountsBalance`

Compatibilidade:
- `income`, `totalExpenses`, `balance`, `bankBalance`, `accountsBalance` e `projectedAccountsBalance` foram preservados.
- Os novos campos usam `projectAccountsByMonth`, sem mudar silenciosamente as telas antigas.
```

---

# FASE 12 — AGENDA E RISCO DE CAIXA

## ETAPA 27 — Criar linha do tempo financeira do mês

**Status:** [x]
**Prioridade:** P1

### Exemplo

```text
05/09 Salário        +10.000 Itaú
06/09 Aluguel         -2.000 Itaú
08/09 Energia           -300 Nubank
10/09 Fatura          -1.500 Itaú
15/09 Empréstimo        -700 Santander
```

### Critérios de aceite

- [x] Ordenação por data.
- [x] Entradas e saídas.
- [x] Conta.
- [x] Previsto/realizado.
- [x] Abre origem.

### Notas de implementação

```text
Engine:
- Criado `getCashflowTimelineForMonth`.
- Timeline agrega receitas, despesas diretas, faturas e dívidas por competência.
- Itens realizados usam data, valor e conta do pagamento/recebimento.
- Itens previstos usam vencimento e mostram `Conta a definir` quando ainda não há conta registrada.

UI:
- Modal de detalhe da Visão Geral mostra a linha do tempo financeira do mês.
- Cada item exibe data, origem, conta, valor assinado e status.
- Clique no item abre a tela de origem: Receitas, Gastos, Cartões ou Dívidas.
```

---

## ETAPA 28 — Detectar saldo negativo ao longo do mês

**Status:** [ ]  
**Prioridade:** P1

### Objetivo

Não olhar apenas o saldo final.

Exemplo:

```text
10/09
Nubank ficará em -R$ 50
```

### Critérios de aceite

- [ ] Detecta primeira data negativa.
- [ ] Mostra conta.
- [ ] Mostra déficit.
- [ ] Considera receitas anteriores.
- [ ] Considera pagamentos anteriores.

### Notas de implementação

```text
Engine:
-

Alertas:
-
```

---

# FASE 13 — RECOMENDAÇÕES OPERACIONAIS

## ETAPA 29 — Criar análise "o que pagar primeiro"

**Status:** [ ]  
**Prioridade:** P2

Considerar:

- vencimento;
- saldo;
- entrada futura;
- risco;
- conta pagadora;
- compromissos seguintes.

Não pagar automaticamente.

### Critérios de aceite

- [ ] Recomenda, não executa.
- [ ] Explica motivo.
- [ ] Respeita datas.
- [ ] Considera caixa futuro.

### Notas de implementação

```text
Engine:
-

UI:
-
```

---

## ETAPA 30 — Sugerir transferências preventivas

**Status:** [ ]  
**Prioridade:** P2

### Exemplo

```text
Nubank ficará negativo em R$ 350 em 10/09.
Itaú possui folga suficiente.

Sugestão:
Transferir R$ 350 do Itaú antes de 10/09.
```

### Critérios de aceite

- [ ] Não executa automaticamente.
- [ ] Não prejudica origem.
- [ ] Considera eventos futuros da origem.
- [ ] Sugere valor/data.

### Notas de implementação

```text
Engine:
-

UI:
-
```

---

# FASE 14 — SNAPSHOTS E CONCILIAÇÃO FINAL

## ETAPA 31 — Reposicionar snapshots como conferência

**Status:** [ ]  
**Prioridade:** P1

### Regra

Snapshot não deve sobrescrever silenciosamente.

Exemplo:

```text
Saldo real banco: R$ 5.240
Ledger:           R$ 5.190
Diferença:        R$    50
```

Opções:

- revisar extrato;
- criar ajuste;
- cancelar.

### Critérios de aceite

- [ ] Diferença explícita.
- [ ] Confirmação.
- [ ] Histórico preservado.
- [ ] Conciliação dentro da página da conta.

### Notas de implementação

```text
Fluxo:
-

Arquivos:
-
```

---

# FASE 15 — AUDITORIA FINANCEIRA

## ETAPA 32 — Auditoria completa de fluxo por conta

**Status:** [ ]  
**Prioridade:** P0

### Cenário

```text
Saldo inicial Itaú:    R$ 5.000
Saldo inicial Nubank:  R$ 2.000

Salário:       +R$ 10.000 → Itaú
Aluguel:       -R$  2.000 → Itaú
Energia:       -R$    300 → Nubank
Transferência:  R$  1.000 Itaú → Nubank
```

### Resultado mensal

```text
Receitas:       R$ 10.000
Despesas:       R$  2.300
Resultado mês:  R$  7.700
```

### Saldos

```text
Itaú:
5.000 + 10.000 - 2.000 - 1.000 = 12.000

Nubank:
2.000 - 300 + 1.000 = 2.700

Saldo disponível total = R$ 14.700
```

### Validar também

- recebimento + estorno;
- gasto + estorno;
- fatura + estorno;
- dívida + estorno;
- transferência + estorno;
- saldo negativo;
- conciliação;
- mês seguinte;
- ocultação de valores;
- tema claro/escuro;
- tooltips;
- extrato;
- Dashboard.

### Critérios de aceite

- [ ] Valores centavo a centavo.
- [ ] Nenhuma dupla contagem.
- [ ] Estornos restauram estado.
- [ ] Ledger explica saldos.
- [ ] Dashboard bate com Contas.
- [ ] Projeção bate.
- [ ] Tema claro validado.
- [ ] Tema escuro validado.
- [ ] Privacidade validada.
- [ ] `npm test`.
- [ ] `npm run typecheck`.
- [ ] `npm run lint`.
- [ ] `npm run build`.

### Notas de implementação

```text
Cenários:
-

Problemas:
-

Correções:
-
```

---

# FASE 16 — PREPARAÇÃO PARA OBJETIVOS FINANCEIROS

## ETAPA 33 — Preparar integração futura com Objetivos

**Status:** [ ]  
**Prioridade:** P1

### Preparar somente infraestrutura

```text
goal_contribution
goal_withdrawal
relatedEntityType = goal
```

### Futuro

Aporte:

```text
Conta -R$ 1.000
Objetivo +R$ 1.000
```

Resgate:

```text
Objetivo -R$ 500
Conta +R$ 500
```

Não vira receita/despesa global.

### Não implementar nesta etapa

- tela de objetivos;
- metas;
- prazos;
- rendimento;
- projeção adaptativa;
- redistribuição.

### Critérios de aceite

- [ ] Ledger preparado.
- [ ] Neutralidade documentada.
- [ ] Nenhum objetivo implementado antecipadamente.

### Notas de implementação

```text
Preparação:
-

Arquivos:
-
```

---

# HISTÓRICO DE EXECUÇÃO

| Data | Etapa | Status | Resumo | Arquivos |
|---|---|---|---|---|
| 2026-08-31 | Etapa 01 — Criar o modelo de movimentações bancárias | Concluído | Criados types do ledger, suporte opcional em AppData, migration e persistência sem alterar cálculos financeiros. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/supabaseClient.ts`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 02 — Formalizar saldo inicial por conta | Concluído | Contas existentes e novas passaram a ter origem contábil `initial_balance`, preservando `BankAccount.balance`. | `src/lib/storage.ts`, `src/store/DataContext.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 03 — Criar funções centrais do ledger | Concluído | Criadas funções centrais de consulta, soma, saldo, reversão e deduplicação. | `src/lib/finance/accountTransactionRules.ts`, `src/lib/finance/index.ts`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 04 — Calcular saldo por ledger | Concluído | Saldo reconstruível por conta e agregado, com comparação contra saldo armazenado. | `src/lib/finance/accountTransactionRules.ts`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 05 — Criar conciliação de saldo | Concluído | Conciliação com saldo real, ledger, diferença, ajuste manual e snapshot. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/ContasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 06 — Vincular receita à conta destino | Concluído | Receita ganhou conta destino opcional e tratamento de conta removida. | `src/lib/types.ts`, `src/lib/storage.ts`, `src/lib/finance/dataQualityRules.ts`, `src/pages/ReceitasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 07 — Criar recebimento mensal de receita | Concluído | Criado IncomeReceipt mensal com movimentação, conta, data, valor e saldo atualizado. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/ReceitasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 08 — Permitir desfazer recebimento | Concluído | Recebimento pode ser estornado preservando histórico e saldo. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/ReceitasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 09 — Vincular pagamento de gasto à conta | Concluído | Criado ExpensePayment mensal com conta, data, valor, transação e compatibilidade com paidMonths. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/GastosPage.tsx`, `src/pages/PlanejamentoPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 10 — Estornar pagamento de gasto | Concluído | Pagamento de gasto pode ser revertido, devolvendo saldo e preservando histórico. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/GastosPage.tsx`, `src/pages/PlanejamentoPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 12 — Criar página de detalhe da conta | Concluído | Criada navegação `/contas/:accountId`, detalhe dedicado com dados, saldo, ledger, conciliação, edição contextual e ações internas de excluir/atualizar saldo; lista ficou apenas como abertura de conta. | `src/App.tsx`, `src/pages/ContasPage.tsx` |
| 2026-08-31 | Etapa 13 — Criar extrato dentro da página da conta | Concluído | Adicionado extrato na página da conta com ordem cronológica, filtros, origem relacionada, estornos, contraparte de transferência e saldo após movimentação. | `src/pages/ContasPage.tsx` |
| 2026-08-31 | Etapa 14 — Criar privacidade global de valores | Concluído | Criado controle global com olho aberto/fechado, preferência persistida e mascaramento central de valores monetários na aplicação. | `src/lib/format.ts`, `src/App.tsx`, `src/components/Layout.tsx`, `src/components/ui.tsx`, `src/lib/finance/projection.ts` |
| 2026-08-31 | Etapa 15 — Implementar tema claro, escuro e sistema | Concluído | Criado seletor global de tema claro/escuro/sistema, preferência persistida, aplicação inicial sem flash e camada global de contraste para componentes, páginas, inputs, gráficos e tooltips. | `src/lib/theme.ts`, `src/App.tsx`, `src/components/Layout.tsx`, `src/index.css` |
| 2026-08-31 | Etapa 16 — Corrigir lifecycle e sobreposição de tooltips | Concluído | Corrigido tooltip compartilhado para fechar antes de cliques, modais, navegação, Escape, scroll e resize, além de ficar abaixo do z-index dos modais. | `src/components/ui.tsx` |
| 2026-08-31 | Etapa 17 — Padronizar confirmação antes de alterar saldo | Concluído | Criada confirmação final para recebimentos, pagamentos e estornos com saldo antes/depois e alerta de saldo negativo sem bloquear a operação. | `src/components/ui.tsx`, `src/pages/ReceitasPage.tsx`, `src/pages/GastosPage.tsx`, `src/pages/PlanejamentoPage.tsx` |
| 2026-08-31 | Etapa 18 — Registrar conta pagadora da fatura | Concluído | Pagamento de fatura exige conta e confirmação, cria movimento `card_invoice_payment` negativo no ledger, reduz o saldo da conta e mantém a fatura sem dupla contagem nas despesas. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/CartoesPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 19 — Estornar pagamento de fatura | Concluído | Pagamento de fatura pode ser desfeito com confirmação, devolvendo saldo à conta, preservando o movimento original e criando `reversal` no extrato sem liberar limite indevidamente. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/CartoesPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 20 — Criar pagamento mensal de dívida por conta | Concluído | Pagamento mensal de dívida exige conta, data, valor real e confirmação, cria movimento `debt_payment` negativo no ledger, reduz o saldo da conta e mantém a projeção de dívida sem dupla contagem. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/DividasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 21 — Estornar pagamento mensal de dívida | Concluído | Pagamento mensal de dívida pode ser desfeito com confirmação, removendo o estado mensal, devolvendo saldo à conta e criando `reversal` no extrato com idempotência. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/DividasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 22 — Criar transferência global entre contas | Concluído | Tela principal de Contas ganhou transferência global com origem, destino, valor, data, preview antes/depois, alerta de saldo negativo e duas pernas `transfer_out`/`transfer_in` com mesmo identificador sem afetar receitas/despesas. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/ContasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 23 — Permitir estorno de transferência | Concluído | Transferências podem ser estornadas pelo extrato com confirmação, criando duas reversões consistentes, restaurando saldos e preservando as pernas originais sem afetar receitas/despesas. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/ContasPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 24 — Separar Resultado do mês de Saldo disponível | Concluído | Dashboard passou a distinguir resultado mensal de saldo disponível, com novo card de saldo das contas, drilldowns separados, tooltips conceituais e gráfico usando "Resultado" em vez de "Saldo". | `src/pages/DashboardPage.tsx`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 25 — Criar projeção mensal por conta | Concluído | Criado engine `projectAccountsByMonth` com projeção por conta, saldo final encadeado, componentes por tipo de fluxo e agregado que soma contas sem duplicar transferências. | `src/lib/finance/accountRules.ts`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 26 — Evoluir `projectMonths` preservando compatibilidade | Concluído | `projectMonths` passou a expor cashflow mensal por conta e saldos de abertura, fechamento e disponível, mantendo os campos antigos e centralizando os novos contratos em `finance/types`. | `src/lib/finance/types.ts`, `src/lib/finance/accountRules.ts`, `src/lib/finance/projection.ts`, `test/finance.test.ts` |
| 2026-08-31 | Etapa 27 — Criar linha do tempo financeira do mês | Concluído | Criada timeline mensal com receitas, despesas, faturas e dívidas ordenadas por data, conta vinculada, status previsto/realizado e navegação para a tela de origem pelo detalhe da Visão Geral. | `src/lib/finance/types.ts`, `src/lib/finance/cashflowTimelineRules.ts`, `src/lib/finance/index.ts`, `src/App.tsx`, `src/pages/VisaoGeralPage.tsx`, `test/finance.test.ts` |

---

# FORMATO DE RESPOSTA OBRIGATÓRIO

```text
✅ Etapa XX — <nome> concluída.

Implementado:
- ...
- ...

Compatibilidade:
- ...

Validação financeira:
- ...

Validado:
- npm test
- npm run typecheck
- npm run lint
- npm run build
- validação manual
- tema claro/escuro quando aplicável

Notas registradas em PLANO_FLUXO_CAIXA_CONTAS_NEXO.md.

Aguardando autorização para iniciar a Etapa XX+1.
```

Se houver bloqueio:

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

# REGRA FINAL

O objetivo deste plano é permitir que o NEXO responda de forma confiável:

```text
Quanto dinheiro tenho?
Em qual conta?
De onde veio?
Para onde foi?
O que ainda vai entrar?
O que ainda precisa sair?
Alguma conta ficará negativa?
Preciso transferir dinheiro?
```

A área de Contas deve funcionar como uma experiência bancária:

```text
Conta
→ dados
→ saldo
→ extrato
```

sem transformar o NEXO em sistema contábil complexo.

Prioridades finais:

1. integridade financeira;
2. saldo explicável;
3. operações reversíveis;
4. privacidade;
5. clareza;
6. consistência visual em claro/escuro.

Somente após conclusão e auditoria deste plano deve começar o módulo completo de Objetivos Financeiros.
