import { useMemo, useState } from 'react';
import { Eye, ChevronRight } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { projectMonths } from '@/lib/projection';
import { formatCurrency, monthLabelShort, formatMonthBR } from '@/lib/format';
import { Card, Badge, Modal } from '@/components/ui';

type MonthStatus = 'saudavel' | 'atencao' | 'critico';

function getMonthStatus(balance: number, income: number): MonthStatus {
  if (balance < 0) return 'critico';
  const pct = income > 0 ? (balance / income) * 100 : 0;
  if (pct < 5) return 'atencao';
  return 'saudavel';
}

const statusConfig: Record<MonthStatus, { label: string; color: 'green' | 'yellow' | 'red'; dotClass: string }> = {
  saudavel: { label: 'Saudável', color: 'green', dotClass: 'bg-emerald-500' },
  atencao: { label: 'Atenção', color: 'yellow', dotClass: 'bg-amber-500' },
  critico: { label: 'Crítico', color: 'red', dotClass: 'bg-rose-500' },
};

export function VisaoGeralPage() {
  const { data } = useData();
  const { selectedMonth } = useMonth();
  const [range, setRange] = useState<6 | 12 | 24>(12);
  const [detailMonth, setDetailMonth] = useState<string | null>(null);

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const months = projection.months.slice(0, range);

  const selectedData = months.find((m) => m.monthKey === detailMonth);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-sm text-gray-500">Competência: {formatMonthBR(selectedMonth)}</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([6, 12, 24] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${range === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              {r} meses
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Saudável</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atenção</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Crítico</div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Mês</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Receitas</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Gastos</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Cartões</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Dívidas</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Saldo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const status = getMonthStatus(m.balance, m.income);
                const cfg = statusConfig[status];
                return (
                  <tr
                    key={m.monthKey}
                    onClick={() => setDetailMonth(m.monthKey)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-700">{monthLabelShort(m.monthKey)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatCurrency(m.income)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(m.fixedExpenses + m.variableExpenses)}</td>
                    <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(m.cardExpenses)}</td>
                    <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(m.debtExpenses)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${m.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(m.balance)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                        <span className="text-xs font-medium text-gray-600">{cfg.label}</span>
                      </div>
                    </td>
                    <td className="px-2 text-gray-300"><ChevronRight size={16} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!detailMonth} onClose={() => setDetailMonth(null)} title={selectedData ? `Detalhes · ${monthLabelShort(selectedData.monthKey)}` : ''}>
        {selectedData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailBox label="Receitas" value={formatCurrency(selectedData.income)} color="green" />
              <DetailBox label="Despesas Fixas" value={formatCurrency(selectedData.fixedExpenses)} color="gray" />
              <DetailBox label="Despesas Variáveis" value={formatCurrency(selectedData.variableExpenses)} color="gray" />
              <DetailBox label="Cartões" value={formatCurrency(selectedData.cardExpenses)} color="purple" />
              <DetailBox label="Dívidas" value={formatCurrency(selectedData.debtExpenses)} color="red" />
              <DetailBox label="Total Despesas" value={formatCurrency(selectedData.totalExpenses)} color="gray" />
              <DetailBox label="Saldo do Mês" value={formatCurrency(selectedData.balance)} color={selectedData.balance >= 0 ? 'green' : 'red'} />
              <DetailBox label="Saldo Acumulado" value={formatCurrency(selectedData.accumulatedBalance)} color={selectedData.accumulatedBalance >= 0 ? 'green' : 'red'} />
            </div>

            {Object.keys(selectedData.categoryBreakdown).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Por categoria</h4>
                <div className="space-y-1.5">
                  {Object.entries(selectedData.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                    <div key={cat} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">{cat}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.entries(selectedData.cardByCard).filter(([, v]) => v > 0).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Por cartão</h4>
                <div className="space-y-1.5">
                  {Object.entries(selectedData.cardByCard).filter(([, v]) => v > 0).map(([cardId, val]) => {
                    const card = data.cards.find((c) => c.id === cardId);
                    return (
                      <div key={cardId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card?.color ?? '#888' }} />
                          <span className="text-sm text-gray-600">{card?.name ?? cardId}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailBox({ label, value, color }: { label: string; value: string; color: 'green' | 'red' | 'purple' | 'gray' }) {
  const colors = {
    green: 'text-emerald-600',
    red: 'text-rose-600',
    purple: 'text-purple-600',
    gray: 'text-gray-900',
  };
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}
