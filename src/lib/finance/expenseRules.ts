import type { Expense } from '../types';
import { getActiveVigencia } from './vigenciaRules';

export function isExpenseActiveInMonth(expense: Expense, monthKey: string): boolean {
  if (!expense.active && expense.type !== 'Pontual') return false;
  if (expense.type === 'Pontual') {
    if (expense.competenceMonth !== monthKey) return false;
    const vig = getActiveVigencia(expense.vigencias, monthKey);
    return !!vig && vig.amount > 0;
  }
  const vig = getActiveVigencia(expense.vigencias, monthKey);
  return !!vig && vig.amount > 0;
}

export function expenseAmountForMonth(expense: Expense, monthKey: string): number {
  if (!isExpenseActiveInMonth(expense, monthKey)) return 0;
  const vig = getActiveVigencia(expense.vigencias, monthKey);
  if (!vig) return 0;
  return expense.status === 'realizado' && expense.realizedAmount != null ? expense.realizedAmount : vig.amount;
}

export function expectedExpenseAmountForMonth(expense: Expense, monthKey: string): number {
  if (!isExpenseActiveInMonth(expense, monthKey)) return 0;
  const vig = getActiveVigencia(expense.vigencias, monthKey);
  return vig?.amount ?? 0;
}

export function isExpensePaidForMonth(expense: Expense, monthKey: string): boolean {
  return expense.paidMonths?.[monthKey] ?? false;
}

export function getExpensesForMonth(expenses: Expense[], monthKey: string): { expense: Expense; amount: number }[] {
  return expenses
    .map((expense) => ({ expense, amount: expenseAmountForMonth(expense, monthKey) }))
    .filter((item) => item.amount > 0);
}
