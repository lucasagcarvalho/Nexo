import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../src/lib/seed';
import { migrateData } from '../src/lib/storage';
import type { AppData, CardPurchase, CreditCard, Debt, Expense, Income } from '../src/lib/types';
import { addMonths, currentMonthKey } from '../src/lib/format';
import {
  cardInvoiceDetail,
  calculateAccountLedgerBalance,
  calculateTotalLedgerBalance,
  createManualAdjustmentTransaction,
  createReversalTransaction,
  getCardCommitmentSummary,
  getAccountTransactions,
  getAccountLedgerBalanceComparisons,
  getAccountLedgerBalanceDifferences,
  getDataQualityIssues,
  getDebtCommitmentSummary,
  getFinancialHealthIndicators,
  getFutureInstallmentCalendar,
  cardUtilization,
  getCategoryBudgetUsages,
  debtPaymentForMonth,
  generateAlerts,
  expenseAmountForMonth,
  getAccountBalanceSnapshotForMonth,
  getCardInvoiceForMonth,
  getInvoiceStatus,
  getMonthHealthStatus,
  getMonthlyComparisonSummary,
  getProjectionHorizonSummaries,
  getTransactionByRelatedEntity,
  getTransactionsForAccount,
  getTransactionsForMonth,
  getTotalLedgerBalanceComparison,
  getActiveVigencia,
  incomeAmountForMonth,
  getMonthlyFinancialSummary,
  getPlanningMonthDetails,
  invoiceStatusKey,
  isExpenseActiveInMonth,
  isExpensePaidForMonth,
  isInvoicePaid,
  isTransactionReversed,
  projectAccountBalance,
  projectMonths,
  purchaseInstallmentStatus,
  sumTransactionsForAccount,
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

test('receita com conta destino mantém o cálculo mensal inalterado', () => {
  const data = baseData();
  data.bankAccounts = [{ id: 'acc-1', bank: 'Itaú', name: 'Conta Corrente', holder: 'Lucas', balance: 500 }];
  data.incomes = [income({ defaultAccountId: 'acc-1' })];
  data.expenses = [];
  data.cards = [];
  data.purchases = [];
  data.debts = [];

  const summary = getMonthlyFinancialSummary(data, '2026-08');

  assert.equal(summary.income, 5000);
  assert.equal(summary.totalExpenses, 0);
  assert.equal(summary.balance, 5000);
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

test('validações de consistência geram pendências e evitam NaN na projeção', () => {
  const data = baseData();
  data.people = [{ id: 'p-1', name: 'Lucas', active: true }];
  data.categories = ['Casa'];
  data.categoryEntries = [{ id: 'cat-1', name: 'Casa', active: true, expenseClass: 'essential' }];
  data.incomes = [
    income({ id: 'inc-ok', name: 'Salário', person: 'Lucas' }),
    income({ id: 'inc-bad', name: 'Bônus', kind: 'determinada', person: 'Pessoa removida', vigencias: [{ id: 'vig-bad', amount: -100, startDate: '2026-08', endDate: null }] }),
  ];
  data.expenses = [
    expense({ id: 'exp-prazo', description: 'Curso', type: 'Prazo', category: 'Categoria removida', person: 'Pessoa removida', vigencias: [{ id: 'vig-exp', amount: 300, startDate: '2026-10', endDate: null }] }),
    expense({ id: 'exp-range', description: 'Contrato', vigencias: [{ id: 'vig-range', amount: 100, startDate: '2026-10', endDate: '2026-09' }] }),
  ];
  data.cards = [card({ id: 'card-bad', name: 'Cartão ruim', dueDay: 40 })];
  data.purchases = [
    { ...purchase({ id: 'pur-bad', name: 'Notebook', cardId: 'missing-card', installments: 0, firstInvoiceMonth: '2026-99', category: 'Categoria removida' }), currentInstallment: 13 } as CardPurchase & { currentInstallment: number },
  ];
  data.debts = [debt({ id: 'debt-bad', name: 'Acordo', balance: 1000, installmentAmount: 0, installmentsRemaining: 0, dueDate: 'data-invalida' })];
  data.bankAccounts = [{ id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: Number.NaN }];
  data.bankBalanceSnapshots = [{ id: 'snap-bad', accountId: 'missing-account', balance: Number.NaN, date: '2026-09-01', monthKey: '2026-08' }];
  data.scenarios = [{ id: 'scenario-bad', name: 'Cenário', type: 'Atual', incomeOverrides: { 'missing-income': 1000 } }];

  const issues = getDataQualityIssues(data);
  const projection = projectMonths(data, 2, '2026-08');

  assert.equal(issues.length >= 13, true);
  assert.equal(issues.some((issue) => issue.title.includes('Notebook') && issue.recordId === 'pur-bad'), true);
  assert.equal(issues.some((issue) => issue.title.includes('Gasto Prazo') && issue.recordId === 'exp-prazo'), true);
  assert.equal(issues.some((issue) => issue.title.includes('Cartão ruim') && issue.recordId === 'card-bad'), true);
  assert.equal(issues.some((issue) => issue.title.includes('Snapshot') && issue.recordId === 'snap-bad'), true);
  assert.equal(projection.months.every((month) => (
    Number.isFinite(month.income)
    && Number.isFinite(month.totalExpenses)
    && Number.isFinite(month.cardExpenses)
    && Number.isFinite(month.debtExpenses)
    && Number.isFinite(month.projectedAccountsBalance)
  )), true);
});

test('comparação mensal ignora meses sem dados e trata denominador zero', () => {
  const data = baseData();
  data.incomes = [
    income({ vigencias: [{ id: 'vig-income', amount: 10000, startDate: '2026-05', endDate: null }] }),
  ];
  data.expenses = [
    expense({ id: 'aug-home', category: 'Casa', vigencias: [{ id: 'vig-aug-home', amount: 4000, startDate: '2026-08', endDate: '2026-08' }] }),
    expense({ id: 'aug-fun', type: 'Pontual', category: 'Lazer', competenceMonth: '2026-08', vigencias: [{ id: 'vig-aug-fun', amount: 2000, startDate: '2026-08', endDate: '2026-08' }] }),
    expense({ id: 'jul-home', category: 'Casa', vigencias: [{ id: 'vig-jul-home', amount: 3000, startDate: '2026-07', endDate: '2026-07' }] }),
    expense({ id: 'jun-home', category: 'Casa', vigencias: [{ id: 'vig-jun-home', amount: 1000, startDate: '2026-06', endDate: '2026-06' }] }),
  ];
  data.cards = [card()];
  data.purchases = [
    purchase({ id: 'aug-card', totalAmount: 1000, installments: 1, firstInvoiceMonth: '2026-08' }),
  ];

  const comparison = getMonthlyComparisonSummary(data, '2026-08');
  const byKey = Object.fromEntries(comparison.metrics.map((metric) => [metric.key, metric]));

  assert.equal(byKey.totalExpenses.currentValue, 7000);
  assert.equal(byKey.totalExpenses.previousMonthValue, 3000);
  assert.equal(byKey.totalExpenses.average3Value, 2000);
  assert.equal(byKey.totalExpenses.average3ChangePercent, 250);
  assert.equal(byKey.cardExpenses.previousMonthChangePercent, null);
  assert.equal(byKey.savingsRate.currentValue, 30);
  assert.equal(comparison.categoryTrends.find((item) => item.category === 'Casa')?.average3Value, 2000);
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

test('indicadores financeiros explicáveis expõem fórmula, faixa e interpretação', () => {
  const data = baseData();
  data.settings.reserveTargetMonths = 3;
  data.bankAccounts = [{ id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 9000 }];
  data.incomes = [income({ vigencias: [{ id: 'vig-income', amount: 10000, startDate: '2026-05', endDate: null }] })];
  data.expenses = [
    expense({ id: 'fixa', category: 'Casa', vigencias: [{ id: 'vig-fixa', amount: 3000, startDate: '2026-05', endDate: null }] }),
    expense({ id: 'prazo', type: 'Prazo', category: 'Educação', vigencias: [{ id: 'vig-prazo', amount: 1000, startDate: '2026-08', endDate: '2026-10' }] }),
    expense({ id: 'hist-1', type: 'Pontual', category: 'Lazer', competenceMonth: '2026-07', vigencias: [{ id: 'vig-hist-1', amount: 2000, startDate: '2026-07', endDate: '2026-07' }] }),
    expense({ id: 'hist-2', type: 'Pontual', category: 'Lazer', competenceMonth: '2026-06', vigencias: [{ id: 'vig-hist-2', amount: 2000, startDate: '2026-06', endDate: '2026-06' }] }),
    expense({ id: 'hist-3', type: 'Pontual', category: 'Lazer', competenceMonth: '2026-05', vigencias: [{ id: 'vig-hist-3', amount: 2000, startDate: '2026-05', endDate: '2026-05' }] }),
  ];
  data.cards = [card()];
  data.purchases = [purchase({ totalAmount: 1500, installments: 1, firstInvoiceMonth: '2026-08' })];
  data.debts = [debt({ balance: 3000, installmentAmount: 1000, installmentsRemaining: 3, dueDate: '2026-08-15' })];

  const indicators = getFinancialHealthIndicators(data, projectMonths(data, 1, '2026-08'));
  const byId = Object.fromEntries(indicators.map((indicator) => [indicator.id, indicator]));

  assert.equal(indicators.every((indicator) => indicator.formula.length > 0 && indicator.range.length > 0 && indicator.explanation.length > 0), true);
  assert.equal(byId['savings-rate'].value, 35);
  assert.equal(byId['savings-rate'].status, 'bom');
  assert.equal(byId['fixed-commitment'].value, 50);
  assert.equal(byId['card-commitment'].value, 15);
  assert.equal(Math.round((byId['reserve-coverage'].value ?? 0) * 10) / 10, 2.7);
  assert.equal(byId['reserve-coverage'].status, 'atencao');
  assert.equal(byId['expense-variation'].value, 30);
  assert.equal(byId['expense-variation'].status, 'critico');
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

test('calendário de parcelas futuras agrupa por fatura e bate com projeção', () => {
  const data = baseData();
  data.cards = [
    card({ id: 'card-1', name: 'Nubank' }),
    card({ id: 'card-2', name: 'Itaú' }),
  ];
  data.purchases = [
    purchase({ id: 'notebook', cardId: 'card-1', name: 'Notebook', totalAmount: 900, installments: 3, firstInvoiceMonth: '2026-08' }),
    purchase({ id: 'curso', cardId: 'card-2', name: 'Curso', totalAmount: 600, installments: 2, firstInvoiceMonth: '2026-09' }),
  ];

  const calendar = getFutureInstallmentCalendar(data, '2026-08', 4);
  const september = calendar.find((month) => month.monthKey === '2026-09');
  const projectionSeptember = projectMonths(data, 2, '2026-08').months[1];

  assert.equal(calendar[0].monthKey, '2026-09');
  assert.equal(september?.total, projectionSeptember.cardExpenses);
  assert.equal(september?.total, 600);
  assert.deepEqual(september?.items.map((item) => item.name).sort(), ['Curso', 'Notebook']);
  assert.equal(september?.items.find((item) => item.name === 'Curso')?.cardName, 'Itaú');
  assert.equal(calendar.some((month) => month.monthKey === '2026-12'), false);
});

test('dívidas ativa, quitada, última parcela e zerada respeitam regra mensal', () => {
  assert.equal(debtPaymentForMonth(debt(), '2026-08'), 200);
  assert.equal(debtPaymentForMonth(debt(), '2026-10'), 200);
  assert.equal(debtPaymentForMonth(debt(), '2026-11'), 0);
  assert.equal(debtPaymentForMonth(debt({ status: 'Quitada' }), '2026-08'), 0);
  assert.equal(debtPaymentForMonth(debt({ installmentsRemaining: 0 }), '2026-08'), 0);
});

test('visão de endividamento resume dívidas ativas e ignora quitadas', () => {
  const data = baseData();
  data.incomes = [income({ vigencias: [{ id: 'vig-income', amount: 5000, startDate: '2026-08', endDate: null }] })];
  data.debts = [
    debt({ id: 'debt-1', name: 'Acordo', balance: 1000, installmentAmount: 200, installmentsRemaining: 3, dueDate: '2026-08-15', interestRate: 2 }),
    debt({ id: 'debt-2', name: 'Empréstimo', balance: 500, installmentAmount: 100, installmentsRemaining: 2, dueDate: '2026-09-10', interestRate: 4 }),
    debt({ id: 'debt-3', name: 'Quitada', balance: 900, installmentAmount: 300, installmentsRemaining: 3, dueDate: '2026-08-05', status: 'Quitada' }),
  ];

  const summary = getDebtCommitmentSummary(data, '2026-08');
  const projection = projectMonths(data, 3, '2026-08').months;

  assert.equal(summary.totalBalance, 1500);
  assert.equal(summary.monthlyPaymentTotal, 300);
  assert.equal(summary.incomeCommitmentPercent, 6);
  assert.equal(summary.activeDebtCount, 2);
  assert.equal(summary.payoffMonth, '2026-10');
  assert.equal(summary.debts.some((item) => item.debtId === 'debt-3'), false);
  assert.equal(Math.round((summary.averageInterestRate ?? 0) * 100) / 100, 2.67);
  assert.equal(projection[0].debtExpenses, 200);
  assert.equal(projection[1].debtExpenses, 300);
  assert.equal(projection[2].debtExpenses, 300);
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

test('migração cria saldo inicial no ledger sem alterar cálculos existentes', () => {
  const legacyData = seedData();
  delete (legacyData as Partial<AppData>).accountTransactions;
  legacyData.incomes = [income({ defaultAccountId: 'acc-1' })];
  legacyData.expenses = [expense()];
  legacyData.bankAccounts = [{ id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 1000 }];

  const migrated = migrateData(legacyData);
  const summary = getMonthlyFinancialSummary(migrated, '2026-08');
  const accountProjection = projectAccountBalance(migrated, currentMonthKey(), 0);

  assert.equal(migrated.accountTransactions?.length, 1);
  assert.equal(migrated.accountTransactions?.[0].id, 'initial-balance-acc-1');
  assert.equal(migrated.accountTransactions?.[0].accountId, 'acc-1');
  assert.equal(migrated.accountTransactions?.[0].kind, 'initial_balance');
  assert.equal(migrated.accountTransactions?.[0].amount, 1000);
  assert.equal(migrated.incomes[0].defaultAccountId, 'acc-1');
  assert.equal(summary.income, 5000);
  assert.equal(summary.totalExpenses, 100);
  assert.equal(summary.balance, 4900);
  assert.equal(accountProjection.accountsBalance, 1000);
});

test('migração de saldo inicial é idempotente por conta', () => {
  const legacyData = seedData();
  legacyData.bankAccounts = [
    { id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 1000 },
    { id: 'acc-2', bank: 'Banco', name: 'Reserva', holder: 'Lucas', balance: 500 },
  ];
  delete (legacyData as Partial<AppData>).accountTransactions;

  const firstMigration = migrateData(legacyData);
  const secondMigration = migrateData(firstMigration);

  assert.equal(firstMigration.accountTransactions?.filter((transaction) => transaction.kind === 'initial_balance').length, 2);
  assert.equal(secondMigration.accountTransactions?.filter((transaction) => transaction.kind === 'initial_balance').length, 2);
  assert.deepEqual(
    secondMigration.accountTransactions?.map((transaction) => [transaction.accountId, transaction.amount]),
    [['acc-1', 1000], ['acc-2', 500]],
  );
});

test('qualidade de dados alerta receita vinculada a conta removida', () => {
  const data = baseData();
  data.bankAccounts = [];
  data.incomes = [income({ id: 'inc-linked', defaultAccountId: 'missing-account' })];

  const issues = getDataQualityIssues(data);

  assert.equal(
    issues.some((item) => (
      item.entity === 'receita'
      && item.recordId === 'inc-linked'
      && item.title.includes('conta removida')
    )),
    true,
  );
});

test('ledger central filtra por conta, mês e entidade relacionada com soma segura', () => {
  const data = baseData();
  data.accountTransactions = [
    {
      id: 'tx-2',
      accountId: 'acc-1',
      date: '2026-08-10',
      monthKey: '2026-08',
      amount: -300,
      kind: 'expense_payment',
      relatedEntityType: 'expense',
      relatedEntityId: 'energy',
      relatedMonthKey: '2026-08',
      createdAt: '2026-08-10T12:00:00.000Z',
    },
    {
      id: 'tx-1',
      accountId: 'acc-1',
      date: '2026-08-05',
      monthKey: '2026-08',
      amount: 1000,
      kind: 'income_receipt',
      relatedEntityType: 'income',
      relatedEntityId: 'salary',
      relatedMonthKey: '2026-08',
      createdAt: '2026-08-05T12:00:00.000Z',
    },
    {
      id: 'bad-nan',
      accountId: 'acc-1',
      date: '2026-08-12',
      monthKey: '2026-08',
      amount: Number.NaN,
      kind: 'manual_adjustment',
      createdAt: '2026-08-12T12:00:00.000Z',
    },
    {
      id: 'bad-inf',
      accountId: 'acc-1',
      date: '2026-08-13',
      monthKey: '2026-08',
      amount: Number.POSITIVE_INFINITY,
      kind: 'manual_adjustment',
      createdAt: '2026-08-13T12:00:00.000Z',
    },
    {
      id: 'tx-3',
      accountId: 'acc-2',
      date: '2026-09-01',
      monthKey: '2026-09',
      amount: 500,
      kind: 'transfer_in',
      relatedEntityType: 'transfer',
      relatedEntityId: 'transfer-1',
      createdAt: '2026-09-01T12:00:00.000Z',
    },
  ];

  assert.deepEqual(getAccountTransactions(data).map((transaction) => transaction.id), ['tx-1', 'tx-2', 'tx-3']);
  assert.deepEqual(getTransactionsForAccount(data, 'acc-1').map((transaction) => transaction.id), ['tx-1', 'tx-2']);
  assert.deepEqual(getTransactionsForMonth(data, '2026-08').map((transaction) => transaction.id), ['tx-1', 'tx-2']);
  assert.equal(getTransactionByRelatedEntity(data, 'expense', 'energy', '2026-08')?.id, 'tx-2');
  assert.equal(sumTransactionsForAccount(data, 'acc-1'), 700);
  assert.equal(calculateAccountLedgerBalance(data, 'acc-1', '2026-08-05'), 1000);
});

test('ledger central cria reversão e detecta transação revertida', () => {
  const data = baseData();
  const original = {
    id: 'tx-payment',
    accountId: 'acc-1',
    date: '2026-08-10',
    monthKey: '2026-08',
    amount: -300,
    kind: 'expense_payment' as const,
    relatedEntityType: 'expense' as const,
    relatedEntityId: 'energy',
    relatedMonthKey: '2026-08',
    note: 'Energia',
    createdAt: '2026-08-10T12:00:00.000Z',
  };
  const reversal = createReversalTransaction(original, '2026-08-12');
  data.accountTransactions = [original, reversal];

  assert.equal(reversal.accountId, original.accountId);
  assert.equal(reversal.amount, 300);
  assert.equal(reversal.kind, 'reversal');
  assert.equal(reversal.reversalOfTransactionId, original.id);
  assert.equal(isTransactionReversed(data, original.id), true);
  assert.equal(getTransactionByRelatedEntity(data, 'expense', 'energy', '2026-08'), null);
  assert.equal(calculateAccountLedgerBalance(data, 'acc-1'), 0);
});

test('ledger central evita duplicidade por id ao somar movimentações', () => {
  const data = baseData();
  data.accountTransactions = [
    {
      id: 'tx-duplicate',
      accountId: 'acc-1',
      date: '2026-08-01',
      monthKey: '2026-08',
      amount: 100,
      kind: 'manual_adjustment',
      createdAt: '2026-08-01T12:00:00.000Z',
    },
    {
      id: 'tx-duplicate',
      accountId: 'acc-1',
      date: '2026-08-01',
      monthKey: '2026-08',
      amount: 100,
      kind: 'manual_adjustment',
      createdAt: '2026-08-01T12:00:00.000Z',
    },
  ];

  assert.equal(getAccountTransactions(data).length, 1);
  assert.equal(calculateAccountLedgerBalance(data, 'acc-1'), 100);
});

test('saldo por ledger pode ser reconstruído por conta e no total sem alterar fluxo mensal', () => {
  const data = baseData();
  data.bankAccounts = [
    { id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 1700 },
    { id: 'acc-2', bank: 'Banco', name: 'Reserva', holder: 'Lucas', balance: 300 },
  ];
  data.accountTransactions = [
    {
      id: 'initial-balance-acc-1',
      accountId: 'acc-1',
      date: '2026-08-01',
      monthKey: '2026-08',
      amount: 1000,
      kind: 'initial_balance',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'income-1',
      accountId: 'acc-1',
      date: '2026-08-05',
      monthKey: '2026-08',
      amount: 1000,
      kind: 'income_receipt',
      relatedEntityType: 'income',
      relatedEntityId: 'salary',
      relatedMonthKey: '2026-08',
      createdAt: '2026-08-05T00:00:00.000Z',
    },
    {
      id: 'expense-1',
      accountId: 'acc-1',
      date: '2026-08-10',
      monthKey: '2026-08',
      amount: -300,
      kind: 'expense_payment',
      relatedEntityType: 'expense',
      relatedEntityId: 'energy',
      relatedMonthKey: '2026-08',
      createdAt: '2026-08-10T00:00:00.000Z',
    },
    {
      id: 'initial-balance-acc-2',
      accountId: 'acc-2',
      date: '2026-08-01',
      monthKey: '2026-08',
      amount: 500,
      kind: 'initial_balance',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'transfer-out',
      accountId: 'acc-2',
      date: '2026-08-12',
      monthKey: '2026-08',
      amount: -200,
      kind: 'transfer_out',
      relatedEntityType: 'transfer',
      relatedEntityId: 'transfer-1',
      createdAt: '2026-08-12T00:00:00.000Z',
    },
  ];
  data.incomes = [income()];
  data.expenses = [expense()];

  const summary = getMonthlyFinancialSummary(data, '2026-08');

  assert.equal(calculateAccountLedgerBalance(data, 'acc-1'), 1700);
  assert.equal(calculateAccountLedgerBalance(data, 'acc-2'), 300);
  assert.equal(calculateTotalLedgerBalance(data), 2000);
  assert.equal(summary.income, 5000);
  assert.equal(summary.totalExpenses, 100);
  assert.equal(summary.balance, 4900);
});

test('diferenças entre saldo armazenado e saldo por ledger são detectáveis', () => {
  const data = baseData();
  data.bankAccounts = [
    { id: 'acc-1', bank: 'Banco', name: 'Conta', holder: 'Lucas', balance: 1700 },
    { id: 'acc-2', bank: 'Banco', name: 'Reserva', holder: 'Lucas', balance: 350 },
  ];
  data.accountTransactions = [
    {
      id: 'initial-balance-acc-1',
      accountId: 'acc-1',
      date: '2026-08-01',
      monthKey: '2026-08',
      amount: 1000,
      kind: 'initial_balance',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'adjustment-acc-1',
      accountId: 'acc-1',
      date: '2026-08-02',
      monthKey: '2026-08',
      amount: 700,
      kind: 'manual_adjustment',
      createdAt: '2026-08-02T00:00:00.000Z',
    },
    {
      id: 'initial-balance-acc-2',
      accountId: 'acc-2',
      date: '2026-08-01',
      monthKey: '2026-08',
      amount: 300,
      kind: 'initial_balance',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  const comparisons = getAccountLedgerBalanceComparisons(data);
  const totalComparison = getTotalLedgerBalanceComparison(data);
  const differences = getAccountLedgerBalanceDifferences(data);

  assert.deepEqual(comparisons.map((comparison) => ({
    accountId: comparison.accountId,
    accountBalance: comparison.accountBalance,
    ledgerBalance: comparison.ledgerBalance,
    difference: comparison.difference,
  })), [
    { accountId: 'acc-1', accountBalance: 1700, ledgerBalance: 1700, difference: 0 },
    { accountId: 'acc-2', accountBalance: 350, ledgerBalance: 300, difference: 50 },
  ]);
  assert.deepEqual(totalComparison, { accountsBalance: 2050, ledgerBalance: 2000, difference: 50 });
  assert.deepEqual(differences.map((comparison) => comparison.accountId), ['acc-2']);
});

test('ajuste manual de conciliação cria movimentação válida sem entrar no fluxo mensal', () => {
  const data = baseData();
  const adjustment = createManualAdjustmentTransaction('acc-1', 150.129, '2026-08-31', 'Conciliação');
  data.accountTransactions = adjustment ? [adjustment] : [];
  data.incomes = [income()];
  data.expenses = [expense()];

  const summary = getMonthlyFinancialSummary(data, '2026-08');

  assert.equal(adjustment?.accountId, 'acc-1');
  assert.equal(adjustment?.kind, 'manual_adjustment');
  assert.equal(adjustment?.monthKey, '2026-08');
  assert.equal(adjustment?.amount, 150.13);
  assert.equal(calculateAccountLedgerBalance(data, 'acc-1'), 150.13);
  assert.equal(summary.income, 5000);
  assert.equal(summary.totalExpenses, 100);
  assert.equal(summary.balance, 4900);
  assert.equal(createManualAdjustmentTransaction('acc-1', Number.NaN, '2026-08-31'), null);
  assert.equal(createManualAdjustmentTransaction('acc-1', 0, '2026-08-31'), null);
});

test('auditoria controlada mantém Dashboard, Planejamento, Cartões, Projeção, Contas, Alertas e Indicadores coerentes', () => {
  const data = baseData();
  data.bankAccounts = [
    { id: 'acc-main', bank: 'Banco', name: 'Conta principal', holder: 'Lucas', balance: 5000 },
  ];
  data.incomes = [
    income({
      id: 'salary',
      name: 'Salário',
      vigencias: [{ id: 'vig-salary', amount: 10000, startDate: '2026-08', endDate: null }],
    }),
    income({
      id: 'extra-sep',
      name: 'Extra setembro',
      type: 'Trabalho extra',
      kind: 'variavel',
      competenceMonth: '2026-09',
      vigencias: [{ id: 'vig-extra-sep', amount: 1000, startDate: '2026-09', endDate: '2026-09' }],
    }),
  ];
  data.expenses = [
    expense({
      id: 'rent',
      description: 'Aluguel',
      category: 'Moradia',
      vigencias: [{ id: 'vig-rent', amount: 2000, startDate: '2026-08', endDate: null }],
    }),
    expense({
      id: 'internet',
      description: 'Internet',
      category: 'Serviços',
      vigencias: [{ id: 'vig-internet', amount: 150, startDate: '2026-08', endDate: null }],
    }),
    expense({
      id: 'course',
      description: 'Curso',
      category: 'Educação',
      type: 'Prazo',
      vigencias: [{ id: 'vig-course', amount: 500, startDate: '2026-08', endDate: '2026-10' }],
    }),
    expense({
      id: 'insurance',
      description: 'Seguro',
      category: 'Serviços',
      type: 'Pontual',
      competenceMonth: '2026-09',
      vigencias: [{ id: 'vig-insurance', amount: 900, startDate: '2026-09', endDate: '2026-09' }],
    }),
  ];
  data.cards = [card({ id: 'card-1', name: 'Nubank', limit: 3000 })];
  data.purchases = [
    purchase({
      id: 'notebook',
      cardId: 'card-1',
      name: 'Notebook',
      totalAmount: 3000,
      installments: 6,
      purchaseDate: '2026-08-01',
      firstInvoiceMonth: '2026-08',
      category: 'Informática',
    }),
  ];
  data.debts = [
    debt({
      id: 'debt-audit',
      name: 'Acordo',
      balance: 2100,
      installmentAmount: 700,
      installmentsRemaining: 3,
      dueDate: '2026-08-15',
      status: 'Parcelada',
    }),
  ];

  const projection = projectMonths(data, 4, '2026-08');
  const expectedMonths = [
    { monthKey: '2026-08', income: 10000, fixedExpenses: 2150, prazoExpenses: 500, variableExpenses: 0, cardExpenses: 500, debtExpenses: 700, totalExpenses: 3850, balance: 6150, projectedAccountsBalance: 5000 },
    { monthKey: '2026-09', income: 11000, fixedExpenses: 2150, prazoExpenses: 500, variableExpenses: 900, cardExpenses: 500, debtExpenses: 700, totalExpenses: 4750, balance: 6250, projectedAccountsBalance: 11250 },
    { monthKey: '2026-10', income: 10000, fixedExpenses: 2150, prazoExpenses: 500, variableExpenses: 0, cardExpenses: 500, debtExpenses: 700, totalExpenses: 3850, balance: 6150, projectedAccountsBalance: 17400 },
    { monthKey: '2026-11', income: 10000, fixedExpenses: 2150, prazoExpenses: 0, variableExpenses: 0, cardExpenses: 500, debtExpenses: 0, totalExpenses: 2650, balance: 7350, projectedAccountsBalance: 24750 },
  ];

  for (const [index, expected] of expectedMonths.entries()) {
    assert.deepEqual(
      {
        monthKey: projection.months[index].monthKey,
        income: projection.months[index].income,
        fixedExpenses: projection.months[index].fixedExpenses,
        prazoExpenses: projection.months[index].prazoExpenses,
        variableExpenses: projection.months[index].variableExpenses,
        cardExpenses: projection.months[index].cardExpenses,
        debtExpenses: projection.months[index].debtExpenses,
        totalExpenses: projection.months[index].totalExpenses,
        balance: projection.months[index].balance,
        projectedAccountsBalance: projection.months[index].projectedAccountsBalance,
      },
      expected,
    );
  }

  const planningSeptember = getPlanningMonthDetails(data, '2026-09');
  assert.equal(planningSeptember.summary.totalExpenses, 4750);
  assert.equal(planningSeptember.fixedExpenses.reduce((sum, item) => sum + item.amount, 0), 2150);
  assert.equal(planningSeptember.prazoExpenses.reduce((sum, item) => sum + item.amount, 0), 500);
  assert.equal(planningSeptember.pontualExpenses.reduce((sum, item) => sum + item.amount, 0), 900);
  assert.equal(planningSeptember.cards.reduce((sum, item) => sum + item.amount, 0), 500);
  assert.equal(planningSeptember.debts.reduce((sum, item) => sum + item.amount, 0), 700);

  const cardSummary = getCardCommitmentSummary(data, '2026-08');
  const cardDetail = cardInvoiceDetail(data, 'card-1', '2026-11');
  const cardUsage = cardUtilization(data, data.cards[0], '2026-08');
  assert.equal(cardSummary.currentInvoiceTotal, 500);
  assert.equal(cardSummary.futureInstallmentsTotal, 2000);
  assert.equal(cardSummary.currentInvoiceIncomePercent, 5);
  assert.equal(cardSummary.totalLimitUsedPercent, 100);
  assert.equal(cardDetail[0].installmentNumber, 4);
  assert.equal(cardDetail[0].amount, 500);
  assert.equal(cardUsage.available, 0);

  const debtSummary = getDebtCommitmentSummary(data, '2026-08');
  assert.equal(debtSummary.totalBalance, 2100);
  assert.equal(debtSummary.monthlyPaymentTotal, 700);
  assert.equal(Math.round(debtSummary.incomeCommitmentPercent * 100) / 100, 7);
  assert.equal(debtSummary.payoffMonth, '2026-10');

  const accountSnapshot = getAccountBalanceSnapshotForMonth(data, '2026-08');
  assert.equal(accountSnapshot, null);
  assert.equal(projectAccountBalance(data, '2026-09', 6250, 5000).projectedAccountsBalance, 11250);

  const alerts = generateAlerts(data, projection);
  assert.equal(alerts.some((alert) => alert.type === 'negative-month'), false);
  assert.equal(alerts.some((alert) => alert.type === 'card-income-share'), false);
  assert.equal(alerts.some((alert) => alert.type === 'debt-income-share'), false);
  assert.equal(alerts.some((alert) => alert.type === 'low-reserve'), true);

  const health = getFinancialHealthIndicators(data, projection);
  assert.equal(health.find((item) => item.id === 'savings-rate')?.value, 61.5);
  assert.equal(health.find((item) => item.id === 'fixed-commitment')?.value, 33.5);
  assert.equal(health.find((item) => item.id === 'card-commitment')?.value, 5);

  const horizon = getProjectionHorizonSummaries(data, projection, [3])[0];
  assert.equal(horizon.lowestProjectedAccountsBalance, 5000);
  assert.equal(horizon.negativeMonths, 0);
  assert.equal(horizon.highestCardInvoice, 500);
  assert.equal(horizon.plannedSavings, 9275);
  assert.deepEqual(getDataQualityIssues(data), []);
});
