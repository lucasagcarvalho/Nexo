import type { AppData } from './types';

const DEFAULT_CATEGORIES = [
  'Moradia', 'Aluguel', 'Casa', 'Alimentação', 'Mercado', 'Delivery',
  'Transporte', 'Carro', 'Combustível', 'Eletrônicos', 'Informática',
  'Saúde', 'Educação', 'Crianças', 'Pets', 'Lazer', 'Assinaturas',
  'Impostos', 'Empréstimos', 'Financiamentos', 'Serviços', 'Outros',
];

export function seedData(): AppData {
  return {
    categories: DEFAULT_CATEGORIES,
    categoryEntries: DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i}`, name, active: true })),
    incomes: [],
    expenses: [],
    cards: [],
    purchases: [],
    debts: [],
    scenarios: [],
    settings: {
      cardMonthlyLimit: 4000,
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
  };
}
