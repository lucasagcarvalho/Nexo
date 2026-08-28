import { useMemo } from 'react';
import { BarChart3, AlertTriangle, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { projectMonths, monthsUntilFreeOfInstallments } from '@/lib/projection';
import { formatCurrency, monthLabelShort, monthShort, formatMonthBR } from '@/lib/format';
import { Card, Badge } from '@/components/ui';

export function ProjecaoPage() {
  const { data } = useData();
  const { selectedMonth } = useMonth();
  const projection = useMemo(() => projectMonths(data, 360, selectedMonth), [data, selectedMonth]);
  const months = projection.months;

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
                <th className="text-right px-4 py-2 font-medium text-gray-500">Fixas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Variáveis</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Cartões</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Dívidas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Total</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Saldo</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Saldo contas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.monthKey} className={`border-b border-gray-100 ${m.balance < 0 ? 'bg-rose-50' : ''}`}>
                  <td className="px-4 py-2 font-medium text-gray-700">{monthShort(m.monthKey)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(m.income)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(m.fixedExpenses)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(m.variableExpenses)}</td>
                  <td className="px-4 py-2 text-right text-purple-600">{formatCurrency(m.cardExpenses)}</td>
                  <td className="px-4 py-2 text-right text-rose-600">{formatCurrency(m.debtExpenses)}</td>
                  <td className="px-4 py-2 text-right text-gray-900 font-medium">{formatCurrency(m.totalExpenses)}</td>
                  <td className={`px-4 py-2 text-right font-bold ${m.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(m.balance)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${m.projectedAccountsBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(m.projectedAccountsBalance)}</td>
                  <td className={`px-4 py-2 text-right ${m.accumulatedBalance >= 0 ? 'text-gray-700' : 'text-rose-600'}`}>{formatCurrency(m.accumulatedBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
