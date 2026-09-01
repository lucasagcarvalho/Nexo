import type { AppData } from '../types';
import { formatCurrency } from '../format';
import { formatBankAccountLabel } from './accountRules';
import { getAccountNegativeBalanceRisksForMonth, getCashflowTimelineForMonth } from './cashflowTimelineRules';
import type { CashflowTimelineItem, PreventiveTransferSuggestion } from './types';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function previousDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const previous = new Date(year, month - 1, day - 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`;
}

function openingBalances(data: AppData, timeline: CashflowTimelineItem[]): Map<string, number> {
  const realizedByAccount = new Map<string, number>();
  for (const item of timeline) {
    if (!item.accountId || item.status !== 'realizado') continue;
    realizedByAccount.set(item.accountId, roundMoney((realizedByAccount.get(item.accountId) ?? 0) + item.amount));
  }
  return new Map(data.bankAccounts.map((account) => [
    account.id,
    roundMoney((Number.isFinite(account.balance) ? account.balance : 0) - (realizedByAccount.get(account.id) ?? 0)),
  ]));
}

function lowestKnownBalanceAfterTransfer(
  timeline: CashflowTimelineItem[],
  openingByAccount: Map<string, number>,
  accountId: string,
  transferDate: string,
  transferAmount: number,
): number {
  let balance = openingByAccount.get(accountId) ?? 0;
  let lowest = balance;
  let transferApplied = false;

  for (const item of timeline.filter((entry) => entry.accountId === accountId)) {
    if (!transferApplied && item.date >= transferDate) {
      balance = roundMoney(balance - transferAmount);
      lowest = Math.min(lowest, balance);
      transferApplied = true;
    }
    balance = roundMoney(balance + item.amount);
    lowest = Math.min(lowest, balance);
  }

  if (!transferApplied) {
    balance = roundMoney(balance - transferAmount);
    lowest = Math.min(lowest, balance);
  }

  return lowest;
}

export function getPreventiveTransferSuggestions(data: AppData, monthKey: string, limit = 3): PreventiveTransferSuggestion[] {
  const timeline = getCashflowTimelineForMonth(data, monthKey);
  const openingByAccount = openingBalances(data, timeline);
  const accountLabels = new Map(data.bankAccounts.map((account) => [account.id, formatBankAccountLabel(account)]));
  const risks = getAccountNegativeBalanceRisksForMonth(data, monthKey);

  return risks
    .map((risk) => {
      const amount = roundMoney(risk.deficit);
      const suggestedDate = previousDay(risk.date);
      const origin = data.bankAccounts
        .filter((account) => account.id !== risk.accountId)
        .map((account) => ({
          account,
          lowestBalance: lowestKnownBalanceAfterTransfer(timeline, openingByAccount, account.id, suggestedDate, amount),
        }))
        .filter((candidate) => candidate.lowestBalance >= 0)
        .sort((a, b) => (
          b.lowestBalance - a.lowestBalance
          || formatBankAccountLabel(a.account).localeCompare(formatBankAccountLabel(b.account))
        ))[0];

      if (!origin) return null;

      const fromAccountLabel = accountLabels.get(origin.account.id) ?? formatBankAccountLabel(origin.account);
      const toAccountLabel = risk.accountLabel;
      return {
        id: `preventive-transfer-${origin.account.id}-${risk.accountId}-${risk.date}`,
        fromAccountId: origin.account.id,
        fromAccountLabel,
        toAccountId: risk.accountId,
        toAccountLabel,
        monthKey,
        suggestedDate,
        amount,
        destinationDeficitDate: risk.date,
        destinationDeficit: risk.deficit,
        originLowestBalanceAfterTransfer: origin.lowestBalance,
        reason: `${toAccountLabel} ficará negativa em ${formatCurrency(risk.deficit)} no dia ${risk.date.slice(8, 10)}/${risk.date.slice(5, 7)}. ${fromAccountLabel} mantém menor saldo previsto de ${formatCurrency(origin.lowestBalance)} após a transferência.`,
      };
    })
    .filter((suggestion): suggestion is PreventiveTransferSuggestion => suggestion !== null)
    .sort((a, b) => (
      a.destinationDeficitDate.localeCompare(b.destinationDeficitDate)
      || b.destinationDeficit - a.destinationDeficit
      || a.fromAccountLabel.localeCompare(b.fromAccountLabel)
    ))
    .slice(0, limit);
}
