export type Recurrence = 'mensal' | 'unica' | 'semanal' | 'personalizada';

export type ExpenseType = 'Fixo' | 'Prazo' | 'Pontual';

export type PaymentMethod = 'Dinheiro' | 'Débito' | 'Crédito' | 'PIX' | 'Boleto' | 'Transferência';

export type Person = string;

export type IncomeType = string;

export type IncomeKind = 'fixa' | 'variavel' | 'determinada';

export interface PersonEntry {
  id: string;
  name: string;
  note?: string;
  active: boolean;
}

export type DebtStatus = 'Em aberto' | 'Negociação' | 'Parcelada' | 'Quitada';

export type ScenarioType = 'Conservador' | 'Atual' | 'Otimista';

export type EntryStatus = 'previsto' | 'realizado';

/**
 * A vigência record represents a value that was active during a date range.
 * Used for versioning recurring incomes/expenses without overwriting history.
 */
export interface Vigencia {
  id: string;
  amount: number;
  startDate: string; // YYYY-MM
  endDate: string | null; // YYYY-MM, null = open-ended
}

export interface Income {
  id: string;
  name: string;
  type: IncomeType;
  kind: IncomeKind;
  person: Person;
  dueDay: number;
  defaultAccountId?: string | null;
  note?: string;
  active: boolean;
  vigencias: Vigencia[];
  status: EntryStatus;
  realizedAmount?: number | null;
  // For variable incomes: the specific month this income belongs to
  competenceMonth?: string; // YYYY-MM
  // Legacy fields kept for migration
  amount?: number;
  startDate?: string;
  endDate?: string | null;
  recurrence?: Recurrence;
  overrides?: Record<string, number>;
}

export interface IncomeReceipt {
  id: string;
  incomeId: string;
  monthKey: string;
  date: string; // YYYY-MM-DD
  accountId: string;
  expectedAmount: number;
  receivedAmount: number;
  transactionId: string;
  createdAt: string;
}

export interface ExpensePayment {
  id: string;
  expenseId: string;
  monthKey: string;
  date: string; // YYYY-MM-DD
  accountId: string;
  expectedAmount: number;
  paidAmount: number;
  transactionId: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  type: ExpenseType;
  person: Person;
  paymentMethod: PaymentMethod;
  dueDay: number;
  note?: string;
  paid: boolean;
  /** Per-month payment status: key = YYYY-MM, value = true if paid that month */
  paidMonths?: Record<string, boolean>;
  active: boolean;
  status: EntryStatus;
  realizedAmount?: number | null;
  vigencias: Vigencia[];
  // For one-time expenses: the specific month
  competenceMonth?: string; // YYYY-MM
  // Legacy fields kept for migration
  amount?: number;
  date?: string; // YYYY-MM-DD
  endDate?: string | null;
  recurrence?: Recurrence;
  cardId?: string | null;
}

export interface CardPurchase {
  id: string;
  cardId: string;
  name: string;
  totalAmount: number;
  installments: number;
  purchaseDate: string; // YYYY-MM-DD
  firstInvoiceMonth: string; // YYYY-MM
  category: string;
  note?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  holder: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Debt {
  id: string;
  name: string;
  institution: string;
  balance: number;
  installmentAmount: number;
  installmentsRemaining: number;
  interestRate?: number;
  dueDate: string; // YYYY-MM-DD
  status: DebtStatus;
  person?: Person;
  note?: string;
}

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  incomeOverrides: Record<string, number>;
  description?: string;
}

export interface Settings {
  cardMonthlyLimit: number;
  cardMonthlyLimitVigencias?: Vigencia[];
  reserveTargetMonths: number;
  reserveFloor: number;
  surplusReserve: number;
  surplusNextMonth: number;
  surplusDebt: number;
  surplusFree: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  detail: string;
}

export interface PendingExpense {
  id: string;
  name: string;
  suggestedCategory: string;
  added: boolean;
}

export type BankAccountType =
  | 'Conta Corrente'
  | 'Conta Poupança'
  | 'Conta de Pagamento'
  | 'Conta Salário'
  | 'Conta Digital'
  | 'Conta Investimento'
  | 'Outra';

export interface BankAccount {
  id: string;
  bank: string;
  holder: string;
  balance: number;
  accountType?: BankAccountType | null;
  agency?: string | null;
  accountNumber?: string | null;
  note?: string;
  name?: string;
}

export interface BankBalanceSnapshot {
  id: string;
  accountId: string;
  balance: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
}

export interface CardInvoicePayment {
  id: string;
  cardId: string;
  monthKey: string; // invoice month, YYYY-MM
  date: string; // YYYY-MM-DD
  accountId: string;
  amount: number;
  transactionId: string;
  createdAt: string;
}

export type AccountTransactionKind =
  | 'initial_balance'
  | 'income_receipt'
  | 'expense_payment'
  | 'card_invoice_payment'
  | 'debt_payment'
  | 'transfer_in'
  | 'transfer_out'
  | 'manual_adjustment'
  | 'reversal'
  | 'goal_contribution'
  | 'goal_withdrawal';

export type AccountTransactionRelatedEntityType =
  | 'income'
  | 'expense'
  | 'cardInvoice'
  | 'debt'
  | 'transfer'
  | 'goal';

export interface AccountTransaction {
  id: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  amount: number;
  kind: AccountTransactionKind;
  relatedEntityType?: AccountTransactionRelatedEntityType;
  relatedEntityId?: string;
  relatedMonthKey?: string;
  reversedTransactionId?: string;
  reversalOfTransactionId?: string;
  note?: string;
  createdAt: string;
}

export interface CategoryEntry {
  id: string;
  name: string;
  active: boolean;
  expenseClass: ExpenseClass;
}

export type ExpenseClass = 'essential' | 'lifestyle' | 'financial' | 'other';

export interface CategoryBudget {
  id: string;
  category: string;
  amount: number;
  startMonth: string;
  endMonth: string | null;
}

export interface AppData {
  incomes: Income[];
  expenses: Expense[];
  cards: CreditCard[];
  purchases: CardPurchase[];
  debts: Debt[];
  scenarios: Scenario[];
  settings: Settings;
  history: HistoryEntry[];
  pendingExpenses: PendingExpense[];
  categories: string[];
  categoryEntries: CategoryEntry[];
  bankAccounts: BankAccount[];
  bankBalanceSnapshots: BankBalanceSnapshot[];
  accountTransactions?: AccountTransaction[];
  incomeReceipts?: IncomeReceipt[];
  expensePayments?: ExpensePayment[];
  cardInvoicePayments?: CardInvoicePayment[];
  people: PersonEntry[];
  incomeTypes: string[];
  categoryBudgets: CategoryBudget[];
  /** Per-card, per-month invoice payment status. Key format: `${cardId}|YYYY-MM`, value: true if paid. */
  cardInvoiceStatus?: Record<string, boolean>;
}
