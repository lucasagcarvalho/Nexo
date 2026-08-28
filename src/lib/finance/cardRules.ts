import type { AppData, CardPurchase, CreditCard, Settings } from '../types';
import { addMonths, currentMonthKey, generateMonthKeys } from '../format';
import { getActiveVigencia } from './vigenciaRules';
import type { InvoiceItem, InvoiceStatus, PurchaseStatus } from './types';

export function monthIndex(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function getInstallmentAmounts(purchase: CardPurchase): number[] {
  const base = purchase.totalAmount / purchase.installments;
  const amounts: number[] = [];
  let sum = 0;
  for (let i = 0; i < purchase.installments; i++) {
    if (i === purchase.installments - 1) {
      amounts.push(Math.round((purchase.totalAmount - sum) * 100) / 100);
    } else {
      const val = Math.round(base * 100) / 100;
      amounts.push(val);
      sum += val;
    }
  }
  return amounts;
}

export function purchaseInstallmentForMonth(purchase: CardPurchase, monthKey: string): number {
  const startMonth = purchase.firstInvoiceMonth ?? purchase.purchaseDate.slice(0, 7);
  const diff = monthIndex(monthKey) - monthIndex(startMonth);
  if (diff < 0 || diff >= purchase.installments) return 0;
  return getInstallmentAmounts(purchase)[diff];
}

export function getCardInvoiceForMonth(purchases: CardPurchase[], cardId: string, monthKey: string): number {
  return purchases
    .filter((purchase) => purchase.cardId === cardId)
    .reduce((sum, purchase) => sum + purchaseInstallmentForMonth(purchase, monthKey), 0);
}

export function cardProjection(data: AppData, card: CreditCard, count = 12, startMonth?: string): { monthKey: string; amount: number }[] {
  const start = startMonth ?? currentMonthKey();
  return generateMonthKeys(start, count).map((monthKey) => ({
    monthKey,
    amount: getCardInvoiceForMonth(data.purchases, card.id, monthKey),
  }));
}

export function cardInvoiceDetail(data: AppData, cardId: string, monthKey: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  for (const purchase of data.purchases) {
    if (purchase.cardId !== cardId) continue;
    const startMonth = purchase.firstInvoiceMonth ?? purchase.purchaseDate.slice(0, 7);
    const diff = monthIndex(monthKey) - monthIndex(startMonth);
    if (diff < 0 || diff >= purchase.installments) continue;
    const amounts = getInstallmentAmounts(purchase);
    items.push({
      purchaseId: purchase.id,
      name: purchase.name,
      installmentNumber: diff + 1,
      totalInstallments: purchase.installments,
      amount: amounts[diff],
      category: purchase.category,
    });
  }
  return items;
}

export function purchaseInstallmentStatus(purchase: CardPurchase, refMonth?: string): PurchaseStatus {
  const startMonth = purchase.firstInvoiceMonth ?? purchase.purchaseDate.slice(0, 7);
  const curMonth = refMonth ?? currentMonthKey();
  const elapsed = Math.max(0, monthIndex(curMonth) - monthIndex(startMonth));
  const currentInstallment = Math.min(elapsed + 1, purchase.installments);
  const remaining = Math.max(0, purchase.installments - elapsed);
  const amounts = getInstallmentAmounts(purchase);
  let remainingBalance = 0;
  for (let i = elapsed; i < purchase.installments; i++) {
    remainingBalance += amounts[i];
  }
  return { currentInstallment, remaining, remainingBalance };
}

export function invoiceStatusKey(cardId: string, monthKey: string): string {
  return `${cardId}|${monthKey}`;
}

export function isInvoicePaid(data: AppData, cardId: string, monthKey: string): boolean {
  return data.cardInvoiceStatus?.[invoiceStatusKey(cardId, monthKey)] ?? false;
}

export function cardUtilization(data: AppData, card: CreditCard, refMonth?: string): { used: number; available: number; currentInvoice: number; nextInvoice: number; futureInstallments: number } {
  const startMonth = refMonth ?? currentMonthKey();
  const nextMonth = addMonths(startMonth, 1);
  const currentIdx = monthIndex(startMonth);
  let currentInvoice = 0;
  let nextInvoice = 0;
  let futureInstallments = 0;
  let used = 0;

  for (const purchase of data.purchases) {
    if (purchase.cardId !== card.id) continue;
    currentInvoice += purchaseInstallmentForMonth(purchase, startMonth);
    nextInvoice += purchaseInstallmentForMonth(purchase, nextMonth);

    const purchaseStartMonth = purchase.firstInvoiceMonth ?? purchase.purchaseDate.slice(0, 7);
    const purchaseStartIdx = monthIndex(purchaseStartMonth);
    const elapsed = currentIdx - purchaseStartIdx;
    const amounts = getInstallmentAmounts(purchase);

    if (elapsed < purchase.installments) {
      for (let i = Math.max(0, elapsed + 2); i < purchase.installments; i++) {
        futureInstallments += amounts[i];
      }
    }

    for (let i = 0; i < purchase.installments; i++) {
      const invoiceMonth = addMonths(purchaseStartMonth, i);
      const invoiceIdx = purchaseStartIdx + i;
      const invoicePaid = isInvoicePaid(data, card.id, invoiceMonth);
      if (invoiceIdx >= currentIdx || !invoicePaid) {
        used += amounts[i];
      }
    }
  }

  return {
    used,
    available: Math.max(0, card.limit - used),
    currentInvoice,
    nextInvoice,
    futureInstallments,
  };
}

export function getCardMonthlyLimit(settings: Settings, monthKey: string): number {
  const vigencias = settings.cardMonthlyLimitVigencias ?? [{
    id: 'legacy-card-limit',
    amount: settings.cardMonthlyLimit,
    startDate: currentMonthKey(),
    endDate: null,
  }];
  return getActiveVigencia(vigencias, monthKey)?.amount ?? settings.cardMonthlyLimit;
}

export function getInvoiceStatus(
  data: AppData,
  card: CreditCard,
  monthKey: string,
  invoiceAmount: number,
): InvoiceStatus {
  if (invoiceAmount <= 0) return 'sem_fatura';
  if (isInvoicePaid(data, card.id, monthKey)) return 'pago';
  const [y, m] = monthKey.split('-').map(Number);
  const dueDate = new Date(y, m, card.dueDay);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dueDate < today) return 'vencido';
  return 'pendente';
}
