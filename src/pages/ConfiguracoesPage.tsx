import { useEffect, useState, useMemo } from 'react';
import { Settings as SettingsIcon, PiggyBank, History, FlaskConical, Layers, Trash2, Plus, AlertTriangle, CheckCircle2, Users, Edit2, Power, Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { getCategoryBudgetUsages, getDataQualityIssues, projectMonths, simulatePurchase, type MonthProjection } from '@/lib/projection';
import { compareMonths, formatCurrency, monthShort, formatMonthBR } from '@/lib/format';
import { Card, Badge, Button, Input, Select, ConfirmDialog, ProgressBar, IconButton, Modal, EmptyState, MonthPicker, CurrencyInput } from '@/components/ui';
import type { Scenario, ScenarioType, CategoryEntry, CategoryBudget, ExpenseClass } from '@/lib/types';
import { PessoasTab } from '@/pages/PessoasTab';

type Tab = 'configuracoes' | 'reserva' | 'cenarios' | 'simulador' | 'historico' | 'pendentes' | 'pessoas' | 'categorias';

export function ConfiguracoesPage() {
  const { data, updateSettings, addScenario, deleteScenario, markPendingAdded, addPendingExpense, deletePendingExpense, resetAll, addPerson, updatePerson, deletePerson, togglePerson, addCategory, updateCategory, deleteCategory, toggleCategory, addCategoryBudget, updateCategoryBudget, deleteCategoryBudget } = useData();
  const [tab, setTab] = useState<Tab>('configuracoes');
  const [confirmReset, setConfirmReset] = useState(false);

  const { selectedMonth } = useMonth();
  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const current = projection.months[0];

  const tabs: { id: Tab; label: string; icon: typeof SettingsIcon }[] = [
    { id: 'configuracoes', label: 'Configurações', icon: SettingsIcon },
    { id: 'reserva', label: 'Reserva', icon: PiggyBank },
    { id: 'cenarios', label: 'Cenários', icon: Layers },
    { id: 'simulador', label: 'Simulador', icon: FlaskConical },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'pendentes', label: 'Pendências', icon: AlertTriangle },
    { id: 'pessoas', label: 'Pessoas', icon: Users },
    { id: 'categorias', label: 'Categorias', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Ajustes, cenários, simulações e histórico</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'configuracoes' && <ConfigTab settings={data.settings} updateSettings={updateSettings} onReset={() => setConfirmReset(true)} />}
      {tab === 'reserva' && <ReservaTab data={data} current={current} />}
      {tab === 'cenarios' && <CenariosTab data={data} selectedMonth={selectedMonth} addScenario={addScenario} deleteScenario={deleteScenario} />}
      {tab === 'simulador' && <SimuladorTab data={data} />}
      {tab === 'historico' && <HistoricoTab data={data} />}
      {tab === 'pendentes' && <PendentesTab data={data} markPendingAdded={markPendingAdded} addPendingExpense={addPendingExpense} deletePendingExpense={deletePendingExpense} />}
      {tab === 'pessoas' && <PessoasTab people={data.people} addPerson={addPerson} updatePerson={updatePerson} deletePerson={deletePerson} togglePerson={togglePerson} />}
      {tab === 'categorias' && <CategoriasTab data={data} selectedMonth={selectedMonth} addCategory={addCategory} updateCategory={updateCategory} deleteCategory={deleteCategory} toggleCategory={toggleCategory} addCategoryBudget={addCategoryBudget} updateCategoryBudget={updateCategoryBudget} deleteCategoryBudget={deleteCategoryBudget} />}

      <ConfirmDialog
        open={confirmReset}
        title="Resetar todos os dados"
        message="Isso irá apagar todos os dados cadastrados (receitas, despesas, cartões, compras, dívidas e configurações). Tem certeza?"
        onConfirm={() => { resetAll(); setConfirmReset(false); }}
        onCancel={() => setConfirmReset(false)}
        confirmText="Resetar tudo"
      />
    </div>
  );
}

function ConfigTab({ settings, updateSettings, onReset }: { settings: ReturnType<typeof useData>['data']['settings']; updateSettings: (u: Partial<typeof settings>) => void; onReset: () => void }) {
  const [local, setLocal] = useState(settings);

  const save = () => {
    updateSettings(local);
  };

  const total = local.surplusReserve + local.surplusNextMonth + local.surplusDebt + local.surplusFree;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Meta de Cartão</h3>
        <Input
          label="Limite mensal desejado para cartões (R$)"
          type="number"
          step="0.01"
          value={local.cardMonthlyLimit}
          onChange={(v) => setLocal({ ...local, cardMonthlyLimit: parseFloat(v) || 0 })}
        />
        <p className="text-xs text-gray-400 mt-1">Este valor representa o total das faturas, não apenas novas compras.</p>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Reserva Financeira</h3>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Meta de meses de despesas"
            value={String(local.reserveTargetMonths)}
            onChange={(v) => setLocal({ ...local, reserveTargetMonths: parseInt(v) })}
            options={[{ value: '1', label: '1 mês' }, { value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }]}
          />
          <Input
            label="Valor mínimo protegido (R$)"
            type="number"
            step="0.01"
            value={local.reserveFloor}
            onChange={(v) => setLocal({ ...local, reserveFloor: parseFloat(v) || 0 })}
          />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Destinação da Sobra</h3>
        <p className="text-xs text-gray-400 mb-3">Defina como o saldo positivo de cada mês deve ser distribuído.</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Reserva (%)" type="number" value={local.surplusReserve} onChange={(v) => setLocal({ ...local, surplusReserve: parseFloat(v) || 0 })} />
          <Input label="Próximo mês (%)" type="number" value={local.surplusNextMonth} onChange={(v) => setLocal({ ...local, surplusNextMonth: parseFloat(v) || 0 })} />
          <Input label="Antecipação de dívida (%)" type="number" value={local.surplusDebt} onChange={(v) => setLocal({ ...local, surplusDebt: parseFloat(v) || 0 })} />
          <Input label="Uso livre (%)" type="number" value={local.surplusFree} onChange={(v) => setLocal({ ...local, surplusFree: parseFloat(v) || 0 })} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-500">Total:</span>
          <Badge color={total === 100 ? 'green' : 'red'}>{total}%</Badge>
          {total !== 100 && <span className="text-xs text-rose-500">A soma deve ser 100%</span>}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="danger" onClick={onReset}>Resetar todos os dados</Button>
        <Button onClick={save} disabled={total !== 100}>Salvar configurações</Button>
      </div>
    </div>
  );
}

function ReservaTab({ data, current }: { data: ReturnType<typeof useData>['data']; current: ReturnType<typeof projectMonths>['months'][0] }) {
  const reserve = Math.max(0, current.accumulatedBalance);
  const monthlyExpenses = current.essentialExpenses;
  const targetMonths = data.settings.reserveTargetMonths;
  const target = monthlyExpenses * targetMonths;
  const monthsCovered = monthlyExpenses > 0 ? reserve / monthlyExpenses : 0;
  const pct = target > 0 ? Math.min(100, (reserve / target) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-gray-400">Reserva atual</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(reserve)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Reserva desejada</p><p className="text-lg font-bold text-blue-600">{formatCurrency(target)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Meses essenciais</p><p className="text-lg font-bold text-gray-900">{monthsCovered.toFixed(1)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Valor protegido</p><p className="text-lg font-bold text-gray-900">{formatCurrency(data.settings.reserveFloor)}</p></Card>
      </div>

      <Card className="p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Progresso da reserva</span>
          <span className="text-gray-700 font-medium">{pct.toFixed(0)}%</span>
        </div>
        <ProgressBar value={reserve} max={target} color={pct >= 100 ? 'green' : 'blue'} />
        <p className="text-xs text-gray-400 mt-2">
          {pct >= 100 ? 'Meta de reserva atingida!' : `Faltam ${formatCurrency(Math.max(0, target - reserve))} para cobrir ${targetMonths} meses de gastos essenciais.`}
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Etapas da Reserva</h3>
        <div className="space-y-2">
          {[
            { label: '1 mês de despesas', target: monthlyExpenses * 1, done: reserve >= monthlyExpenses * 1 },
            { label: '3 meses de despesas', target: monthlyExpenses * 3, done: reserve >= monthlyExpenses * 3 },
            { label: '6 meses de despesas', target: monthlyExpenses * 6, done: reserve >= monthlyExpenses * 6 },
          ].map((step) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${step.done ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                {step.done && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <span className={`text-sm ${step.done ? 'text-gray-700' : 'text-gray-400'}`}>{step.label}</span>
              <span className="text-xs text-gray-400 ml-auto">{formatCurrency(step.target)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CenariosTab({ data, selectedMonth, addScenario, deleteScenario }: { data: ReturnType<typeof useData>['data']; selectedMonth: string; addScenario: (s: Omit<Scenario, 'id'>) => void; deleteScenario: (id: string) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ScenarioType>('Atual');
  const [selectedIncomeId, setSelectedIncomeId] = useState(data.incomes[0]?.id ?? '');
  const [incomeOverride, setIncomeOverride] = useState('');

  const projection = useMemo(() => projectMonths(data, 12, selectedMonth), [data, selectedMonth]);
  const incomeOptions = data.incomes.map((income) => ({ value: income.id, label: income.name }));
  useEffect(() => {
    if (!selectedIncomeId && data.incomes[0]) {
      setSelectedIncomeId(data.incomes[0].id);
    }
  }, [data.incomes, selectedIncomeId]);
  const scenarioDataFor = (incomeOverrides: Record<string, number>) => ({
    ...data,
    incomes: data.incomes.map((income) => ({
      ...income,
      vigencias: income.vigencias.map((vigencia) => ({
        ...vigencia,
        amount: incomeOverrides[income.id] ?? vigencia.amount,
      })),
    })),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Criar Cenário</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Nome" value={name} onChange={setName} placeholder="Ex: Otimista Janeiro" />
          <Select label="Tipo" value={type} onChange={(v) => setType(v as ScenarioType)} options={[{ value: 'Conservador', label: 'Conservador' }, { value: 'Atual', label: 'Atual' }, { value: 'Otimista', label: 'Otimista' }]} />
          <Select label="Receita" value={selectedIncomeId} onChange={setSelectedIncomeId} options={incomeOptions} />
          <Input label="Novo valor (R$)" type="number" value={incomeOverride} onChange={setIncomeOverride} placeholder="Ex: 11000" />
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={() => {
            if (!name || !selectedIncomeId || !incomeOverride) return;
            const overrides: Record<string, number> = {};
            overrides[selectedIncomeId] = parseFloat(incomeOverride);
            addScenario({ name, type, incomeOverrides: overrides, description: '' });
            setName('');
            setIncomeOverride('');
          }} disabled={!name || !selectedIncomeId || !incomeOverride}><Plus size={14} className="inline mr-1" /> Adicionar cenário</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.scenarios.map((sc) => {
          const scenarioData = scenarioDataFor(sc.incomeOverrides);
          const scenarioProj = projectMonths(scenarioData, 12, selectedMonth);
          const totalIncome = scenarioProj.months.reduce((s, m) => s + m.income, 0);
          const totalBalance = scenarioProj.months.reduce((s, m) => s + m.balance, 0);
          const overrideEntries = Object.entries(sc.incomeOverrides);
          return (
            <Card key={sc.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{sc.name}</h4>
                  <Badge color={sc.type === 'Otimista' ? 'green' : sc.type === 'Conservador' ? 'yellow' : 'blue'}>{sc.type}</Badge>
                </div>
                <IconButton icon={<Trash2 size={14} />} label="Excluir cenário" variant="danger" onClick={() => deleteScenario(sc.id)} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Receita 12m</span><span className="font-medium text-emerald-600">{formatCurrency(totalIncome)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Saldo 12m</span><span className={`font-medium ${totalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(totalBalance)}</span></div>
              </div>
              {overrideEntries.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  {overrideEntries.map(([incomeId, value]) => {
                    const income = data.incomes.find((item) => item.id === incomeId);
                    return (
                      <div key={incomeId} className="flex justify-between gap-2 text-xs">
                        <span className={income ? 'text-gray-500' : 'text-amber-600'}>{income?.name ?? 'Receita removida'}</span>
                        <span className="font-medium text-gray-700">{formatCurrency(value)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Comparison chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparação de Cenários · Saldo Mensal</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={projection.months.slice(0, 12).map((m, i) => {
            const row: Record<string, string | number> = { month: monthShort(m.monthKey) };
            for (const sc of data.scenarios) {
              const scenarioData = scenarioDataFor(sc.incomeOverrides);
              const sp = projectMonths(scenarioData, 12, selectedMonth);
              row[sc.name] = Math.round(sp.months[i]?.balance ?? 0);
            }
            return row;
          })}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
            <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            {data.scenarios.map((sc, i) => (
              <Bar key={sc.id} dataKey={sc.name} fill={['#3B82F6', '#10B981', '#F59E0B'][i % 3]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function SimuladorTab({ data }: { data: ReturnType<typeof useData>['data'] }) {
  const [simType, setSimType] = useState('compra');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [cardId, setCardId] = useState(data.cards[0]?.id ?? '');
  const [incomeId, setIncomeId] = useState(data.incomes[0]?.id ?? '');
  const [incomeMode, setIncomeMode] = useState<'valor' | 'percentual'>('valor');
  const [incomeDirection, setIncomeDirection] = useState<'aumento' | 'reducao'>('aumento');
  const [category, setCategory] = useState(data.categories[0] ?? 'Outros');
  const [categoryPercent, setCategoryPercent] = useState('15');
  const [debtId, setDebtId] = useState(data.debts.find((debt) => debt.status !== 'Quitada')?.id ?? '');
  const [debtPayoffMonth, setDebtPayoffMonth] = useState('');
  const { selectedMonth } = useMonth();

  type SimulationResult = {
    before: MonthProjection[];
    after: MonthProjection[];
    negativeMonths: { monthKey: string; before: number; after: number }[];
  };

  const result = useMemo<SimulationResult | null>(() => {
    const amt = parseFloat(amount);
    const inst = parseInt(installments) || 1;
    const before = projectMonths(data, 12, selectedMonth).months;

    if (simType === 'compra') {
      if (!cardId || !amt || amt <= 0) return null;
      return simulatePurchase(data, cardId, amt, inst, `${selectedMonth}-01`, selectedMonth);
    }
    if (simType === 'renda') {
      if (!incomeId || !amt || amt <= 0) return null;
      const direction = incomeDirection === 'aumento' ? 1 : -1;
      const simData = {
        ...data,
        incomes: data.incomes.map((income) => {
          if (income.id !== incomeId) return income;
          return {
            ...income,
            vigencias: income.vigencias.map((vigencia) => ({
              ...vigencia,
              amount: Math.max(0, incomeMode === 'percentual'
                ? vigencia.amount * (1 + direction * amt / 100)
                : vigencia.amount + direction * amt),
            })),
          };
        }),
      };
      const after = projectMonths(simData, 12, selectedMonth).months;
      return { before, after, negativeMonths: negativeMonthsBetween(before, after) };
    }
    if (simType === 'categoria') {
      const percent = Math.min(100, Math.max(0, parseFloat(categoryPercent) || 0));
      if (!category || percent <= 0) return null;
      const factor = 1 - percent / 100;
      const simData = {
        ...data,
        expenses: data.expenses.map((expense) => (
          expense.category === category
            ? { ...expense, vigencias: expense.vigencias.map((vigencia) => ({ ...vigencia, amount: Math.max(0, vigencia.amount * factor) })) }
            : expense
        )),
        purchases: data.purchases.map((purchase) => (
          purchase.category === category
            ? { ...purchase, totalAmount: Math.max(0, purchase.totalAmount * factor) }
            : purchase
        )),
      };
      const after = projectMonths(simData, 12, selectedMonth).months;
      return { before, after, negativeMonths: negativeMonthsBetween(before, after) };
    }
    if (simType === 'quitacao') {
      if (!debtId) return null;
      const payoffMonth = debtPayoffMonth || selectedMonth;
      const simData = {
        ...data,
        debts: data.debts.map((debt) => {
          if (debt.id !== debtId) return debt;
          if (compareMonths(payoffMonth, selectedMonth) <= 0) {
            return { ...debt, balance: 0, installmentAmount: 0, installmentsRemaining: 0, status: 'Quitada' as const };
          }
          const firstMonth = debt.dueDate.slice(0, 7);
          const monthsToPayBeforeQuit = Math.max(0, compareMonths(payoffMonth, firstMonth));
          return { ...debt, installmentsRemaining: Math.min(debt.installmentsRemaining, monthsToPayBeforeQuit) };
        }),
      };
      const after = projectMonths(simData, 12, selectedMonth).months;
      return { before, after, negativeMonths: negativeMonthsBetween(before, after) };
    }
    return null;
  }, [simType, amount, installments, cardId, incomeDirection, incomeId, incomeMode, category, categoryPercent, debtId, debtPayoffMonth, data, selectedMonth]);

  const chartData = result ? result.before.map((m, i) => ({
    month: monthShort(m.monthKey),
    Antes: Math.round(m.balance),
    Depois: Math.round(result.after[i]?.balance ?? 0),
    Diferença: Math.round((result.after[i]?.balance ?? 0) - m.balance),
  })) : [];
  const totalBefore = result?.before.reduce((s, m) => s + m.balance, 0) ?? 0;
  const totalAfter = result?.after.reduce((s, m) => s + m.balance, 0) ?? 0;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Simular Decisão</h3>
        <p className="text-xs text-gray-400 mb-3">Teste o impacto de uma decisão sem alterar seus dados reais.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Tipo de simulação" value={simType} onChange={setSimType} options={[
            { value: 'compra', label: 'Nova compra parcelada' },
            { value: 'renda', label: 'Alterar renda' },
            { value: 'categoria', label: 'Reduzir categoria' },
            { value: 'quitacao', label: 'Quitar dívida' },
          ]} />
          {(simType === 'compra' || simType === 'renda') && (
            <Input label={simType === 'renda' && incomeMode === 'percentual' ? 'Percentual (%)' : 'Valor (R$)'} type="number" step="0.01" value={amount} onChange={setAmount} />
          )}
          {simType === 'compra' && (
            <>
              <Select label="Cartão" value={cardId} onChange={setCardId} options={data.cards.map((c) => ({ value: c.id, label: c.name }))} />
              <Input label="Parcelas" type="number" value={installments} onChange={setInstallments} />
            </>
          )}
          {simType === 'renda' && (
            <>
              <Select label="Receita" value={incomeId} onChange={setIncomeId} options={data.incomes.map((income) => ({ value: income.id, label: income.name }))} />
              <Select label="Direção" value={incomeDirection} onChange={(value) => setIncomeDirection(value as 'aumento' | 'reducao')} options={[
                { value: 'aumento', label: 'Aumentar' },
                { value: 'reducao', label: 'Reduzir' },
              ]} />
              <Select label="Tipo de ajuste" value={incomeMode} onChange={(value) => setIncomeMode(value as 'valor' | 'percentual')} options={[
                { value: 'valor', label: 'Valor fixo' },
                { value: 'percentual', label: 'Percentual' },
              ]} />
            </>
          )}
          {simType === 'categoria' && (
            <>
              <Select label="Categoria" value={category} onChange={setCategory} options={data.categories.map((item) => ({ value: item, label: item }))} />
              <Input label="Redução (%)" type="number" step="0.01" value={categoryPercent} onChange={setCategoryPercent} />
            </>
          )}
          {simType === 'quitacao' && (
            <>
              <Select label="Dívida" value={debtId} onChange={setDebtId} options={data.debts.filter((debt) => debt.status !== 'Quitada').map((debt) => ({ value: debt.id, label: debt.name }))} />
              <Input label="Quitar a partir de (AAAA-MM)" value={debtPayoffMonth || selectedMonth} onChange={setDebtPayoffMonth} />
            </>
          )}
        </div>
      </Card>

      {result && (
        <>
          {result.negativeMonths.length > 0 && (
            <Card className="p-4 bg-rose-50 border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-rose-500" />
                <h3 className="text-sm font-semibold text-rose-700">Meses que ficarão negativos</h3>
              </div>
              {result.negativeMonths.map((nm) => (
                <p key={nm.monthKey} className="text-sm text-rose-600">
                  {monthShort(nm.monthKey)}: {formatCurrency(nm.after)}
                </p>
              ))}
            </Card>
          )}

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Impacto no Saldo · 12 meses</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="Antes" fill="#D1D5DB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Depois" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Diferença" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <p className="text-xs text-gray-400">Saldo total (12m) - Antes</p>
              <p className="text-lg font-bold text-gray-700">{formatCurrency(totalBefore)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-gray-400">Saldo total (12m) - Depois</p>
              <p className={`text-lg font-bold ${totalAfter >= totalBefore ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(totalAfter)}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Diferença por mês</h3>
            <div className="space-y-1">
              {result.before.map((month, index) => {
                const after = result.after[index];
                const diff = (after?.balance ?? 0) - month.balance;
                return (
                  <div key={month.monthKey} className="grid grid-cols-4 gap-2 rounded-lg bg-gray-50 p-2 text-xs">
                    <span className="font-medium text-gray-700">{formatMonthBR(month.monthKey)}</span>
                    <span className="text-right text-gray-500">Base: {formatCurrency(month.balance)}</span>
                    <span className="text-right text-gray-500">Cenário: {formatCurrency(after?.balance ?? 0)}</span>
                    <span className={`text-right font-semibold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-center">
            <p className="text-xs text-gray-400">Esta é apenas uma simulação. Seus dados reais não foram alterados.</p>
          </div>
        </>
      )}
    </div>
  );
}

function negativeMonthsBetween(before: MonthProjection[], after: MonthProjection[]) {
  return after
    .filter((month, index) => month.balance < 0 && before[index]?.balance >= 0)
    .map((month, index) => ({ monthKey: month.monthKey, before: before[index]?.balance ?? 0, after: month.balance }));
}

function HistoricoTab({ data }: { data: ReturnType<typeof useData>['data'] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <History size={18} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-700">Histórico de Alterações</h3>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.history.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum histórico.</p>
        ) : (
          data.history.map((h) => (
            <div key={h.id} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
              <Badge color={h.action === 'criação' ? 'green' : h.action === 'exclusão' ? 'red' : h.action === 'duplicação' ? 'purple' : 'blue'}>{h.action}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{h.detail}</p>
                <p className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function PendentesTab({ data, markPendingAdded, addPendingExpense, deletePendingExpense }: { data: ReturnType<typeof useData>['data']; markPendingAdded: (id: string) => void; addPendingExpense: (name: string, cat: string) => void; deletePendingExpense: (id: string) => void }) {
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('Outros');
  const dataQualityIssues = useMemo(() => getDataQualityIssues(data), [data]);
  const pending = data.pendingExpenses.filter((p) => !p.added);
  const added = data.pendingExpenses.filter((p) => p.added);
  const severityColor = {
    critical: 'red',
    warning: 'yellow',
  } as const;
  const severityLabel = {
    critical: 'Crítico',
    warning: 'Atenção',
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-rose-50 border-rose-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <h3 className="text-sm font-semibold text-rose-700">Inconsistências que podem distorcer relatórios</h3>
        </div>
        <p className="text-xs text-rose-600 mb-3">{dataQualityIssues.length} inconsistência(s) encontrada(s)</p>
        <div className="space-y-2">
          {dataQualityIssues.length === 0 ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} /> Nenhuma inconsistência financeira encontrada.</p>
          ) : (
            dataQualityIssues.map((item) => (
              <div key={item.id} className="p-2.5 bg-white rounded-lg border border-rose-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={severityColor[item.severity]}>{severityLabel[item.severity]}</Badge>
                  <span className="text-xs text-gray-400">{item.entity} · {item.recordId}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mt-1">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-amber-700">Despesas ainda não incorporadas ao planejamento</h3>
        </div>
        <p className="text-xs text-amber-600 mb-3">{pending.length} despesa(s) pendente(s)</p>
        <div className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} /> Todas as despesas foram incorporadas!</p>
          ) : (
            pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-2">({p.suggestedCategory})</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => markPendingAdded(p.id)}>Adicionar ao planejamento</Button>
                  <IconButton icon={<Trash2 size={14} />} label="Excluir pendência" variant="danger" onClick={() => deletePendingExpense(p.id)} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Adicionar pendência</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Nome" value={newName} onChange={setNewName} placeholder="Ex: Academia" />
          <Select label="Categoria sugerida" value={newCat} onChange={setNewCat} options={data.categories.map((c) => ({ value: c, label: c }))} />
          <div className="flex items-end">
            <Button onClick={() => { if (newName) { addPendingExpense(newName, newCat); setNewName(''); } }}><Plus size={14} className="inline mr-1" /> Adicionar</Button>
          </div>
        </div>
      </Card>

      {added.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Já incorporadas ({added.length})</h3>
          <div className="space-y-1">
            {added.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-sm text-gray-500">{p.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function CategoriasTab({ data, selectedMonth, addCategory, updateCategory, deleteCategory, toggleCategory, addCategoryBudget, updateCategoryBudget, deleteCategoryBudget }: {
  data: ReturnType<typeof useData>['data'];
  selectedMonth: string;
  addCategory: (name: string, expenseClass?: ExpenseClass) => void;
  updateCategory: (id: string, updates: Partial<CategoryEntry>) => void;
  deleteCategory: (id: string) => void;
  toggleCategory: (id: string) => void;
  addCategoryBudget: (budget: Omit<CategoryBudget, 'id'>) => void;
  updateCategoryBudget: (id: string, updates: Partial<CategoryBudget>) => void;
  deleteCategoryBudget: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryEntry | null>(null);
  const [confirm, setConfirm] = useState<CategoryEntry | null>(null);
  const [name, setName] = useState('');
  const [expenseClass, setExpenseClass] = useState<ExpenseClass>('other');
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [confirmBudget, setConfirmBudget] = useState<CategoryBudget | null>(null);
  const [budgetCategory, setBudgetCategory] = useState(data.categoryEntries.find((cat) => cat.active)?.name ?? data.categories[0] ?? '');
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [budgetStart, setBudgetStart] = useState(selectedMonth);
  const [budgetEnd, setBudgetEnd] = useState('');
  const categories = data.categoryEntries;
  const activeCategoryOptions = data.categoryEntries
    .filter((cat) => cat.active)
    .map((cat) => ({ value: cat.name, label: cat.name }));
  const budgetUsages = useMemo(() => getCategoryBudgetUsages(data, selectedMonth), [data, selectedMonth]);

  const classOptions: { value: ExpenseClass; label: string }[] = [
    { value: 'essential', label: 'Essencial' },
    { value: 'lifestyle', label: 'Discricionário' },
    { value: 'financial', label: 'Financeiro' },
    { value: 'other', label: 'Outros' },
  ];
  const classLabel = (value: ExpenseClass) => classOptions.find((option) => option.value === value)?.label ?? 'Outros';
  const classBadgeColor = (value: ExpenseClass) => (
    value === 'essential' ? 'green' : value === 'financial' ? 'purple' : value === 'lifestyle' ? 'yellow' : 'gray'
  );
  const openAdd = () => { setEditing(null); setName(''); setExpenseClass('other'); setOpen(true); };
  const openEdit = (cat: CategoryEntry) => { setEditing(cat); setName(cat.name); setExpenseClass(cat.expenseClass); setOpen(true); };
  const openAddBudget = () => {
    setEditingBudget(null);
    setBudgetCategory(activeCategoryOptions[0]?.value ?? data.categories[0] ?? '');
    setBudgetAmount(0);
    setBudgetStart(selectedMonth);
    setBudgetEnd('');
    setBudgetOpen(true);
  };
  const openEditBudget = (budget: CategoryBudget) => {
    setEditingBudget(budget);
    setBudgetCategory(budget.category);
    setBudgetAmount(budget.amount);
    setBudgetStart(budget.startMonth);
    setBudgetEnd(budget.endMonth ?? '');
    setBudgetOpen(true);
  };
  const save = () => {
    if (!name.trim()) return;
    if (editing) updateCategory(editing.id, { name: name.trim(), expenseClass });
    else addCategory(name.trim(), expenseClass);
    setOpen(false);
  };
  const saveBudget = () => {
    if (!budgetCategory || budgetAmount <= 0 || !budgetStart) return;
    const payload = {
      category: budgetCategory,
      amount: budgetAmount,
      startMonth: budgetStart,
      endMonth: budgetEnd || null,
    };
    if (editingBudget) updateCategoryBudget(editingBudget.id, payload);
    else addCategoryBudget(payload);
    setBudgetOpen(false);
  };
  const budgetBadgeColor = (status: 'saudavel' | 'atencao' | 'excedido') => (
    status === 'excedido' ? 'red' : status === 'atencao' ? 'yellow' : 'green'
  );
  const budgetLabel = (status: 'saudavel' | 'atencao' | 'excedido') => (
    status === 'excedido' ? 'Excedido' : status === 'atencao' ? 'Atenção' : 'Saudável'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-gray-800">Categorias de gasto</h3><p className="text-sm text-gray-500">Categorias usadas em todos os gastos. Categorias desativadas não aparecem nos formulários.</p></div>
        <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Nova categoria</Button>
      </div>
      <Card className="overflow-hidden">
        {categories.length === 0 ? <EmptyState icon={<Tag size={48} />} title="Nenhuma categoria" /> : (
          <div className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap"><Tag size={14} className="text-gray-400" /><span className="font-medium text-gray-800">{cat.name}</span><Badge color={classBadgeColor(cat.expenseClass)}>{classLabel(cat.expenseClass)}</Badge></div>
                <div className="flex items-center gap-2"><Badge color={cat.active ? 'green' : 'gray'}>{cat.active ? 'Ativa' : 'Inativa'}</Badge><IconButton icon={<Edit2 size={15} />} label="Editar categoria" onClick={() => openEdit(cat)} /><IconButton icon={<Power size={15} />} label={cat.active ? 'Desativar categoria' : 'Ativar categoria'} onClick={() => toggleCategory(cat.id)} /><IconButton icon={<Trash2 size={15} />} label="Excluir categoria" variant="danger" onClick={() => setConfirm(cat)} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar categoria' : 'Nova categoria'} footer={
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!name.trim()}>Salvar</Button></div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          <Input label="Nome" value={name} onChange={setName} required />
          <Select label="Classificação" value={expenseClass} onChange={(value) => setExpenseClass(value as ExpenseClass)} options={classOptions} required />
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Excluir categoria" message="Se houver gastos vinculados, é preferível desativar a categoria para preservar o histórico. Deseja excluir mesmo assim?" onConfirm={() => { if (confirm) deleteCategory(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} confirmText="Excluir" />

      <div className="flex items-center justify-between pt-2">
        <div><h3 className="text-lg font-semibold text-gray-800">Orçamentos por categoria</h3><p className="text-sm text-gray-500">Limites por categoria com vigência mensal.</p></div>
        <Button onClick={openAddBudget} disabled={activeCategoryOptions.length === 0}><Plus size={16} className="inline mr-1" /> Novo orçamento</Button>
      </div>
      <Card className="overflow-hidden">
        {data.categoryBudgets.length === 0 ? <EmptyState icon={<PiggyBank size={48} />} title="Nenhum orçamento" /> : (
          <div className="divide-y divide-gray-100">
            {data.categoryBudgets.map((budget) => {
              const usage = budgetUsages.find((item) => item.budget.id === budget.id);
              const pct = usage?.usagePercent ?? 0;
              const status = usage?.status ?? 'saudavel';
              return (
                <div key={budget.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-800">{budget.category}</span>
                      <Badge color={budgetBadgeColor(status)}>{budgetLabel(status)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                      <div><p className="text-xs text-gray-400">Orçamento</p><p className="font-semibold text-gray-800">{formatCurrency(budget.amount)}</p></div>
                      <div><p className="text-xs text-gray-400">Realizado</p><p className="font-semibold text-gray-800">{formatCurrency(usage?.realizedAmount ?? 0)}</p></div>
                      <div><p className="text-xs text-gray-400">Diferença</p><p className={`font-semibold ${(usage?.difference ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(usage?.difference ?? -budget.amount)}</p></div>
                      <div><p className="text-xs text-gray-400">Vigência</p><p className="font-semibold text-gray-800">{formatMonthBR(budget.startMonth)} - {budget.endMonth ? formatMonthBR(budget.endMonth) : 'sem fim'}</p></div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={pct} max={100} color={status === 'excedido' ? 'red' : status === 'atencao' ? 'yellow' : 'green'} />
                      <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}% usado em {formatMonthBR(selectedMonth)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton icon={<Edit2 size={15} />} label="Editar orçamento" onClick={() => openEditBudget(budget)} />
                    <IconButton icon={<Trash2 size={15} />} label="Excluir orçamento" variant="danger" onClick={() => setConfirmBudget(budget)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title={editingBudget ? 'Editar orçamento' : 'Novo orçamento'} footer={
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setBudgetOpen(false)}>Cancelar</Button><Button onClick={saveBudget} disabled={!budgetCategory || budgetAmount <= 0 || !budgetStart}>Salvar</Button></div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); saveBudget(); }} className="space-y-3">
          <Select label="Categoria" value={budgetCategory} onChange={setBudgetCategory} options={activeCategoryOptions.length > 0 ? activeCategoryOptions : data.categories.map((cat) => ({ value: cat, label: cat }))} required />
          <CurrencyInput label="Valor do orçamento" value={budgetAmount} onChange={setBudgetAmount} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MonthPicker label="Início" value={budgetStart} onChange={setBudgetStart} required />
            <MonthPicker label="Fim" value={budgetEnd} onChange={setBudgetEnd} />
          </div>
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>
      <ConfirmDialog open={!!confirmBudget} title="Excluir orçamento" message="Deseja excluir este orçamento por categoria?" onConfirm={() => { if (confirmBudget) deleteCategoryBudget(confirmBudget.id); setConfirmBudget(null); }} onCancel={() => setConfirmBudget(null)} confirmText="Excluir" />
    </div>
  );
}
