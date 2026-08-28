import type { AppData, CategoryBudget } from '../types';
import { compareMonths } from '../format';
import { debtPaymentForMonth } from './debtRules';
import { expenseAmountForMonth } from './expenseRules';
import { purchaseInstallmentForMonth } from './cardRules';

export type CategoryBudgetStatus = 'saudavel' | 'atencao' | 'excedido';

export interface CategoryBudgetUsage {
  budget: CategoryBudget;
  category: string;
  budgetAmount: number;
  realizedAmount: number;
  difference: number;
  usagePercent: number;
  status: CategoryBudgetStatus;
}

export function isCategoryBudgetActiveInMonth(budget: CategoryBudget, monthKey: string): boolean {
  if (compareMonths(monthKey, budget.startMonth) < 0) return false;
  if (budget.endMonth && compareMonths(monthKey, budget.endMonth) > 0) return false;
  return budget.amount > 0;
}

export function categoryBudgetStatus(usagePercent: number): CategoryBudgetStatus {
  if (usagePercent >= 100) return 'excedido';
  if (usagePercent >= 80) return 'atencao';
  return 'saudavel';
}

export function getCategorySpendingForMonth(data: AppData, monthKey: string): Record<string, number> {
  const spending: Record<string, number> = {};

  for (const expense of data.expenses) {
    if (expense.cardId) continue;
    const amount = expenseAmountForMonth(expense, monthKey);
    if (amount <= 0) continue;
    spending[expense.category] = (spending[expense.category] ?? 0) + amount;
  }

  for (const purchase of data.purchases) {
    const amount = purchaseInstallmentForMonth(purchase, monthKey);
    if (amount <= 0) continue;
    spending[purchase.category] = (spending[purchase.category] ?? 0) + amount;
  }

  for (const debt of data.debts) {
    const amount = debtPaymentForMonth(debt, monthKey);
    if (amount <= 0) continue;
    spending.Dívidas = (spending.Dívidas ?? 0) + amount;
  }

  return spending;
}

export function getCategoryBudgetUsages(data: AppData, monthKey: string): CategoryBudgetUsage[] {
  const spending = getCategorySpendingForMonth(data, monthKey);
  return data.categoryBudgets
    .filter((budget) => isCategoryBudgetActiveInMonth(budget, monthKey))
    .map((budget) => {
      const realizedAmount = spending[budget.category] ?? 0;
      const usagePercent = budget.amount > 0 ? (realizedAmount / budget.amount) * 100 : 0;
      return {
        budget,
        category: budget.category,
        budgetAmount: budget.amount,
        realizedAmount,
        difference: realizedAmount - budget.amount,
        usagePercent,
        status: categoryBudgetStatus(usagePercent),
      };
    })
    .sort((a, b) => b.usagePercent - a.usagePercent || b.realizedAmount - a.realizedAmount);
}

export function getExceededCategoryBudgets(data: AppData, monthKey: string): CategoryBudgetUsage[] {
  return getCategoryBudgetUsages(data, monthKey).filter((usage) => usage.status === 'excedido');
}
