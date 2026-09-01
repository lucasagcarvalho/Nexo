import type { AccountTransaction, AppData, BankAccount } from '../types';
import { compareMonths, currentMonthKey, generateMonthKeys } from '../format';
import { getAccountTransactions, isTransactionReversed } from './accountTransactionRules';
import { incomeAmountForMonth } from './incomeRules';
import type { AccountMonthProjection, AccountsMonthProjection } from './types';

function endOfMonthDate(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthKey}-${String(lastDay).padStart(2, '0')}`;
}

export function totalBankBalance(data: AppData): number {
  return data.bankAccounts.reduce((sum, account) => sum + (Number.isFinite(account.balance) ? account.balance : 0), 0);
}

export function formatBankAccountLabel(account: BankAccount): string {
  const bank = account.bank.trim() || account.name?.trim() || 'Conta';
  const holder = account.holder.trim();
  return holder ? `${bank} · ${holder}` : bank;
}

function sumValues(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) * 100) / 100;
}

function getActiveTransferTransactionsForMonth(data: AppData, accountId: string, monthKey: string): AccountTransaction[] {
  return getAccountTransactions(data).filter((transaction) => (
    transaction.accountId === accountId
    && transaction.monthKey === monthKey
    && transaction.relatedEntityType === 'transfer'
    && (transaction.kind === 'transfer_in' || transaction.kind === 'transfer_out' || transaction.kind === 'reversal')
    && (transaction.kind === 'reversal' || !isTransactionReversed(data, transaction.id))
  ));
}

function projectAccountMonth(
  data: AppData,
  account: BankAccount,
  monthKey: string,
  openingBalance: number,
): AccountMonthProjection {
  const income = sumValues(data.incomes
    .filter((item) => item.defaultAccountId === account.id)
    .map((item) => incomeAmountForMonth(item, monthKey)));
  const expensePayments = sumValues((data.expensePayments ?? [])
    .filter((payment) => payment.accountId === account.id && payment.monthKey === monthKey)
    .map((payment) => payment.paidAmount));
  const cardInvoicePayments = sumValues((data.cardInvoicePayments ?? [])
    .filter((payment) => payment.accountId === account.id && payment.monthKey === monthKey)
    .map((payment) => payment.amount));
  const debtPayments = sumValues((data.debtPayments ?? [])
    .filter((payment) => payment.accountId === account.id && payment.monthKey === monthKey)
    .map((payment) => payment.paidAmount));
  const transferTransactions = getActiveTransferTransactionsForMonth(data, account.id, monthKey);
  const transferIn = sumValues(transferTransactions
    .filter((transaction) => transaction.amount > 0)
    .map((transaction) => transaction.amount));
  const transferOut = sumValues(transferTransactions
    .filter((transaction) => transaction.amount < 0)
    .map((transaction) => Math.abs(transaction.amount)));
  const closingBalance = sumValues([
    openingBalance,
    income,
    -expensePayments,
    -cardInvoicePayments,
    -debtPayments,
    transferIn,
    -transferOut,
  ]);

  return {
    accountId: account.id,
    accountLabel: formatBankAccountLabel(account),
    monthKey,
    openingBalance,
    income,
    expensePayments,
    cardInvoicePayments,
    debtPayments,
    transferIn,
    transferOut,
    closingBalance,
  };
}

export function projectAccountsByMonth(data: AppData, startMonth?: string, count = 12): AccountsMonthProjection[] {
  const monthKeys = generateMonthKeys(startMonth ?? currentMonthKey(), count);
  const openingByAccount = new Map(data.bankAccounts.map((account) => [
    account.id,
    Number.isFinite(account.balance) ? account.balance : 0,
  ]));

  return monthKeys.map((monthKey) => {
    const accounts = data.bankAccounts.map((account) => {
      const openingBalance = openingByAccount.get(account.id) ?? 0;
      const projection = projectAccountMonth(data, account, monthKey, openingBalance);
      openingByAccount.set(account.id, projection.closingBalance);
      return projection;
    });

    const openingBalance = sumValues(accounts.map((account) => account.openingBalance));
    const income = sumValues(accounts.map((account) => account.income));
    const expensePayments = sumValues(accounts.map((account) => account.expensePayments));
    const cardInvoicePayments = sumValues(accounts.map((account) => account.cardInvoicePayments));
    const debtPayments = sumValues(accounts.map((account) => account.debtPayments));
    const transferIn = sumValues(accounts.map((account) => account.transferIn));
    const transferOut = sumValues(accounts.map((account) => account.transferOut));
    const closingBalance = sumValues(accounts.map((account) => account.closingBalance));

    return {
      monthKey,
      accounts,
      openingBalance,
      income,
      expensePayments,
      cardInvoicePayments,
      debtPayments,
      transferIn,
      transferOut,
      netCashflow: sumValues([closingBalance, -openingBalance]),
      closingBalance,
    };
  });
}

export function getAccountBalanceSnapshotForMonth(data: AppData, monthKey: string): number | null {
  const monthEnd = endOfMonthDate(monthKey);
  let hasSnapshot = false;

  const total = data.bankAccounts.reduce((sum, account) => {
    const snapshot = data.bankBalanceSnapshots
      .filter((item) => item.accountId === account.id && item.date <= monthEnd)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!snapshot) return sum;
    hasSnapshot = true;
    return sum + (Number.isFinite(snapshot.balance) ? snapshot.balance : 0);
  }, 0);

  return hasSnapshot ? total : null;
}

export function projectAccountBalance(data: AppData, monthKey: string, monthlyBalance: number, previousProjectedBalance?: number): { accountsBalance: number; projectedAccountsBalance: number } {
  const currentMonth = currentMonthKey();
  const currentBalance = totalBankBalance(data);
  const snapshotBalance = getAccountBalanceSnapshotForMonth(data, monthKey);

  if (compareMonths(monthKey, currentMonth) < 0) {
    const accountsBalance = snapshotBalance ?? 0;
    return { accountsBalance, projectedAccountsBalance: accountsBalance };
  }

  if (compareMonths(monthKey, currentMonth) === 0) {
    return { accountsBalance: currentBalance, projectedAccountsBalance: currentBalance };
  }

  const projectedAccountsBalance = (previousProjectedBalance ?? currentBalance) + monthlyBalance;
  return { accountsBalance: currentBalance, projectedAccountsBalance };
}
