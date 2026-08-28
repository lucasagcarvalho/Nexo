import type { AppData, Income, Expense, Vigencia, CategoryEntry } from './types';
import { seedData } from './seed';
import { uid, currentMonthKey } from './format';
import { getSupabase } from './supabaseClient';

const STORAGE_KEY = 'recuperacao-financeira-v3';

// ─── localStorage cache (instant load) ───────────────────────────

export function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = seedData();
      saveLocalData(data);
      return data;
    }
    const parsed = JSON.parse(raw) as AppData;
    return migrateData(parsed);
  } catch {
    const data = seedData();
    saveLocalData(data);
    return data;
  }
}

export function saveLocalData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage may be full or unavailable
  }
}

// ─── Supabase persistence ────────────────────────────────────────

export async function loadRemoteData(): Promise<AppData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      console.error('Erro ao carregar dados do Supabase:', error.message);
      return null;
    }
    if (!data) return null;
    return migrateData(data.data as AppData);
  } catch (err) {
    console.error('Falha de conexão com Supabase:', err);
    return null;
  }
}

export async function saveRemoteData(data: AppData): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true }; // No Supabase configured — local only
  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ id: 1, data }, { onConflict: 'id' });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro de conexão' };
  }
}

// ─── Backward-compatible sync wrappers ────────────────────────────

export function loadData(): AppData {
  return loadLocalData();
}

export function saveData(data: AppData): void {
  saveLocalData(data);
}

export function resetData(): AppData {
  const data = seedData();
  saveLocalData(data);
  return data;
}

// ─── Migration helpers (unchanged) ────────────────────────────────

function migrateIncome(old: any): Income {
  if (old.vigencias && Array.isArray(old.vigencias) && old.vigencias.length > 0) {
    return {
      id: old.id,
      name: old.name ?? '',
      type: old.type ?? 'Outros',
      kind: old.kind ?? (old.recurrence === 'unica' ? 'variavel' : 'fixa'),
      person: old.person ?? 'Lucas',
      dueDay: old.dueDay ?? 1,
      note: old.note,
      active: old.active ?? true,
      vigencias: old.vigencias,
      status: old.status ?? 'previsto',
      realizedAmount: old.realizedAmount,
      competenceMonth: old.competenceMonth,
    };
  }
  const isVariable = old.recurrence === 'unica' || old.kind === 'variavel';
  const vigencias: Vigencia[] = isVariable
    ? [{ id: uid(), amount: old.amount ?? 0, startDate: old.startDate ?? old.competenceMonth ?? currentMonthKey(), endDate: old.startDate ?? old.competenceMonth ?? currentMonthKey() }]
    : [{ id: uid(), amount: old.amount ?? 0, startDate: old.startDate ?? currentMonthKey(), endDate: old.endDate ?? null }];

  return {
    id: old.id,
    name: old.name ?? '',
    type: old.type ?? 'Outros',
    kind: isVariable ? 'variavel' : 'fixa',
    person: old.person ?? 'Lucas',
    dueDay: old.dueDay ?? 1,
    note: old.note,
    active: old.active ?? true,
    vigencias,
    status: old.status ?? 'previsto',
    realizedAmount: old.realizedAmount,
    competenceMonth: isVariable ? (old.startDate ?? old.competenceMonth) : undefined,
  };
}

function migrateExpense(old: any): Expense {
  let type: Expense['type'] = old.type ?? 'Fixo';
  if ((type as string) === 'Variável' || (type as string) === 'Temporário') type = 'Pontual';

  if (old.vigencias && Array.isArray(old.vigencias) && old.vigencias.length > 0) {
    // Migrate legacy `paid` boolean to per-month paidMonths
    const paidMonths = old.paidMonths ?? (old.paid ? { [old.competenceMonth ?? old.vigencias[0]?.startDate ?? currentMonthKey()]: true } : {});
    return {
      id: old.id,
      description: old.description ?? '',
      category: old.category ?? 'Outros',
      type,
      person: old.person ?? 'Lucas',
      paymentMethod: old.paymentMethod ?? 'Débito',
      dueDay: old.dueDay ?? 1,
      note: old.note,
      paid: old.paid ?? false,
      paidMonths,
      active: old.active ?? true,
      status: old.status ?? 'previsto',
      realizedAmount: old.realizedAmount,
      vigencias: old.vigencias,
      competenceMonth: old.competenceMonth,
      cardId: old.cardId,
    };
  }
  const isOneTime = old.recurrence === 'unica' || (old.type as string) === 'Variável' || (old.type as string) === 'Temporário';
  const monthKey = old.date ? old.date.slice(0, 7) : (old.competenceMonth ?? currentMonthKey());
  const vigencias: Vigencia[] = isOneTime
    ? [{ id: uid(), amount: old.amount ?? 0, startDate: monthKey, endDate: monthKey }]
    : [{ id: uid(), amount: old.amount ?? 0, startDate: monthKey, endDate: old.endDate ?? null }];

  const paidMonths = old.paidMonths ?? (old.paid ? { [isOneTime ? monthKey : (old.startDate ?? currentMonthKey())]: true } : {});
  return {
    id: old.id,
    description: old.description ?? '',
    category: old.category ?? 'Outros',
    type: isOneTime ? 'Pontual' : 'Fixo',
    person: old.person ?? 'Lucas',
    paymentMethod: old.paymentMethod ?? 'Débito',
    dueDay: old.dueDay ?? 1,
    note: old.note,
    paid: old.paid ?? false,
    paidMonths,
    active: old.active ?? true,
    status: old.status ?? 'previsto',
    realizedAmount: old.realizedAmount,
    vigencias,
    competenceMonth: isOneTime ? monthKey : undefined,
    cardId: old.cardId,
  };
}

function migrateData(data: any): AppData {
  const seed = seedData();
  const categories: string[] = data.categories ?? seed.categories;
  let categoryEntries: CategoryEntry[] = data.categoryEntries;
  if (!categoryEntries || !Array.isArray(categoryEntries) || categoryEntries.length === 0) {
    categoryEntries = categories.map((name: string, i: number) => ({ id: `cat-${i}`, name, active: true }));
  }
  const existingNames = new Set(categoryEntries.map((c: CategoryEntry) => c.name));
  for (const defName of seed.categories) {
    if (!existingNames.has(defName)) {
      categoryEntries.push({ id: `cat-${uid()}`, name: defName, active: true });
      categories.push(defName);
    }
  }
  return {
    categories,
    categoryEntries,
    incomes: (data.incomes ?? []).map(migrateIncome),
    expenses: (data.expenses ?? []).map(migrateExpense),
    cards: data.cards ?? [],
    purchases: (data.purchases ?? []).map((p: any) => ({
      ...p,
      firstInvoiceMonth: p.firstInvoiceMonth ?? p.purchaseDate?.slice(0, 7) ?? currentMonthKey(),
    })),
    debts: data.debts ?? [],
    scenarios: data.scenarios ?? [],
    settings: { ...seed.settings, ...data.settings },
    history: data.history ?? [],
    pendingExpenses: data.pendingExpenses ?? [],
    bankAccounts: data.bankAccounts ?? [],
    bankBalanceSnapshots: data.bankBalanceSnapshots ?? [],
    people: data.people ?? [
      { id: 'p-lucas', name: 'Lucas', active: true },
      { id: 'p-thais', name: 'Thais', active: true },
      { id: 'p-outros', name: 'Outros', active: true },
    ],
    incomeTypes: data.incomeTypes ?? seed.incomeTypes,
    cardInvoiceStatus: data.cardInvoiceStatus ?? {},
  };
}
