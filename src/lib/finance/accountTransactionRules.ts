import type { AccountTransaction, AccountTransactionRelatedEntityType, AppData } from '../types';
import { uid } from '../format';

export interface AccountLedgerBalanceComparison {
  accountId: string;
  accountBalance: number;
  ledgerBalance: number;
  difference: number;
}

export interface TotalLedgerBalanceComparison {
  accountsBalance: number;
  ledgerBalance: number;
  difference: number;
}

function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function isValidTransaction(transaction: AccountTransaction): boolean {
  return (
    !!transaction.id
    && !!transaction.accountId
    && isValidDateKey(transaction.date)
    && isValidMonthKey(transaction.monthKey)
    && transaction.date.slice(0, 7) === transaction.monthKey
    && Number.isFinite(transaction.amount)
  );
}

function sortTransactions(a: AccountTransaction, b: AccountTransaction): number {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;
  const createdCompare = a.createdAt.localeCompare(b.createdAt);
  if (createdCompare !== 0) return createdCompare;
  return a.id.localeCompare(b.id);
}

export function getAccountTransactions(data: AppData): AccountTransaction[] {
  const seen = new Set<string>();
  return (data.accountTransactions ?? [])
    .filter((transaction) => {
      if (!isValidTransaction(transaction) || seen.has(transaction.id)) return false;
      seen.add(transaction.id);
      return true;
    })
    .sort(sortTransactions);
}

export function getTransactionsForAccount(data: AppData, accountId: string): AccountTransaction[] {
  return getAccountTransactions(data).filter((transaction) => transaction.accountId === accountId);
}

export function getTransactionsForMonth(data: AppData, monthKey: string): AccountTransaction[] {
  return getAccountTransactions(data).filter((transaction) => transaction.monthKey === monthKey);
}

export function getTransactionByRelatedEntity(
  data: AppData,
  relatedEntityType: AccountTransactionRelatedEntityType,
  relatedEntityId: string,
  relatedMonthKey?: string,
): AccountTransaction | null {
  return getAccountTransactions(data).find((transaction) => (
    transaction.relatedEntityType === relatedEntityType
    && transaction.relatedEntityId === relatedEntityId
    && (relatedMonthKey === undefined || transaction.relatedMonthKey === relatedMonthKey)
    && transaction.kind !== 'reversal'
    && !isTransactionReversed(data, transaction.id)
  )) ?? null;
}

export function sumTransactionsForAccount(data: AppData, accountId: string, untilDate?: string): number {
  return getTransactionsForAccount(data, accountId)
    .filter((transaction) => untilDate === undefined || transaction.date <= untilDate)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function calculateAccountLedgerBalance(data: AppData, accountId: string, untilDate?: string): number {
  return sumTransactionsForAccount(data, accountId, untilDate);
}

export function calculateTotalLedgerBalance(data: AppData, untilDate?: string): number {
  return data.bankAccounts.reduce((sum, account) => (
    sum + calculateAccountLedgerBalance(data, account.id, untilDate)
  ), 0);
}

export function getAccountLedgerBalanceComparisons(data: AppData, untilDate?: string): AccountLedgerBalanceComparison[] {
  return data.bankAccounts.map((account) => {
    const accountBalance = Number.isFinite(account.balance) ? account.balance : 0;
    const ledgerBalance = calculateAccountLedgerBalance(data, account.id, untilDate);
    return {
      accountId: account.id,
      accountBalance,
      ledgerBalance,
      difference: accountBalance - ledgerBalance,
    };
  });
}

export function getTotalLedgerBalanceComparison(data: AppData, untilDate?: string): TotalLedgerBalanceComparison {
  const comparisons = getAccountLedgerBalanceComparisons(data, untilDate);
  const accountsBalance = comparisons.reduce((sum, comparison) => sum + comparison.accountBalance, 0);
  const ledgerBalance = comparisons.reduce((sum, comparison) => sum + comparison.ledgerBalance, 0);
  return {
    accountsBalance,
    ledgerBalance,
    difference: accountsBalance - ledgerBalance,
  };
}

export function getAccountLedgerBalanceDifferences(data: AppData, untilDate?: string): AccountLedgerBalanceComparison[] {
  return getAccountLedgerBalanceComparisons(data, untilDate)
    .filter((comparison) => Math.round(comparison.difference * 100) !== 0);
}

export function createManualAdjustmentTransaction(
  accountId: string,
  amount: number,
  date: string,
  note?: string,
): AccountTransaction | null {
  const roundedAmount = Math.round(amount * 100) / 100;
  if (!accountId || !isValidDateKey(date) || !Number.isFinite(roundedAmount) || roundedAmount === 0) return null;
  return {
    id: uid(),
    accountId,
    date,
    monthKey: date.slice(0, 7),
    amount: roundedAmount,
    kind: 'manual_adjustment',
    note: note || 'Conciliação manual de saldo.',
    createdAt: new Date().toISOString(),
  };
}

export function createReversalTransaction(transaction: AccountTransaction, date = transaction.date): AccountTransaction {
  const monthKey = date.slice(0, 7);
  return {
    id: uid(),
    accountId: transaction.accountId,
    date,
    monthKey,
    amount: -transaction.amount,
    kind: 'reversal',
    relatedEntityType: transaction.relatedEntityType,
    relatedEntityId: transaction.relatedEntityId,
    relatedMonthKey: transaction.relatedMonthKey,
    reversalOfTransactionId: transaction.id,
    note: transaction.note ? `Estorno: ${transaction.note}` : 'Estorno de movimentação.',
    createdAt: new Date().toISOString(),
  };
}

export function isTransactionReversed(data: AppData, transactionId: string): boolean {
  return getAccountTransactions(data).some((transaction) => (
    transaction.reversalOfTransactionId === transactionId
    || transaction.reversedTransactionId === transactionId
  ));
}
