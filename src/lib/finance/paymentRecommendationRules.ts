import type { AppData } from '../types';
import { formatCurrency } from '../format';
import { formatBankAccountLabel } from './accountRules';
import { getCashflowTimelineForMonth } from './cashflowTimelineRules';
import type { CashflowTimelineItem, PaymentPriorityRecommendation } from './types';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getOpeningBalances(data: AppData, monthKey: string, timeline: CashflowTimelineItem[]): Map<string, number> {
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

function knownAccountFlowBefore(timeline: CashflowTimelineItem[], accountId: string, date: string): number {
  return roundMoney(timeline
    .filter((item) => item.accountId === accountId && item.date < date)
    .reduce((sum, item) => sum + item.amount, 0));
}

function knownAccountFlowAfter(timeline: CashflowTimelineItem[], accountId: string, date: string): number[] {
  let running = 0;
  const balances: number[] = [];
  for (const item of timeline.filter((entry) => entry.accountId === accountId && entry.date > date)) {
    running = roundMoney(running + item.amount);
    balances.push(running);
  }
  return balances;
}

function riskLevel(balanceAfterPayment: number, lowestBalanceAfterPayment: number): PaymentPriorityRecommendation['riskLevel'] {
  if (balanceAfterPayment < 0 || lowestBalanceAfterPayment < 0) return 'alto';
  if (lowestBalanceAfterPayment < balanceAfterPayment * 0.25 || lowestBalanceAfterPayment < 200) return 'medio';
  return 'baixo';
}

function reasonForRecommendation(
  item: CashflowTimelineItem,
  recommendation: Omit<PaymentPriorityRecommendation, 'id' | 'rank' | 'item' | 'reason'>,
): string {
  if (recommendation.riskLevel === 'alto') {
    return `${item.label} vence em ${item.date.slice(8, 10)}/${item.date.slice(5, 7)} e pode deixar ${recommendation.accountLabel} negativa.`;
  }
  if (recommendation.lowestBalanceAfterPayment < recommendation.balanceAfterPayment) {
    return `${item.label} vence em ${item.date.slice(8, 10)}/${item.date.slice(5, 7)} e há compromissos seguintes nessa conta.`;
  }
  return `${item.label} vence em ${item.date.slice(8, 10)}/${item.date.slice(5, 7)} e cabe no caixa previsto da conta.`;
}

function buildRecommendationForAccount(
  item: CashflowTimelineItem,
  accountId: string,
  accountLabel: string,
  openingBalances: Map<string, number>,
  timeline: CashflowTimelineItem[],
): Omit<PaymentPriorityRecommendation, 'id' | 'rank' | 'item' | 'reason'> {
  const balanceBeforePayment = roundMoney((openingBalances.get(accountId) ?? 0) + knownAccountFlowBefore(timeline, accountId, item.date));
  const balanceAfterPayment = roundMoney(balanceBeforePayment + item.amount);
  const futureBalanceDeltas = knownAccountFlowAfter(timeline, accountId, item.date);
  const lowestBalanceAfterPayment = futureBalanceDeltas.reduce(
    (lowest, delta) => Math.min(lowest, roundMoney(balanceAfterPayment + delta)),
    balanceAfterPayment,
  );
  return {
    accountId,
    accountLabel,
    dueDate: item.date,
    amount: Math.abs(item.amount),
    balanceBeforePayment,
    balanceAfterPayment,
    lowestBalanceAfterPayment,
    riskLevel: riskLevel(balanceAfterPayment, lowestBalanceAfterPayment),
  };
}

export function getPaymentPriorityRecommendations(data: AppData, monthKey: string, limit = 5): PaymentPriorityRecommendation[] {
  const timeline = getCashflowTimelineForMonth(data, monthKey);
  const openingBalances = getOpeningBalances(data, monthKey, timeline);
  const accountLabels = new Map(data.bankAccounts.map((account) => [account.id, formatBankAccountLabel(account)]));
  const pendingPayments = timeline.filter((item) => item.amount < 0 && item.status === 'previsto');

  return pendingPayments
    .map((item) => {
      const candidateAccountIds = item.accountId
        ? [item.accountId]
        : data.bankAccounts.map((account) => account.id);
      const bestAccount = candidateAccountIds
        .map((accountId) => buildRecommendationForAccount(
          item,
          accountId,
          accountLabels.get(accountId) ?? item.accountLabel,
          openingBalances,
          timeline,
        ))
        .sort((a, b) => (
          b.lowestBalanceAfterPayment - a.lowestBalanceAfterPayment
          || b.balanceAfterPayment - a.balanceAfterPayment
          || a.accountLabel.localeCompare(b.accountLabel)
        ))[0];

      if (!bestAccount) return null;

      const recommendation = {
        id: `pay-first-${item.id}`,
        rank: 0,
        item,
        ...bestAccount,
        reason: reasonForRecommendation(item, bestAccount),
      };
      return recommendation;
    })
    .filter((item): item is PaymentPriorityRecommendation => item !== null)
    .sort((a, b) => (
      a.dueDate.localeCompare(b.dueDate)
      || riskRank(b.riskLevel) - riskRank(a.riskLevel)
      || a.lowestBalanceAfterPayment - b.lowestBalanceAfterPayment
      || a.item.label.localeCompare(b.item.label)
    ))
    .slice(0, limit)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
      reason: `${recommendation.reason} Saldo após pagar: ${formatCurrency(recommendation.balanceAfterPayment)}.`,
    }));
}

function riskRank(risk: PaymentPriorityRecommendation['riskLevel']): number {
  if (risk === 'alto') return 3;
  if (risk === 'medio') return 2;
  return 1;
}
