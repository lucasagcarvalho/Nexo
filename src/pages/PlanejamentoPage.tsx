import { useMemo, useState } from 'react';
import { CalendarDays, Check, Clock, Repeat, Calendar, CreditCard, Landmark, TrendingUp } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { getPlanningMonthDetails, projectMonths } from '@/lib/projection';
import { formatCurrency, monthLabel, formatDateBR, formatMonthBR } from '@/lib/format';
import type { Expense } from '@/lib/types';
import { Card, Badge, Button, CurrencyInput, Input, Modal, Select } from '@/components/ui';

export function PlanejamentoPage() {
  const { data, payExpense, undoExpensePayment, isExpensePaidForMonth, isInvoicePaid } = useData();
  const { selectedMonth } = useMonth();
  const [paying, setPaying] = useState<{ expense: Expense; amount: number } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    date: '',
    amount: 0,
    accountId: '',
  });

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const planning = useMemo(() => getPlanningMonthDetails(data, selectedMonth), [data, selectedMonth]);
  const monthData = projection.months[0];
  const cardEntries = planning.cards;
  const accountOptions = useMemo(() => [
    { value: '', label: 'Selecione a conta' },
    ...data.bankAccounts.map((account) => ({
      value: account.id,
      label: `${account.name} · ${account.bank}`,
    })),
  ], [data.bankAccounts]);

  const dateForDueDay = (monthKey: string, dueDay: number): string => {
    const [year, month] = monthKey.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(Math.max(dueDay, 1), lastDay);
    return `${monthKey}-${String(day).padStart(2, '0')}`;
  };

  const openPayment = (expense: Expense, amount: number) => {
    if (isExpensePaidForMonth(expense, selectedMonth)) return;
    setPaying({ expense, amount });
    setPaymentForm({
      date: dateForDueDay(selectedMonth, expense.dueDay),
      amount,
      accountId: data.bankAccounts[0]?.id ?? '',
    });
  };

  const savePayment = () => {
    if (!paying || !paymentForm.accountId || !paymentForm.date || paymentForm.amount <= 0) return;
    payExpense({
      expenseId: paying.expense.id,
      monthKey: selectedMonth,
      date: paymentForm.date,
      accountId: paymentForm.accountId,
      expectedAmount: paying.amount,
      paidAmount: paymentForm.amount,
    });
    setPaying(null);
  };

  const bills = useMemo(() => {
    const list: { id: string; date: string; label: string; amount: number; paid: boolean }[] = [];
    for (const { expense, amount } of planning.expenses) {
      if (amount > 0) {
        list.push({ id: expense.id, date: `${selectedMonth}-${String(expense.dueDay).padStart(2, '0')}`, label: expense.description, amount, paid: isExpensePaidForMonth(expense, selectedMonth) });
      }
    }
    for (const { cardId, amount } of cardEntries) {
      const card = data.cards.find((c) => c.id === cardId);
      if (card) {
        list.push({ id: `card-${cardId}`, date: `${selectedMonth}-${String(card.dueDay).padStart(2, '0')}`, label: `Cartão ${card.name}`, amount, paid: isInvoicePaid(cardId, selectedMonth) });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [planning.expenses, cardEntries, data.cards, selectedMonth, isExpensePaidForMonth, isInvoicePaid]);

  if (!monthData) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planejamento</h1>
        <p className="text-sm text-gray-500">{monthLabel(selectedMonth)}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-gray-400">Receitas</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(monthData.income)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Previsto</p><p className="text-lg font-bold text-rose-600">{formatCurrency(monthData.expectedExpenses)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Realizado</p><p className="text-lg font-bold text-rose-600">{formatCurrency(monthData.realizedExpenses)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Pendente</p><p className="text-lg font-bold text-amber-600">{formatCurrency(monthData.unpaidExpenses)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Saldo do mês</p><p className={`text-lg font-bold ${monthData.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthData.balance)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Saldo acumulado</p><p className={`text-lg font-bold ${monthData.accumulatedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthData.accumulatedBalance)}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Receitas */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Receitas</h3>
          </div>
          <div className="space-y-1.5">
            {planning.incomes.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma receita em {formatMonthBR(selectedMonth)}.</p>
            ) : (
              planning.incomes.map(({ income: inc, amount }) => {
                return (
                  <div key={inc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {inc.kind === 'fixa' ? <Repeat size={12} className="text-blue-400" /> : <Calendar size={12} className="text-amber-400" />}
                      <span className="text-sm text-gray-700">{inc.name}</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-600">{formatCurrency(amount)}</span>
                  </div>
                );
              })
            )}
            <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border-t border-emerald-200 mt-2">
              <span className="text-sm font-semibold text-emerald-700">Total</span>
              <span className="text-sm font-bold text-emerald-700">{formatCurrency(monthData.income)}</span>
            </div>
          </div>
        </Card>

        {/* Cartões */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-700">Cartões</h3>
          </div>
          <div className="space-y-1.5">
            {cardEntries.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma fatura de cartão em {formatMonthBR(selectedMonth)}.</p>
            ) : (
              cardEntries.map(({ cardId, amount }) => {
                const card = data.cards.find((c) => c.id === cardId);
                return (
                  <div key={cardId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card?.color ?? '#888' }} />
                      <span className="text-sm text-gray-700">{card?.name ?? cardId}</span>
                    </div>
                    <span className="text-sm font-medium text-purple-600">{formatCurrency(amount)}</span>
                  </div>
                );
              })
            )}
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg mt-2">
              <span className="text-sm font-semibold text-purple-700">Total cartões</span>
              <span className="text-sm font-bold text-purple-700">{formatCurrency(monthData.cardExpenses)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Despesas Fixas */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Repeat size={16} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Despesas Fixas</h3>
        </div>
        <div className="space-y-1.5">
          {planning.fixedExpenses.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma despesa fixa em {formatMonthBR(selectedMonth)}.</p>
          ) : (
            planning.fixedExpenses.map(({ expense: exp, amount }) => {
              return (
                <div key={exp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <button onClick={() => (isExpensePaidForMonth(exp, selectedMonth) ? undoExpensePayment(exp.id, selectedMonth) : openPayment(exp, amount))} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isExpensePaidForMonth(exp, selectedMonth) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                      {isExpensePaidForMonth(exp, selectedMonth) && <Check size={12} className="text-white" />}
                    </button>
                    <span className="text-sm text-gray-700">{exp.description}</span>
                    <span className="text-xs text-gray-400">{exp.category} · Dia {exp.dueDay}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                </div>
              );
            })
          )}
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg mt-2">
            <span className="text-sm font-semibold text-blue-700">Total fixas</span>
            <span className="text-sm font-bold text-blue-700">{formatCurrency(monthData.fixedExpenses)}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Despesas com Prazo */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-700">Despesas com Prazo</h3>
          </div>
          <div className="space-y-1.5">
            {planning.prazoExpenses.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma despesa com prazo em {formatMonthBR(selectedMonth)}.</p>
            ) : (
              planning.prazoExpenses.map(({ expense: exp, amount }) => {
                return (
                  <div key={exp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <button onClick={() => (isExpensePaidForMonth(exp, selectedMonth) ? undoExpensePayment(exp.id, selectedMonth) : openPayment(exp, amount))} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isExpensePaidForMonth(exp, selectedMonth) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                        {isExpensePaidForMonth(exp, selectedMonth) && <Check size={12} className="text-white" />}
                      </button>
                      <span className="text-sm text-gray-700">{exp.description}</span>
                      <span className="text-xs text-gray-400">{exp.category} · Dia {exp.dueDay}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                );
              })
            )}
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg mt-2">
              <span className="text-sm font-semibold text-purple-700">Total prazo</span>
              <span className="text-sm font-bold text-purple-700">{formatCurrency(monthData.prazoExpenses)}</span>
            </div>
          </div>
        </Card>

        {/* Despesas Pontuais */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Despesas Pontuais</h3>
          </div>
          <div className="space-y-1.5">
            {planning.pontualExpenses.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma despesa pontual em {formatMonthBR(selectedMonth)}.</p>
            ) : (
              planning.pontualExpenses.map(({ expense: exp, amount }) => {
                return (
                  <div key={exp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <button onClick={() => (isExpensePaidForMonth(exp, selectedMonth) ? undoExpensePayment(exp.id, selectedMonth) : openPayment(exp, amount))} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isExpensePaidForMonth(exp, selectedMonth) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                        {isExpensePaidForMonth(exp, selectedMonth) && <Check size={12} className="text-white" />}
                      </button>
                      <span className="text-sm text-gray-700">{exp.description}</span>
                      <span className="text-xs text-gray-400">{exp.category}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                );
              })
            )}
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg mt-2">
              <span className="text-sm font-semibold text-amber-700">Total pontuais</span>
              <span className="text-sm font-bold text-amber-700">{formatCurrency(monthData.variableExpenses)}</span>
            </div>
          </div>
        </Card>

        {/* Dívidas */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={16} className="text-rose-500" />
            <h3 className="text-sm font-semibold text-gray-700">Dívidas</h3>
          </div>
          <div className="space-y-1.5">
            {planning.debts.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma dívida ativa.</p>
            ) : (
              planning.debts.map(({ debt, amount }) => (
                <div key={debt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-700">{debt.name}</span>
                    <p className="text-xs text-gray-400">{debt.installmentsRemaining}x restantes</p>
                  </div>
                  <span className="text-sm font-medium text-rose-600">{formatCurrency(amount)}</span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between p-2 bg-rose-50 rounded-lg mt-2">
              <span className="text-sm font-semibold text-rose-700">Total dívidas</span>
              <span className="text-sm font-bold text-rose-700">{formatCurrency(monthData.debtExpenses)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Resultado */}
      <Card className="p-4 bg-gradient-to-r from-gray-50 to-blue-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Resultado do Mês</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Receitas</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(monthData.income)}</p></div>
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Previsto</p><p className="text-lg font-bold text-rose-600">{formatCurrency(monthData.expectedExpenses)}</p></div>
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Realizado</p><p className="text-lg font-bold text-rose-600">{formatCurrency(monthData.realizedExpenses)}</p></div>
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Pago</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(monthData.paidExpenses)}</p></div>
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Pendente</p><p className="text-lg font-bold text-amber-600">{formatCurrency(monthData.unpaidExpenses)}</p></div>
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Variação</p><p className={`text-lg font-bold ${monthData.expenseVariance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthData.expenseVariance)}</p></div>
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Saldo</p><p className={`text-lg font-bold ${monthData.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthData.balance)}</p></div>
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Acumulado</p><p className={`text-lg font-bold ${monthData.accumulatedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthData.accumulatedBalance)}</p></div>
        </div>
      </Card>

      {/* Próximos vencimentos */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={18} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Vencimentos de {formatMonthBR(selectedMonth)}</h3>
        </div>
        <div className="space-y-1.5">
          {bills.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum vencimento.</p>
          ) : (
            bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-16">{formatDateBR(bill.date)}</span>
                  <span className="text-sm text-gray-700">{bill.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(bill.amount)}</span>
                  {bill.paid ? (
                    <Badge color="green"><Check size={10} className="inline" /> Pago</Badge>
                  ) : (
                    <Badge color="yellow"><Clock size={10} className="inline" /> Pendente</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={paying !== null} onClose={() => setPaying(null)} title="Registrar pagamento" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPaying(null)}>Cancelar</Button>
          <Button onClick={savePayment} disabled={!paymentForm.accountId || !paymentForm.date || paymentForm.amount <= 0}>
            Pagar
          </Button>
        </div>
      }>
        {paying && (
          <form onSubmit={(e) => { e.preventDefault(); savePayment(); }} className="space-y-3">
            <div className="p-3 bg-rose-50 rounded-lg">
              <p className="text-sm font-semibold text-rose-700">{paying.expense.description}</p>
              <p className="text-xs text-gray-500">Previsto: {formatCurrency(paying.amount)} · Dia {paying.expense.dueDay}</p>
            </div>
            <Input label="Data paga" type="date" value={paymentForm.date} onChange={(v) => setPaymentForm({ ...paymentForm, date: v })} required />
            <CurrencyInput label="Valor pago" value={paymentForm.amount} onChange={(v) => setPaymentForm({ ...paymentForm, amount: v })} required />
            <Select label="Conta" value={paymentForm.accountId} onChange={(v) => setPaymentForm({ ...paymentForm, accountId: v })} options={accountOptions} required />
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        )}
      </Modal>
    </div>
  );
}
