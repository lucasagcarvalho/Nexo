import type { AppData } from '../types';
import { incomeAmountForMonth, getIncomesForMonth } from './incomeRules';
import { expenseAmountForMonth, expectedExpenseAmountForMonth, getExpensesForMonth, isExpensePaidForMonth } from './expenseRules';
import { isInvoicePaid, purchaseInstallmentForMonth, getInstallmentAmounts, monthIndex } from './cardRules';
import { debtPaymentForMonth, getDebtPaymentsForMonth } from './debtRules';

export function getMonthlyFinancialSummary(data: AppData, monthKey: string) {
  let fixedIncome = 0;
  let variableIncome = 0;

  for (const income of data.incomes) {
    const amount = incomeAmountForMonth(income, monthKey);
    if (amount === 0) continue;
    if (income.kind === 'variavel') variableIncome += amount;
    else fixedIncome += amount;
  }
  const income = fixedIncome + variableIncome;

  let fixedExpenses = 0;
  let prazoExpenses = 0;
  let variableExpenses = 0;
  let expectedDirectExpenses = 0;
  let paidDirectExpenses = 0;
  const categoryBreakdown: Record<string, number> = {};
  const typeBreakdown: Record<string, number> = {};

  for (const expense of data.expenses) {
    if (expense.cardId) continue;
    const amount = expenseAmountForMonth(expense, monthKey);
    if (amount === 0) continue;
    expectedDirectExpenses += expectedExpenseAmountForMonth(expense, monthKey);
    if (isExpensePaidForMonth(expense, monthKey)) paidDirectExpenses += amount;
    if (expense.type === 'Fixo') fixedExpenses += amount;
    else if (expense.type === 'Prazo') prazoExpenses += amount;
    else variableExpenses += amount;
    typeBreakdown[expense.type] = (typeBreakdown[expense.type] ?? 0) + amount;
    categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] ?? 0) + amount;
  }

  const cardByCard: Record<string, number> = {};
  let cardExpenses = 0;
  let paidCardExpenses = 0;
  for (const purchase of data.purchases) {
    const installment = purchaseInstallmentForMonth(purchase, monthKey);
    if (installment > 0) {
      cardByCard[purchase.cardId] = (cardByCard[purchase.cardId] ?? 0) + installment;
      cardExpenses += installment;
      if (isInvoicePaid(data, purchase.cardId, monthKey)) paidCardExpenses += installment;
      categoryBreakdown['Cartões'] = (categoryBreakdown['Cartões'] ?? 0) + installment;
    }
  }

  let debtExpenses = 0;
  for (const debt of data.debts) {
    const amount = debtPaymentForMonth(debt, monthKey);
    if (amount <= 0) continue;
    debtExpenses += amount;
    categoryBreakdown['Dívidas'] = (categoryBreakdown['Dívidas'] ?? 0) + amount;
  }

  const totalExpenses = fixedExpenses + prazoExpenses + variableExpenses + cardExpenses + debtExpenses;
  const expectedExpenses = expectedDirectExpenses + cardExpenses + debtExpenses;
  const realizedExpenses = totalExpenses;
  const paidExpenses = paidDirectExpenses + paidCardExpenses;
  const unpaidExpenses = Math.max(0, realizedExpenses - paidExpenses);
  const expenseVariance = realizedExpenses - expectedExpenses;
  const expenseVariancePercent = expectedExpenses > 0 ? (expenseVariance / expectedExpenses) * 100 : 0;
  const balance = income - totalExpenses;

  let parcelasFuturas = 0;
  for (const purchase of data.purchases) {
    const startMonth = purchase.firstInvoiceMonth ?? purchase.purchaseDate.slice(0, 7);
    const startIdx = monthIndex(startMonth);
    const targetIdx = monthIndex(monthKey);
    const remaining = purchase.installments - (targetIdx - startIdx);
    if (remaining > 0) {
      const amounts = getInstallmentAmounts(purchase);
      for (let i = Math.max(0, targetIdx - startIdx); i < purchase.installments; i++) {
        parcelasFuturas += amounts[i];
      }
    }
  }

  return {
    income,
    fixedIncome,
    variableIncome,
    fixedExpenses,
    prazoExpenses,
    variableExpenses,
    cardExpenses,
    debtExpenses,
    totalExpenses,
    expectedExpenses,
    realizedExpenses,
    paidExpenses,
    unpaidExpenses,
    expenseVariance,
    expenseVariancePercent,
    balance,
    cardByCard,
    cardInstallments: cardExpenses,
    categoryBreakdown,
    typeBreakdown,
    parcelasFuturas,
  };
}

export function getPlanningMonthDetails(data: AppData, monthKey: string) {
  const incomes = getIncomesForMonth(data.incomes, monthKey);
  const expenses = getExpensesForMonth(data.expenses, monthKey).filter(({ expense }) => !expense.cardId);
  const debts = getDebtPaymentsForMonth(data.debts, monthKey);
  const summary = getMonthlyFinancialSummary(data, monthKey);
  const cards = Object.entries(summary.cardByCard)
    .filter(([, amount]) => amount > 0)
    .map(([cardId, amount]) => ({ cardId, amount }));

  return {
    summary,
    incomes,
    expenses,
    fixedExpenses: expenses.filter(({ expense }) => expense.type === 'Fixo'),
    prazoExpenses: expenses.filter(({ expense }) => expense.type === 'Prazo'),
    pontualExpenses: expenses.filter(({ expense }) => expense.type === 'Pontual'),
    cards,
    debts,
  };
}
