import type { AppData } from '../types';
import { compareMonths, currentMonthKey } from '../format';

function endOfMonthDate(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthKey}-${String(lastDay).padStart(2, '0')}`;
}

export function totalBankBalance(data: AppData): number {
  return data.bankAccounts.reduce((sum, account) => sum + (Number.isFinite(account.balance) ? account.balance : 0), 0);
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
