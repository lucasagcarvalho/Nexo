import { useMemo } from 'react';
import { CalendarDays, Check, Clock, Repeat, Calendar, CreditCard, Landmark, TrendingUp } from 'lucide-react';
import { useData, getActiveVigencia } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { projectMonths } from '@/lib/projection';
import { formatCurrency, monthLabel, formatDateBR, formatMonthBR } from '@/lib/format';
import { Card, Badge, ProgressBar } from '@/components/ui';

export function PlanejamentoPage() {
  const { data, togglePaidMonth, isExpensePaidForMonth } = useData();
  const { selectedMonth } = useMonth();

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const monthData = projection.months[0];

  if (!monthData) return null;

  // Filter incomes and expenses for the selected month
  const monthIncomes = data.incomes.filter((inc) => {
    if (!inc.active) return false;
    if (inc.kind === 'variavel') return inc.competenceMonth === selectedMonth;
    return getActiveVigencia(inc.vigencias, selectedMonth) !== null;
  });

  const monthExpenses = data.expenses.filter((exp) => {
    if (exp.type === 'Fixo') return getActiveVigencia(exp.vigencias, selectedMonth) !== null;
    return exp.competenceMonth === selectedMonth;
  });

  const fixedExpenses = monthExpenses.filter((e) => e.type === 'Fixo');
  const pontualExpenses = monthExpenses.filter((e) => e.type !== 'Fixo');

  const cardEntries = Object.entries(monthData.cardByCard).filter(([, v]) => v > 0);
  const activeDebts = data.debts.filter((d) => d.status !== 'Quitada' && d.installmentsRemaining > 0);

  const bills = useMemo(() => {
    const list: { id: string; date: string; label: string; amount: number; paid: boolean }[] = [];
    for (const exp of monthExpenses) {
      const vig = getActiveVigencia(exp.vigencias, selectedMonth);
      const amount = vig?.amount ?? 0;
      if (amount > 0) {
        list.push({ id: exp.id, date: `${selectedMonth}-${String(exp.dueDay).padStart(2, '0')}`, label: exp.description, amount, paid: isExpensePaidForMonth(exp, selectedMonth) });
      }
    }
    for (const [cardId, amt] of cardEntries) {
      const card = data.cards.find((c) => c.id === cardId);
      if (card) {
        list.push({ id: `card-${cardId}`, date: `${selectedMonth}-${String(card.dueDay).padStart(2, '0')}`, label: `Cartão ${card.name}`, amount: amt, paid: false });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [monthExpenses, cardEntries, data.cards, selectedMonth]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planejamento</h1>
        <p className="text-sm text-gray-500">{monthLabel(selectedMonth)}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-gray-400">Receitas</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(monthData.income)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Despesas</p><p className="text-lg font-bold text-rose-600">{formatCurrency(monthData.totalExpenses)}</p></Card>
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
            {monthIncomes.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma receita em {formatMonthBR(selectedMonth)}.</p>
            ) : (
              monthIncomes.map((inc) => {
                const vig = getActiveVigencia(inc.vigencias, selectedMonth);
                const amount = vig?.amount ?? 0;
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
              cardEntries.map(([cardId, amt]) => {
                const card = data.cards.find((c) => c.id === cardId);
                return (
                  <div key={cardId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card?.color ?? '#888' }} />
                      <span className="text-sm text-gray-700">{card?.name ?? cardId}</span>
                    </div>
                    <span className="text-sm font-medium text-purple-600">{formatCurrency(amt)}</span>
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
          {fixedExpenses.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma despesa fixa em {formatMonthBR(selectedMonth)}.</p>
          ) : (
            fixedExpenses.map((exp) => {
              const vig = getActiveVigencia(exp.vigencias, selectedMonth);
              const amount = vig?.amount ?? 0;
              return (
                <div key={exp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <button onClick={() => togglePaidMonth(exp.id, selectedMonth)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isExpensePaidForMonth(exp, selectedMonth) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
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
        {/* Despesas Pontuais */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Despesas Pontuais</h3>
          </div>
          <div className="space-y-1.5">
            {pontualExpenses.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma despesa pontual em {formatMonthBR(selectedMonth)}.</p>
            ) : (
              pontualExpenses.map((exp) => {
                const vig = getActiveVigencia(exp.vigencias, selectedMonth);
                const amount = vig?.amount ?? 0;
                return (
                  <div key={exp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePaidMonth(exp.id, selectedMonth)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isExpensePaidForMonth(exp, selectedMonth) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
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
            {activeDebts.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma dívida ativa.</p>
            ) : (
              activeDebts.map((debt) => (
                <div key={debt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-700">{debt.name}</span>
                    <p className="text-xs text-gray-400">{debt.installmentsRemaining}x restantes</p>
                  </div>
                  <span className="text-sm font-medium text-rose-600">{formatCurrency(debt.installmentAmount)}</span>
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
          <div className="p-3 bg-white rounded-lg"><p className="text-xs text-gray-400">Despesas</p><p className="text-lg font-bold text-rose-600">{formatCurrency(monthData.totalExpenses)}</p></div>
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
    </div>
  );
}
