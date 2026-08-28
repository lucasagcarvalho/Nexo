import type { AppData, Income, Expense, CardPurchase, CreditCard, Vigencia } from './types';
import { addMonths, generateMonthKeys, monthLabelShort, compareMonths, currentMonthKey } from './format';
import { getActiveVigencia } from '@/store/DataContext';

export interface MonthProjection {
  monthKey: string;
  income: number;
  fixedIncome: number;
  variableIncome: number;
  fixedExpenses: number;
  prazoExpenses: number;
  variableExpenses: number;
  cardExpenses: number;
  debtExpenses: number;
  totalExpenses: number;
  balance: number;
  accumulatedBalance: number;
  cardByCard: Record<string, number>;
  cardInstallments: number;
  categoryBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  parcelasFuturas: number;
  bankBalance: number;
}

export interface ProjectionResult {
  months: MonthProjection[];
  startMonth: string;
}

function incomeAmountForMonth(income: Income, monthKey: string): number {
  if (!income.active) return 0;
  // Variable income: only shows in its competence month
  if (income.kind === 'variavel') {
    if (income.competenceMonth && income.competenceMonth !== monthKey) return 0;
    const vig = getActiveVigencia(income.vigencias, monthKey);
    if (!vig) return 0;
    return vig.amount;
  }
  // Fixed and Determinada: check vigências
  const vig = getActiveVigencia(income.vigencias, monthKey);
  if (!vig) return 0;
  return vig.amount;
}

function isIncomeActiveInMonth(income: Income, monthKey: string): boolean {
  if (!income.active) return false;
  if (income.kind === 'variavel') {
    return income.competenceMonth === monthKey;
  }
  return getActiveVigencia(income.vigencias, monthKey) !== null;
}

function expenseAmountForMonth(expense: Expense, monthKey: string): number {
  if (!expense.active && expense.type !== 'Pontual') return 0;
  // One-time expense: only shows in its competence month
  if (expense.type === 'Pontual') {
    if (expense.competenceMonth && expense.competenceMonth !== monthKey) return 0;
    const vig = getActiveVigencia(expense.vigencias, monthKey);
    if (!vig) return 0;
    return expense.status === 'realizado' && expense.realizedAmount != null
      ? expense.realizedAmount
      : vig.amount;
  }
  // Fixo and Prazo: check vigências (Prazo has endDate set on the vigência)
  const vig = getActiveVigencia(expense.vigencias, monthKey);
  if (!vig) return 0;
  return expense.status === 'realizado' && expense.realizedAmount != null
    ? expense.realizedAmount
    : vig.amount;
}

function isExpenseActiveInMonth(expense: Expense, monthKey: string): boolean {
  if (expense.type === 'Pontual') {
    return expense.competenceMonth === monthKey;
  }
  return getActiveVigencia(expense.vigencias, monthKey) !== null;
}

function getInstallmentAmounts(purchase: CardPurchase): number[] {
  const base = purchase.totalAmount / purchase.installments;
  const amounts: number[] = [];
  let sum = 0;
  for (let i = 0; i < purchase.installments; i++) {
    if (i === purchase.installments - 1) {
      amounts.push(Math.round((purchase.totalAmount - sum) * 100) / 100);
    } else {
      const val = Math.round(base * 100) / 100;
      amounts.push(val);
      sum += val;
    }
  }
  return amounts;
}

function purchaseInstallmentForMonth(purchase: CardPurchase, monthKey: string): number {
  const startMonth = purchase.firstInvoiceMonth ?? purchase.purchaseDate.slice(0, 7);
  const startIdx = monthIndex(startMonth);
  const targetIdx = monthIndex(monthKey);
  const diff = targetIdx - startIdx;
  if (diff < 0 || diff >= purchase.installments) return 0;
  return getInstallmentAmounts(purchase)[diff];
}

function monthIndex(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function projectMonths(data: AppData, count = 360, startMonth?: string): ProjectionResult {
  const start = startMonth ?? currentMonthKey();
  const monthKeys = generateMonthKeys(start, count);
  const months: MonthProjection[] = [];
  let accumulated = 0;

  for (const mk of monthKeys) {
    let fixedIncome = 0;
    let variableIncome = 0;

    for (const inc of data.incomes) {
      const amt = incomeAmountForMonth(inc, mk);
      if (amt === 0) continue;
      if (inc.kind === 'variavel') variableIncome += amt;
      else fixedIncome += amt;
    }
    const income = fixedIncome + variableIncome;

    let fixedExpenses = 0;
    let prazoExpenses = 0;
    let variableExpenses = 0;
    const categoryBreakdown: Record<string, number> = {};
    const typeBreakdown: Record<string, number> = {};

    for (const exp of data.expenses) {
      if (exp.cardId) continue;
      const amt = expenseAmountForMonth(exp, mk);
      if (amt === 0) continue;
      if (exp.type === 'Fixo') fixedExpenses += amt;
      else if (exp.type === 'Prazo') prazoExpenses += amt;
      else variableExpenses += amt;
      typeBreakdown[exp.type] = (typeBreakdown[exp.type] ?? 0) + amt;
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] ?? 0) + amt;
    }

    // Card expenses from purchases
    const cardByCard: Record<string, number> = {};
    let cardExpenses = 0;
    for (const pur of data.purchases) {
      const inst = purchaseInstallmentForMonth(pur, mk);
      if (inst > 0) {
        cardByCard[pur.cardId] = (cardByCard[pur.cardId] ?? 0) + inst;
        cardExpenses += inst;
        categoryBreakdown['Cartões'] = (categoryBreakdown['Cartões'] ?? 0) + inst;
      }
    }

    // Debt expenses
    let debtExpenses = 0;
    for (const debt of data.debts) {
      if (debt.status === 'Quitada') continue;
      if (debt.installmentsRemaining <= 0) continue;
      const debtMonth = debt.dueDate.slice(0, 7);
      if (debtMonth === mk || (debt.installmentAmount > 0 && mk >= debtMonth && mk <= addMonths(debtMonth, debt.installmentsRemaining - 1))) {
        debtExpenses += debt.installmentAmount;
        categoryBreakdown['Dívidas'] = (categoryBreakdown['Dívidas'] ?? 0) + debt.installmentAmount;
      }
    }

    const totalExpenses = fixedExpenses + prazoExpenses + variableExpenses + cardExpenses + debtExpenses;
    const balance = income - totalExpenses;

    // Surplus allocation
    let carryToNext = 0;
    if (balance > 0) {
      const s = data.settings;
      carryToNext = balance * (s.surplusNextMonth + s.surplusFree) / 100;
    }
    accumulated += carryToNext;

    // Future installments from this month forward
    let parcelasFuturas = 0;
    for (const pur of data.purchases) {
      const startMonth = pur.firstInvoiceMonth ?? pur.purchaseDate.slice(0, 7);
      const startIdx = monthIndex(startMonth);
      const targetIdx = monthIndex(mk);
      const remaining = pur.installments - (targetIdx - startIdx);
      if (remaining > 0) {
        const amounts = getInstallmentAmounts(pur);
        for (let i = Math.max(0, targetIdx - startIdx); i < pur.installments; i++) {
          parcelasFuturas += amounts[i];
        }
      }
    }

    // Bank account balance
    const bankBalance = data.bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    months.push({
      monthKey: mk,
      income,
      fixedIncome,
      variableIncome,
      fixedExpenses,
      prazoExpenses,
      variableExpenses,
      cardExpenses,
      debtExpenses,
      totalExpenses,
      balance,
      accumulatedBalance: accumulated,
      cardByCard,
      cardInstallments: cardExpenses,
      categoryBreakdown,
      typeBreakdown,
      parcelasFuturas,
      bankBalance,
    });
  }

  return { months, startMonth: start };
}

export function cardProjection(data: AppData, card: CreditCard, count = 12, startMonth?: string): { monthKey: string; amount: number }[] {
  const start = startMonth ?? currentMonthKey();
  const monthKeys = generateMonthKeys(start, count);
  return monthKeys.map((mk) => {
    let amount = 0;
    for (const pur of data.purchases) {
      if (pur.cardId !== card.id) continue;
      amount += purchaseInstallmentForMonth(pur, mk);
    }
    return { monthKey: mk, amount };
  });
}

export interface InvoiceItem {
  purchaseId: string;
  name: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  category: string;
}

export function cardInvoiceDetail(data: AppData, cardId: string, monthKey: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  for (const pur of data.purchases) {
    if (pur.cardId !== cardId) continue;
    const startMonth = pur.firstInvoiceMonth ?? pur.purchaseDate.slice(0, 7);
    const startIdx = monthIndex(startMonth);
    const targetIdx = monthIndex(monthKey);
    const diff = targetIdx - startIdx;
    if (diff < 0 || diff >= pur.installments) continue;
    const amounts = getInstallmentAmounts(pur);
    items.push({
      purchaseId: pur.id,
      name: pur.name,
      installmentNumber: diff + 1,
      totalInstallments: pur.installments,
      amount: amounts[diff],
      category: pur.category,
    });
  }
  return items;
}

export interface PurchaseStatus {
  currentInstallment: number;
  remaining: number;
  remainingBalance: number;
}

export function purchaseInstallmentStatus(pur: CardPurchase, refMonth?: string): PurchaseStatus {
  const startMonth = pur.firstInvoiceMonth ?? pur.purchaseDate.slice(0, 7);
  const curMonth = refMonth ?? currentMonthKey();
  const elapsed = Math.max(0, monthIndex(curMonth) - monthIndex(startMonth));
  const currentInstallment = Math.min(elapsed + 1, pur.installments);
  const remaining = Math.max(0, pur.installments - elapsed);
  const amounts = getInstallmentAmounts(pur);
  let remainingBalance = 0;
  for (let i = elapsed; i < pur.installments; i++) {
    remainingBalance += amounts[i];
  }
  return { currentInstallment, remaining, remainingBalance };
}

export function cardUtilization(data: AppData, card: CreditCard, refMonth?: string): { used: number; available: number; currentInvoice: number; nextInvoice: number; futureInstallments: number } {
  const startMonth = refMonth ?? currentMonthKey();
  const nextMonth = addMonths(startMonth, 1);
  let currentInvoice = 0;
  let nextInvoice = 0;
  let futureInstallments = 0;

  for (const pur of data.purchases) {
    if (pur.cardId !== card.id) continue;
    currentInvoice += purchaseInstallmentForMonth(pur, startMonth);
    nextInvoice += purchaseInstallmentForMonth(pur, nextMonth);
    const purStartMonth = pur.firstInvoiceMonth ?? pur.purchaseDate.slice(0, 7);
    const purStartIdx = monthIndex(purStartMonth);
    const curIdx = monthIndex(startMonth);
    const elapsed = curIdx - purStartIdx;
    if (elapsed < pur.installments) {
      const amounts = getInstallmentAmounts(pur);
      for (let i = Math.max(0, elapsed + 2); i < pur.installments; i++) {
        futureInstallments += amounts[i];
      }
    }
  }

  const used = currentInvoice + futureInstallments;
  return {
    used,
    available: Math.max(0, card.limit - used),
    currentInvoice,
    nextInvoice,
    futureInstallments,
  };
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
  const simulatedData: AppData = {
    ...data,
    purchases: [...data.purchases, simulatedPurchase],
  };
  const after = projectMonths(simulatedData, 12, start).months;
  const negativeMonths = after
    .filter((m, i) => m.balance < 0 && before[i].balance >= 0)
    .map((m, i) => ({ monthKey: m.monthKey, before: before[i].balance, after: m.balance }));
  return { before, after, negativeMonths };
}

export function totalDebt(data: AppData): number {
  return data.debts
    .filter((d) => d.status !== 'Quitada')
    .reduce((sum, d) => sum + d.balance, 0);
}

export function monthsUntilFreeOfInstallments(data: AppData, refMonth?: string): number {
  const startMonth = refMonth ?? currentMonthKey();
  let maxEnd = -1;
  for (const pur of data.purchases) {
    const purStartMonth = pur.firstInvoiceMonth ?? pur.purchaseDate.slice(0, 7);
    const endMonth = addMonths(purStartMonth, pur.installments - 1);
    if (monthIndex(endMonth) > maxEnd) maxEnd = monthIndex(endMonth);
  }
  const startIdx = monthIndex(startMonth);
  return maxEnd < 0 ? 0 : Math.max(0, maxEnd - startIdx + 1);
}

export function totalBankBalance(data: AppData): number {
  return data.bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
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
  const hasNegative = projection.months.some((m) => m.balance < 0);
  if (!hasNegative) { steps[0].done = true; doneCount++; }
  const currentMonth = projection.months[0];
  if (currentMonth && currentMonth.cardExpenses <= data.settings.cardMonthlyLimit) { steps[1].done = true; doneCount++; }
  const hasActiveDebt = data.debts.some((d) => d.status !== 'Quitada' && d.balance > 0);
  if (!hasActiveDebt) { steps[2].done = true; doneCount++; }
  const monthlyExpenses = currentMonth?.totalExpenses ?? 0;
  const reserve = Math.max(0, currentMonth?.accumulatedBalance ?? 0);
  if (reserve >= monthlyExpenses * 1) { steps[3].done = true; doneCount++; }
  if (reserve >= monthlyExpenses * 3) { steps[4].done = true; doneCount++; }
  const commitment = currentMonth && currentMonth.income > 0 ? (currentMonth.totalExpenses / currentMonth.income) * 100 : 100;
  if (reserve >= monthlyExpenses * 3 && !hasNegative && commitment < 70) { steps[5].done = true; doneCount++; }

  return { percent: Math.round((doneCount / steps.length) * 100), steps };
}

export function generateAlerts(data: AppData, projection: ProjectionResult): { type: 'critico' | 'atencao' | 'info' | 'positivo'; message: string }[] {
  const alerts: { type: 'critico' | 'atencao' | 'info' | 'positivo'; message: string }[] = [];
  const current = projection.months[0];
  if (!current) return alerts;

  const commitment = current.income > 0 ? (current.totalExpenses / current.income) * 100 : 100;
  const monthName = monthLabelShort(current.monthKey);

  if (current.balance < 0) {
    alerts.push({ type: 'critico', message: `O mês de ${monthName} está com saldo negativo de ${formatCurrencyAbs(current.balance)}.` });
  } else if (commitment >= 90) {
    alerts.push({ type: 'atencao', message: `O mês de ${monthName} está com comprometimento de ${commitment.toFixed(0)}% da renda.` });
  } else if (commitment >= 80) {
    alerts.push({ type: 'atencao', message: `Atenção: ${commitment.toFixed(0)}% da renda de ${monthName} já está comprometida.` });
  }

  for (const card of data.cards) {
    const cardAmount = current.cardByCard[card.id] ?? 0;
    if (cardAmount > 0) {
      alerts.push({ type: 'info', message: `Você possui ${formatCurrencyAbs(cardAmount)} de parcelas do cartão ${card.name} em ${monthName}.` });
    }
  }

  if (current.cardExpenses > data.settings.cardMonthlyLimit) {
    alerts.push({ type: 'critico', message: `Seu gasto com cartões ultrapassou o limite definido de ${formatCurrencyAbs(data.settings.cardMonthlyLimit)}.` });
  }

  const futureNeg = projection.months.find((m) => m.balance < 0);
  if (futureNeg && futureNeg.monthKey !== current.monthKey) {
    alerts.push({ type: 'critico', message: `ATENÇÃO: Seu saldo projetado para ${monthLabelShort(futureNeg.monthKey)} ficará negativo em ${formatCurrencyAbs(futureNeg.balance)}.` });
  }

  const unplannedDebt = data.debts.find((d) => d.status === 'Em aberto');
  if (unplannedDebt) {
    alerts.push({ type: 'atencao', message: `A dívida "${unplannedDebt.name}" ainda está sem planejamento.` });
  }

  if (current.income > 0) {
    const instPercent = (current.cardExpenses / current.income) * 100;
    if (instPercent > 25) {
      alerts.push({ type: 'atencao', message: `Suas parcelas representam ${instPercent.toFixed(0)}% da renda.` });
    }
  }

  const lastMonth = projection.months[projection.months.length - 1];
  if (lastMonth && lastMonth.accumulatedBalance > 0) {
    alerts.push({ type: 'positivo', message: `Se nenhum novo gasto for criado, seu saldo acumulado em 24 meses será ${formatCurrencyAbs(lastMonth.accumulatedBalance)}.` });
  }

  return alerts;
}

function formatCurrencyAbs(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));
}

export type InvoiceStatus = 'pago' | 'pendente' | 'vencido' | 'sem_fatura';

export function invoiceStatusKey(cardId: string, monthKey: string): string {
  return `${cardId}|${monthKey}`;
}

export function getInvoiceStatus(
  data: AppData,
  card: CreditCard,
  monthKey: string,
  invoiceAmount: number,
): InvoiceStatus {
  if (invoiceAmount <= 0) return 'sem_fatura';
  const key = invoiceStatusKey(card.id, monthKey);
  if (data.cardInvoiceStatus?.[key]) return 'pago';
  const [y, m] = monthKey.split('-').map(Number);
  const dueDate = new Date(y, m, card.dueDay);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dueDate < today) return 'vencido';
  return 'pendente';
}

export function isInvoicePaid(data: AppData, cardId: string, monthKey: string): boolean {
  return data.cardInvoiceStatus?.[invoiceStatusKey(cardId, monthKey)] ?? false;
}
