import type { AppData, CardPurchase } from '../types';
import { addMonths, currentMonthKey, generateMonthKeys, monthLabelShort, compareMonths } from '../format';
import { getMonthlyFinancialSummary } from './monthlySummary';
import { projectAccountBalance, totalBankBalance } from './accountRules';
import { getCardMonthlyLimit, purchaseInstallmentForMonth } from './cardRules';
import { getExceededCategoryBudgets } from './categoryBudgetRules';
import { debtPaymentForMonth } from './debtRules';
import { expenseAmountForMonth } from './expenseRules';
import type { FinancialAlert, FinancialAlertSeverity, MonthHealthStatus, MonthProjection, ProjectionResult } from './types';

export function projectMonths(data: AppData, count = 360, startMonth?: string): ProjectionResult {
  const start = startMonth ?? currentMonthKey();
  const monthKeys = generateMonthKeys(start, count);
  const months: MonthProjection[] = [];
  let accumulated = 0;
  let previousProjectedAccountsBalance: number | undefined;
  const currentMonth = currentMonthKey();

  if (compareMonths(start, currentMonth) > 0) {
    previousProjectedAccountsBalance = totalBankBalance(data);
    let cursor = addMonths(currentMonth, 1);
    while (compareMonths(cursor, start) < 0) {
      previousProjectedAccountsBalance += getMonthlyFinancialSummary(data, cursor).balance;
      cursor = addMonths(cursor, 1);
    }
  }

  for (const monthKey of monthKeys) {
    const financials = getMonthlyFinancialSummary(data, monthKey);

    let carryToNext = 0;
    if (financials.balance > 0) {
      const settings = data.settings;
      carryToNext = financials.balance * (settings.surplusNextMonth + settings.surplusFree) / 100;
    }
    accumulated += carryToNext;

    const accountProjection = projectAccountBalance(data, monthKey, financials.balance, previousProjectedAccountsBalance);
    previousProjectedAccountsBalance = accountProjection.projectedAccountsBalance;

    months.push({
      monthKey,
      ...financials,
      accumulatedBalance: accumulated,
      bankBalance: accountProjection.projectedAccountsBalance,
      accountsBalance: accountProjection.accountsBalance,
      projectedAccountsBalance: accountProjection.projectedAccountsBalance,
    });
  }

  return { months, startMonth: start };
}

export function simulatePurchase(
  data: AppData,
  cardId: string,
  totalAmount: number,
  installments: number,
  purchaseDate: string,
  refMonth?: string,
): { before: MonthProjection[]; after: MonthProjection[]; negativeMonths: { monthKey: string; before: number; after: number }[] } {
  const start = refMonth ?? currentMonthKey();
  const before = projectMonths(data, 12, start).months;
  const simulatedPurchase: CardPurchase = {
    id: 'sim',
    cardId,
    name: 'Simulação',
    totalAmount,
    installments,
    purchaseDate,
    firstInvoiceMonth: purchaseDate.slice(0, 7),
    category: 'Simulação',
    note: '',
  };
  const after = projectMonths({ ...data, purchases: [...data.purchases, simulatedPurchase] }, 12, start).months;
  const negativeMonths = after
    .filter((month, index) => month.balance < 0 && before[index].balance >= 0)
    .map((month, index) => ({ monthKey: month.monthKey, before: before[index].balance, after: month.balance }));
  return { before, after, negativeMonths };
}

export function recoveryProgress(data: AppData, projection: ProjectionResult): { percent: number; steps: { label: string; done: boolean }[] } {
  const steps = [
    { label: 'Sair do déficit', done: false },
    { label: 'Controlar cartões', done: false },
    { label: 'Eliminar dívidas caras', done: false },
    { label: 'Criar reserva de 1 mês', done: false },
    { label: 'Criar reserva de 3 meses', done: false },
    { label: 'Estabilidade financeira', done: false },
  ];

  let doneCount = 0;
  const hasNegative = projection.months.some((month) => month.balance < 0);
  if (!hasNegative) { steps[0].done = true; doneCount++; }
  const currentMonth = projection.months[0];
  if (currentMonth && currentMonth.cardExpenses <= getCardMonthlyLimit(data.settings, currentMonth.monthKey)) { steps[1].done = true; doneCount++; }
  const hasActiveDebt = data.debts.some((debt) => debt.status !== 'Quitada' && debt.balance > 0);
  if (!hasActiveDebt) { steps[2].done = true; doneCount++; }
  const monthlyExpenses = currentMonth?.totalExpenses ?? 0;
  const reserve = Math.max(0, currentMonth?.accumulatedBalance ?? 0);
  if (reserve >= monthlyExpenses * 1) { steps[3].done = true; doneCount++; }
  if (reserve >= monthlyExpenses * 3) { steps[4].done = true; doneCount++; }
  const commitment = currentMonth && currentMonth.income > 0 ? (currentMonth.totalExpenses / currentMonth.income) * 100 : 100;
  if (reserve >= monthlyExpenses * 3 && !hasNegative && commitment < 70) { steps[5].done = true; doneCount++; }

  return { percent: Math.round((doneCount / steps.length) * 100), steps };
}

export function getMonthHealthStatus(month: MonthProjection): MonthHealthStatus {
  if (month.balance < 0 || month.projectedAccountsBalance < 0) return 'critico';
  const commitment = month.income > 0 ? (month.totalExpenses / month.income) * 100 : 100;
  if (commitment >= 90 || month.balance < month.income * 0.05) return 'atencao';
  return 'saudavel';
}

export function generateAlerts(data: AppData, projection: ProjectionResult): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  const current = projection.months[0];
  if (!current) return alerts;

  const commitment = current.income > 0 ? (current.totalExpenses / current.income) * 100 : 100;
  const monthName = monthLabelShort(current.monthKey);
  const addAlert = (
    severity: FinancialAlertSeverity,
    type: string,
    title: string,
    description: string,
    month = current.monthKey,
    value?: number,
  ) => {
    const id = `${type}:${month}:${title}`;
    if (alerts.some((alert) => alert.id === id)) return;
    alerts.push({ id, severity, type, title, description, month, value });
  };

  if (current.balance < 0) {
    addAlert(
      'critical',
      'negative-month',
      `${monthName} pode fechar negativo`,
      `As saídas previstas superam as receitas em ${formatCurrencyAbs(current.balance)}.`,
      current.monthKey,
      current.balance,
    );
  } else if (commitment >= 90) {
    addAlert(
      'warning',
      'income-commitment',
      `${commitment.toFixed(0)}% da renda comprometida`,
      `O mês de ${monthName} está com pouco espaço de folga entre receitas e saídas.`,
      current.monthKey,
      commitment,
    );
  } else if (commitment >= 80) {
    addAlert(
      'warning',
      'income-commitment',
      `${commitment.toFixed(0)}% da renda comprometida`,
      `A renda de ${monthName} já está próxima do limite de segurança.`,
      current.monthKey,
      commitment,
    );
  }

  for (const budgetUsage of getExceededCategoryBudgets(data, current.monthKey)) {
    const excessPercent = budgetUsage.usagePercent - 100;
    addAlert(
      'warning',
      'category-budget-exceeded',
      `${budgetUsage.category} acima do orçamento`,
      `${budgetUsage.category} está ${excessPercent.toFixed(0)}% acima do orçamento: realizado ${formatCurrencyAbs(budgetUsage.realizedAmount)} para limite de ${formatCurrencyAbs(budgetUsage.budgetAmount)}.`,
      current.monthKey,
      budgetUsage.difference,
    );
  }

  const cardMonthlyLimit = getCardMonthlyLimit(data.settings, current.monthKey);
  if (current.cardExpenses > cardMonthlyLimit) {
    addAlert(
      'critical',
      'card-limit-exceeded',
      'Cartões acima da meta',
      `As faturas somam ${formatCurrencyAbs(current.cardExpenses)} e ultrapassam a meta mensal de ${formatCurrencyAbs(cardMonthlyLimit)}.`,
      current.monthKey,
      current.cardExpenses - cardMonthlyLimit,
    );
  }

  if (current.income > 0) {
    const cardIncomePercent = (current.cardExpenses / current.income) * 100;
    if (cardIncomePercent >= 35) {
      addAlert(
        'warning',
        'card-income-share',
        `Faturas representam ${cardIncomePercent.toFixed(0)}% da renda`,
        `As faturas de ${monthName} somam ${formatCurrencyAbs(current.cardExpenses)} para renda de ${formatCurrencyAbs(current.income)}.`,
        current.monthKey,
        cardIncomePercent,
      );
    }
  }

  const dueConcentration = getDueDateConcentration(data, current.monthKey);
  if (dueConcentration && current.totalExpenses > 0 && dueConcentration.amount / current.totalExpenses >= 0.35) {
    addAlert(
      'warning',
      'due-date-concentration',
      `Concentração entre os dias ${dueConcentration.startDay} e ${dueConcentration.endDay}`,
      `${formatCurrencyAbs(dueConcentration.amount)} vencem em uma janela de ${dueConcentration.endDay - dueConcentration.startDay + 1} dias.`,
      current.monthKey,
      dueConcentration.amount,
    );
  }

  const futureNeg = projection.months.find((month) => month.balance < 0);
  if (futureNeg && futureNeg.monthKey !== current.monthKey) {
    addAlert(
      'critical',
      'future-negative-month',
      `${monthLabelShort(futureNeg.monthKey)} pode fechar negativo`,
      `A projeção indica déficit de ${formatCurrencyAbs(futureNeg.balance)} nesse mês.`,
      futureNeg.monthKey,
      futureNeg.balance,
    );
  }

  const unplannedDebt = data.debts.find((debt) => debt.status === 'Em aberto');
  if (unplannedDebt) {
    addAlert(
      'warning',
      'unplanned-debt',
      'Dívida sem planejamento',
      `A dívida "${unplannedDebt.name}" ainda está em aberto e precisa de plano de pagamento.`,
      current.monthKey,
      unplannedDebt.balance,
    );
  }

  if (current.income > 0) {
    const debtPercent = (current.debtExpenses / current.income) * 100;
    if (debtPercent >= 15) {
      addAlert(
        'warning',
        'debt-income-share',
        `Dívidas consomem ${debtPercent.toFixed(0)}% da renda`,
        `As parcelas de dívidas em ${monthName} somam ${formatCurrencyAbs(current.debtExpenses)}.`,
        current.monthKey,
        debtPercent,
      );
    }
  }

  const essentialExpenses = current.essentialExpenses;
  const reserveBalance = totalBankBalance(data);
  if (essentialExpenses > 0) {
    const monthsCovered = reserveBalance / essentialExpenses;
    if (monthsCovered < data.settings.reserveTargetMonths) {
      addAlert(
        monthsCovered < 1 ? 'critical' : 'warning',
        'low-reserve',
        `Reserva cobre ${monthsCovered.toFixed(1)} mês de gastos essenciais`,
        `Saldo em contas de ${formatCurrencyAbs(reserveBalance)} comparado a gastos essenciais mensais de ${formatCurrencyAbs(essentialExpenses)}.`,
        current.monthKey,
        monthsCovered,
      );
    }
  }

  const previousAverage = averagePreviousExpenses(data, current.monthKey, 3);
  if (previousAverage > 0) {
    const growthPercent = ((current.realizedExpenses - previousAverage) / previousAverage) * 100;
    if (growthPercent >= 15) {
      addAlert(
        'warning',
        'expense-growth',
        `Gastos subiram ${growthPercent.toFixed(0)}%`,
        `As saídas de ${monthName} estão acima da média dos últimos 3 meses (${formatCurrencyAbs(previousAverage)}).`,
        current.monthKey,
        growthPercent,
      );
    }
  }

  return alerts.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function formatCurrencyAbs(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));
}

function severityRank(severity: FinancialAlertSeverity): number {
  if (severity === 'critical') return 3;
  if (severity === 'warning') return 2;
  return 1;
}

function averagePreviousExpenses(data: AppData, monthKey: string, count: number): number {
  let total = 0;
  let months = 0;
  for (let i = 1; i <= count; i++) {
    const summary = getMonthlyFinancialSummary(data, addMonths(monthKey, -i));
    if (summary.realizedExpenses <= 0) continue;
    total += summary.realizedExpenses;
    months++;
  }
  return months > 0 ? total / months : 0;
}

function getDueDateConcentration(data: AppData, monthKey: string): { startDay: number; endDay: number; amount: number } | null {
  const dueItems: { day: number; amount: number }[] = [];

  for (const expense of data.expenses) {
    if (expense.cardId) continue;
    const directAmount = expenseAmountForMonth(expense, monthKey);
    if (directAmount > 0) dueItems.push({ day: expense.dueDay, amount: directAmount });
  }

  for (const card of data.cards) {
    const amount = data.purchases.reduce((sum, purchase) => (
      purchase.cardId === card.id ? sum + purchaseInstallmentForMonth(purchase, monthKey) : sum
    ), 0);
    if (amount > 0) dueItems.push({ day: card.dueDay, amount });
  }

  for (const debt of data.debts) {
    const amount = debtPaymentForMonth(debt, monthKey);
    if (amount > 0) dueItems.push({ day: Number(debt.dueDate.slice(8, 10)), amount });
  }

  if (dueItems.length === 0) return null;

  let best = { startDay: 1, endDay: 5, amount: 0 };
  for (let startDay = 1; startDay <= 27; startDay++) {
    const endDay = startDay + 4;
    const amount = dueItems
      .filter((item) => item.day >= startDay && item.day <= endDay)
      .reduce((sum, item) => sum + item.amount, 0);
    if (amount > best.amount) best = { startDay, endDay, amount };
  }

  return best.amount > 0 ? best : null;
}
