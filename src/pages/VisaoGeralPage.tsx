import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, ArrowUpRight, CalendarDays, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { getCashflowTimelineForMonth, getMonthlyComparisonSummary, getPaymentPriorityRecommendations, getPreventiveTransferSuggestions, projectMonths } from '@/lib/projection';
import { formatCurrency, formatDateBR, formatPercent, monthLabelShort, formatMonthBR } from '@/lib/format';
import { Badge, Card, Modal } from '@/components/ui';
import type { PageId } from '@/components/Layout';
import type { CashflowTimelineItem } from '@/lib/projection';
import type { MonthlyComparisonMetric } from '@/lib/projection';

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

export function VisaoGeralPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { data } = useData();
  const { selectedMonth } = useMonth();
  const [range, setRange] = useState<6 | 12 | 24>(12);
  const [detailMonth, setDetailMonth] = useState<string | null>(null);

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const comparison = useMemo(() => getMonthlyComparisonSummary(data, selectedMonth), [data, selectedMonth]);
  const months = projection.months.slice(0, range);

  const selectedData = months.find((m) => m.monthKey === detailMonth);
  const selectedTimeline = useMemo(
    () => (detailMonth ? getCashflowTimelineForMonth(data, detailMonth) : []),
    [data, detailMonth],
  );
  const selectedPaymentRecommendations = useMemo(
    () => (detailMonth ? getPaymentPriorityRecommendations(data, detailMonth, 4) : []),
    [data, detailMonth],
  );
  const selectedTransferSuggestions = useMemo(
    () => (detailMonth ? getPreventiveTransferSuggestions(data, detailMonth, 3) : []),
    [data, detailMonth],
  );

  const openTimelineOrigin = (item: CashflowTimelineItem) => {
    setDetailMonth(null);
    onNavigate(item.originPage);
  };

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
        <div className="border-b border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Comparação mensal · {formatMonthBR(selectedMonth)}</h2>
          <p className="text-xs text-gray-400 mt-1">Mês atual contra mês anterior, média de 3 meses e média de 6 meses.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-4">
          {comparison.metrics.map((metric) => (
            <ComparisonMetricCard key={metric.key} metric={metric} />
          ))}
        </div>
      </Card>

      {comparison.categoryTrends.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Tendência por categoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {comparison.categoryTrends.map((category) => (
              <div key={category.category} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{category.category}</p>
                  <p className="text-xs text-gray-400">Atual: {formatCurrency(category.currentValue)} · Média 3m: {category.average3Value === null ? 'sem base' : formatCurrency(category.average3Value)}</p>
                </div>
                <TrendBadge value={category.average3ChangePercent} />
              </div>
            ))}
          </div>
        </Card>
      )}

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

      <Modal open={!!detailMonth} onClose={() => setDetailMonth(null)} title={selectedData ? `Detalhes · ${monthLabelShort(selectedData.monthKey)}` : ''} size="lg">
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

            <div>
              <div className="mb-2 flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-blue-500" />
                <h4 className="text-sm font-semibold text-gray-700">Transferências preventivas</h4>
              </div>
              <div className="space-y-1.5">
                {selectedTransferSuggestions.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Nenhuma transferência preventiva sugerida para este mês.</p>
                ) : (
                  selectedTransferSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => {
                        setDetailMonth(null);
                        onNavigate('contas');
                      }}
                      className="flex w-full items-start justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-left transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {suggestion.fromAccountLabel} → {suggestion.toAccountLabel}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{suggestion.reason}</p>
                        <p className="mt-1 text-xs text-gray-400">Transferir até {formatDateBR(suggestion.suggestedDate).slice(0, 5)}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Badge color="blue">Sugestão</Badge>
                        <span className="min-w-[92px] text-right text-sm font-bold text-blue-700">{formatCurrency(suggestion.amount)}</span>
                        <ArrowUpRight size={15} className="text-blue-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-700">O que pagar primeiro</h4>
              </div>
              <div className="space-y-1.5">
                {selectedPaymentRecommendations.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Nenhuma pendência prevista para priorizar neste mês.</p>
                ) : (
                  selectedPaymentRecommendations.map((recommendation) => (
                    <button
                      key={recommendation.id}
                      type="button"
                      onClick={() => openTimelineOrigin(recommendation.item)}
                      className="flex w-full items-start justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-left transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">{recommendation.rank}</span>
                          <p className="truncate text-sm font-semibold text-gray-800">{recommendation.item.label}</p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{recommendation.reason}</p>
                        <p className="mt-1 truncate text-xs text-gray-400">{recommendation.accountLabel}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Badge color={recommendation.riskLevel === 'alto' ? 'red' : recommendation.riskLevel === 'medio' ? 'yellow' : 'green'}>
                          {recommendation.riskLevel === 'alto' ? 'Alto' : recommendation.riskLevel === 'medio' ? 'Médio' : 'Baixo'}
                        </Badge>
                        <span className="min-w-[92px] text-right text-sm font-bold text-rose-600">{formatCurrency(-recommendation.amount)}</span>
                        <ArrowUpRight size={15} className="text-amber-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <CalendarDays size={16} className="text-blue-500" />
                <h4 className="text-sm font-semibold text-gray-700">Linha do tempo financeira</h4>
              </div>
              <div className="space-y-1.5">
                {selectedTimeline.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Nenhum movimento previsto ou realizado neste mês.</p>
                ) : (
                  selectedTimeline.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openTimelineOrigin(item)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-16 flex-shrink-0 text-xs font-bold text-gray-500">{formatDateBR(item.date).slice(0, 5)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{item.label}</p>
                          <p className="truncate text-xs text-gray-400">{item.accountLabel}</p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Badge color={item.status === 'realizado' ? 'green' : 'yellow'}>{item.status === 'realizado' ? 'Realizado' : 'Previsto'}</Badge>
                        <span className={`min-w-[92px] text-right text-sm font-bold ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(item.amount)}
                        </span>
                        <ArrowUpRight size={15} className="text-gray-300" />
                      </div>
                    </button>
                  ))
                )}
              </div>
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

function ComparisonMetricCard({ metric }: { metric: MonthlyComparisonMetric }) {
  const formatValue = (value: number | null) => {
    if (value === null) return 'sem base';
    return metric.unit === 'percent' ? formatPercent(value) : formatCurrency(value);
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400">{metric.label}</p>
          <p className="text-lg font-bold text-gray-900">{formatValue(metric.currentValue)}</p>
        </div>
        <TrendBadge value={metric.average3ChangePercent} />
      </div>
      <div className="mt-3 space-y-1 text-xs">
        <ComparisonLine label="Mês anterior" reference={formatValue(metric.previousMonthValue)} change={metric.previousMonthChangePercent} />
        <ComparisonLine label="Média 3 meses" reference={formatValue(metric.average3Value)} change={metric.average3ChangePercent} />
        <ComparisonLine label="Média 6 meses" reference={formatValue(metric.average6Value)} change={metric.average6ChangePercent} />
      </div>
    </div>
  );
}

function ComparisonLine({ label, reference, change }: { label: string; reference: string; change: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-400">{label}: {reference}</span>
      <TrendBadge value={change} compact />
    </div>
  );
}

function TrendBadge({ value, compact = false }: { value: number | null; compact?: boolean }) {
  if (value === null) return <Badge color="gray">sem base</Badge>;
  const positive = value > 0;
  const neutral = Math.abs(value) < 0.01;
  const color = neutral ? 'gray' : positive ? 'yellow' : 'green';
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <Badge color={color}>
      <span className="inline-flex items-center gap-1">
        {!compact && !neutral && <Icon size={12} />}
        {positive ? '+' : ''}{formatPercent(value)}
      </span>
    </Badge>
  );
}
