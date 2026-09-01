import type { AppData, BankAccount } from '../types';
import { getCardInvoiceForMonth } from './cardRules';
import { debtPaymentForMonth } from './debtRules';
import { expenseAmountForMonth } from './expenseRules';
import { incomeAmountForMonth } from './incomeRules';
import { formatBankAccountLabel } from './accountRules';
import type { CashflowTimelineItem } from './types';

const ACCOUNT_NOT_DEFINED = 'Conta a definir';

function dateForMonthDay(monthKey: string, dueDay: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(Number.isFinite(dueDay) ? Math.trunc(dueDay) : 1, 1), lastDay);
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

function accountLabel(accountById: Map<string, BankAccount>, accountId?: string | null): string {
  if (!accountId) return ACCOUNT_NOT_DEFINED;
  const account = accountById.get(accountId);
  return account ? formatBankAccountLabel(account) : ACCOUNT_NOT_DEFINED;
}

function dayFromDate(date: string): number {
  const day = Number(date.slice(8, 10));
  return Number.isFinite(day) ? day : 1;
}

export function getCashflowTimelineForMonth(data: AppData, monthKey: string): CashflowTimelineItem[] {
  const accountById = new Map(data.bankAccounts.map((account) => [account.id, account]));
  const items: CashflowTimelineItem[] = [];

  for (const income of data.incomes) {
    const amount = incomeAmountForMonth(income, monthKey);
    if (amount <= 0) continue;
    const receipt = (data.incomeReceipts ?? []).find((item) => item.incomeId === income.id && item.monthKey === monthKey);
    const date = receipt?.date ?? dateForMonthDay(monthKey, income.dueDay);
    const accountId = receipt?.accountId ?? income.defaultAccountId ?? null;
    items.push({
      id: `income-${income.id}-${monthKey}`,
      date,
      day: dayFromDate(date),
      monthKey,
      label: income.name,
      amount: receipt?.receivedAmount ?? amount,
      accountId,
      accountLabel: accountLabel(accountById, accountId),
      status: receipt ? 'realizado' : 'previsto',
      sourceType: 'income',
      sourceId: income.id,
      originPage: 'receitas',
    });
  }

  for (const expense of data.expenses) {
    if (expense.cardId) continue;
    const amount = expenseAmountForMonth(expense, monthKey);
    if (amount <= 0) continue;
    const payment = (data.expensePayments ?? []).find((item) => item.expenseId === expense.id && item.monthKey === monthKey);
    const date = payment?.date ?? dateForMonthDay(monthKey, expense.dueDay);
    const accountId = payment?.accountId ?? null;
    items.push({
      id: `expense-${expense.id}-${monthKey}`,
      date,
      day: dayFromDate(date),
      monthKey,
      label: expense.description,
      amount: -(payment?.paidAmount ?? amount),
      accountId,
      accountLabel: accountLabel(accountById, accountId),
      status: payment ? 'realizado' : 'previsto',
      sourceType: 'expense',
      sourceId: expense.id,
      originPage: 'gastos',
    });
  }

  for (const card of data.cards) {
    const amount = getCardInvoiceForMonth(data.purchases, card.id, monthKey);
    if (amount <= 0) continue;
    const payment = (data.cardInvoicePayments ?? []).find((item) => item.cardId === card.id && item.monthKey === monthKey);
    const date = payment?.date ?? dateForMonthDay(monthKey, card.dueDay);
    const accountId = payment?.accountId ?? null;
    items.push({
      id: `card-${card.id}-${monthKey}`,
      date,
      day: dayFromDate(date),
      monthKey,
      label: `Fatura ${card.name}`,
      amount: -(payment?.amount ?? amount),
      accountId,
      accountLabel: accountLabel(accountById, accountId),
      status: payment ? 'realizado' : 'previsto',
      sourceType: 'cardInvoice',
      sourceId: card.id,
      originPage: 'cartoes',
    });
  }

  for (const debt of data.debts) {
    const amount = debtPaymentForMonth(debt, monthKey);
    if (amount <= 0) continue;
    const payment = (data.debtPayments ?? []).find((item) => item.debtId === debt.id && item.monthKey === monthKey);
    const date = payment?.date ?? (
      debt.dueDate.slice(0, 7) === monthKey
        ? debt.dueDate
        : dateForMonthDay(monthKey, dayFromDate(debt.dueDate))
    );
    const accountId = payment?.accountId ?? null;
    items.push({
      id: `debt-${debt.id}-${monthKey}`,
      date,
      day: dayFromDate(date),
      monthKey,
      label: debt.name,
      amount: -(payment?.paidAmount ?? amount),
      accountId,
      accountLabel: accountLabel(accountById, accountId),
      status: payment ? 'realizado' : 'previsto',
      sourceType: 'debt',
      sourceId: debt.id,
      originPage: 'dividas',
    });
  }

  return items.sort((a, b) => (
    a.date.localeCompare(b.date)
    || a.label.localeCompare(b.label)
    || a.id.localeCompare(b.id)
  ));
}
