import type { AccountTransaction, AppData } from '../types';
import { formatBankAccountLabel } from './accountRules';
import { calculateAccountLedgerBalance, calculateTotalLedgerBalance, getAccountTransactions } from './accountTransactionRules';
import { getMonthlyFinancialSummary } from './monthlySummary';
import { projectMonths } from './projection';
import type { FinancialFlowAuditAccount, FinancialFlowAuditReport } from './types';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function startOfMonth(monthKey: string): string {
  return `${monthKey}-01`;
}

function previousDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const previous = new Date(year, month - 1, day - 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`;
}

function isInitialBalanceForMonth(transaction: AccountTransaction, monthKey: string): boolean {
  return transaction.monthKey === monthKey && transaction.kind === 'initial_balance';
}

function accountAudit(data: AppData, accountId: string, monthKey: string): FinancialFlowAuditAccount {
  const account = data.bankAccounts.find((item) => item.id === accountId);
  const monthTransactions = getAccountTransactions(data).filter((transaction) => (
    transaction.accountId === accountId && transaction.monthKey === monthKey
  ));
  const openingBeforeMonth = calculateAccountLedgerBalance(data, accountId, previousDay(startOfMonth(monthKey)));
  const initialBalance = monthTransactions
    .filter((transaction) => transaction.kind === 'initial_balance')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const openingBalance = roundMoney(openingBeforeMonth + initialBalance);
  const operationalTransactions = monthTransactions.filter((transaction) => !isInitialBalanceForMonth(transaction, monthKey));
  const inflows = roundMoney(operationalTransactions
    .filter((transaction) => transaction.amount > 0 && transaction.kind !== 'transfer_in' && transaction.kind !== 'manual_adjustment')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const outflows = roundMoney(operationalTransactions
    .filter((transaction) => transaction.amount < 0 && transaction.kind !== 'transfer_out' && transaction.kind !== 'manual_adjustment')
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0));
  const transfersIn = roundMoney(operationalTransactions
    .filter((transaction) => transaction.kind === 'transfer_in')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const transfersOut = roundMoney(operationalTransactions
    .filter((transaction) => transaction.kind === 'transfer_out')
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0));
  const adjustments = roundMoney(operationalTransactions
    .filter((transaction) => transaction.kind === 'manual_adjustment')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const closingBalance = roundMoney(openingBalance + inflows - outflows + transfersIn - transfersOut + adjustments);

  return {
    accountId,
    accountLabel: account ? formatBankAccountLabel(account) : accountId,
    openingBalance,
    inflows,
    outflows,
    transfersIn,
    transfersOut,
    adjustments,
    closingBalance,
    transactions: monthTransactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      kind: transaction.kind,
      amount: transaction.amount,
    })),
  };
}

export function getFinancialFlowAuditReport(data: AppData, monthKey: string): FinancialFlowAuditReport {
  const summary = getMonthlyFinancialSummary(data, monthKey);
  const projection = projectMonths(data, 1, monthKey).months[0];
  const accountBalances = data.bankAccounts.map((account) => accountAudit(data, account.id, monthKey));
  const availableBalance = roundMoney(accountBalances.reduce((sum, account) => sum + account.closingBalance, 0));
  const ledgerBalance = calculateTotalLedgerBalance(data);
  const storedAccountsBalance = roundMoney(data.bankAccounts.reduce((sum, account) => sum + account.balance, 0));
  const projectedAccountsBalance = projection?.accountsBalance ?? 0;
  const accountOperationalResult = roundMoney(accountBalances.reduce((sum, account) => (
    sum + account.inflows - account.outflows + account.adjustments
  ), 0));

  return {
    monthKey,
    income: summary.income,
    totalExpenses: summary.totalExpenses,
    result: summary.balance,
    accountBalances,
    availableBalance,
    ledgerBalance,
    storedAccountsBalance,
    projectedAccountsBalance,
    checks: {
      noDoubleCounting: roundMoney(summary.balance - accountOperationalResult) === 0,
      ledgerExplainsStoredBalances: roundMoney(storedAccountsBalance - ledgerBalance) === 0,
      dashboardMatchesAccounts: roundMoney(storedAccountsBalance - availableBalance) === 0,
      projectionMatchesAccounts: roundMoney(projectedAccountsBalance - storedAccountsBalance) === 0,
    },
  };
}
