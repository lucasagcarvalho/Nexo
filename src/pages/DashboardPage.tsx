import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, CreditCard, Wallet, PieChart as PieChartIcon, AlertCircle, CheckCircle2, Info, AlertTriangle, LineChart as LineChartIcon, Calendar, BarChart3, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, Area, AreaChart } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { projectMonths, generateAlerts, recoveryProgress, totalDebt, monthsUntilFreeOfInstallments, cardUtilization, totalBankBalance } from '@/lib/projection';
import { formatCurrency, formatPercent, monthLabelShort, monthShort, formatDateBR, formatMonthBR, currentMonthKey } from '@/lib/format';
import { Card, StatCard, Badge, ProgressBar } from '@/components/ui';
import type { PageId } from '@/components/Layout';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280'];

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { data } = useData();
  const { selectedMonth } = useMonth();
  const [detailModal, setDetailModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const alerts = useMemo(() => generateAlerts(data, projection), [data, projection]);
  const recovery = useMemo(() => recoveryProgress(data, projection), [data, projection]);
  const current = projection.months[0];
  const debt = totalDebt(data);
  const monthsFree = monthsUntilFreeOfInstallments(data, selectedMonth);
  const bankBalance = totalBankBalance(data);

  if (!current) return null;

  const commitment = current.income > 0 ? (current.totalExpenses / current.income) * 100 : 0;
  const cardLimit = data.settings.cardMonthlyLimit;
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

  const showCardDetail = () => {
    setDetailModal({
      title: `Detalhamento das Faturas de Cartão · ${formatMonthBR(selectedMonth)}`,
      content: (
        <div className="space-y-3">
          {data.cards.map((card) => {
            const amt = current.cardByCard[card.id] ?? 0;
            return (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                  <span className="text-sm font-medium text-gray-700">{card.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(amt)}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-700">Total</span>
            <span className="text-sm font-bold text-blue-900">{formatCurrency(current.cardExpenses)}</span>
          </div>
        </div>
      ),
    });
  };

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
    critico: <AlertCircle className="text-rose-500" size={18} />,
    atencao: <AlertTriangle className="text-amber-500" size={18} />,
    info: <Info className="text-blue-500" size={18} />,
    positivo: <CheckCircle2 className="text-emerald-500" size={18} />,
  };

  const alertBg = {
    critico: 'bg-rose-50 border-rose-200',
    atencao: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
    positivo: 'bg-emerald-50 border-emerald-200',
  };

  return (
    <div className="space-y-6">
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

      {/* Top cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title="Receita Total" value={formatCurrency(current.income)} color="green" icon={<TrendingUp size={18} />} tooltip="Soma das receitas fixas e variáveis deste mês." />
        <StatCard title="Total de Saídas" value={formatCurrency(current.totalExpenses)} color="red" icon={<TrendingDown size={18} />} tooltip="Gastos fixos, pontuais, cartões e dívidas deste mês." />
        <StatCard title="Cartões" value={formatCurrency(current.cardExpenses)} color="purple" icon={<CreditCard size={18} />} onClick={showCardDetail} tooltip="Total das faturas de cartão deste mês. Clique para ver a composição." />
        <StatCard title="Dívidas" value={formatCurrency(current.debtExpenses)} color="yellow" icon={<Wallet size={18} />} tooltip="Parcelas de dívidas consideradas neste mês." />
        <StatCard title="Saldo Projetado" value={formatCurrency(current.balance)} color={current.balance >= 0 ? 'green' : 'red'} icon={<Wallet size={18} />} tooltip="Receitas previstas menos gastos, cartões e dívidas deste mês." />
        <StatCard title="Saldo em Contas" value={formatCurrency(bankBalance)} color={bankBalance >= 0 ? 'green' : 'red'} icon={<Building2 size={18} />} onClick={showBankDetail} tooltip="Soma dos saldos atuais de todas as contas. Clique para ver a composição." />
      </div>

      {/* Receita breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-gray-400">Receitas Fixas</p><p className="text-lg font-bold text-blue-600">{formatCurrency(current.fixedIncome)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Receitas Variáveis</p><p className="text-lg font-bold text-amber-600">{formatCurrency(current.variableIncome)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Gastos Fixos</p><p className="text-lg font-bold text-gray-900">{formatCurrency(current.fixedExpenses)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Gastos Pontuais</p><p className="text-lg font-bold text-gray-900">{formatCurrency(current.variableExpenses)}</p></Card>
      </div>

      {/* Card limit + Recovery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-1">
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
              <LineChartIcon size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Saúde Financeira</h3>
            </div>
            <span className="text-2xl font-bold text-blue-600">{recovery.percent}%</span>
          </div>
          <ProgressBar value={recovery.percent} max={100} color="blue" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
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
      </div>

      {/* Cards section */}
      {data.cards.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Cartões · {formatMonthBR(selectedMonth)}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.cards.map((card) => {
              const util = cardUtilization(data, card, selectedMonth);
              return (
                <button key={card.id} onClick={() => onNavigate('cartoes')} className="p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-left transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                    <span className="text-sm font-medium text-gray-700">{card.name}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Fatura do mês</span><span className="font-medium text-gray-900">{formatCurrency(util.currentInvoice)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Próxima fatura</span><span className="font-medium text-gray-700">{formatCurrency(util.nextInvoice)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Parcelado futuro</span><span className="font-medium text-amber-600">{formatCurrency(util.futureInstallments)}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gastos por Categoria · {formatMonthBR(selectedMonth)}</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">Nenhum gasto em {formatMonthBR(selectedMonth)}.</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4">
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
              <div className="grid grid-cols-3 gap-2">
                {typeData.map((t) => (
                  <div key={t.name} className="p-2 bg-gray-50 rounded-lg text-center">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição dos Gastos · {formatMonthBR(selectedMonth)}</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">Nenhum gasto em {formatMonthBR(selectedMonth)}.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: { name: string }) => e.name} labelLine={{ stroke: '#D1D5DB' }}>
                  {categoryData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

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

      {/* Alerts */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={18} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-700">Alertas Financeiros</h3>
        </div>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum alerta no momento.</p>
          ) : (
            alerts.map((alert, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${alertBg[alert.type]}`}>
                <div className="flex-shrink-0 mt-0.5">{alertIcons[alert.type]}</div>
                <p className="text-sm text-gray-700">{alert.message}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Metrics */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={18} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Métricas · {formatMonthBR(selectedMonth)}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <MetricItem label="Receita total" value={formatCurrency(current.income)} positive />
          <MetricItem label="Gastos fixos" value={formatCurrency(current.fixedExpenses)} negative />
          <MetricItem label="Gastos com prazo" value={formatCurrency(current.prazoExpenses)} negative />
          <MetricItem label="Gastos pontuais" value={formatCurrency(current.variableExpenses)} negative />
          <MetricItem label="Faturas dos cartões" value={formatCurrency(current.cardExpenses)} />
          <MetricItem label="Dívidas mensais" value={formatCurrency(current.debtExpenses)} negative />
          <MetricItem label="Saldo projetado" value={formatCurrency(current.balance)} positive={current.balance >= 0} negative={current.balance < 0} />
          <MetricItem label="Saldo em contas" value={formatCurrency(bankBalance)} positive={bankBalance >= 0} negative={bankBalance < 0} />
          <MetricItem label="% renda comprometida" value={formatPercent(commitment)} />
          <MetricItem label="Parcelado futuro" value={formatCurrency(current.parcelasFuturas)} negative />
          <MetricItem label="Dívida total" value={formatCurrency(debt)} negative />
          <MetricItem label="Meses p/ sair parcelas" value={`${monthsFree} meses`} />
          <MetricItem label="Reserva recomendada" value={formatCurrency(current.totalExpenses * data.settings.reserveTargetMonths)} />
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
    <div className="p-2.5 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-bold ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
