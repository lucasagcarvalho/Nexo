import type { Vigencia } from '../types';
import { compareMonths } from '../format';

export function getActiveVigencia(vigencias: Vigencia[], monthKey: string): Vigencia | null {
  let active: Vigencia | null = null;
  for (const v of vigencias) {
    if (compareMonths(monthKey, v.startDate) < 0) continue;
    if (v.endDate && compareMonths(monthKey, v.endDate) > 0) continue;
    const isMonthlyOverride = v.startDate === monthKey && v.endDate === monthKey;
    const activeIsMonthlyOverride = active?.startDate === monthKey && active?.endDate === monthKey;
    if (!active || (isMonthlyOverride && !activeIsMonthlyOverride) || compareMonths(v.startDate, active.startDate) > 0) {
      active = v;
    }
  }
  return active;
}
