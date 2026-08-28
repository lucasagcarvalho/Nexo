import type { Income } from '../types';
import { getActiveVigencia } from './vigenciaRules';

export function incomeAmountForMonth(income: Income, monthKey: string): number {
  if (!income.active) return 0;
  if (income.kind === 'variavel') {
    if (income.competenceMonth && income.competenceMonth !== monthKey) return 0;
    const vig = getActiveVigencia(income.vigencias, monthKey);
    if (!vig) return 0;
    const amount = income.status === 'realizado' && income.realizedAmount != null ? income.realizedAmount : vig.amount;
    return Number.isFinite(amount) ? amount : 0;
  }
  const vig = getActiveVigencia(income.vigencias, monthKey);
  if (!vig) return 0;
  const amount = income.status === 'realizado' && income.realizedAmount != null ? income.realizedAmount : vig.amount;
  return Number.isFinite(amount) ? amount : 0;
}

export function isIncomeActiveInMonth(income: Income, monthKey: string): boolean {
  return incomeAmountForMonth(income, monthKey) > 0;
}

export function getIncomesForMonth(incomes: Income[], monthKey: string): { income: Income; amount: number }[] {
  return incomes
    .map((income) => ({ income, amount: incomeAmountForMonth(income, monthKey) }))
    .filter((item) => item.amount > 0);
}
