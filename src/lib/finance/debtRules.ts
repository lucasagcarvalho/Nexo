import type { AppData, Debt } from '../types';
import { addMonths, currentMonthKey } from '../format';
import { monthIndex } from './cardRules';

export function debtPaymentForMonth(debt: Debt, monthKey: string): number {
  if (debt.status === 'Quitada') return 0;
  if (debt.installmentsRemaining <= 0 || debt.installmentAmount <= 0) return 0;
  const debtMonth = debt.dueDate.slice(0, 7);
  const endMonth = addMonths(debtMonth, debt.installmentsRemaining - 1);
  return monthKey >= debtMonth && monthKey <= endMonth ? debt.installmentAmount : 0;
}

export function getDebtPaymentsForMonth(debts: Debt[], monthKey: string): { debt: Debt; amount: number }[] {
  return debts
    .map((debt) => ({ debt, amount: debtPaymentForMonth(debt, monthKey) }))
    .filter((item) => item.amount > 0);
}

export function totalDebt(data: AppData): number {
  return data.debts
    .filter((debt) => debt.status !== 'Quitada')
    .reduce((sum, debt) => sum + debt.balance, 0);
}

export function monthsUntilFreeOfInstallments(data: AppData, refMonth?: string): number {
  const startMonth = refMonth ?? currentMonthKey();
  let maxEnd = -1;
  for (const purchase of data.purchases) {
    const purchaseStartMonth = purchase.firstInvoiceMonth ?? purchase.purchaseDate.slice(0, 7);
    const endMonth = addMonths(purchaseStartMonth, purchase.installments - 1);
    if (monthIndex(endMonth) > maxEnd) maxEnd = monthIndex(endMonth);
  }
  const startIdx = monthIndex(startMonth);
  return maxEnd < 0 ? 0 : Math.max(0, maxEnd - startIdx + 1);
}
