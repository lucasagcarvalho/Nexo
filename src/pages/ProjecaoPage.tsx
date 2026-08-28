import { useMemo, useState } from 'react';
import { BarChart3, AlertTriangle, TrendingUp, TrendingDown, Calendar, ChevronRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { projectMonths, monthsUntilFreeOfInstallments, getMonthHealthStatus, getProjectionHorizonSummaries, type MonthProjection, type MonthHealthStatus, type ProjectionHorizonSummary } from '@/lib/projection';
import { formatCurrency, monthLabelShort, monthShort, formatMonthBR, formatPercent } from '@/lib/format';
import { Card, Badge, Modal } from '@/components/ui';

export function ProjecaoPage() {
  const { data } = useData();
  const { selectedMonth } = useMonth();
  const [detailMonth, setDetailMonth] = useState<MonthProjection | null>(null);
  const projection = useMemo(() => projectMonths(data, 360, selectedMonth), [data, selectedMonth]);
  const months = projection.months;
  const horizonSummaries = useMemo(() => getProjectionHorizonSummaries(data, projection), [data, projection]);

  const flowData = months.map((m) => ({
    month: monthShort(m.monthKey),
    Receitas: Math.round(m.income),
    Despesas: Math.round(m.totalExpenses),
    Saldo: Math.round(m.balance),
  }));

  const accumulatedData = months.map((m) => ({
    month: monthShort(m.monthKey),
    Acumulado: Math.round(m.accumulatedBalance),
  }));

  const cardData = months.map((m) => ({
    month: monthShort(m.monthKey),
    Cartões: Math.round(m.cardExpenses),
  }));

  const monthsFree = monthsUntilFreeOfInstallments(data, selectedMonth);
  const negativeMonths = months.filter((m) => m.balance < 0);
  const tightestMonth = [...months].sort((a, b) => a.balance - b.balance)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Projeção Financeira</h1>
        <p className="text-sm text-gray-500">Projeção de até 30 anos (360 meses) a partir de {formatMonthBR(selectedMonth)} · recálculo automático</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-emerald-500" /><p className="text-xs text-gray-400">Receita projetada (360m)</p></div>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(months.reduce((s, m) => s + m.income, 0))}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={14} className="text-rose-500" /><p className="text-xs text-gray-400">Despesas projetadas (360m)</p></div>
          <p className="text-lg font-bold text-rose-600">{formatCurrency(months.reduce((s, m) => s + m.totalExpenses, 0))}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1"><BarChart3 size={14} className="text-blue-500" /><p className="text-xs text-gray-400">Saldo acumulado</p></div>
          <p className={`text-lg font-bold ${(months[months.length - 1]?.accumulatedBalance ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(months[months.length - 1]?.accumulatedBalance ?? 0)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1"><Calendar size={14} className="text-amber-500" /><p className="text-xs text-gray-400">Livre das parcelas em</p></div>
          <p className="text-lg font-bold text-amber-600">{monthsFree > 0 ? `${monthsFree} meses` : 'Livre'}</p>
        </Card>
      </div>

      {/* Risk alerts */}
      {negativeMonths.length > 0 && (
        <Card className="p-4 bg-rose-50 border-rose-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-rose-500" />
            <h3 className="text-sm font-semibold text-rose-700">Meses com saldo negativo ({negativeMonths.length})</h3>
          </div>
          <div className="space-y-1">
            {negativeMonths.map((m) => (
              <div key={m.monthKey} className="flex items-center justify-between text-sm">
                <span className="text-rose-600">{monthLabelShort(m.monthKey)}</span>
                <span className="font-bold text-rose-700">{formatCurrency(m.balance)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tightestMonth && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Mês mais apertado</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{monthLabelShort(tightestMonth.monthKey)}</span>
            <Badge color={tightestMonth.balance < 0 ? 'red' : 'yellow'}>{formatCurrency(tightestMonth.balance)}</Badge>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={18} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Horizonte financeiro resumido</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {horizonSummaries.map((summary) => (
            <ProjectionHorizonCard key={summary.months} summary={summary} />
          ))}
        </div>
      </Card>

      {/* Charts */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Fluxo Financeiro · 360 meses</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={flowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
            <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Receitas" stroke="#10B981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Despesas" stroke="#EF4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Saldo" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Saldo Acumulado · 360 meses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={accumulatedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="Acumulado" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Faturas de Cartões · 360 meses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cardData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="Cartões" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Full table */}
      <Card className="overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-700 p-4 pb-2">Tabela Completa · 360 meses</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Mês</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Receitas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Gastos fixos</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Gastos prazo</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Gastos pontuais</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Cartões</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Dívidas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Total de saídas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Saldo do mês</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Saldo projetado em contas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">% renda comprometida</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Status</th>
                <th className="w-10 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const status = getMonthHealthStatus(m);
                const commitmentPercent = m.income > 0 ? (m.totalExpenses / m.income) * 100 : 0;
                return (
                <tr key={m.monthKey} className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${status === 'critico' ? 'bg-rose-50' : status === 'atencao' ? 'bg-amber-50/50' : ''}`} onClick={() => setDetailMonth(m)}>
                  <td className="px-4 py-2 font-medium text-gray-700 whitespace-nowrap">{monthShort(m.monthKey)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(m.income)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(m.fixedExpenses)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(m.prazoExpenses)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(m.variableExpenses)}</td>
                  <td className="px-4 py-2 text-right text-purple-600">{formatCurrency(m.cardExpenses)}</td>
                  <td className="px-4 py-2 text-right text-rose-600">{formatCurrency(m.debtExpenses)}</td>
                  <td className="px-4 py-2 text-right text-gray-900 font-medium">{formatCurrency(m.totalExpenses)}</td>
                  <td className={`px-4 py-2 text-right font-bold ${m.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(m.balance)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${m.projectedAccountsBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(m.projectedAccountsBalance)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatPercent(commitmentPercent)}</td>
                  <td className="px-4 py-2 text-center"><MonthStatusBadge status={status} /></td>
                  <td className="px-2 py-2 text-gray-300"><ChevronRight size={16} /></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!detailMonth} onClose={() => setDetailMonth(null)} title={detailMonth ? `Detalhes · ${formatMonthBR(detailMonth.monthKey)}` : ''} size="lg">
        {detailMonth && <ProjectionMonthDetail month={detailMonth} />}
      </Modal>
    </div>
  );
}

function MonthStatusBadge({ status }: { status: MonthHealthStatus }) {
  const config: Record<MonthHealthStatus, { label: string; color: 'green' | 'yellow' | 'red' }> = {
    saudavel: { label: 'Saudável', color: 'green' },
    atencao: { label: 'Atenção', color: 'yellow' },
    critico: { label: 'Crítico', color: 'red' },
  };
  return <Badge color={config[status].color}>{config[status].label}</Badge>;
}

function ProjectionHorizonCard({ summary }: { summary: ProjectionHorizonSummary }) {
  const hasRisk = summary.negativeMonths > 0 || summary.lowestProjectedAccountsBalance < 0;
  return (
    <div className={`p-3 rounded-lg border ${hasRisk ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800">Próximos {summary.months} meses</h4>
        <Badge color={hasRisk ? 'red' : 'green'}>{hasRisk ? 'Risco' : 'Saudável'}</Badge>
      </div>
      <div className="space-y-2">
        <HorizonMetric label="Menor saldo projetado" value={formatCurrency(summary.lowestProjectedAccountsBalance)} negative={summary.lowestProjectedAccountsBalance < 0} />
        <HorizonMetric label="Meses negativos" value={String(summary.negativeMonths)} negative={summary.negativeMonths > 0} />
        <HorizonMetric label="Maior fatura" value={formatCurrency(summary.highestCardInvoice)} />
        <HorizonMetric label="Maior comprometimento" value={formatPercent(summary.highestIncomeCommitmentPercent)} negative={summary.highestIncomeCommitmentPercent >= 90} />
        <HorizonMetric label="Poupança prevista" value={formatCurrency(summary.plannedSavings)} positive={summary.plannedSavings > 0} />
      </div>
    </div>
  );
}

function HorizonMetric({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

function ProjectionMonthDetail({ month }: { month: MonthProjection }) {
  const commitmentPercent = month.income > 0 ? (month.totalExpenses / month.income) * 100 : 0;
  const rows = [
    ['Receitas', month.income, 'text-emerald-600'],
    ['Gastos fixos', month.fixedExpenses, 'text-gray-700'],
    ['Gastos prazo', month.prazoExpenses, 'text-gray-700'],
    ['Gastos pontuais', month.variableExpenses, 'text-gray-700'],
    ['Cartões', month.cardExpenses, 'text-purple-600'],
    ['Dívidas', month.debtExpenses, 'text-rose-600'],
    ['Total de saídas', month.totalExpenses, 'text-gray-900'],
    ['Saldo do mês', month.balance, month.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'],
    ['Saldo projetado em contas', month.projectedAccountsBalance, month.projectedAccountsBalance >= 0 ? 'text-blue-600' : 'text-rose-600'],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card className="p-3"><p className="text-xs text-gray-400">Status</p><div className="mt-1"><MonthStatusBadge status={getMonthHealthStatus(month)} /></div></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">% renda comprometida</p><p className="text-lg font-bold text-gray-900">{formatPercent(commitmentPercent)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Pendente no mês</p><p className="text-lg font-bold text-rose-600">{formatCurrency(month.unpaidExpenses)}</p></Card>
      </div>
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {rows.map(([label, value, className]) => (
          <div key={label} className="flex items-center justify-between p-3 bg-white">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm font-bold ${className}`}>{formatCurrency(value as number)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
