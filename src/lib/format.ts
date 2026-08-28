export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1000) {
    return 'R$ ' + (value / 1000).toFixed(1).replace('.', ',') + 'k';
  }
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  return value.toFixed(1).replace('.', ',') + '%';
}

/**
 * Parse a Brazilian currency string (e.g. "R$ 1.234,56" or "1234,56") into a number.
 */
export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Format a number as a Brazilian currency string with the R$ prefix.
 * Used for display in CurrencyInput while typing.
 */
export function formatCurrencyInput(value: number): string {
  if (value === 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse raw digit input into a number (cents-based approach).
 * Strips everything except digits, treats last 2 chars as cents.
 */
export function parseCurrencyFromDigits(value: string): number {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits === '') return 0;
  return parseInt(digits) / 100;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export function monthLabelShort(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES_SHORT[parseInt(m) - 1]}/${y.slice(2)}`;
}

export function monthShort(key: string): string {
  const [, m] = key.split('-');
  return MONTH_NAMES_SHORT[parseInt(m) - 1];
}

/**
 * Format a YYYY-MM key as MM/YYYY for Brazilian display.
 */
export function formatMonthBR(key: string): string {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}

/**
 * Format a YYYY-MM-DD date as DD/MM/YYYY for Brazilian display.
 */
export function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1 + n, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function generateMonthKeys(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}

/**
 * @deprecated Use formatDateBR instead.
 */
export function formatDate(dateStr: string): string {
  return formatDateBR(dateStr);
}

/**
 * @deprecated Use formatDateBR or formatMonthBR instead.
 */
export function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Compare two YYYY-MM month keys. Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareMonths(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (ay * 12 + am) - (by * 12 + bm);
}

/**
 * Check if a month key falls within a vigência range.
 */
export function isMonthInVigencia(monthKey: string, startDate: string, endDate: string | null): boolean {
  if (compareMonths(monthKey, startDate) < 0) return false;
  if (endDate && compareMonths(monthKey, endDate) > 0) return false;
  return true;
}
