import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../src/lib/seed';
import type { AppData, CardPurchase, CreditCard, Debt, Expense, Income } from '../src/lib/types';
import { addMonths, currentMonthKey } from '../src/lib/format';
import {
  cardInvoiceDetail,
  getCardCommitmentSummary,
  cardUtilization,
  getCategoryBudgetUsages,
  debtPaymentForMonth,
  generateAlerts,
  expenseAmountForMonth,
  getAccountBalanceSnapshotForMonth,
  getCardInvoiceForMonth,
  getInvoiceStatus,
  getMonthHealthStatus,
  getProjectionHorizonSummaries,
  getActiveVigencia,
  incomeAmountForMonth,
  getMonthlyFinancialSummary,
  getPlanningMonthDetails,
  invoiceStatusKey,
  isExpenseActiveInMonth,
  isExpensePaidForMonth,
  isInvoicePaid,
  projectAccountBalance,
  projectMonths,
  purchaseInstallmentStatus,
} from '../src/lib/finance';

function baseData(): AppData {
  return {
    ...seedData(),
    settings: {
      ...seedData().settings,
      surplusNextMonth: 0,
      surplusFree: 0,
    },
  };
}

function income(overrides: Partial<Income> = {}): Income {
  return {
    id: 'inc-1',
    name: 'Salário',
    type: 'Salário',
    kind: 'fixa',
    person: 'Lucas',
    dueDay: 5,
    active: true,
    status: 'previsto',
    vigencias: [{ id: 'vig-inc', amount: 5000, startDate: '2026-01', endDate: null }],
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    description: 'Despesa',
    category: 'Casa',
    type: 'Fixo',
    person: 'Lucas',
    paymentMethod: 'PIX',
    dueDay: 10,
    paid: false,
    active: true,
    status: 'previsto',
    vigencias: [{ id: 'vig-exp', amount: 100, startDate: '2026-01', endDate: null }],
    ...overrides,
  };
}

function card(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'card-1',
    name: 'Nubank',
    bank: 'Nubank',
    holder: 'Lucas',
    limit: 3000,
    closingDay: 20,
    dueDay: 10,
    color: '#3B82F6',
    ...overrides,
  };
}

function purchase(overrides: Partial<CardPurchase> = {}): CardPurchase {
  return {
    id: 'pur-1',
    cardId: 'card-1',
    name: 'Notebook',
    totalAmount: 2000,
    installments: 5,
    purchaseDate: '2026-08-01',
    firstInvoiceMonth: '2026-08',
    category: 'Eletrônicos',
    ...overrides,
  };
}

function debt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'debt-1',
    name: 'Acordo',
    institution: 'Banco',
    balance: 1000,
    installmentAmount: 200,
    installmentsRemaining: 3,
    dueDate: '2026-08-15',
    status: 'Parcelada',
    ...overrides,
  };
}

test('despesa Prazo fica ativa durante a vigência inclusive e zera depois', () => {
  const prazo = expense({
    id: 'prazo',
    type: 'Prazo',
    vigencias: [{ id: 'vig-prazo', amount: 500, startDate: '2026-08', endDate: '2026-11' }],
  });

  assert.equal(isExpenseActiveInMonth(prazo, '2026-08'), true);
  assert.equal(expenseAmountForMonth(prazo, '2026-11'), 500);
  assert.equal(isExpenseActiveInMonth(prazo, '2026-12'), false);
  assert.equal(expenseAmountForMonth(prazo, '2026-12'), 0);
});

test('despesa Fixo respeita início da vigência', () => {
  const fixed = expense({
    type: 'Fixo',
    vigencias: [{ id: 'vig-fixa', amount: 150, startDate: '2026-08', endDate: null }],
  });

  assert.equal(expenseAmountForMonth(fixed, '2026-07'), 0);
  assert.equal(expenseAmountForMonth(fixed, '2026-08'), 150);
  assert.equal(expenseAmountForMonth(fixed, '2026-09'), 150);
});

test('despesa Pontual entra apenas no mês de competência', () => {
  const pontual = expense({
    id: 'pontual',
    type: 'Pontual',
    competenceMonth: '2026-09',
    vigencias: [{ id: 'vig-pontual', amount: 300, startDate: '2026-09', endDate: '2026-09' }],
  });

  assert.equal(expenseAmountForMonth(pontual, '2026-08'), 0);
  assert.equal(expenseAmountForMonth(pontual, '2026-09'), 300);
  assert.equal(expenseAmountForMonth(pontual, '2026-10'), 0);
});

test('despesa realizada usa valor realizado quando diferente do previsto', () => {
  const realized = expense({
    status: 'realizado',
    realizedAmount: 135,
    vigencias: [{ id: 'vig-realized', amount: 100, startDate: '2026-08', endDate: null }],
  });

  assert.equal(expenseAmountForMonth(realized, '2026-08'), 135);
});

test('gasto pago e não pago usa paidMonths por mês', () => {
  const paid = expense({ paidMonths: { '2026-08': true } });

  assert.equal(isExpensePaidForMonth(paid, '2026-08'), true);
  assert.equal(isExpensePaidForMonth(paid, '2026-09'), false);
});

test('receitas fixa, variável e determinada respeitam competência e vigência', () => {
  const fixed = income();
  const variable = income({
    id: 'inc-var',
    kind: 'variavel',
    competenceMonth: '2026-08',
    vigencias: [{ id: 'vig-var', amount: 700, startDate: '2026-08', endDate: '2026-08' }],
  });
  const determined = income({
    id: 'inc-det',
    kind: 'determinada',
    vigencias: [{ id: 'vig-det', amount: 1200, startDate: '2026-08', endDate: '2026-10' }],
  });

  assert.equal(incomeAmountForMonth(fixed, '2026-08'), 5000);
  assert.equal(incomeAmountForMonth(variable, '2026-08'), 700);
  assert.equal(incomeAmountForMonth(variable, '2026-09'), 0);
  assert.equal(incomeAmountForMonth(determined, '2026-10'), 1200);
  assert.equal(incomeAmountForMonth(determined, '2026-11'), 0);
});

test('vigência mensal sobrescreve somente o mês e alteração futura vale a partir do mês', () => {
  const vigencias = [
    { id: 'base', amount: 1000, startDate: '2026-01', endDate: '2026-09' },
    { id: 'override', amount: 1300, startDate: '2026-08', endDate: '2026-08' },
    { id: 'future', amount: 1500, startDate: '2026-10', endDate: null },
  ];

  assert.equal(getActiveVigencia(vigencias, '2026-07')?.amount, 1000);
  assert.equal(getActiveVigencia(vigencias, '2026-08')?.amount, 1300);
  assert.equal(getActiveVigencia(vigencias, '2026-09')?.amount, 1000);
  assert.equal(getActiveVigencia(vigencias, '2026-10')?.amount, 1500);
});

test('compra à vista e parcelada compõem faturas mensais', () => {
  const purchases = [
    purchase({ id: 'cash', totalAmount: 250, installments: 1, firstInvoiceMonth: '2026-08' }),
    purchase({ id: 'installment', totalAmount: 1000, installments: 4, firstInvoiceMonth: '2026-08' }),
  ];

  assert.equal(getCardInvoiceForMonth(purchases, 'card-1', '2026-08'), 500);
  assert.equal(getCardInvoiceForMonth(purchases, 'card-1', '2026-09'), 250);
  assert.equal(getCardInvoiceForMonth(purchases, 'card-1', '2026-12'), 0);
});

test('parcela atual diferente de 1 é derivada pelo primeiro mês da fatura', () => {
  const installment = purchase({ totalAmount: 900, installments: 3, firstInvoiceMonth: '2026-06' });
  const status = purchaseInstallmentStatus(installment, '2026-08');

  assert.equal(status.currentInstallment, 3);
  assert.equal(status.remaining, 1);
  assert.equal(status.remainingBalance, 300);
});

test('detalhe de fatura informa número da parcela e valor', () => {
  const data = baseData();
  data.purchases = [purchase({ totalAmount: 999.99, installments: 3, firstInvoiceMonth: '2026-08' })];

  const items = cardInvoiceDetail(data, 'card-1', '2026-10');

  assert.equal(items.length, 1);
  assert.equal(items[0].installmentNumber, 3);
  assert.equal(items[0].totalInstallments, 3);
  assert.equal(items[0].amount, 333.33);
});

test('fatura paga e não paga usam status central do cartão', () => {
  const data = baseData();
  const creditCard = card();
  const futureMonth = addMonths(currentMonthKey(), 1);

  assert.equal(isInvoicePaid(data, creditCard.id, futureMonth), false);
  assert.equal(getInvoiceStatus(data, creditCard, futureMonth, 100), 'pendente');

  data.cardInvoiceStatus = { [invoiceStatusKey(creditCard.id, futureMonth)]: true };

  assert.equal(isInvoicePaid(data, creditCard.id, futureMonth), true);
  assert.equal(getInvoiceStatus(data, creditCard, futureMonth, 100), 'pago');
  assert.equal(getInvoiceStatus(data, creditCard, futureMonth, 0), 'sem_fatura');
});

test('resumo mensal centraliza receitas, despesas, cartões e dívidas', () => {
  const data = baseData();
  data.incomes = [income()];
  data.expenses = [
    expense({ id: 'fixa', type: 'Fixo', vigencias: [{ id: 'vig-fixa', amount: 100, startDate: '2026-01', endDate: null }] }),
    expense({ id: 'prazo', type: 'Prazo', vigencias: [{ id: 'vig-prazo', amount: 500, startDate: '2026-08', endDate: '2026-11' }] }),
    expense({ id: 'pontual', type: 'Pontual', competenceMonth: '2026-08', vigencias: [{ id: 'vig-pontual', amount: 300, startDate: '2026-08', endDate: '2026-08' }] }),
  ];
  data.cards = [card()];
  data.purchases = [purchase()];
  data.debts = [debt()];

  const summary = getMonthlyFinancialSummary(data, '2026-08');

  assert.equal(summary.income, 5000);
  assert.equal(summary.fixedExpenses, 100);
  assert.equal(summary.prazoExpenses, 500);
  assert.equal(summary.variableExpenses, 300);
  assert.equal(summary.cardExpenses, 400);
  assert.equal(summary.debtExpenses, 200);
  assert.equal(summary.totalExpenses, 1500);
  assert.equal(summary.balance, 3500);
});

test('resumo mensal diferencia previsto, realizado, pago, pendente e variação', () => {
  const data = baseData();
  data.expenses = [
    expense({
      id: 'paid-realized',
      status: 'realizado',
      realizedAmount: 130,
      paidMonths: { '2026-08': true },
      vigencias: [{ id: 'vig-paid', amount: 100, startDate: '2026-08', endDate: null }],
    }),
    expense({
      id: 'pending-planned',
      status: 'previsto',
      vigencias: [{ id: 'vig-pending', amount: 200, startDate: '2026-08', endDate: null }],
    }),
  ];
  data.cards = [card()];
  data.purchases = [purchase({ totalAmount: 500, installments: 1, firstInvoiceMonth: '2026-08' })];
  data.cardInvoiceStatus = { [invoiceStatusKey('card-1', '2026-08')]: true };
  data.debts = [debt({ installmentAmount: 50, installmentsRemaining: 1 })];

  const summary = getMonthlyFinancialSummary(data, '2026-08');

  assert.equal(summary.expectedExpenses, 850);
  assert.equal(summary.realizedExpenses, 880);
  assert.equal(summary.totalExpenses, 880);
  assert.equal(summary.paidExpenses, 630);
  assert.equal(summary.unpaidExpenses, 250);
  assert.equal(summary.expenseVariance, 30);
  assert.equal(Math.round(summary.expenseVariancePercent * 100) / 100, 3.53);
});

test('resumo mensal separa essenciais, discricionários e compromissos financeiros', () => {
  const data = baseData();
  data.categoryEntries = [
    { id: 'cat-home', name: 'Moradia', active: true, expenseClass: 'essential' },
    { id: 'cat-fun', name: 'Lazer', active: true, expenseClass: 'lifestyle' },
    { id: 'cat-loan', name: 'Empréstimos', active: true, expenseClass: 'financial' },
    { id: 'cat-misc', name: 'Outros', active: true, expenseClass: 'other' },
  ];
  data.expenses = [
    expense({ id: 'home', category: 'Moradia', vigencias: [{ id: 'vig-home', amount: 1000, startDate: '2026-08', endDate: null }] }),
    expense({ id: 'misc', category: 'Outros', vigencias: [{ id: 'vig-misc', amount: 50, startDate: '2026-08', endDate: null }] }),
  ];
  data.purchases = [
    purchase({ id: 'fun', category: 'Lazer', totalAmount: 300, installments: 1, firstInvoiceMonth: '2026-08' }),
    purchase({ id: 'loan-card', category: 'Empréstimos', totalAmount: 200, installments: 1, firstInvoiceMonth: '2026-08' }),
  ];
  data.debts = [debt({ installmentAmount: 400, installmentsRemaining: 1 })];

  const summary = getMonthlyFinancialSummary(data, '2026-08');

  assert.equal(summary.essentialExpenses, 1000);
  assert.equal(summary.discretionaryExpenses, 300);
  assert.equal(summary.financialCommitments, 600);
  assert.equal(summary.otherExpenses, 50);
});

test('orçamento por categoria respeita vigência e soma gastos diretos e cartão', () => {
  const data = baseData();
  data.categoryBudgets = [
    { id: 'budget-food', category: 'Alimentação', amount: 1200, startMonth: '2026-08', endMonth: '2026-09' },
  ];
  data.expenses = [
    expense({
      id: 'market',
      category: 'Alimentação',
      status: 'realizado',
      realizedAmount: 900,
      vigencias: [{ id: 'vig-market', amount: 800, startDate: '2026-08', endDate: null }],
    }),
  ];
  data.purchases = [
    purchase({
      id: 'delivery',
      category: 'Alimentação',
      totalAmount: 600,
      installments: 2,
      firstInvoiceMonth: '2026-08',
    }),
  ];

  const august = getCategoryBudgetUsages(data, '2026-08');
  assert.equal(august.length, 1);
  assert.equal(august[0].realizedAmount, 1200);
  assert.equal(august[0].usagePercent, 100);
  assert.equal(august[0].status, 'excedido');

  assert.equal(getCategoryBudgetUsages(data, '2026-10').length, 0);
});

test('categoria acima do orçamento gera alerta financeiro', () => {
  const data = baseData();
  data.categoryBudgets = [
    { id: 'budget-food', category: 'Alimentação', amount: 1000, startMonth: '2026-08', endMonth: null },
  ];
  data.expenses = [
    expense({
      category: 'Alimentação',
      vigencias: [{ id: 'vig-food', amount: 1250, startDate: '2026-08', endDate: null }],
    }),
  ];

  const projection = projectMonths(data, 1, '2026-08');
  const alerts = generateAlerts(data, projection);

  assert.equal(alerts.some((alert) => (
    alert.type === 'category-budget-exceeded'
    && alert.title === 'Alimentação acima do orçamento'
    && alert.month === '2026-08'
  )), true);
});

test('central de alertas deriva riscos financeiros sem duplicar ids', () => {
  const data = baseData();
  data.incomes = [income({ vigencias: [{ id: 'vig-income', amount: 5000, startDate: '2026-01', endDate: null }] })];
  data.expenses = [
    expense({
      id: 'rent',
      category: 'Moradia',
      dueDay: 5,
      vigencias: [{ id: 'vig-rent', amount: 1800, startDate: '2026-01', endDate: null }],
    }),
    expense({
      id: 'condo',
      category: 'Moradia',
      dueDay: 8,
      vigencias: [{ id: 'vig-condo', amount: 800, startDate: '2026-01', endDate: null }],
    }),
    expense({
      id: 'food-current',
      category: 'Alimentação',
      dueDay: 10,
      vigencias: [{ id: 'vig-food-current', amount: 1800, startDate: '2026-08', endDate: '2026-08' }],
    }),
    expense({
      id: 'food-past-1',
      category: 'Alimentação',
      dueDay: 10,
      vigencias: [{ id: 'vig-food-past-1', amount: 1000, startDate: '2026-07', endDate: '2026-07' }],
    }),
    expense({
      id: 'food-past-2',
      category: 'Alimentação',
      dueDay: 10,
      vigencias: [{ id: 'vig-food-past-2', amount: 1000, startDate: '2026-06', endDate: '2026-06' }],
    }),
    expense({
      id: 'food-past-3',
      category: 'Alimentação',
      dueDay: 10,
      vigencias: [{ id: 'vig-food-past-3', amount: 1000, startDate: '2026-05', endDate: '2026-05' }],
    }),
  ];
  data.cards = [card()];
  data.purchases = [purchase({ totalAmount: 2000, installments: 1, firstInvoiceMonth: '2026-08' })];
  data.debts = [debt({ installmentAmount: 900, installmentsRemaining: 12, dueDate: '2026-08-09' })];
  data.bankAccounts = [{ id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 1000 }];
  data.settings.cardMonthlyLimit = 1500;
  data.settings.cardMonthlyLimitVigencias = [{ id: 'vig-card-limit', amount: 1500, startDate: '2026-01', endDate: null }];
  data.categoryBudgets = [
    { id: 'budget-food', category: 'Alimentação', amount: 1200, startMonth: '2026-08', endMonth: null },
  ];

  const alerts = generateAlerts(data, projectMonths(data, 6, '2026-08'));
  const alertIds = new Set(alerts.map((alert) => alert.id));

  assert.equal(alertIds.size, alerts.length);
  assert.equal(alerts[0].severity, 'critical');
  assert.equal(alerts.some((alert) => alert.type === 'negative-month' && alert.month === '2026-08'), true);
  assert.equal(alerts.some((alert) => alert.type === 'category-budget-exceeded'), true);
  assert.equal(alerts.some((alert) => alert.type === 'card-limit-exceeded'), true);
  assert.equal(alerts.some((alert) => alert.type === 'card-income-share'), true);
  assert.equal(alerts.some((alert) => alert.type === 'due-date-concentration'), true);
  assert.equal(alerts.some((alert) => alert.type === 'debt-income-share'), true);
  assert.equal(alerts.some((alert) => alert.type === 'low-reserve'), true);
  assert.equal(alerts.some((alert) => alert.type === 'expense-growth'), true);
});

test('alerta de reserva baixa usa gastos essenciais classificados', () => {
  const data = baseData();
  data.settings.reserveTargetMonths = 3;
  data.bankAccounts = [{ id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 2000 }];
  data.categoryEntries = [
    { id: 'cat-home', name: 'Moradia', active: true, expenseClass: 'essential' },
    { id: 'cat-fun', name: 'Lazer', active: true, expenseClass: 'lifestyle' },
  ];
  data.expenses = [
    expense({ id: 'home', category: 'Moradia', vigencias: [{ id: 'vig-home', amount: 1000, startDate: '2026-08', endDate: null }] }),
    expense({ id: 'fun', category: 'Lazer', vigencias: [{ id: 'vig-fun', amount: 5000, startDate: '2026-08', endDate: null }] }),
  ];

  const alerts = generateAlerts(data, projectMonths(data, 1, '2026-08'));
  const reserveAlert = alerts.find((alert) => alert.type === 'low-reserve');

  assert.equal(reserveAlert?.value, 2);
  assert.equal(reserveAlert?.description.includes('gastos essenciais mensais de R$ 1.000,00'), true);
});

test('Planejamento e Projeção consomem o mesmo resumo mensal', () => {
  const data = baseData();
  data.incomes = [income()];
  data.expenses = [expense({ id: 'prazo', type: 'Prazo', vigencias: [{ id: 'vig-prazo', amount: 500, startDate: '2026-08', endDate: '2026-11' }] })];
  data.cards = [card()];
  data.purchases = [purchase()];
  data.debts = [debt()];

  const planning = getPlanningMonthDetails(data, '2026-08');
  const projection = projectMonths(data, 1, '2026-08').months[0];

  assert.equal(planning.summary.totalExpenses, projection.totalExpenses);
  assert.equal(planning.summary.income, projection.income);
  assert.equal(planning.prazoExpenses[0].amount, projection.prazoExpenses);
  assert.equal(planning.cards[0].amount, projection.cardExpenses);
  assert.equal(planning.debts[0].amount, projection.debtExpenses);
});

test('status da projeção identifica meses saudáveis, atenção e críticos', () => {
  const data = baseData();
  data.bankAccounts = [{ id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 5000 }];
  data.incomes = [income({ vigencias: [{ id: 'vig-income', amount: 5000, startDate: '2026-08', endDate: null }] })];

  data.expenses = [expense({ vigencias: [{ id: 'vig-healthy', amount: 1000, startDate: '2026-08', endDate: null }] })];
  assert.equal(getMonthHealthStatus(projectMonths(data, 1, '2026-08').months[0]), 'saudavel');

  data.expenses = [expense({ vigencias: [{ id: 'vig-warning', amount: 4600, startDate: '2026-08', endDate: null }] })];
  assert.equal(getMonthHealthStatus(projectMonths(data, 1, '2026-08').months[0]), 'atencao');

  data.expenses = [expense({ vigencias: [{ id: 'vig-critical', amount: 6000, startDate: '2026-08', endDate: null }] })];
  assert.equal(getMonthHealthStatus(projectMonths(data, 1, '2026-08').months[0]), 'critico');
});

test('horizonte financeiro resume 3, 6 e 12 meses pelo motor de projeção', () => {
  const data = baseData();
  data.settings.surplusReserve = 50;
  data.settings.surplusNextMonth = 0;
  data.settings.surplusFree = 0;
  data.bankAccounts = [{ id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 1000 }];
  data.incomes = [income({ vigencias: [{ id: 'vig-income', amount: 5000, startDate: '2026-08', endDate: null }] })];
  data.expenses = [
    expense({
      id: 'monthly',
      vigencias: [{ id: 'vig-monthly', amount: 3000, startDate: '2026-08', endDate: null }],
    }),
    expense({
      id: 'heavy',
      type: 'Pontual',
      competenceMonth: '2026-10',
      vigencias: [{ id: 'vig-heavy', amount: 7000, startDate: '2026-10', endDate: '2026-10' }],
    }),
  ];
  data.cards = [card()];
  data.purchases = [
    purchase({ id: 'card-aug', totalAmount: 1200, installments: 1, firstInvoiceMonth: '2026-08' }),
    purchase({ id: 'card-sep', totalAmount: 1800, installments: 1, firstInvoiceMonth: '2026-09' }),
  ];

  const summaries = getProjectionHorizonSummaries(data, projectMonths(data, 12, '2026-08'));
  const threeMonths = summaries.find((summary) => summary.months === 3);

  assert.deepEqual(summaries.map((summary) => summary.months), [3, 6, 12]);
  assert.equal(threeMonths?.negativeMonths, 1);
  assert.equal(threeMonths?.highestCardInvoice, 1800);
  assert.equal(threeMonths?.highestIncomeCommitmentPercent, 200);
  assert.equal(threeMonths?.lowestProjectedAccountsBalance, -3800);
  assert.equal(threeMonths?.plannedSavings, 500);
});

test('limite disponível do cartão libera parcela paga somente no mês seguinte', () => {
  const data = baseData();
  data.cards = [card()];
  data.purchases = [purchase()];

  assert.equal(cardUtilization(data, data.cards[0], '2026-08').used, 2000);
  assert.equal(cardUtilization(data, data.cards[0], '2026-08').available, 1000);

  data.cardInvoiceStatus = { [invoiceStatusKey('card-1', '2026-08')]: true };

  assert.equal(cardUtilization(data, data.cards[0], '2026-08').available, 1000);
  assert.equal(cardUtilization(data, data.cards[0], '2026-09').available, 1400);
});

test('indicadores de comprometimento do cartão separam limite, fatura e renda', () => {
  const data = baseData();
  data.incomes = [income({ vigencias: [{ id: 'vig-income', amount: 5000, startDate: '2026-08', endDate: null }] })];
  data.cards = [card({ limit: 3000 })];
  data.purchases = [
    purchase({ id: 'current', totalAmount: 900, installments: 3, firstInvoiceMonth: '2026-08' }),
    purchase({ id: 'next', totalAmount: 1200, installments: 2, firstInvoiceMonth: '2026-09' }),
  ];

  const summary = getCardCommitmentSummary(data, '2026-08');
  const cardSummary = summary.cards[0];

  assert.equal(cardSummary.limit, 3000);
  assert.equal(cardSummary.currentInvoice, 300);
  assert.equal(cardSummary.nextInvoice, 900);
  assert.equal(cardSummary.futureInstallments, 900);
  assert.equal(cardSummary.highestInvoiceNextSixMonths, 900);
  assert.equal(cardSummary.committedLimit, 2100);
  assert.equal(cardSummary.availableLimit, 900);
  assert.equal(summary.currentInvoiceIncomePercent, 6);
  assert.equal(summary.futureInstallmentsIncomePercent, 18);
  assert.equal(summary.totalLimitUsedPercent, 70);

  data.cardInvoiceStatus = { [invoiceStatusKey('card-1', '2026-08')]: true };

  const nextMonthSummary = getCardCommitmentSummary(data, '2026-09').cards[0];
  assert.equal(nextMonthSummary.committedLimit, 1800);
  assert.equal(nextMonthSummary.availableLimit, 1200);
});

test('dívidas ativa, quitada, última parcela e zerada respeitam regra mensal', () => {
  assert.equal(debtPaymentForMonth(debt(), '2026-08'), 200);
  assert.equal(debtPaymentForMonth(debt(), '2026-10'), 200);
  assert.equal(debtPaymentForMonth(debt(), '2026-11'), 0);
  assert.equal(debtPaymentForMonth(debt({ status: 'Quitada' }), '2026-08'), 0);
  assert.equal(debtPaymentForMonth(debt({ installmentsRemaining: 0 }), '2026-08'), 0);
});

test('contas usam snapshot histórico, saldo atual e projeção futura', () => {
  const data = baseData();
  data.bankAccounts = [
    { id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 1000 },
    { id: 'acc-2', bank: 'Banco', name: 'Reserva', holder: 'Lucas', balance: 500 },
  ];
  data.bankBalanceSnapshots = [
    { id: 'snap-1', accountId: 'acc-1', balance: 800, date: '2026-07-31', monthKey: '2026-07' },
    { id: 'snap-2', accountId: 'acc-2', balance: 300, date: '2026-07-20', monthKey: '2026-07' },
  ];

  assert.equal(getAccountBalanceSnapshotForMonth(data, '2026-07'), 1100);

  const currentProjection = projectAccountBalance(data, currentMonthKey(), 0);
  assert.equal(currentProjection.accountsBalance, 1500);
  assert.equal(currentProjection.projectedAccountsBalance, 1500);

  const futureProjection = projectAccountBalance(data, addMonths(currentMonthKey(), 1), 250, 1500);
  assert.equal(futureProjection.accountsBalance, 1500);
  assert.equal(futureProjection.projectedAccountsBalance, 1750);
});
