import type { AppData, Debt } from '../types';
import { addMonths, currentMonthKey } from '../format';
import { monthIndex } from './cardRules';
import { incomeAmountForMonth } from './incomeRules';
import type { DebtCommitmentSummary } from './types';

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

export function getDebtPayoffMonth(debt: Debt): string | null {
  if (debt.status === 'Quitada') return null;
  if (debt.installmentsRemaining <= 0 || debt.installmentAmount <= 0) return null;
  return addMonths(debt.dueDate.slice(0, 7), debt.installmentsRemaining - 1);
}

export function getDebtCommitmentSummary(data: AppData, monthKey: string): DebtCommitmentSummary {
  const activeDebts = data.debts.filter((debt) => debt.status !== 'Quitada' && debt.balance > 0);
  const income = data.incomes.reduce((sum, income) => sum + incomeAmountForMonth(income, monthKey), 0);
  const debts = activeDebts.map((debt) => ({
    debtId: debt.id,
    name: debt.name,
    institution: debt.institution,
    status: debt.status,
    currentBalance: debt.balance,
    monthlyPayment: debt.installmentAmount > 0 && debt.installmentsRemaining > 0 ? debt.installmentAmount : 0,
    installmentsRemaining: Math.max(0, debt.installmentsRemaining),
    payoffMonth: getDebtPayoffMonth(debt),
    interestRate: debt.interestRate && debt.interestRate > 0 ? debt.interestRate : null,
  }));
  const totalBalance = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
  const monthlyPaymentTotal = debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  const weightedInterest = debts.reduce((sum, debt) => (
    debt.interestRate === null ? sum : sum + debt.currentBalance * debt.interestRate
  ), 0);
  const interestBalance = debts.reduce((sum, debt) => (
    debt.interestRate === null ? sum : sum + debt.currentBalance
  ), 0);
  const payoffMonth = debts.reduce<string | null>((latest, debt) => {
    if (!debt.payoffMonth) return latest;
    if (!latest || monthIndex(debt.payoffMonth) > monthIndex(latest)) return debt.payoffMonth;
    return latest;
  }, null);

  return {
    totalBalance,
    monthlyPaymentTotal,
    incomeCommitmentPercent: income > 0 ? (monthlyPaymentTotal / income) * 100 : 0,
    activeDebtCount: debts.length,
    payoffMonth,
    averageInterestRate: interestBalance > 0 ? weightedInterest / interestBalance : null,
    debts,
  };
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
