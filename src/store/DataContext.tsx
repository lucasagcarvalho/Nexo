import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { AccountTransaction, AppData, Income, IncomeReceipt, Expense, ExpensePayment, CreditCard, CardPurchase, Debt, Scenario, Settings, PendingExpense, BankAccount, BankBalanceSnapshot, Vigencia, PersonEntry, CategoryEntry, CategoryBudget } from '@/lib/types';
import { loadLocalData, saveLocalData, loadRemoteData, saveRemoteData, resetData, migrateData } from '@/lib/storage';
import { defaultCategoryClass } from '@/lib/seed';
import { uid, currentMonthKey, addMonths, compareMonths } from '@/lib/format';
import { getActiveVigencia as getFinanceActiveVigencia, invoiceStatusKey, isExpensePaidForMonth as getFinanceExpensePaidForMonth } from '@/lib/projection';
import { calculateAccountLedgerBalance, createExpensePaymentReversalTransaction, createExpensePaymentTransaction, createIncomeReceiptReversalTransaction, createIncomeReceiptTransaction, createManualAdjustmentTransaction, getExpensePaymentForMonth, getIncomeReceiptForMonth } from '@/lib/finance/accountTransactionRules';
import { useAuth } from '@/store/AuthContext';

interface DataContextValue {
  data: AppData;
  loading: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  // Incomes
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, updates: Partial<Income>) => void;
  deleteIncome: (id: string) => void;
  toggleIncome: (id: string) => void;
  duplicateIncome: (id: string) => void;
  receiveIncome: (input: {
    incomeId: string;
    monthKey: string;
    date: string;
    accountId: string;
    expectedAmount: number;
    receivedAmount: number;
  }) => void;
  undoIncomeReceipt: (incomeId: string, monthKey: string, date?: string) => void;
  isIncomeReceivedForMonth: (incomeId: string, monthKey: string) => boolean;
  // Expenses
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  duplicateExpense: (id: string) => void;
  togglePaidMonth: (id: string, monthKey: string) => void;
  payExpense: (input: {
    expenseId: string;
    monthKey: string;
    date: string;
    accountId: string;
    expectedAmount: number;
    paidAmount: number;
  }) => void;
  undoExpensePayment: (expenseId: string, monthKey: string, date?: string) => void;
  isExpensePaidForMonth: (expense: Expense, monthKey: string) => boolean;
  deleteExpenseMonth: (id: string, monthKey: string, scope: 'this-month' | 'future') => void;
  // Cards
  addCard: (card: Omit<CreditCard, 'id'>) => void;
  updateCard: (id: string, updates: Partial<CreditCard>) => void;
  deleteCard: (id: string) => void;
  // Purchases
  addPurchase: (purchase: Omit<CardPurchase, 'id'>) => void;
  updatePurchase: (id: string, updates: Partial<CardPurchase>) => void;
  deletePurchase: (id: string) => void;
  duplicatePurchase: (id: string) => void;
  // Debts
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  // Scenarios
  addScenario: (scenario: Omit<Scenario, 'id'>) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  // Settings
  updateSettings: (updates: Partial<Settings>) => void;
  updateCardMonthlyLimit: (amount: number, monthKey: string, scope: 'this-month' | 'future') => void;
  // Categories
  addCategory: (name: string, expenseClass?: CategoryEntry['expenseClass']) => void;
  updateCategory: (id: string, updates: Partial<CategoryEntry>) => void;
  deleteCategory: (id: string) => void;
  toggleCategory: (id: string) => void;
  addCategoryBudget: (budget: Omit<CategoryBudget, 'id'>) => void;
  updateCategoryBudget: (id: string, updates: Partial<CategoryBudget>) => void;
  deleteCategoryBudget: (id: string) => void;
  // Pending expenses
  markPendingAdded: (id: string) => void;
  addPendingExpense: (name: string, suggestedCategory: string) => void;
  deletePendingExpense: (id: string) => void;
  // History
  addHistory: (action: string, entity: string, detail: string) => void;
  // Bank accounts
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  reconcileBankAccountBalance: (accountId: string, realBalance: number, date: string, note?: string) => void;
  // Bank balance snapshots
  addBalanceSnapshot: (snapshot: Omit<BankBalanceSnapshot, 'id'>) => void;
  // People
  addPerson: (name: string, note?: string) => string;
  updatePerson: (id: string, updates: Partial<PersonEntry>) => void;
  deletePerson: (id: string) => void;
  togglePerson: (id: string) => void;
  // Income types
  addIncomeType: (name: string) => void;
  // Card invoice status
  toggleInvoicePaid: (cardId: string, monthKey: string) => void;
  isInvoicePaid: (cardId: string, monthKey: string) => boolean;
  // Reset
  resetAll: () => void;
  importData: (backup: unknown) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const localStorageUserId = user?.mode === 'remote' ? user.id : undefined;
  const [data, setData] = useState<AppData>(() => loadLocalData(localStorageUserId));
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<AppData>(data);

  latestDataRef.current = data;

  // Load from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user?.mode !== 'remote') {
        setLoading(false);
        return;
      }
      const remote = await loadRemoteData(user.id);
      if (!cancelled) {
        if (remote) {
          setData(remote);
          saveLocalData(remote, user.id);
        } else {
          setData(loadLocalData(user.id));
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Debounced save to Supabase + immediate local cache
  useEffect(() => {
    saveLocalData(data, localStorageUserId);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (user?.mode !== 'remote') return;
      const result = await saveRemoteData(latestDataRef.current, user.id);
      if (!result.success) {
        setSaveError(result.error ?? 'Erro ao salvar dados');
      } else {
        setSaveError(null);
      }
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [data, localStorageUserId, user]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  const addHistory = useCallback((action: string, entity: string, detail: string) => {
    setData((prev) => ({
      ...prev,
      history: [
        { id: uid(), timestamp: new Date().toISOString(), action, entity, detail },
        ...prev.history,
      ].slice(0, 200),
    }));
  }, []);

  const addIncome = useCallback((income: Omit<Income, 'id'>) => {
    const newIncome: Income = { ...income, id: uid() };
    setData((prev) => ({ ...prev, incomes: [...prev.incomes, newIncome] }));
    addHistory('criação', 'receita', `Receita "${income.name}" criada.`);
  }, [addHistory]);

  const updateIncome = useCallback((id: string, updates: Partial<Income>) => {
    setData((prev) => ({
      ...prev,
      incomes: prev.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  }, []);

  const deleteIncome = useCallback((id: string) => {
    const inc = data.incomes.find((i) => i.id === id);
    setData((prev) => ({ ...prev, incomes: prev.incomes.filter((i) => i.id !== id) }));
    if (inc) addHistory('exclusão', 'receita', `Receita "${inc.name}" excluída.`);
  }, [data.incomes, addHistory]);

  const toggleIncome = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      incomes: prev.incomes.map((i) => (i.id === id ? { ...i, active: !i.active } : i)),
    }));
  }, []);

  const duplicateIncome = useCallback((id: string) => {
    const inc = data.incomes.find((i) => i.id === id);
    if (!inc) return;
    const copy: Income = {
      ...inc, id: uid(), name: `${inc.name} (cópia)`,
      vigencias: inc.vigencias.map((v) => ({ ...v, id: uid() })),
    };
    setData((prev) => ({ ...prev, incomes: [...prev.incomes, copy] }));
    addHistory('duplicação', 'receita', `Receita "${inc.name}" duplicada.`);
  }, [data.incomes, addHistory]);

  const receiveIncome = useCallback((input: {
    incomeId: string;
    monthKey: string;
    date: string;
    accountId: string;
    expectedAmount: number;
    receivedAmount: number;
  }) => {
    let incomeName = '';
    let accountName = '';
    let receivedAmount = 0;
    setData((prev) => {
      const income = prev.incomes.find((item) => item.id === input.incomeId);
      const account = prev.bankAccounts.find((item) => item.id === input.accountId);
      if (!income || !account) return prev;
      if ((prev.incomeReceipts ?? []).some((receipt) => receipt.incomeId === input.incomeId && receipt.monthKey === input.monthKey)) {
        return prev;
      }
      const transaction = createIncomeReceiptTransaction(
        input.incomeId,
        input.accountId,
        input.receivedAmount,
        input.date,
        input.monthKey,
        `Recebimento de "${income.name}".`,
      );
      if (!transaction) return prev;

      incomeName = income.name;
      accountName = account.name;
      receivedAmount = transaction.amount;
      const receipt: IncomeReceipt = {
        id: uid(),
        incomeId: input.incomeId,
        monthKey: input.monthKey,
        date: input.date,
        accountId: input.accountId,
        expectedAmount: input.expectedAmount,
        receivedAmount: transaction.amount,
        transactionId: transaction.id,
        createdAt: transaction.createdAt,
      };

      return {
        ...prev,
        incomeReceipts: [...(prev.incomeReceipts ?? []), receipt],
        accountTransactions: [...(prev.accountTransactions ?? []), transaction],
        bankAccounts: prev.bankAccounts.map((item) => (
          item.id === input.accountId ? { ...item, balance: item.balance + transaction.amount } : item
        )),
      };
    });
    if (incomeName) {
      addHistory('recebimento', 'receita', `Receita "${incomeName}" recebida em "${accountName}" no valor de R$ ${receivedAmount.toFixed(2).replace('.', ',')}.`);
    }
  }, [addHistory]);

  const undoIncomeReceipt = useCallback((incomeId: string, monthKey: string, date?: string) => {
    let incomeName = '';
    let accountName = '';
    let reversedAmount = 0;
    setData((prev) => {
      const receipt = getIncomeReceiptForMonth(prev, incomeId, monthKey);
      if (!receipt) return prev;
      const transaction = (prev.accountTransactions ?? []).find((item) => item.id === receipt.transactionId);
      const reversal = createIncomeReceiptReversalTransaction(prev, incomeId, monthKey, date);
      if (!transaction || !reversal) return prev;
      const income = prev.incomes.find((item) => item.id === incomeId);
      const account = prev.bankAccounts.find((item) => item.id === receipt.accountId);

      incomeName = income?.name ?? receipt.incomeId;
      accountName = account?.name ?? receipt.accountId;
      reversedAmount = transaction.amount;

      return {
        ...prev,
        incomeReceipts: (prev.incomeReceipts ?? []).filter((item) => item.id !== receipt.id),
        accountTransactions: [...(prev.accountTransactions ?? []), reversal],
        bankAccounts: prev.bankAccounts.map((item) => (
          item.id === receipt.accountId ? { ...item, balance: item.balance - transaction.amount } : item
        )),
      };
    });
    if (incomeName) {
      addHistory('estorno', 'receita', `Recebimento de "${incomeName}" em "${accountName}" desfeito no valor de R$ ${reversedAmount.toFixed(2).replace('.', ',')}.`);
    }
  }, [addHistory]);

  const isIncomeReceivedForMonth = useCallback((incomeId: string, monthKey: string): boolean => {
    return (data.incomeReceipts ?? []).some((receipt) => receipt.incomeId === incomeId && receipt.monthKey === monthKey);
  }, [data.incomeReceipts]);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...expense, id: uid() };
    setData((prev) => ({ ...prev, expenses: [...prev.expenses, newExpense] }));
    addHistory('criação', 'despesa', `Despesa "${expense.description}" criada.`);
  }, [addHistory]);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    const exp = data.expenses.find((e) => e.id === id);
    setData((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
    if (exp) addHistory('exclusão', 'despesa', `Despesa "${exp.description}" excluída.`);
  }, [data.expenses, addHistory]);

  const duplicateExpense = useCallback((id: string) => {
    const exp = data.expenses.find((e) => e.id === id);
    if (!exp) return;
    const copy: Expense = {
      ...exp, id: uid(), description: `${exp.description} (cópia)`,
      vigencias: exp.vigencias.map((v) => ({ ...v, id: uid() })),
    };
    setData((prev) => ({ ...prev, expenses: [...prev.expenses, copy] }));
    addHistory('duplicação', 'despesa', `Despesa "${exp.description}" duplicada.`);
  }, [data.expenses, addHistory]);

  const togglePaidMonth = useCallback((id: string, monthKey: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => {
        if (e.id !== id) return e;
        const paidMonths = { ...(e.paidMonths ?? {}) };
        paidMonths[monthKey] = !paidMonths[monthKey];
        return { ...e, paidMonths };
      }),
    }));
  }, []);

  const payExpense = useCallback((input: {
    expenseId: string;
    monthKey: string;
    date: string;
    accountId: string;
    expectedAmount: number;
    paidAmount: number;
  }) => {
    let expenseName = '';
    let accountName = '';
    let paidAmount = 0;
    setData((prev) => {
      const expense = prev.expenses.find((item) => item.id === input.expenseId);
      const account = prev.bankAccounts.find((item) => item.id === input.accountId);
      if (!expense || !account) return prev;
      if (getExpensePaymentForMonth(prev, input.expenseId, input.monthKey)) return prev;
      const transaction = createExpensePaymentTransaction(
        input.expenseId,
        input.accountId,
        input.paidAmount,
        input.date,
        input.monthKey,
        `Pagamento de "${expense.description}".`,
      );
      if (!transaction) return prev;

      expenseName = expense.description;
      accountName = account.name;
      paidAmount = Math.abs(transaction.amount);
      const payment: ExpensePayment = {
        id: uid(),
        expenseId: input.expenseId,
        monthKey: input.monthKey,
        date: input.date,
        accountId: input.accountId,
        expectedAmount: input.expectedAmount,
        paidAmount,
        transactionId: transaction.id,
        createdAt: transaction.createdAt,
      };

      return {
        ...prev,
        expenses: prev.expenses.map((item) => {
          if (item.id !== input.expenseId) return item;
          const paidMonths = { ...(item.paidMonths ?? {}), [input.monthKey]: true };
          return {
            ...item,
            paid: item.type === 'Pontual' ? true : item.paid,
            paidMonths,
          };
        }),
        expensePayments: [...(prev.expensePayments ?? []), payment],
        accountTransactions: [...(prev.accountTransactions ?? []), transaction],
        bankAccounts: prev.bankAccounts.map((item) => (
          item.id === input.accountId ? { ...item, balance: item.balance + transaction.amount } : item
        )),
      };
    });
    if (expenseName) {
      addHistory('pagamento', 'despesa', `Despesa "${expenseName}" paga em "${accountName}" no valor de R$ ${paidAmount.toFixed(2).replace('.', ',')}.`);
    }
  }, [addHistory]);

  const undoExpensePayment = useCallback((expenseId: string, monthKey: string, date?: string) => {
    let expenseName = '';
    let accountName = '';
    let reversedAmount = 0;
    setData((prev) => {
      const payment = getExpensePaymentForMonth(prev, expenseId, monthKey);
      if (!payment) return prev;
      const transaction = (prev.accountTransactions ?? []).find((item) => item.id === payment.transactionId);
      const reversal = createExpensePaymentReversalTransaction(prev, expenseId, monthKey, date);
      if (!transaction || !reversal) return prev;
      const expense = prev.expenses.find((item) => item.id === expenseId);
      const account = prev.bankAccounts.find((item) => item.id === payment.accountId);

      expenseName = expense?.description ?? payment.expenseId;
      accountName = account?.name ?? payment.accountId;
      reversedAmount = Math.abs(transaction.amount);

      return {
        ...prev,
        expenses: prev.expenses.map((item) => {
          if (item.id !== expenseId) return item;
          const paidMonths = { ...(item.paidMonths ?? {}) };
          delete paidMonths[monthKey];
          return {
            ...item,
            paid: item.type === 'Pontual' ? false : item.paid,
            paidMonths,
          };
        }),
        expensePayments: (prev.expensePayments ?? []).filter((item) => item.id !== payment.id),
        accountTransactions: [...(prev.accountTransactions ?? []), reversal],
        bankAccounts: prev.bankAccounts.map((item) => (
          item.id === payment.accountId ? { ...item, balance: item.balance - transaction.amount } : item
        )),
      };
    });
    if (expenseName) {
      addHistory('estorno', 'despesa', `Pagamento de "${expenseName}" em "${accountName}" desfeito no valor de R$ ${reversedAmount.toFixed(2).replace('.', ',')}.`);
    }
  }, [addHistory]);

  const isExpensePaidForMonth = useCallback((expense: Expense, monthKey: string): boolean => {
    return getFinanceExpensePaidForMonth(expense, monthKey);
  }, []);

  const deleteExpenseMonth = useCallback((id: string, monthKey: string, scope: 'this-month' | 'future') => {
    setData((prev) => {
      const exp = prev.expenses.find((e) => e.id === id);
      if (!exp) return prev;
      if (scope === 'this-month') {
        // Create a one-month override with amount 0 (effectively hides it for this month)
        const paidMonths = { ...(exp.paidMonths ?? {}) };
        delete paidMonths[monthKey];
        const newVigencias = applyMonthOverride(exp.vigencias, monthKey, 0);
        return {
          ...prev,
          expenses: prev.expenses.map((e) =>
            e.id === id ? { ...e, vigencias: newVigencias, paidMonths } : e
          ),
        };
      } else {
        // future: close all vigencias at the month before
        const prevMonth = addMonths(monthKey, -1);
        const newVigencias = exp.vigencias.map((v) => {
          if (!v.endDate || compareMonths(v.endDate, monthKey) >= 0) {
            if (compareMonths(v.startDate, monthKey) < 0) {
              return { ...v, endDate: prevMonth };
            }
            return null;
          }
          return v;
        }).filter(Boolean) as Vigencia[];
        const hasActive = newVigencias.some((v) => !v.endDate || compareMonths(v.endDate, monthKey) >= 0);
        return {
          ...prev,
          expenses: prev.expenses.map((e) =>
            e.id === id ? { ...e, vigencias: newVigencias, active: hasActive } : e
          ),
        };
      }
    });
  }, []);

  const addCard = useCallback((card: Omit<CreditCard, 'id'>) => {
    const newCard: CreditCard = { ...card, id: uid() };
    setData((prev) => ({ ...prev, cards: [...prev.cards, newCard] }));
    addHistory('criação', 'cartão', `Cartão "${card.name}" criado.`);
  }, [addHistory]);

  const updateCard = useCallback((id: string, updates: Partial<CreditCard>) => {
    setData((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const deleteCard = useCallback((id: string) => {
    const card = data.cards.find((c) => c.id === id);
    setData((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== id),
      purchases: prev.purchases.filter((p) => p.cardId !== id),
    }));
    if (card) addHistory('exclusão', 'cartão', `Cartão "${card.name}" excluído.`);
  }, [data.cards, addHistory]);

  const addPurchase = useCallback((purchase: Omit<CardPurchase, 'id'>) => {
    const newPurchase: CardPurchase = { ...purchase, id: uid() };
    setData((prev) => ({ ...prev, purchases: [...prev.purchases, newPurchase] }));
    addHistory('criação', 'compra', `Compra "${purchase.name}" de R$ ${purchase.totalAmount.toFixed(2).replace('.', ',')} em ${purchase.installments}x criada.`);
  }, [addHistory]);

  const updatePurchase = useCallback((id: string, updates: Partial<CardPurchase>) => {
    setData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  const deletePurchase = useCallback((id: string) => {
    const pur = data.purchases.find((p) => p.id === id);
    setData((prev) => ({ ...prev, purchases: prev.purchases.filter((p) => p.id !== id) }));
    if (pur) addHistory('exclusão', 'compra', `Compra "${pur.name}" excluída.`);
  }, [data.purchases, addHistory]);

  const duplicatePurchase = useCallback((id: string) => {
    const pur = data.purchases.find((p) => p.id === id);
    if (!pur) return;
    const copy: CardPurchase = { ...pur, id: uid(), name: `${pur.name} (cópia)` };
    setData((prev) => ({ ...prev, purchases: [...prev.purchases, copy] }));
    addHistory('duplicação', 'compra', `Compra "${pur.name}" duplicada.`);
  }, [data.purchases, addHistory]);

  const addDebt = useCallback((debt: Omit<Debt, 'id'>) => {
    const newDebt: Debt = { ...debt, id: uid() };
    setData((prev) => ({ ...prev, debts: [...prev.debts, newDebt] }));
    addHistory('criação', 'dívida', `Dívida "${debt.name}" criada.`);
  }, [addHistory]);

  const updateDebt = useCallback((id: string, updates: Partial<Debt>) => {
    setData((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
  }, []);

  const deleteDebt = useCallback((id: string) => {
    const debt = data.debts.find((d) => d.id === id);
    setData((prev) => ({ ...prev, debts: prev.debts.filter((d) => d.id !== id) }));
    if (debt) addHistory('exclusão', 'dívida', `Dívida "${debt.name}" excluída.`);
  }, [data.debts, addHistory]);

  const addScenario = useCallback((scenario: Omit<Scenario, 'id'>) => {
    const newScenario: Scenario = { ...scenario, id: uid() };
    setData((prev) => ({ ...prev, scenarios: [...prev.scenarios, newScenario] }));
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setData((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setData((prev) => ({ ...prev, scenarios: prev.scenarios.filter((s) => s.id !== id) }));
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setData((prev) => {
      const nextSettings = { ...prev.settings, ...updates };
      if (updates.cardMonthlyLimit !== undefined && updates.cardMonthlyLimitVigencias === undefined) {
        const currentVigencias = prev.settings.cardMonthlyLimitVigencias ?? [{
          id: uid(),
          amount: prev.settings.cardMonthlyLimit,
          startDate: currentMonthKey(),
          endDate: null,
        }];
        nextSettings.cardMonthlyLimitVigencias = applyVigenciaChange(
          currentVigencias,
          currentMonthKey(),
          updates.cardMonthlyLimit,
        );
      }
      return { ...prev, settings: nextSettings };
    });
    addHistory('edição', 'configuração', 'Configurações alteradas.');
  }, [addHistory]);

  const addCategory = useCallback((name: string, expenseClass?: CategoryEntry['expenseClass']) => {
    setData((prev) => {
      if (prev.categories.includes(name)) return prev;
      const entry: CategoryEntry = { id: uid(), name, active: true, expenseClass: expenseClass ?? defaultCategoryClass(name) };
      return {
        ...prev,
        categories: [...prev.categories, name],
        categoryEntries: [...prev.categoryEntries, entry],
      };
    });
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<CategoryEntry>) => {
    setData((prev) => {
      const previous = prev.categoryEntries.find((c) => c.id === id);
      const nextEntries = prev.categoryEntries.map((c) => (c.id === id ? { ...c, ...updates } : c));
      const nextName = nextEntries.find((c) => c.id === id)?.name;
      return {
        ...prev,
        categoryEntries: nextEntries,
        categories: nextEntries.map((c) => c.name),
        categoryBudgets: previous && nextName && nextName !== previous.name
          ? prev.categoryBudgets.map((budget) => (
            budget.category === previous.name ? { ...budget, category: nextName } : budget
          ))
          : prev.categoryBudgets,
      };
    });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setData((prev) => {
      const entry = prev.categoryEntries.find((c) => c.id === id);
      if (!entry) return prev;
      return {
        ...prev,
        categoryEntries: prev.categoryEntries.filter((c) => c.id !== id),
        categories: prev.categories.filter((c) => c !== entry.name),
        categoryBudgets: prev.categoryBudgets.filter((budget) => budget.category !== entry.name),
      };
    });
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      categoryEntries: prev.categoryEntries.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    }));
  }, []);

  const addCategoryBudget = useCallback((budget: Omit<CategoryBudget, 'id'>) => {
    const newBudget: CategoryBudget = { ...budget, id: uid() };
    setData((prev) => ({ ...prev, categoryBudgets: [...prev.categoryBudgets, newBudget] }));
    addHistory('criação', 'orçamento', `Orçamento de "${budget.category}" criado.`);
  }, [addHistory]);

  const updateCategoryBudget = useCallback((id: string, updates: Partial<CategoryBudget>) => {
    setData((prev) => ({
      ...prev,
      categoryBudgets: prev.categoryBudgets.map((budget) => (
        budget.id === id ? { ...budget, ...updates } : budget
      )),
    }));
  }, []);

  const deleteCategoryBudget = useCallback((id: string) => {
    const budget = data.categoryBudgets.find((item) => item.id === id);
    setData((prev) => ({
      ...prev,
      categoryBudgets: prev.categoryBudgets.filter((item) => item.id !== id),
    }));
    if (budget) addHistory('exclusão', 'orçamento', `Orçamento de "${budget.category}" excluído.`);
  }, [data.categoryBudgets, addHistory]);

  const markPendingAdded = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      pendingExpenses: prev.pendingExpenses.map((p) => (p.id === id ? { ...p, added: true } : p)),
    }));
  }, []);

  const addPendingExpense = useCallback((name: string, suggestedCategory: string) => {
    const pe: PendingExpense = { id: uid(), name, suggestedCategory, added: false };
    setData((prev) => ({ ...prev, pendingExpenses: [...prev.pendingExpenses, pe] }));
  }, []);

  const deletePendingExpense = useCallback((id: string) => {
    setData((prev) => ({ ...prev, pendingExpenses: prev.pendingExpenses.filter((p) => p.id !== id) }));
  }, []);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
    const newAccount: BankAccount = { ...account, id: uid() };
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const initialTransaction: AccountTransaction = {
      id: `initial-balance-${newAccount.id}`,
      accountId: newAccount.id,
      date,
      monthKey: date.slice(0, 7),
      amount: Number.isFinite(newAccount.balance) ? newAccount.balance : 0,
      kind: 'initial_balance',
      note: 'Saldo inicial informado no cadastro da conta.',
      createdAt: now.toISOString(),
    };
    setData((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount],
      accountTransactions: [...(prev.accountTransactions ?? []), initialTransaction],
    }));
    addHistory('criação', 'conta', `Conta "${account.name}" criada.`);
  }, [addHistory]);

  const updateBankAccount = useCallback((id: string, updates: Partial<BankAccount>) => {
    setData((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  }, []);

  const deleteBankAccount = useCallback((id: string) => {
    const acc = data.bankAccounts.find((a) => a.id === id);
    setData((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((a) => a.id !== id),
      bankBalanceSnapshots: prev.bankBalanceSnapshots.filter((s) => s.accountId !== id),
      accountTransactions: (prev.accountTransactions ?? []).filter((t) => t.accountId !== id),
      incomeReceipts: (prev.incomeReceipts ?? []).filter((receipt) => receipt.accountId !== id),
      expensePayments: (prev.expensePayments ?? []).filter((payment) => payment.accountId !== id),
    }));
    if (acc) addHistory('exclusão', 'conta', `Conta "${acc.name}" excluída.`);
  }, [data.bankAccounts, addHistory]);

  const reconcileBankAccountBalance = useCallback((accountId: string, realBalance: number, date: string, note?: string) => {
    let accountName = '';
    let adjustmentAmount = 0;
    setData((prev) => {
      const account = prev.bankAccounts.find((item) => item.id === accountId);
      if (!account) return prev;
      accountName = account.name;
      const ledgerBalance = calculateAccountLedgerBalance(prev, accountId, date);
      adjustmentAmount = Math.round((realBalance - ledgerBalance) * 100) / 100;
      const monthKey = date.slice(0, 7);
      const snapshot: BankBalanceSnapshot = {
        id: uid(),
        accountId,
        balance: realBalance,
        date,
        monthKey,
      };
      const adjustment: AccountTransaction | null = createManualAdjustmentTransaction(
        accountId,
        adjustmentAmount,
        date,
        note || `Conciliação de saldo para ${realBalance.toFixed(2)}.`,
      );

      return {
        ...prev,
        bankAccounts: prev.bankAccounts.map((item) => (
          item.id === accountId ? { ...item, balance: realBalance } : item
        )),
        bankBalanceSnapshots: [...prev.bankBalanceSnapshots, snapshot],
        accountTransactions: adjustment
          ? [...(prev.accountTransactions ?? []), adjustment]
          : (prev.accountTransactions ?? []),
      };
    });
    if (accountName) {
      addHistory('conciliação', 'conta', `Conta "${accountName}" conciliada com ajuste de R$ ${adjustmentAmount.toFixed(2).replace('.', ',')}.`);
    }
  }, [addHistory]);

  const addBalanceSnapshot = useCallback((snapshot: Omit<BankBalanceSnapshot, 'id'>) => {
    const newSnapshot: BankBalanceSnapshot = { ...snapshot, id: uid() };
    setData((prev) => ({ ...prev, bankBalanceSnapshots: [...prev.bankBalanceSnapshots, newSnapshot] }));
  }, []);

  const addPerson = useCallback((name: string, note?: string): string => {
    const id = uid();
    const person: PersonEntry = { id, name, note, active: true };
    setData((prev) => ({ ...prev, people: [...prev.people, person] }));
    addHistory('criação', 'pessoa', `Pessoa "${name}" cadastrada.`);
    return id;
  }, [addHistory]);

  const updatePerson = useCallback((id: string, updates: Partial<PersonEntry>) => {
    setData((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  const deletePerson = useCallback((id: string) => {
    const person = data.people.find((p) => p.id === id);
    setData((prev) => ({ ...prev, people: prev.people.filter((p) => p.id !== id) }));
    if (person) addHistory('exclusão', 'pessoa', `Pessoa "${person.name}" excluída.`);
  }, [data.people, addHistory]);

  const togglePerson = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    }));
  }, []);

  const addIncomeType = useCallback((name: string) => {
    setData((prev) => {
      if (prev.incomeTypes.includes(name)) return prev;
      return { ...prev, incomeTypes: [...prev.incomeTypes, name] };
    });
  }, []);

  const updateCardMonthlyLimit = useCallback((amount: number, monthKey: string, scope: 'this-month' | 'future') => {
    setData((prev) => {
      const currentVigencias = prev.settings.cardMonthlyLimitVigencias ?? [{
        id: uid(),
        amount: prev.settings.cardMonthlyLimit,
        startDate: currentMonthKey(),
        endDate: null,
      }];
      const cardMonthlyLimitVigencias = scope === 'this-month'
        ? applyMonthOverride(currentVigencias, monthKey, amount)
        : applyVigenciaChange(currentVigencias, monthKey, amount);

      return {
        ...prev,
        settings: {
          ...prev.settings,
          cardMonthlyLimit: amount,
          cardMonthlyLimitVigencias,
        },
      };
    });
    addHistory('alteração', 'meta de cartão', `Meta de cartão alterada para ${monthKey}.`);
  }, [addHistory]);

  const toggleInvoicePaid = useCallback((cardId: string, monthKey: string) => {
    const key = invoiceStatusKey(cardId, monthKey);
    setData((prev) => {
      const current = prev.cardInvoiceStatus ?? {};
      const next = { ...current };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return { ...prev, cardInvoiceStatus: next };
    });
  }, []);

  const isInvoicePaidCb = useCallback((cardId: string, monthKey: string): boolean => {
    return data.cardInvoiceStatus?.[invoiceStatusKey(cardId, monthKey)] ?? false;
  }, [data.cardInvoiceStatus]);

  const resetAll = useCallback(() => {
    const fresh = resetData(localStorageUserId);
    setData(fresh);
  }, [localStorageUserId]);

  const importData = useCallback((backup: unknown) => {
    const imported = migrateData(backup);
    setData({
      ...imported,
      history: [
        { id: uid(), timestamp: new Date().toISOString(), action: 'importação', entity: 'backup', detail: 'Banco importado por arquivo JSON.' },
        ...imported.history,
      ].slice(0, 200),
    });
  }, []);

  const value: DataContextValue = {
    data,
    loading,
    saveError,
    clearSaveError,
    addIncome, updateIncome, deleteIncome, toggleIncome, duplicateIncome, receiveIncome, undoIncomeReceipt, isIncomeReceivedForMonth,
    addExpense, updateExpense, deleteExpense, duplicateExpense, togglePaidMonth, payExpense, undoExpensePayment, isExpensePaidForMonth, deleteExpenseMonth,
    addCard, updateCard, deleteCard,
    addPurchase, updatePurchase, deletePurchase, duplicatePurchase,
    addDebt, updateDebt, deleteDebt,
    addScenario, updateScenario, deleteScenario,
    updateSettings,
    updateCardMonthlyLimit,
    addCategory, updateCategory, deleteCategory, toggleCategory,
    addCategoryBudget, updateCategoryBudget, deleteCategoryBudget,
    markPendingAdded, addPendingExpense, deletePendingExpense,
    addHistory,
    addBankAccount, updateBankAccount, deleteBankAccount, reconcileBankAccountBalance,
    addBalanceSnapshot,
    addPerson, updatePerson, deletePerson, togglePerson,
    addIncomeType,
    toggleInvoicePaid,
    isInvoicePaid: isInvoicePaidCb,
    resetAll,
    importData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

/**
 * Helper: get the active vigência for a given month, or null if none.
 */
export function getActiveVigencia(vigencias: Vigencia[], monthKey: string): Vigencia | null {
  return getFinanceActiveVigencia(vigencias, monthKey);
}

/**
 * Helper: apply a future change to a recurring item's vigências.
 * Closes the current vigência at the month before the change month,
 * and adds a new vigência starting at the change month.
 */
export function applyVigenciaChange(
  vigencias: Vigencia[],
  changeMonth: string,
  newAmount: number,
  newEndDate: string | null = null,
): Vigencia[] {
  const prevMonth = addMonths(changeMonth, -1);
  const updated: Vigencia[] = vigencias.map((v) => {
    // If this vigência is open-ended or ends after the change month, close it
    if (!v.endDate || compareMonths(v.endDate, changeMonth) >= 0) {
      if (compareMonths(v.startDate, changeMonth) < 0) {
        return { ...v, endDate: prevMonth };
      }
    }
    return v;
  });
  // Add new vigência
  updated.push({
    id: uid(),
    amount: newAmount,
    startDate: changeMonth,
    endDate: newEndDate,
  });
  // Sort by startDate
  return updated.sort((a, b) => compareMonths(a.startDate, b.startDate));
}

/**
 * Helper: apply a single-month override (exception) without changing vigências.
 * Creates a one-month vigência that supersedes others for that month.
 */
export function applyMonthOverride(
  vigencias: Vigencia[],
  overrideMonth: string,
  newAmount: number,
): Vigencia[] {
  // Remove any existing one-month vigência for this month
  const filtered = vigencias.filter(
    (v) => !(v.startDate === overrideMonth && v.endDate === overrideMonth),
  );
  // Add a one-month vigência
  filtered.push({
    id: uid(),
    amount: newAmount,
    startDate: overrideMonth,
    endDate: overrideMonth,
  });
  return filtered.sort((a, b) => compareMonths(a.startDate, b.startDate));
}
