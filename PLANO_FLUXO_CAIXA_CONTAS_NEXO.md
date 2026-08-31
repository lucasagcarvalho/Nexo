# Plano de Evolução — Fluxo de Caixa por Conta no NEXO

## Objetivo

Evoluir o NEXO para que receitas, despesas, faturas, dívidas, transferências e movimentações financeiras passem a refletir corretamente **onde o dinheiro entra, de onde ele sai e como o saldo de cada conta evolui ao longo do tempo**, sem duplicar receitas/despesas e sem quebrar o motor financeiro já existente.

Hoje o sistema possui dois blocos separados:

1. Fluxo mensal:
   - receitas;
   - gastos diretos;
   - cartões;
   - dívidas;
   - saldo mensal.

2. Saldo em contas:
   - `BankAccount.balance`;
   - snapshots manuais;
   - projeção agregada.

O problema atual é que esses dois mundos não estão conectados.

Marcar:

- receita como realizada;
- despesa como paga;
- fatura como paga;

não altera nenhuma conta bancária.

Também não existe:

- ledger;
- histórico de movimentações;
- transferência entre contas;
- conta de destino da receita;
- conta de origem do pagamento;
- pagamento mensal de dívida;
- estorno real;
- projeção futura por conta.

A regra central deste plano é:

> Receita e despesa representam fluxo financeiro.  
> Conta bancária representa onde o dinheiro está.  
> Movimentação bancária explica como o saldo mudou.

---

# PRINCÍPIOS CONTÁBEIS DO MÓDULO

## 1. Saldo bancário não é receita

Exemplo:

```text
Saldo atual Itaú: R$ 5.000
Salário do mês:   R$ 10.000
```

O NEXO não deve interpretar isso como:

```text
Receita total = R$ 15.000
```

O correto é:

```text
Saldo inicial:  R$ 5.000
Receita do mês: R$ 10.000
```

Se a receita cair no Itaú:

```text
Itaú:
R$ 5.000
+ R$ 10.000
= R$ 15.000
```

A receita continua existindo uma única vez.

## 2. Saldo negativo não é despesa do mês

Exemplo:

```text
Conta Santander: -R$ 2.000
```

Esse valor representa saldo negativo trazido do passado.

Não deve automaticamente virar:

```text
Despesa do mês = R$ 2.000
```

O NEXO deve preservar a diferença entre:

- estoque/saldo;
- fluxo do mês;
- dívida/passivo;
- movimentação.

## 3. Transferência entre contas é neutra

Exemplo:

```text
Itaú   -R$ 1.000
Nubank +R$ 1.000
```

O patrimônio bancário total não mudou.

Portanto:

- não é receita;
- não é despesa;
- não altera resultado do mês;
- altera apenas distribuição entre contas.

## 4. Pagar uma despesa deve gerar movimentação

Exemplo:

```text
Energia
R$ 300
Conta: Nubank
```

Ao marcar como paga:

```text
Nubank -R$ 300
```

Ao desfazer:

```text
Nubank +R$ 300
```

O estorno deve ser seguro e idempotente.

## 5. Receber uma receita deve gerar movimentação

Exemplo:

```text
Salário Lucas
R$ 10.000
Conta destino: Itaú
```

Ao marcar como recebido:

```text
Itaú +R$ 10.000
```

Ao desfazer:

```text
Itaú -R$ 10.000
```

## 6. Saldo deve poder ser explicado

Depois da implementação, o saldo de uma conta deve ser explicável por:

```text
Saldo inicial
+ entradas
- saídas
+ transferências recebidas
- transferências enviadas
+ ajustes
= saldo atual
```

Snapshots deixam de ser a única explicação do saldo.

---

# INSTRUÇÕES DE EXECUÇÃO PARA O CODEX

## Regra principal

Execute **uma etapa por vez**.

Não implemente duas etapas simultaneamente.

Não antecipe etapas futuras.

Ao iniciar uma etapa:

1. Leia completamente a etapa atual.
2. Analise o código existente relacionado.
3. Liste os arquivos que serão impactados.
4. Reutilize o motor financeiro atual sempre que possível.
5. Não recrie cálculos financeiros dentro da UI.
6. Preserve compatibilidade com dados existentes.
7. Implemente somente a etapa atual.
8. Rode:
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
9. Faça validação manual dos critérios de aceite.
10. Atualize `Notas de implementação`.
11. Atualize `Histórico de execução`.
12. Marque `[x]` somente quando todos os critérios forem atendidos.
13. Pare.
14. Informe ao usuário que a etapa terminou.

Resposta obrigatória:

> Etapa XX concluída. Alterações implementadas e validadas. Aguardando autorização para iniciar a próxima etapa.

**Nunca iniciar automaticamente a etapa seguinte.**

---

# REGRA DE SEGURANÇA

Este plano altera uma parte central do NEXO.

Portanto:

- não apagar models existentes sem migration;
- não alterar `Income`, `Expense`, cartões ou dívidas de forma incompatível sem camada de migração;
- não transformar `BankAccount.balance` em receita;
- não transformar conta negativa em despesa;
- não somar ledger novamente em `income` ou `totalExpenses`;
- não duplicar movimentações;
- não gerar duas saídas ao clicar duas vezes;
- não estornar duas vezes;
- não alterar projeção global antes da etapa específica;
- não integrar Objetivos Financeiros neste plano além dos pontos explicitamente preparados para integração futura.

Se surgir divergência financeira inesperada:

1. marcar a etapa `[!]`;
2. registrar o cenário;
3. não corrigir silenciosamente;
4. explicar o impacto;
5. aguardar decisão.

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
- **P2** — experiência e automação
- **P3** — refinamento

---

# FASE 1 — MODELAGEM DO LEDGER

## ETAPA 01 — Criar o modelo de movimentações bancárias

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Criar uma camada explícita de movimentações por conta.

### Novo conceito

Sugestão:

```ts
type AccountTransactionKind =
  | 'initial_balance'
  | 'income_receipt'
  | 'expense_payment'
  | 'card_invoice_payment'
  | 'debt_payment'
  | 'transfer_in'
  | 'transfer_out'
  | 'manual_adjustment'
  | 'reversal'
  | 'goal_contribution'
  | 'goal_withdrawal';

interface AccountTransaction {
  id: string;
  accountId: string;
  date: string;
  monthKey: string;
  amount: number;
  kind: AccountTransactionKind;
  relatedEntityType?: 'income' | 'expense' | 'cardInvoice' | 'debt' | 'transfer' | 'goal';
  relatedEntityId?: string;
  relatedMonthKey?: string;
  reversedTransactionId?: string;
  reversalOfTransactionId?: string;
  note?: string;
  createdAt: string;
}
```

### Regra

- Entrada na conta = valor positivo.
- Saída na conta = valor negativo.
- Transferência deve gerar duas pernas.
- Estorno deve gerar transação inversa ou relação explícita de reversão.
- Ledger não substitui `Income`/`Expense`; ele explica o saldo bancário.

### Compatibilidade

Adicionar ao `AppData`:

```ts
accountTransactions?: AccountTransaction[];
```

Migração deve inicializar com `[]`.

### Critérios de aceite

- [x] Novo type criado.
- [x] `AppData` suporta movimentações.
- [x] Migration de dados antigos segura.
- [x] Nenhum cálculo existente alterado.
- [x] Persistência local e Supabase continua funcionando.
- [x] Testes passam.

### Notas de implementação

```text
Types:
- Criados `AccountTransactionKind`, `AccountTransactionRelatedEntityType` e `AccountTransaction` em `src/lib/types.ts`.
- `AppData` passou a aceitar `accountTransactions?: AccountTransaction[]`.

Migration:
- `migrateData` inicializa `accountTransactions` com `[]` quando o campo não existe em dados antigos.

Persistência:
- `accountTransactions` foi incluído em `APP_DATA_KEYS`; localStorage e Supabase continuam persistindo o `AppData` como JSON único.
- `supabaseClient` passou a tolerar `import.meta.env` ausente em execução de testes Node.

Arquivos:
- `src/lib/types.ts`
- `src/lib/seed.ts`
- `src/lib/storage.ts`
- `src/lib/supabaseClient.ts`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`

Testes:
- Adicionado teste de migração garantindo ledger vazio e cálculos mensais/de contas inalterados.
- Validados `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
```

---

## ETAPA 02 — Formalizar saldo inicial por conta

**Status:** [x]  
**Prioridade:** P0

### Problema

Hoje `BankAccount.balance` representa o saldo atual, mas não existe saldo inicial explícito.

### Objetivo

Criar uma base consistente para reconstruir saldos.

### Regra proposta

Cada conta deve possuir uma origem contábil.

Estratégia recomendada:

- manter `BankAccount.balance` durante migração;
- criar uma transação `initial_balance`;
- saldo inicial não é receita;
- migration deve ser idempotente.

### Critérios de aceite

- [x] Contas existentes ganham origem de saldo.
- [x] Não existe dupla contagem.
- [x] Saldo inicial nunca entra em receita.
- [x] Saldo inicial nunca entra em despesa.
- [x] Migração idempotente.

### Notas de implementação

```text
Estratégia:
- `BankAccount.balance` foi preservado como saldo atual.
- Cada conta passa a ter uma transação `initial_balance` no ledger.
- Novas contas criadas pela UI também recebem `initial_balance` no momento do cadastro.

Dados antigos:
- `migrateData` cria uma transação `initial_balance` para cada conta antiga sem origem contábil.
- O valor da transação usa o `BankAccount.balance` existente; valores inválidos entram como `0`.

Idempotência:
- A migração verifica se já existe uma transação `initial_balance` para o `accountId` antes de criar outra.
- O `id` migrado segue o formato determinístico `initial-balance-${accountId}`.

Arquivos:
- `src/lib/storage.ts`
- `src/store/DataContext.tsx`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`

Testes:
- Ajustado teste de migração para validar criação de `initial_balance` sem alterar receitas, despesas ou saldo atual em contas.
- Adicionado teste de idempotência para impedir duplicidade de saldo inicial.
- Validados `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
```

---

## ETAPA 03 — Criar funções centrais do ledger

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Centralizar regras de movimentação.

Sugestão:

```text
src/lib/finance/accountTransactionRules.ts
```

Funções esperadas:

```ts
getAccountTransactions(...)
getTransactionsForAccount(...)
getTransactionsForMonth(...)
getTransactionByRelatedEntity(...)
sumTransactionsForAccount(...)
calculateAccountLedgerBalance(...)
createReversalTransaction(...)
isTransactionReversed(...)
```

### Critérios de aceite

- [x] Funções centralizadas.
- [x] Testes de entrada/saída.
- [x] Testes de reversão.
- [x] Testes de duplicidade.
- [x] Nenhum NaN.
- [x] Nenhum Infinity.

### Notas de implementação

```text
Funções:
- Criado `src/lib/finance/accountTransactionRules.ts`.
- Funções exportadas: `getAccountTransactions`, `getTransactionsForAccount`, `getTransactionsForMonth`, `getTransactionByRelatedEntity`, `sumTransactionsForAccount`, `calculateAccountLedgerBalance`, `createReversalTransaction`, `isTransactionReversed`.

Regras:
- Movimentações inválidas, com data/mês incoerentes, `NaN` ou `Infinity`, são ignoradas pelas funções centrais.
- Movimentações duplicadas por `id` são consideradas apenas uma vez.
- `createReversalTransaction` cria uma movimentação inversa com `kind: 'reversal'` e `reversalOfTransactionId`.
- `getTransactionByRelatedEntity` não retorna transações já revertidas nem a própria transação de estorno.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/lib/finance/index.ts`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`

Testes:
- Adicionados testes para filtros por conta, mês e entidade relacionada.
- Adicionados testes para soma segura ignorando `NaN` e `Infinity`.
- Adicionados testes para criação/detecção de reversão.
- Adicionado teste para deduplicação por `id`.
- Validados `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
```

---

# FASE 2 — SALDO BANCÁRIO RECONSTRUÍVEL

## ETAPA 04 — Calcular saldo por ledger

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Permitir calcular saldo real a partir das movimentações.

### Fórmula

```text
Saldo = saldo inicial + soma das movimentações válidas
```

### Critérios de aceite

- [x] Saldo por conta pode ser reconstruído.
- [x] Saldo total pode ser reconstruído.
- [x] Diferenças contra `BankAccount.balance` são detectáveis.
- [x] Nenhum fluxo mensal é alterado.

### Notas de implementação

```text
Fórmula:
- `calculateAccountLedgerBalance(data, accountId, untilDate?)` soma as movimentações válidas da conta.
- `calculateTotalLedgerBalance(data, untilDate?)` soma o saldo por ledger de todas as contas cadastradas.

Compatibilidade:
- `BankAccount.balance` continua sendo preservado e nenhuma tela passou a substituir saldo atual pelo ledger.
- `getMonthlyFinancialSummary`, `projectMonths` e `projectAccountBalance` não foram alterados nesta etapa.

Diferenças:
- `getAccountLedgerBalanceComparisons` compara `BankAccount.balance` contra saldo calculado por ledger por conta.
- `getTotalLedgerBalanceComparison` compara o saldo total armazenado contra o saldo total por ledger.
- `getAccountLedgerBalanceDifferences` retorna apenas contas com divergência financeira.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`
```

---

## ETAPA 05 — Criar conciliação de saldo

**Status:** [x]  
**Prioridade:** P1

### Objetivo

Quando o saldo real do banco divergir do ledger, permitir correção controlada.

### Fluxo

```text
Saldo calculado: R$ 4.850
Saldo real informado: R$ 5.000
Diferença: +R$ 150
```

Usuário confirma:

```text
Ajuste manual +R$ 150
```

### Regra

Não sobrescrever silenciosamente.
Criar `manual_adjustment`.

### Critérios de aceite

- [x] Tela mostra saldo calculado.
- [x] Usuário pode informar saldo real.
- [x] Diferença é exibida.
- [x] Ajuste cria movimentação.
- [x] Histórico preservado.

### Notas de implementação

```text
Fluxo:
- O botão "Atualizar saldo" da conta passou a abrir um fluxo de conciliação.
- Ao confirmar, o sistema calcula `saldo real informado - saldo calculado por ledger`.
- Se houver diferença, cria uma movimentação `manual_adjustment`.
- `BankAccount.balance` continua sendo atualizado para refletir o saldo real informado, preservando compatibilidade com as telas atuais.
- Um `BankBalanceSnapshot` continua sendo registrado para manter o histórico de conferências.

UI:
- A modal de contas agora exibe data da conciliação, saldo real informado, saldo calculado pelo ledger e ajuste manual.
- Os cards de conta exibem também o saldo calculado pelo ledger.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/ContasPage.tsx`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`
```

---

# FASE 3 — RECEITAS POR CONTA

## ETAPA 06 — Vincular receita à conta destino

**Status:** [x]  
**Prioridade:** P1

### Objetivo

Permitir cadastrar:

```text
Salário Lucas
R$ 10.000
Recebe dia 05
Conta destino: Itaú
```

### Regra

Adicionar um vínculo compatível com receitas recorrentes, como `defaultAccountId?: string` ou estrutura equivalente.

### Critérios de aceite

- [x] Receita pode ter conta destino.
- [x] Campo é opcional para compatibilidade.
- [x] Conta removida é tratada com segurança.
- [x] UI permite selecionar conta.
- [x] Motor mensal continua inalterado.

### Notas de implementação

```text
Campo:
- `Income.defaultAccountId?: string | null`

Compatibilidade:
- Campo opcional e preservado em `migrateIncome`.
- Dados antigos seguem válidos com `defaultAccountId: null`.
- Conta removida gera alerta de qualidade, sem quebrar receita existente.

UI:
- Modal de Receitas permite selecionar "Conta destino".
- Lista de receitas mostra a conta destino ou "Conta removida".
- Seleção vazia mantém a receita sem conta definida.

Arquivos:
- `src/lib/types.ts`
- `src/lib/storage.ts`
- `src/lib/finance/dataQualityRules.ts`
- `src/pages/ReceitasPage.tsx`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`
```

---

## ETAPA 07 — Criar recebimento mensal de receita

**Status:** [x]  
**Prioridade:** P0

### Problema

`Income.status` é global e não representa recebimento mensal real.

### Objetivo

Criar um evento mensal de recebimento.

Exemplo conceitual:

```ts
interface IncomeReceipt {
  id: string;
  incomeId: string;
  monthKey: string;
  date: string;
  accountId: string;
  expectedAmount: number;
  receivedAmount: number;
  transactionId: string;
}
```

### Fluxo

```text
Previsto:
05/09 Salário R$ 10.000 → Itaú

[Ainda não recebido]

Receber
Data: 05/09/2026
Valor: R$ 10.000
Conta: Itaú
```

Resultado:

```text
income_receipt +R$ 10.000
```

### Critérios de aceite

- [x] Recebimento é mensal.
- [x] Pode registrar valor diferente do previsto.
- [x] Pode informar data real.
- [x] Pode escolher conta.
- [x] Movimentação criada uma única vez.
- [x] Receita prevista não duplica receita realizada no motor.

### Notas de implementação

```text
Model:
- `IncomeReceipt` registra `incomeId`, `monthKey`, `date`, `accountId`, valores previsto/recebido, `transactionId` e `createdAt`.
- `AppData.incomeReceipts?: IncomeReceipt[]`.

Fluxo:
- `DataContext.receiveIncome` registra o recebimento por `incomeId + monthKey`.
- O recebimento incrementa `BankAccount.balance` da conta escolhida.
- `DataContext.isIncomeReceivedForMonth` identifica o estado mensal na UI.
- Desfazer recebimento permanece fora do escopo desta etapa.

Transação:
- `createIncomeReceiptTransaction` cria `AccountTransaction.kind = 'income_receipt'` com valor positivo.
- A transação usa `relatedEntityType = 'income'`, `relatedEntityId = incomeId` e `relatedMonthKey = monthKey`.
- A criação é idempotente por recebimento mensal existente.

Arquivos:
- `src/lib/types.ts`
- `src/lib/seed.ts`
- `src/lib/storage.ts`
- `src/lib/finance/accountTransactionRules.ts`
- `src/lib/finance/dataQualityRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/ReceitasPage.tsx`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`

Testes:
- Recebimento mensal cria movimentação bancária sem duplicar receita mensal.
- Transação rejeita dados inválidos.
- Migração inicializa `incomeReceipts` de forma compatível.
- Qualidade de dados valida recebimento com movimentação inexistente.
```

---

## ETAPA 08 — Permitir desfazer recebimento

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Desfazer recebimento sem corromper saldo.

### Critérios de aceite

- [x] Desfazer altera estado mensal.
- [x] Saldo volta corretamente.
- [x] Histórico preservado.
- [x] Duplo clique não duplica estorno.
- [x] Testes cobrem reversão.

### Notas de implementação

```text
Estorno:
- `undoIncomeReceipt` remove o `IncomeReceipt` mensal e cria uma transação `reversal` apontando para a `income_receipt` original.
- O saldo armazenado em `BankAccount.balance` é reduzido pelo valor da transação original.
- O ledger preserva a movimentação original e o estorno.

Idempotência:
- `createIncomeReceiptReversalTransaction` retorna `null` se não houver recebimento, transação original ou se a transação já estiver revertida.
- Dupla tentativa de desfazer não cria novo estorno.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/ReceitasPage.tsx`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`
```

---

# FASE 4 — GASTOS POR CONTA

## ETAPA 09 — Vincular pagamento de gasto à conta

**Status:** [x]  
**Prioridade:** P0

### Objetivo

Transformar:

```text
Pago = true
```

em:

```text
Pago
Conta: Nubank
Valor: R$ 300
Data: 10/09/2026
```

Resultado:

```text
expense_payment -R$ 300
```

### Regra

Não remover imediatamente `paidMonths`; manter compatibilidade e consistência.

### Critérios de aceite

- [x] Usuário escolhe conta ao pagar.
- [x] Pode informar valor real.
- [x] Pode informar data real.
- [x] Movimentação é criada.
- [x] `paidMonths` permanece consistente.
- [x] Total da despesa não é duplicado.

### Notas de implementação

```text
Fluxo:
- `ExpensePayment` registra pagamento mensal com `expenseId`, `monthKey`, `date`, `accountId`, valores previsto/pago, `transactionId` e `createdAt`.
- `DataContext.payExpense` cria pagamento mensal, reduz `BankAccount.balance` e cria `expense_payment`.
- `GastosPage` e `PlanejamentoPage` abrem modal para informar conta, data e valor ao pagar.
- Estornar pagamento permanece fora do escopo desta etapa.

Compatibilidade paidMonths:
- `paidMonths[monthKey] = true` continua sendo a fonte de status pago/pendente para o motor mensal.
- `ExpensePayment` guarda a razão bancária do pagamento sem substituir `paidMonths`.
- `togglePaidMonth` permanece disponível para compatibilidade, mas as UIs de pagamento alteradas usam `payExpense`.
- O total mensal de despesas continua calculado pelas regras atuais, sem somar `expensePayments`.

Arquivos:
- `src/lib/types.ts`
- `src/lib/seed.ts`
- `src/lib/storage.ts`
- `src/lib/finance/accountTransactionRules.ts`
- `src/lib/finance/dataQualityRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/GastosPage.tsx`
- `src/pages/PlanejamentoPage.tsx`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`
```

---

## ETAPA 10 — Estornar pagamento de gasto

**Status:** [x]  
**Prioridade:** P0

### Critérios de aceite

- [x] Saldo retorna.
- [x] Gasto volta a pendente.
- [x] Histórico preservado.
- [x] Estorno idempotente.
- [x] Nenhuma despesa duplicada.

### Notas de implementação

```text
Fluxo:
- `createExpensePaymentReversalTransaction` cria `reversal` da `expense_payment` original.
- `DataContext.undoExpensePayment` remove o `ExpensePayment`, limpa `paidMonths[monthKey]`, restaura `paid` em gasto pontual e devolve saldo em `BankAccount.balance`.
- `GastosPage` e `PlanejamentoPage` alternam o botão de status: pendente abre pagamento, pago desfaz pagamento.
- O ledger preserva pagamento original e estorno.

Arquivos:
- `src/lib/finance/accountTransactionRules.ts`
- `src/store/DataContext.tsx`
- `src/pages/GastosPage.tsx`
- `src/pages/PlanejamentoPage.tsx`
- `test/finance.test.ts`
- `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md`

Testes:
- Estorno de pagamento mensal de gasto restaura saldo por ledger.
- Estorno de pagamento mensal de gasto é idempotente após reversão criada.
```

---

# FASE 5 — FATURAS DE CARTÃO

## ETAPA 11 — Registrar conta pagadora da fatura

**Status:** [ ]  
**Prioridade:** P0

### Objetivo

Ao marcar fatura como paga:

```text
Fatura Nubank
R$ 2.500
Conta utilizada: Itaú
```

Resultado:

```text
card_invoice_payment -R$ 2.500
```

### Regra

O pagamento da fatura não cria nova despesa global. A despesa já existe via parcelas/fatura no motor.

### Critérios de aceite

- [ ] Conta pagadora obrigatória ao pagar.
- [ ] Valor correto da fatura usado.
- [ ] Status mensal continua consistente.
- [ ] Saldo da conta reduz.
- [ ] Sem dupla contagem.

### Notas de implementação

```text
Fluxo:
-

Arquivos:
-

Testes:
-
```

---

## ETAPA 12 — Estornar pagamento de fatura

**Status:** [ ]  
**Prioridade:** P0

### Critérios de aceite

- [ ] Fatura volta para não paga.
- [ ] Conta recebe valor de volta.
- [ ] Limite do cartão continua seguindo regra atual.
- [ ] Estorno idempotente.
- [ ] Histórico preservado.

### Notas de implementação

```text
Fluxo:
-

Arquivos:
-

Testes:
-
```

---

# FASE 6 — DÍVIDAS

## ETAPA 13 — Criar pagamento mensal de dívida

**Status:** [ ]  
**Prioridade:** P0

### Objetivo

Criar evento mensal de pagamento com conta, data e valor real.

Resultado:

```text
debt_payment -R$ 700
```

### Critérios de aceite

- [ ] Pagamento mensal existe.
- [ ] Conta utilizada é registrada.
- [ ] Data real é registrada.
- [ ] Pode informar valor diferente.
- [ ] Saldo bancário reduz.
- [ ] Projeção de dívida continua correta.

### Notas de implementação

```text
Model:
-

Fluxo:
-

Arquivos:
-
```

---

## ETAPA 14 — Estornar pagamento de dívida

**Status:** [ ]  
**Prioridade:** P0

### Critérios de aceite

- [ ] Estado mensal retorna a pendente.
- [ ] Conta recebe estorno.
- [ ] Dívida não é marcada globalmente incorretamente.
- [ ] Histórico preservado.
- [ ] Idempotência garantida.

### Notas de implementação

```text
Fluxo:
-

Arquivos:
-
```

---

# FASE 7 — TRANSFERÊNCIAS

## ETAPA 15 — Criar transferência entre contas

**Status:** [ ]  
**Prioridade:** P1

### Fluxo

```text
Transferir
Origem: Itaú
Destino: Nubank
Valor: R$ 1.000
Data: 12/09/2026
```

Ledger:

```text
Itaú   transfer_out -R$ 1.000
Nubank transfer_in  +R$ 1.000
```

### Critérios de aceite

- [ ] Duas pernas geradas.
- [ ] Mesmo identificador de transferência relacionado.
- [ ] Total bancário não muda.
- [ ] Contas individuais mudam.
- [ ] Pode desfazer transferência com segurança.
- [ ] Transferência não entra em receita/despesa.

### Notas de implementação

```text
Model:
-

Fluxo:
-

Arquivos:
-

Testes:
-
```

---

# FASE 8 — HISTÓRICO DAS CONTAS

## ETAPA 16 — Criar razão/ledger visual da conta

**Status:** [ ]  
**Prioridade:** P1

### Objetivo

Tela de conta deve mostrar algo como:

```text
01/09 Saldo inicial           +R$ 2.000
05/09 Salário                 +R$ 10.000
06/09 Aluguel                 -R$ 2.000
10/09 Transferência Nubank    -R$ 1.000
12/09 Estorno Energia         +R$ 300
```

### Deve mostrar

- data;
- descrição;
- tipo;
- valor;
- saldo após movimentação;
- origem relacionada;
- estorno quando aplicável.

### Critérios de aceite

- [ ] Histórico ordenado.
- [ ] Saldo após cada linha calculável.
- [ ] Entradas/saídas claras.
- [ ] Estornos identificáveis.
- [ ] Filtros por mês.
- [ ] Sem depender de snapshots.

### Notas de implementação

```text
Tela:
-

Filtros:
-

Arquivos:
-
```

---

# FASE 9 — PROJEÇÃO POR CONTA

## ETAPA 17 — Criar projeção mensal por conta

**Status:** [ ]  
**Prioridade:** P0

### Objetivo

Permitir:

```text
Itaú
Saldo início         R$ 5.000
Receitas previstas  +R$ 10.000
Pagamentos previstos -R$ 6.000
Transferências       -R$ 1.000
Saldo final           R$ 8.000
```

### Critérios de aceite

- [ ] Projeção existe por conta.
- [ ] Agregado é soma das contas.
- [ ] Transferências anulam no agregado.
- [ ] Receitas/despesas não são duplicadas.
- [ ] Meses futuros encadeiam saldo final → saldo inicial seguinte.

### Notas de implementação

```text
Engine:
-

MonthProjection:
-

Arquivos:
-

Testes:
-
```

---

## ETAPA 18 — Evoluir `projectMonths` sem quebrar compatibilidade

**Status:** [ ]  
**Prioridade:** P0

### Objetivo

Integrar projeção por conta ao motor central preservando:

```text
income
totalExpenses
balance
```

Adicionar campos novos em vez de alterar significado dos existentes.

### Critérios de aceite

- [ ] `projectMonths` continua compatível.
- [ ] Dashboard não quebra.
- [ ] Planejamento não quebra.
- [ ] Análise não quebra.
- [ ] Projeção usa novos dados.
- [ ] Testes existentes continuam passando.

### Notas de implementação

```text
Campos:
-

Compatibilidade:
-

Arquivos:
-
```

---

# FASE 10 — AGENDA FINANCEIRA

## ETAPA 19 — Criar linha do tempo de entradas e pagamentos

**Status:** [ ]  
**Prioridade:** P1

### Objetivo

Criar visão cronológica do mês:

```text
05/09 Salário Lucas      +R$ 10.000 Itaú
06/09 Aluguel            -R$  2.000 Itaú
08/09 Energia            -R$    300 Nubank
10/09 Fatura cartão      -R$  1.500 Itaú
15/09 Empréstimo         -R$    700 Santander
```

### Critérios de aceite

- [ ] Receitas e pagamentos na mesma timeline.
- [ ] Ordenação por data.
- [ ] Conta visível.
- [ ] Status previsto/realizado visível.
- [ ] Pode abrir detalhe.

### Notas de implementação

```text
Tela:
-

Arquivos:
-
```

---

## ETAPA 20 — Detectar conta negativa antes do próximo recebimento

**Status:** [ ]  
**Prioridade:** P1

### Objetivo

Analisar saldo ao longo do mês, não apenas no fechamento.

### Critérios de aceite

- [ ] Simulação diária ou por eventos.
- [ ] Identifica primeira data negativa.
- [ ] Mostra valor negativo.
- [ ] Não depende apenas do saldo mensal final.
- [ ] Considera entradas anteriores ao vencimento.

### Notas de implementação

```text
Engine:
-

Alertas:
-

Arquivos:
-
```

---

# FASE 11 — SUGESTÃO DE ORDEM DE PAGAMENTOS

## ETAPA 21 — Criar análise "o que pagar primeiro"

**Status:** [ ]  
**Prioridade:** P2

### Objetivo

Ajudar a organizar pagamentos considerando:

- vencimento;
- saldo da conta;
- receitas futuras;
- risco de saldo negativo;
- prioridade temporal;
- conta sugerida.

### Regra

Nunca pagar automaticamente.
Apenas recomendar.

### Critérios de aceite

- [ ] Sugestão baseada em dados.
- [ ] Explicação curta.
- [ ] Nunca executa pagamento sozinho.
- [ ] Considera receitas futuras.

### Notas de implementação

```text
Regras:
-

UI:
-

Arquivos:
-
```

---

## ETAPA 22 — Sugerir transferência entre contas

**Status:** [ ]  
**Prioridade:** P2

### Exemplo

```text
Nubank ficará negativo em R$ 350 em 10/09.
Itaú possui folga de R$ 2.100.

Sugestão:
Transferir R$ 350 do Itaú para Nubank antes de 10/09.
```

### Regra

Considerar:

- saldo mínimo;
- compromissos da conta origem;
- entradas futuras;
- contas que também poderão precisar de saldo.

### Critérios de aceite

- [ ] Não transfere automaticamente.
- [ ] Sugestão não prejudica conta origem.
- [ ] Valor mínimo necessário.
- [ ] Data sugerida.
- [ ] Explicação do motivo.

### Notas de implementação

```text
Engine:
-

UI:
-

Arquivos:
-
```

---

# FASE 12 — SNAPSHOTS E CONCILIAÇÃO

## ETAPA 23 — Reposicionar snapshots como ferramenta de conciliação

**Status:** [ ]  
**Prioridade:** P1

### Objetivo

Snapshots deixam de ser a principal origem histórica e passam a servir para conferência.

Exemplo:

```text
Saldo do banco:  R$ 5.240
Saldo do ledger: R$ 5.190
Diferença:       R$    50
```

### Opções

- revisar movimentações;
- criar ajuste;
- ignorar temporariamente.

### Critérios de aceite

- [ ] Snapshot não sobrescreve saldo silenciosamente.
- [ ] Diferença é explícita.
- [ ] Ajuste exige confirmação.
- [ ] Histórico não é destruído.

### Notas de implementação

```text
Mudança:
-

Compatibilidade:
-

Arquivos:
-
```

---

# FASE 13 — AUDITORIA E DUPLA CONTAGEM

## ETAPA 24 — Auditoria financeira completa

**Status:** [ ]  
**Prioridade:** P0

### Cenário controlado

```text
Saldo inicial Itaú:    R$ 5.000
Saldo inicial Nubank:  R$ 2.000

Receita salário:
R$ 10.000 → Itaú

Despesa aluguel:
R$ 2.000 → Itaú

Despesa energia:
R$ 300 → Nubank

Transferência:
Itaú → Nubank R$ 1.000
```

### Resultado esperado

Fluxo global:

```text
Receitas: R$ 10.000
Despesas: R$ 2.300
Saldo do mês: R$ 7.700
```

Contas:

```text
Itaú:
5.000 + 10.000 - 2.000 - 1.000 = 12.000

Nubank:
2.000 - 300 + 1.000 = 2.700

Total:
14.700
```

Patrimônio bancário:

```text
Saldo inicial total: R$ 7.000
+ resultado do mês:  R$ 7.700
= saldo final total: R$ 14.700
```

### Validar

- marcar/desmarcar receita;
- pagar/despagar gasto;
- pagar/despagar fatura;
- pagar/despagar dívida;
- transferir/estornar transferência;
- conciliar saldo;
- mês seguinte herda saldo anterior;
- nenhuma receita duplicada;
- nenhuma despesa duplicada.

### Critérios de aceite

- [ ] Valores batem centavo a centavo.
- [ ] Contas individuais batem.
- [ ] Agregado bate.
- [ ] Fluxo global bate.
- [ ] Estornos restauram estado anterior.
- [ ] Projeção bate.
- [ ] Testes passam.
- [ ] Typecheck passa.
- [ ] Lint passa sem novos erros.
- [ ] Build passa.

### Notas de implementação

```text
Cenários:
-

Divergências:
-

Correções:
-

Testes:
-
```

---

# FASE 14 — PREPARAÇÃO PARA OBJETIVOS FINANCEIROS

## ETAPA 25 — Preparar integração futura com Objetivos

**Status:** [ ]  
**Prioridade:** P1

### Objetivo

Não implementar Objetivos ainda.

Preparar a infraestrutura para que depois seja possível:

```text
Conta bancária -R$ 1.000
Objetivo       +R$ 1.000
```

sem virar despesa.

E:

```text
Objetivo       -R$ 500
Conta bancária +R$ 500
```

sem virar receita.

### Preparar

- `goal_contribution`;
- `goal_withdrawal`;
- relação opcional `relatedEntityType: 'goal'`;
- neutralidade patrimonial;
- integração futura com ledger.

### Não criar ainda

- tela de objetivos;
- metas;
- prazos;
- rendimento;
- projeção adaptativa;
- redistribuição de aportes.

### Critérios de aceite

- [ ] Ledger suporta tipos futuros.
- [ ] Nenhuma funcionalidade de objetivo implementada prematuramente.
- [ ] Arquitetura documentada.
- [ ] Testes de neutralidade preparados quando aplicável.

### Notas de implementação

```text
Preparação:
-

Arquivos:
-

Decisões:
-
```

---

# HISTÓRICO DE EXECUÇÃO

Adicionar uma linha ao finalizar cada etapa.

| Data | Etapa | Status | Resumo | Arquivos |
|---|---|---|---|---|
| 2026-08-31 | Etapa 01 — Criar o modelo de movimentações bancárias | Concluído | Criados types do ledger, suporte opcional em `AppData`, seed/migração com lista vazia e teste de compatibilidade sem alterar cálculos financeiros. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/supabaseClient.ts`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 02 — Formalizar saldo inicial por conta | Concluído | Contas existentes e novas passam a ter origem contábil `initial_balance`, preservando `BankAccount.balance` e sem alterar o motor financeiro mensal. | `src/lib/storage.ts`, `src/store/DataContext.tsx`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 03 — Criar funções centrais do ledger | Concluído | Criadas funções centrais para consultar, filtrar, somar, calcular saldo por ledger, criar reversões e detectar reversões com proteção contra valores inválidos e duplicidade por `id`. | `src/lib/finance/accountTransactionRules.ts`, `src/lib/finance/index.ts`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 04 — Calcular saldo por ledger | Concluído | Adicionados cálculos de saldo reconstruível por conta e total, além de comparações para detectar divergências contra `BankAccount.balance`, sem alterar fluxo mensal ou projeção atual. | `src/lib/finance/accountTransactionRules.ts`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 05 — Criar conciliação de saldo | Concluído | Fluxo de atualização de saldo virou conciliação explícita: exibe saldo por ledger, saldo informado e diferença; ao confirmar, cria `manual_adjustment`, snapshot e atualiza `BankAccount.balance`. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/ContasPage.tsx`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 06 — Vincular receita à conta destino | Concluído | Receitas passam a aceitar vínculo opcional `defaultAccountId`, com seleção na UI, migração compatível e alerta para conta removida, sem alterar o motor mensal. | `src/lib/types.ts`, `src/lib/storage.ts`, `src/lib/finance/dataQualityRules.ts`, `src/pages/ReceitasPage.tsx`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 07 — Criar recebimento mensal de receita | Concluído | Criado `IncomeReceipt` mensal e ação de recebimento que gera `income_receipt`, incrementa saldo da conta escolhida e mantém receita prevista sem duplicação no motor mensal. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/finance/accountTransactionRules.ts`, `src/lib/finance/dataQualityRules.ts`, `src/store/DataContext.tsx`, `src/pages/ReceitasPage.tsx`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 08 — Permitir desfazer recebimento | Concluído | Recebimentos mensais podem ser desfeitos com remoção do estado mensal, criação de `reversal`, restauração do saldo da conta e proteção contra estorno duplicado. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/ReceitasPage.tsx`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 09 — Vincular pagamento de gasto à conta | Concluído | Criado `ExpensePayment` mensal e ação de pagamento que exige conta/data/valor, gera `expense_payment`, reduz saldo da conta e mantém `paidMonths` consistente sem duplicar despesas. | `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/storage.ts`, `src/lib/finance/accountTransactionRules.ts`, `src/lib/finance/dataQualityRules.ts`, `src/store/DataContext.tsx`, `src/pages/GastosPage.tsx`, `src/pages/PlanejamentoPage.tsx`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |
| 2026-08-31 | Etapa 10 — Estornar pagamento de gasto | Concluído | Pagamentos mensais de gasto podem ser desfeitos com remoção do estado mensal, criação de `reversal`, limpeza de `paidMonths`, restauração do saldo da conta e proteção contra estorno duplicado. | `src/lib/finance/accountTransactionRules.ts`, `src/store/DataContext.tsx`, `src/pages/GastosPage.tsx`, `src/pages/PlanejamentoPage.tsx`, `test/finance.test.ts`, `PLANO_FLUXO_CAIXA_CONTAS_NEXO.md` |

---

# FORMATO DE RESPOSTA OBRIGATÓRIO AO FINAL DE CADA ETAPA

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

Este plano não deve transformar o NEXO em um sistema contábil complexo.

O objetivo é simples:

> Saber onde o dinheiro está, por onde ele entrou, de onde ele saiu e se haverá dinheiro suficiente quando cada compromisso chegar.

A prioridade máxima é:

> Integridade financeira sem dupla contagem.

A segunda prioridade é:

> Todo saldo de conta deve ser explicável.

A terceira prioridade é:

> Todo pagamento ou recebimento deve poder ser desfeito com segurança.

Somente depois deste plano estar concluído e auditado deve ser iniciado o módulo:

```text
Objetivos Financeiros / Aplicações
```

Esse módulo usará esta infraestrutura para registrar:

```text
aporte:
conta → objetivo

resgate:
objetivo → conta
```

sem alterar incorretamente receita, despesa ou patrimônio.
