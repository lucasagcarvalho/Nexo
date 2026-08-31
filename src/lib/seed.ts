import type { AppData } from './types';

const DEFAULT_CATEGORIES = [
  'Moradia', 'Aluguel', 'Casa', 'Alimentação', 'Mercado', 'Delivery',
  'Transporte', 'Carro', 'Combustível', 'Eletrônicos', 'Informática',
  'Saúde', 'Educação', 'Crianças', 'Pets', 'Lazer', 'Assinaturas',
  'Impostos', 'Empréstimos', 'Financiamentos', 'Serviços', 'Outros',
];

const DEFAULT_CATEGORY_CLASSES: Record<string, AppData['categoryEntries'][number]['expenseClass']> = {
  Moradia: 'essential',
  Aluguel: 'essential',
  Casa: 'essential',
  Alimentação: 'essential',
  Mercado: 'essential',
  Transporte: 'essential',
  Carro: 'essential',
  Combustível: 'essential',
  Saúde: 'essential',
  Educação: 'essential',
  Crianças: 'essential',
  Impostos: 'essential',
  Empréstimos: 'financial',
  Financiamentos: 'financial',
  Assinaturas: 'lifestyle',
  Delivery: 'lifestyle',
  Eletrônicos: 'lifestyle',
  Informática: 'lifestyle',
  Pets: 'lifestyle',
  Lazer: 'lifestyle',
  Serviços: 'other',
  Outros: 'other',
};

export function defaultCategoryClass(name: string): AppData['categoryEntries'][number]['expenseClass'] {
  return DEFAULT_CATEGORY_CLASSES[name] ?? 'other';
}

export function seedData(): AppData {
  return {
    categories: DEFAULT_CATEGORIES,
    categoryEntries: DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i}`, name, active: true, expenseClass: defaultCategoryClass(name) })),
    incomes: [],
    expenses: [],
    cards: [],
    purchases: [],
    debts: [],
    scenarios: [],
    settings: {
      cardMonthlyLimit: 4000,
      cardMonthlyLimitVigencias: [{ id: 'card-limit-default', amount: 4000, startDate: '2026-01', endDate: null }],
      reserveTargetMonths: 3,
      reserveFloor: 500,
      surplusReserve: 50,
      surplusNextMonth: 25,
      surplusDebt: 15,
      surplusFree: 10,
    },
    history: [],
    pendingExpenses: [],
    bankAccounts: [],
    bankBalanceSnapshots: [],
    accountTransactions: [],
    people: [
      { id: 'p-lucas', name: 'Lucas', active: true },
      { id: 'p-thais', name: 'Thais', active: true },
      { id: 'p-outros', name: 'Outros', active: true },
    ],
    incomeTypes: [
      'Salário', 'Aluguel', 'Freelancer', 'Trabalho extra', 'Comissão',
      'Bônus', 'Festa / Evento', 'Venda', 'Prestação de serviço', 'Reembolso',
      'Benefício', 'Pensão', 'Rendimentos', 'Investimentos', 'Dividendos',
      'Cashback', 'Presente', 'Outros',
    ],
    categoryBudgets: [],
  };
}
