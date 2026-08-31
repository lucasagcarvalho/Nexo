import type { AppData, Vigencia } from '../types';
import { compareMonths } from '../format';
import type { DataQualityIssue, DataQualitySeverity } from './types';
import { monthIndex } from './cardRules';

function issue(severity: DataQualitySeverity, entity: string, recordId: string, title: string, description: string): DataQualityIssue {
  return {
    id: `${entity}:${recordId}:${title}`,
    severity,
    entity,
    recordId,
    title,
    description,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasNegativeAmount(vigencias: Vigencia[]): boolean {
  return vigencias.some((vigencia) => isFiniteNumber(vigencia.amount) && vigencia.amount < 0);
}

function hasInvalidVigenciaRange(vigencias: Vigencia[]): boolean {
  return vigencias.some((vigencia) => (
    !isValidMonthKey(vigencia.startDate)
    || (vigencia.endDate !== null && (!isValidMonthKey(vigencia.endDate) || compareMonths(vigencia.endDate, vigencia.startDate) < 0))
  ));
}

function hasMissingPerson(data: AppData, person?: string): boolean {
  if (!person) return false;
  return !data.people.some((entry) => entry.name === person);
}

function hasMissingCategory(data: AppData, category?: string): boolean {
  if (!category) return false;
  return !data.categories.includes(category);
}

export function getDataQualityIssues(data: AppData): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const cardIds = new Set(data.cards.map((card) => card.id));
  const accountIds = new Set(data.bankAccounts.map((account) => account.id));
  const incomeIds = new Set(data.incomes.map((income) => income.id));
  const expenseIds = new Set(data.expenses.map((expense) => expense.id));
  const transactionIds = new Set((data.accountTransactions ?? []).map((transaction) => transaction.id));

  for (const income of data.incomes) {
    if (hasNegativeAmount(income.vigencias)) {
      issues.push(issue('critical', 'receita', income.id, `Receita "${income.name}" possui valor negativo.`, 'Corrija o valor para evitar distorções nos relatórios.'));
    }
    if (hasInvalidVigenciaRange(income.vigencias)) {
      issues.push(issue('critical', 'receita', income.id, `Receita "${income.name}" possui vigência inválida.`, 'Verifique início e fim da vigência para manter o cálculo mensal confiável.'));
    }
    if (income.kind === 'determinada' && income.vigencias.some((vigencia) => !vigencia.endDate)) {
      issues.push(issue('warning', 'receita', income.id, `Receita determinada "${income.name}" está sem fim.`, 'Informe o mês final dessa receita determinada.'));
    }
    if (hasMissingPerson(data, income.person)) {
      issues.push(issue('warning', 'receita', income.id, `Receita "${income.name}" referencia pessoa removida.`, 'Selecione uma pessoa cadastrada para esta receita.'));
    }
    if (income.defaultAccountId && !accountIds.has(income.defaultAccountId)) {
      issues.push(issue('warning', 'receita', income.id, `Receita "${income.name}" referencia conta removida.`, 'Selecione uma conta cadastrada ou deixe a conta destino em branco.'));
    }
  }

  for (const expense of data.expenses) {
    if (hasNegativeAmount(expense.vigencias) || (isFiniteNumber(expense.realizedAmount) && expense.realizedAmount < 0)) {
      issues.push(issue('critical', 'despesa', expense.id, `Despesa "${expense.description}" possui valor negativo.`, 'Corrija o valor para evitar distorções nos relatórios.'));
    }
    if (hasInvalidVigenciaRange(expense.vigencias)) {
      issues.push(issue('critical', 'despesa', expense.id, `Despesa "${expense.description}" possui vigência inválida.`, 'Verifique início e fim da vigência.'));
    }
    if (expense.type === 'Prazo') {
      const first = expense.vigencias[0];
      if (!first?.startDate || !first.endDate) {
        issues.push(issue('critical', 'despesa', expense.id, `Gasto Prazo "${expense.description}" está sem início ou fim.`, 'Informe os meses inicial e final para projetar corretamente.'));
      }
    }
    if (hasMissingPerson(data, expense.person)) {
      issues.push(issue('warning', 'despesa', expense.id, `Despesa "${expense.description}" referencia pessoa removida.`, 'Selecione uma pessoa cadastrada para esta despesa.'));
    }
    if (hasMissingCategory(data, expense.category)) {
      issues.push(issue('warning', 'despesa', expense.id, `Despesa "${expense.description}" referencia categoria removida.`, 'Selecione uma categoria cadastrada para esta despesa.'));
    }
  }

  for (const card of data.cards) {
    if (card.limit < 0) {
      issues.push(issue('critical', 'cartão', card.id, `Cartão "${card.name}" possui limite negativo.`, 'Corrija o limite para manter o uso de cartão confiável.'));
    }
    if (card.dueDay < 1 || card.dueDay > 31 || card.closingDay < 1 || card.closingDay > 31) {
      issues.push(issue('critical', 'cartão', card.id, `Cartão "${card.name}" possui vencimento ou fechamento inválido.`, 'Use dias entre 1 e 31.'));
    }
  }

  for (const purchase of data.purchases) {
    const legacyCurrentInstallment = (purchase as unknown as { currentInstallment?: number }).currentInstallment;
    if (!cardIds.has(purchase.cardId)) {
      issues.push(issue('critical', 'compra', purchase.id, `Compra "${purchase.name}" referencia cartão removido.`, 'Selecione um cartão válido ou remova a compra.'));
    }
    if (purchase.totalAmount < 0) {
      issues.push(issue('critical', 'compra', purchase.id, `Compra "${purchase.name}" possui valor negativo.`, 'Corrija o valor total da compra.'));
    }
    if (!Number.isInteger(purchase.installments) || purchase.installments <= 0) {
      issues.push(issue('critical', 'compra', purchase.id, `Compra "${purchase.name}" possui quantidade de parcelas inválida.`, 'Use pelo menos 1 parcela para manter a projeção confiável.'));
    }
    if (isFiniteNumber(legacyCurrentInstallment) && legacyCurrentInstallment > purchase.installments) {
      issues.push(issue('critical', 'compra', purchase.id, `Compra "${purchase.name}" possui parcela atual ${legacyCurrentInstallment}/${purchase.installments}.`, 'Corrija para manter a projeção confiável.'));
    }
    if (!isValidMonthKey(purchase.firstInvoiceMonth) || Number.isNaN(monthIndex(purchase.firstInvoiceMonth))) {
      issues.push(issue('critical', 'compra', purchase.id, `Compra "${purchase.name}" possui primeiro mês de fatura inválido.`, 'Informe o mês no formato AAAA-MM.'));
    }
    if (hasMissingCategory(data, purchase.category)) {
      issues.push(issue('warning', 'compra', purchase.id, `Compra "${purchase.name}" referencia categoria removida.`, 'Selecione uma categoria cadastrada para esta compra.'));
    }
  }

  for (const debt of data.debts) {
    if (debt.balance < 0 || debt.installmentAmount < 0) {
      issues.push(issue('critical', 'dívida', debt.id, `Dívida "${debt.name}" possui valor negativo.`, 'Corrija saldo e parcela para manter a projeção confiável.'));
    }
    if (debt.status !== 'Quitada' && debt.balance > 0 && (debt.installmentsRemaining <= 0 || debt.installmentAmount <= 0)) {
      issues.push(issue('critical', 'dívida', debt.id, `Dívida ativa "${debt.name}" está sem parcelas válidas.`, 'Informe parcela mensal e quantidade restante ou marque como quitada.'));
    }
    if (!isValidDate(debt.dueDate)) {
      issues.push(issue('critical', 'dívida', debt.id, `Dívida "${debt.name}" possui vencimento inválido.`, 'Informe a data no formato AAAA-MM-DD.'));
    }
    if (hasMissingPerson(data, debt.person)) {
      issues.push(issue('warning', 'dívida', debt.id, `Dívida "${debt.name}" referencia pessoa removida.`, 'Selecione uma pessoa cadastrada para esta dívida.'));
    }
  }

  for (const receipt of data.incomeReceipts ?? []) {
    if (!incomeIds.has(receipt.incomeId)) {
      issues.push(issue('warning', 'recebimento', receipt.id, 'Recebimento referencia receita removida.', 'Remova o recebimento ou restaure a receita vinculada.'));
    }
    if (!accountIds.has(receipt.accountId)) {
      issues.push(issue('critical', 'recebimento', receipt.id, 'Recebimento referencia conta removida.', 'Restaure a conta vinculada ou revise o recebimento.'));
    }
    if (!isValidMonthKey(receipt.monthKey) || !isValidDate(receipt.date)) {
      issues.push(issue('critical', 'recebimento', receipt.id, 'Recebimento possui mês ou data inválidos.', 'Informe mês e data nos formatos AAAA-MM e AAAA-MM-DD.'));
    }
    if (!isFiniteNumber(receipt.expectedAmount) || !isFiniteNumber(receipt.receivedAmount) || receipt.receivedAmount < 0) {
      issues.push(issue('critical', 'recebimento', receipt.id, 'Recebimento possui valor inválido.', 'Corrija os valores previsto e recebido.'));
    }
    if (!transactionIds.has(receipt.transactionId)) {
      issues.push(issue('critical', 'recebimento', receipt.id, 'Recebimento referencia movimentação inexistente.', 'Recrie ou concilie a movimentação bancária vinculada.'));
    }
  }

  for (const payment of data.expensePayments ?? []) {
    if (!expenseIds.has(payment.expenseId)) {
      issues.push(issue('warning', 'pagamento', payment.id, 'Pagamento referencia despesa removida.', 'Remova o pagamento ou restaure a despesa vinculada.'));
    }
    if (!accountIds.has(payment.accountId)) {
      issues.push(issue('critical', 'pagamento', payment.id, 'Pagamento referencia conta removida.', 'Restaure a conta vinculada ou revise o pagamento.'));
    }
    if (!isValidMonthKey(payment.monthKey) || !isValidDate(payment.date)) {
      issues.push(issue('critical', 'pagamento', payment.id, 'Pagamento possui mês ou data inválidos.', 'Informe mês e data nos formatos AAAA-MM e AAAA-MM-DD.'));
    }
    if (!isFiniteNumber(payment.expectedAmount) || !isFiniteNumber(payment.paidAmount) || payment.paidAmount < 0) {
      issues.push(issue('critical', 'pagamento', payment.id, 'Pagamento possui valor inválido.', 'Corrija os valores previsto e pago.'));
    }
    if (!transactionIds.has(payment.transactionId)) {
      issues.push(issue('critical', 'pagamento', payment.id, 'Pagamento referencia movimentação inexistente.', 'Recrie ou concilie a movimentação bancária vinculada.'));
    }
  }

  for (const snapshot of data.bankBalanceSnapshots) {
    if (!accountIds.has(snapshot.accountId)) {
      issues.push(issue('critical', 'snapshot', snapshot.id, 'Snapshot referencia conta removida.', 'Remova o snapshot ou restaure a conta vinculada.'));
    }
    if (!isFiniteNumber(snapshot.balance)) {
      issues.push(issue('critical', 'snapshot', snapshot.id, 'Snapshot possui saldo inválido.', 'Corrija o saldo para manter o histórico de contas confiável.'));
    }
    if (!isValidDate(snapshot.date) || !isValidMonthKey(snapshot.monthKey) || snapshot.date.slice(0, 7) !== snapshot.monthKey) {
      issues.push(issue('critical', 'snapshot', snapshot.id, 'Snapshot possui data ou mês inválido.', 'Verifique se data e mês pertencem à mesma competência.'));
    }
  }

  for (const scenario of data.scenarios) {
    for (const incomeId of Object.keys(scenario.incomeOverrides ?? {})) {
      if (!incomeIds.has(incomeId)) {
        issues.push(issue('warning', 'cenário', scenario.id, `Cenário "${scenario.name}" referencia receita removida.`, 'Remova o override ou selecione uma receita existente.'));
      }
    }
  }

  return issues;
}
