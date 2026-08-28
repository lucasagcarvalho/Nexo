import type { AppData, ExpenseClass } from '../types';

export function getCategoryExpenseClass(data: AppData, categoryName: string): ExpenseClass {
  return data.categoryEntries.find((category) => category.name === categoryName)?.expenseClass ?? 'other';
}

export function expenseClassLabel(expenseClass: ExpenseClass): string {
  const labels: Record<ExpenseClass, string> = {
    essential: 'Essencial',
    lifestyle: 'Discricionário',
    financial: 'Financeiro',
    other: 'Outros',
  };
  return labels[expenseClass];
}
