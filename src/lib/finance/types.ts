import type { DebtStatus } from '../types';

export interface AccountMonthProjection {
  accountId: string;
  accountLabel: string;
  monthKey: string;
  openingBalance: number;
  income: number;
  expensePayments: number;
  cardInvoicePayments: number;
  debtPayments: number;
  transferIn: number;
  transferOut: number;
  closingBalance: number;
}

export interface AccountsMonthProjection {
  monthKey: string;
  accounts: AccountMonthProjection[];
  openingBalance: number;
  income: number;
  expensePayments: number;
  cardInvoicePayments: number;
  debtPayments: number;
  transferIn: number;
  transferOut: number;
  netCashflow: number;
  closingBalance: number;
}

export type CashflowTimelineStatus = 'previsto' | 'realizado';

export type CashflowTimelineSourceType = 'income' | 'expense' | 'cardInvoice' | 'debt';

export type CashflowTimelineOriginPage = 'receitas' | 'gastos' | 'cartoes' | 'dividas';

export interface CashflowTimelineItem {
  id: string;
  date: string;
  day: number;
  monthKey: string;
  label: string;
  amount: number;
  accountId: string | null;
  accountLabel: string;
  status: CashflowTimelineStatus;
  sourceType: CashflowTimelineSourceType;
  sourceId: string;
  originPage: CashflowTimelineOriginPage;
}

export interface AccountNegativeBalanceRisk {
  accountId: string;
  accountLabel: string;
  monthKey: string;
  date: string;
  day: number;
  openingBalance: number;
  balance: number;
  deficit: number;
  triggeringItem: CashflowTimelineItem;
}

export interface PaymentPriorityRecommendation {
  id: string;
  rank: number;
  item: CashflowTimelineItem;
  accountId: string;
  accountLabel: string;
  dueDate: string;
  amount: number;
  balanceBeforePayment: number;
  balanceAfterPayment: number;
  lowestBalanceAfterPayment: number;
  riskLevel: 'baixo' | 'medio' | 'alto';
  reason: string;
}

export interface PreventiveTransferSuggestion {
  id: string;
  fromAccountId: string;
  fromAccountLabel: string;
  toAccountId: string;
  toAccountLabel: string;
  monthKey: string;
  suggestedDate: string;
  amount: number;
  destinationDeficitDate: string;
  destinationDeficit: number;
  originLowestBalanceAfterTransfer: number;
  reason: string;
}

export interface FinancialFlowAuditTransaction {
  id: string;
  date: string;
  kind: string;
  amount: number;
}

export interface FinancialFlowAuditAccount {
  accountId: string;
  accountLabel: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  transfersIn: number;
  transfersOut: number;
  adjustments: number;
  closingBalance: number;
  transactions: FinancialFlowAuditTransaction[];
}

export interface FinancialFlowAuditReport {
  monthKey: string;
  income: number;
  totalExpenses: number;
  result: number;
  accountBalances: FinancialFlowAuditAccount[];
  availableBalance: number;
  ledgerBalance: number;
  storedAccountsBalance: number;
  projectedAccountsBalance: number;
  checks: {
    noDoubleCounting: boolean;
    ledgerExplainsStoredBalances: boolean;
    dashboardMatchesAccounts: boolean;
    projectionMatchesAccounts: boolean;
  };
}

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
  expectedExpenses: number;
  realizedExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  expenseVariance: number;
  expenseVariancePercent: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  financialCommitments: number;
  otherExpenses: number;
  balance: number;
  accumulatedBalance: number;
  cardByCard: Record<string, number>;
  cardInstallments: number;
  categoryBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  parcelasFuturas: number;
  bankBalance: number;
  accountsBalance: number;
  projectedAccountsBalance: number;
  accountCashflow: AccountMonthProjection[];
  openingAccountsBalance: number;
  closingAccountsBalance: number;
  availableAccountsBalance: number;
}

export interface ProjectionResult {
  months: MonthProjection[];
  startMonth: string;
}

export interface ProjectionHorizonSummary {
  months: number;
  lowestProjectedAccountsBalance: number;
  negativeMonths: number;
  highestCardInvoice: number;
  highestIncomeCommitmentPercent: number;
  plannedSavings: number;
}

export type MonthHealthStatus = 'saudavel' | 'atencao' | 'critico';

export type FinancialHealthIndicatorStatus = 'bom' | 'atencao' | 'critico' | 'neutro';

export interface FinancialHealthIndicator {
  id: string;
  label: string;
  value: number | null;
  unit: 'percent' | 'months';
  status: FinancialHealthIndicatorStatus;
  formula: string;
  explanation: string;
  range: string;
}

export type FinancialAlertSeverity = 'info' | 'warning' | 'critical';

export interface FinancialAlert {
  id: string;
  severity: FinancialAlertSeverity;
  type: string;
  title: string;
  description: string;
  month?: string;
  value?: number;
}

export interface InvoiceItem {
  purchaseId: string;
  name: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  category: string;
}

export interface PurchaseStatus {
  currentInstallment: number;
  remaining: number;
  remainingBalance: number;
}

export type InvoiceStatus = 'pago' | 'pendente' | 'vencido' | 'sem_fatura';

export interface CardCommitmentIndicator {
  cardId: string;
  limit: number;
  committedLimit: number;
  availableLimit: number;
  currentInvoice: number;
  nextInvoice: number;
  futureInstallments: number;
  highestInvoiceNextSixMonths: number;
}

export interface CardCommitmentSummary {
  cards: CardCommitmentIndicator[];
  totalLimit: number;
  totalCommittedLimit: number;
  totalAvailableLimit: number;
  currentInvoiceTotal: number;
  futureInstallmentsTotal: number;
  currentInvoiceIncomePercent: number;
  futureInstallmentsIncomePercent: number;
  totalLimitUsedPercent: number;
}

export interface FutureInstallmentItem extends InvoiceItem {
  cardId: string;
  cardName: string;
}

export interface FutureInstallmentMonth {
  monthKey: string;
  total: number;
  items: FutureInstallmentItem[];
}

export interface DebtCommitmentItem {
  debtId: string;
  name: string;
  institution: string;
  status: DebtStatus;
  currentBalance: number;
  monthlyPayment: number;
  installmentsRemaining: number;
  payoffMonth: string | null;
  interestRate: number | null;
}

export interface DebtCommitmentSummary {
  totalBalance: number;
  monthlyPaymentTotal: number;
  incomeCommitmentPercent: number;
  activeDebtCount: number;
  payoffMonth: string | null;
  averageInterestRate: number | null;
  debts: DebtCommitmentItem[];
}

export type DataQualitySeverity = 'warning' | 'critical';

export interface DataQualityIssue {
  id: string;
  severity: DataQualitySeverity;
  entity: string;
  recordId: string;
  title: string;
  description: string;
}

export type MonthlyComparisonMetricKey =
  | 'income'
  | 'totalExpenses'
  | 'cardExpenses'
  | 'essentialExpenses'
  | 'nonEssentialExpenses'
  | 'savingsRate';

export interface MonthlyComparisonMetric {
  key: MonthlyComparisonMetricKey;
  label: string;
  currentValue: number;
  previousMonthValue: number | null;
  previousMonthChangePercent: number | null;
  average3Value: number | null;
  average3ChangePercent: number | null;
  average6Value: number | null;
  average6ChangePercent: number | null;
  unit: 'currency' | 'percent';
}

export interface CategoryTrend {
  category: string;
  currentValue: number;
  average3Value: number | null;
  average3ChangePercent: number | null;
}

export interface MonthlyComparisonSummary {
  monthKey: string;
  metrics: MonthlyComparisonMetric[];
  categoryTrends: CategoryTrend[];
}
