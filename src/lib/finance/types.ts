import type { DebtStatus } from '../types';

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
