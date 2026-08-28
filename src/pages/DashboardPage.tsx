import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, CreditCard, Wallet, PieChart as PieChartIcon, AlertCircle, CheckCircle2, Info, AlertTriangle, LineChart as LineChartIcon, Building2, Banknote, ReceiptText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, Area, AreaChart } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { getCategoryBudgetUsages, projectMonths, generateAlerts, recoveryProgress, cardUtilization, totalBankBalance, getCardMonthlyLimit, getFinancialHealthIndicators, getProjectionHorizonSummaries } from '@/lib/projection';
import { formatCurrency, formatPercent, monthLabelShort, monthShort, formatMonthBR } from '@/lib/format';
import { Card, StatCard, Badge, ProgressBar } from '@/components/ui';
import type { PageId } from '@/components/Layout';
import type { FinancialHealthIndicator } from '@/lib/projection';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280'];

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { data } = useData();
  const { selectedMonth } = useMonth();
  const [detailModal, setDetailModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const alerts = useMemo(() => generateAlerts(data, projection), [data, projection]);
  const recovery = useMemo(() => recoveryProgress(data, projection), [data, projection]);
  const healthIndicators = useMemo(() => getFinancialHealthIndicators(data, projection), [data, projection]);
  const horizonSummaries = useMemo(() => getProjectionHorizonSummaries(data, projection), [data, projection]);
  const current = projection.months[0];
  const bankBalance = totalBankBalance(data);
  const categoryBudgetUsages = useMemo(() => getCategoryBudgetUsages(data, selectedMonth), [data, selectedMonth]);

  if (!current) return null;

  const cardLimit = getCardMonthlyLimit(data.settings, selectedMonth);
  const cardPct = cardLimit > 0 ? (current.cardExpenses / cardLimit) * 100 : 0;
  const cardColor = cardPct > 100 ? 'red' : cardPct >= 80 ? 'yellow' : 'green';

  const balancePct = current.income > 0 ? (current.balance / current.income) * 100 : 0;
  let statusLabel = 'Saudável';
  let statusColor: 'green' | 'red' | 'yellow' | 'blue' = 'green';
  if (current.balance < 0) { statusLabel = 'Crítico'; statusColor = 'red'; }
  else if (balancePct < 5) { statusLabel = 'Atenção'; statusColor = 'yellow'; }
  else if (balancePct < 15) { statusLabel = 'Recuperação'; statusColor = 'blue'; }

  const flowData = projection.months.slice(0, 12).map((m) => ({
    month: monthShort(m.monthKey),
    Receitas: Math.round(m.income),
    Despesas: Math.round(m.totalExpenses),
    Saldo: Math.round(m.balance),
  }));

  const balanceData = projection.months.slice(0, 12).map((m) => ({
    month: monthShort(m.monthKey),
    Saldo: Math.round(m.balance),
    Acumulado: Math.round(m.accumulatedBalance),
  }));

  const categoryData = Object.entries(current.categoryBreakdown)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
  const budgetStatusLabel = {
    saudavel: 'Saudável',
    atencao: 'Atenção',
    excedido: 'Excedido',
  };
  const budgetStatusColor = {
    saudavel: 'green',
    atencao: 'yellow',
    excedido: 'red',
  } as const;

  // Group small categories into "Outros" (threshold: 5% of total)
  const totalCat = categoryData.reduce((s, c) => s + c.value, 0);
  const THRESHOLD = totalCat * 0.05;
  const bigCats = categoryData.filter((c) => c.value >= THRESHOLD);
  const smallCats = categoryData.filter((c) => c.value < THRESHOLD);
  const outrosValue = smallCats.reduce((s, c) => s + c.value, 0);
  const pieData = outrosValue > 0 ? [...bigCats, { name: 'Outros', value: outrosValue }] : bigCats;

  const typeData = [
    { name: 'Fixos', value: Math.round(current.fixedExpenses), color: '#3B82F6' },
    { name: 'Prazo', value: Math.round(current.prazoExpenses), color: '#8B5CF6' },
    { name: 'Pontuais', value: Math.round(current.variableExpenses), color: '#F59E0B' },
  ].filter((t) => t.value > 0);

  const parcelasData = projection.months.slice(0, 12).map((m) => ({
    month: monthShort(m.monthKey),
    Parcelas: Math.round(m.cardInstallments),
    Renda: Math.round(m.income),
  }));

  const showBankDetail = () => {
    setDetailModal({
      title: `Composição do Saldo · ${formatMonthBR(selectedMonth)}`,
      content: (
        <div className="space-y-3">
          {data.bankAccounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">{acc.name}</span>
                <span className="text-xs text-gray-400 ml-2">{acc.bank}</span>
              </div>
              <span className={`text-sm font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(acc.balance)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <span className="text-sm font-medium text-emerald-700">Saldo total</span>
            <span className={`text-sm font-bold ${bankBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>{formatCurrency(bankBalance)}</span>
          </div>
        </div>
      ),
    });
  };

  const alertIcons = {
    critical: <AlertCircle className="text-rose-500" size={18} />,
    warning: <AlertTriangle className="text-amber-500" size={18} />,
    info: <Info className="text-blue-500" size={18} />,
  };

  const alertBg = {
    critical: 'bg-rose-50 border-rose-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const alertBadgeColor = {
    critical: 'red',
    warning: 'yellow',
    info: 'blue',
  } as const;

  const alertSeverityLabel = {
    critical: 'Crítico',
    warning: 'Atenção',
    info: 'Info',
  };
  const topAlerts = alerts.slice(0, 3);
  const topBudgetUsages = categoryBudgetUsages
    .filter((usage) => usage.status !== 'saudavel')
    .concat(categoryBudgetUsages.filter((usage) => usage.status === 'saudavel'))
    .slice(0, 6);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{monthLabelShort(selectedMonth)} · Visão geral financeira</p>
        </div>
        <div className={`px-4 py-2 rounded-xl border-2 ${
          statusColor === 'green' ? 'bg-emerald-50 border-emerald-300' :
          statusColor === 'red' ? 'bg-rose-50 border-rose-300' :
          statusColor === 'yellow' ? 'bg-amber-50 border-amber-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              statusColor === 'green' ? 'bg-emerald-500' :
              statusColor === 'red' ? 'bg-rose-500' :
              statusColor === 'yellow' ? 'bg-amber-500' :
              'bg-blue-500'
            }`} />
            <span className="text-sm font-bold text-gray-700">{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Bloco 1: resumo do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-1">
        <StatCard title="Receita prevista" value={formatCurrency(current.income)} color="green" icon={<TrendingUp size={18} />} tooltip="Soma das receitas fixas e variáveis deste mês." />
        <StatCard title="Despesas previstas" value={formatCurrency(current.expectedExpenses)} color="red" icon={<TrendingDown size={18} />} tooltip="Valor previsto para gastos fixos, pontuais, cartões e dívidas deste mês." />
        <StatCard title="Despesas realizadas" value={formatCurrency(current.realizedExpenses)} color="red" icon={<ReceiptText size={18} />} tooltip="Valor efetivo do mês, usando valor realizado quando informado." />
        <StatCard title="Ainda a pagar" value={formatCurrency(current.unpaidExpenses)} color={current.unpaidExpenses > 0 ? 'yellow' : 'green'} icon={<Banknote size={18} />} tooltip="Saídas realizadas que ainda não foram marcadas como pagas." />
        <StatCard title="Saldo previsto" value={formatCurrency(current.balance)} color={current.balance >= 0 ? 'green' : 'red'} icon={<Wallet size={18} />} tooltip="Receitas previstas menos gastos, cartões e dívidas deste mês." />
        <StatCard title="Saldo projetado contas" value={formatCurrency(current.projectedAccountsBalance)} color={current.projectedAccountsBalance >= 0 ? 'green' : 'red'} icon={<Building2 size={18} />} onClick={showBankDetail} tooltip="Saldo em contas projetado para o mês, conforme o motor financeiro." />
      </div>

      {/* Bloco 2: alertas prioritários */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={18} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-700">Alertas prioritários</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {topAlerts.length === 0 ? (
            <div className="lg:col-span-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">Nenhum alerta prioritário no momento.</div>
          ) : (
            topAlerts.map((alert) => (
              <div key={alert.id} className={`flex items-start gap-2 p-3 rounded-lg border ${alertBg[alert.severity]}`}>
                <div className="flex-shrink-0 mt-0.5">{alertIcons[alert.severity]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                    <Badge color={alertBadgeColor[alert.severity]}>{alertSeverityLabel[alert.severity]}</Badge>
                    {alert.month && <span className="text-xs text-gray-400">{formatMonthBR(alert.month)}</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{alert.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Bloco 3: orçamento por categoria */}
      {categoryBudgetUsages.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Orçamento por Categoria · {formatMonthBR(selectedMonth)}</h3>
            </div>
            <button onClick={() => onNavigate('configuracoes')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Configurar</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {topBudgetUsages.map((usage) => (
              <div key={usage.budget.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700 truncate">{usage.category}</span>
                  <Badge color={budgetStatusColor[usage.status]}>{budgetStatusLabel[usage.status]}</Badge>
                </div>
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(usage.realizedAmount)}</span>
                  <span className="text-xs text-gray-400">de {formatCurrency(usage.budgetAmount)}</span>
                </div>
                <ProgressBar value={usage.usagePercent} max={100} color={usage.status === 'excedido' ? 'red' : usage.status === 'atencao' ? 'yellow' : 'green'} />
                <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                  <span className="text-gray-400">{usage.usagePercent.toFixed(1)}% usado</span>
                  <span className={usage.difference > 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                    {usage.difference > 0 ? '+' : ''}{formatCurrency(usage.difference)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bloco 4: cartões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Cartões neste mês</h3>
            <Badge color={cardColor}>{formatPercent(cardPct)}</Badge>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-gray-900">{formatCurrency(current.cardExpenses)}</span>
            <span className="text-sm text-gray-400">/ {formatCurrency(cardLimit)}</span>
          </div>
          <ProgressBar value={current.cardExpenses} max={cardLimit} color={cardColor} />
          <p className="text-xs text-gray-400 mt-2">
            {cardPct > 100 ? 'Limite ultrapassado! Reduza gastos no cartão.' : cardPct >= 80 ? 'Atenção: próximo do limite.' : 'Dentro do limite.'}
          </p>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Resumo dos cartões · {formatMonthBR(selectedMonth)}</h3>
            </div>
            <button onClick={() => onNavigate('cartoes')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Abrir cartões</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <MetricItem label="Fatura atual" value={formatCurrency(current.cardExpenses)} negative={current.cardExpenses > 0} />
            <MetricItem label="% da renda" value={formatPercent(current.income > 0 ? (current.cardExpenses / current.income) * 100 : 0)} negative={current.income > 0 && current.cardExpenses / current.income >= 0.35} />
            <MetricItem label="Parcelas futuras" value={formatCurrency(current.parcelasFuturas)} negative={current.parcelasFuturas > 0} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {data.cards.slice(0, 3).map((card) => {
              const util = cardUtilization(data, card, selectedMonth);
              return (
                <button key={card.id} onClick={() => onNavigate('cartoes')} className="p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-100 text-left transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                    <span className="text-sm font-medium text-gray-700">{card.name}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Fatura</span><span className="font-medium text-gray-900">{formatCurrency(util.currentInvoice)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Próxima</span><span className="font-medium text-gray-700">{formatCurrency(util.nextInvoice)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Futuro</span><span className="font-medium text-amber-600">{formatCurrency(util.futureInstallments)}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bloco 5: próximos meses */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <LineChartIcon size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Próximos meses</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {horizonSummaries.map((summary) => (
            <div key={summary.months} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-700">{summary.months} meses</p>
                <Badge color={summary.negativeMonths > 0 ? 'red' : 'green'}>{summary.negativeMonths} negativo(s)</Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">Menor saldo em contas</span><span className={summary.lowestProjectedAccountsBalance < 0 ? 'font-medium text-rose-600' : 'font-medium text-gray-700'}>{formatCurrency(summary.lowestProjectedAccountsBalance)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Maior fatura</span><span className="font-medium text-gray-700">{formatCurrency(summary.highestCardInvoice)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Maior comprometimento</span><span className="font-medium text-gray-700">{formatPercent(summary.highestIncomeCommitmentPercent)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bloco 6: saúde financeira */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LineChartIcon size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Saúde financeira explicável</h3>
          </div>
          <Badge color="blue">{formatMonthBR(selectedMonth)}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {healthIndicators.map((indicator) => (
            <HealthIndicatorCard key={indicator.id} indicator={indicator} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        <ExpenseClassCard title="Essenciais" value={current.essentialExpenses} income={current.income} colorClass="text-emerald-600" />
        <ExpenseClassCard title="Discricionários" value={current.discretionaryExpenses} income={current.income} colorClass="text-amber-600" />
        <ExpenseClassCard title="Compromissos financeiros" value={current.financialCommitments} income={current.income} colorClass="text-purple-600" />
        <ExpenseClassCard title="Outros" value={current.otherExpenses} income={current.income} colorClass="text-gray-700" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Fluxo Financeiro · 12 meses a partir de {formatMonthBR(selectedMonth)}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={flowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Receitas" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Despesas" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Saldo" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Saldo" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="Acumulado" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gastos por Categoria · {formatMonthBR(selectedMonth)}</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">Nenhum gasto em {formatMonthBR(selectedMonth)}.</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-2">
              <ResponsiveContainer width="100%" height={260} className="flex-1">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={(e: { name: string }) => e.name} labelLine={{ stroke: '#D1D5DB' }}>
                    {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 max-h-[260px] overflow-y-auto">
                {categoryData.map((cat, i) => {
                  const pct = totalCat > 0 ? (cat.value / totalCat) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-600 truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-medium text-gray-900">{formatCurrency(cat.value)}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gastos por Tipo · {formatMonthBR(selectedMonth)}</h3>
          {typeData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">Nenhum gasto em {formatMonthBR(selectedMonth)}.</div>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={70} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {typeData.map((t, i) => (<Cell key={i} fill={t.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                {typeData.map((t) => (
                  <div key={t.name} className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <p className="text-xs text-gray-400">{t.name}</p>
                    <p className="text-sm font-bold" style={{ color: t.color }}>{formatCurrency(t.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Parcelas Futuras vs Renda</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={parcelasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Renda" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Parcelas" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-700">Checklist de recuperação</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
          {recovery.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                {step.done && <CheckCircle2 size={10} className="text-white" />}
              </div>
              <span className={step.done ? 'text-gray-700' : 'text-gray-400'}>{step.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">{detailModal.title}</h2>
              <button onClick={() => setDetailModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4">{detailModal.content}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricItem({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-bold ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function HealthIndicatorCard({ indicator }: { indicator: FinancialHealthIndicator }) {
  const statusLabel = {
    bom: 'Bom',
    atencao: 'Atenção',
    critico: 'Crítico',
    neutro: 'Sem dados',
  };
  const statusColor = {
    bom: 'green',
    atencao: 'yellow',
    critico: 'red',
    neutro: 'gray',
  } as const;
  const valueText = indicator.value === null
    ? 'Sem dados'
    : indicator.unit === 'months'
      ? `${indicator.value.toFixed(1).replace('.', ',')} meses`
      : formatPercent(indicator.value);

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{indicator.label}</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{valueText}</p>
        </div>
        <Badge color={statusColor[indicator.status]}>{statusLabel[indicator.status]}</Badge>
      </div>
      <p className="text-xs text-gray-600 mt-2">{indicator.explanation}</p>
      <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
        <p className="text-[11px] text-gray-400">Fórmula: {indicator.formula}</p>
        <p className="text-[11px] text-gray-400">{indicator.range}</p>
      </div>
    </div>
  );
}

function ExpenseClassCard({ title, value, income, colorClass }: { title: string; value: number; income: number; colorClass: string }) {
  const percent = income > 0 ? (value / income) * 100 : 0;
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-400">{title}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{formatCurrency(value)}</p>
      <p className="text-xs text-gray-400 mt-1">{formatPercent(percent)} da renda</p>
    </Card>
  );
}
