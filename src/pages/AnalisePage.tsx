import { useMemo } from 'react';
import { Activity, BarChart3, PieChart, TrendingDown, TrendingUp } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { getFinancialHealthIndicators, getMonthlyComparisonSummary, projectMonths } from '@/lib/projection';
import { formatCurrency, formatMonthBR, formatPercent } from '@/lib/format';
import { Badge, Card, ProgressBar } from '@/components/ui';
import type { FinancialHealthIndicator, MonthlyComparisonMetric } from '@/lib/projection';

export function AnalisePage() {
  const { data } = useData();
  const { selectedMonth } = useMonth();

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const current = projection.months[0];
  const healthIndicators = useMemo(() => getFinancialHealthIndicators(data, projection), [data, projection]);
  const comparison = useMemo(() => getMonthlyComparisonSummary(data, selectedMonth), [data, selectedMonth]);

  if (!current) return null;

  const categoryItems = Object.entries(current.categoryBreakdown)
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const typeItems = [
    { label: 'Fixos', value: current.fixedExpenses },
    { label: 'Prazo', value: current.prazoExpenses },
    { label: 'Pontuais', value: current.variableExpenses },
    { label: 'Cartões', value: current.cardExpenses },
    { label: 'Dívidas', value: current.debtExpenses },
  ].filter((item) => item.value > 0);

  const classItems = [
    { label: 'Essenciais', value: current.essentialExpenses },
    { label: 'Estilo de vida', value: current.discretionaryExpenses },
    { label: 'Financeiros', value: current.financialCommitments },
    { label: 'Outros', value: current.otherExpenses },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Análise financeira</h1>
        <p className="text-sm text-gray-500">Competência: {formatMonthBR(selectedMonth)}</p>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={18} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-700">Saúde financeira completa</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {healthIndicators.map((indicator) => (
            <HealthCard key={indicator.id} indicator={indicator} />
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-700">Comparações</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {comparison.metrics.map((metric) => (
            <ComparisonCard key={metric.key} metric={metric} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DistributionCard title="Distribuição por categoria" icon={<PieChart size={18} className="text-blue-600" />} items={categoryItems} total={current.totalExpenses} />
        <DistributionCard title="Distribuição por tipo" icon={<BarChart3 size={18} className="text-blue-600" />} items={typeItems} total={current.totalExpenses} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-700">Distribuição por classe</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {classItems.map((item) => (
            <ClassBox key={item.label} label={item.label} value={item.value} total={current.totalExpenses} />
          ))}
        </div>
      </Card>

      {comparison.categoryTrends.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown size={18} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-700">Categorias contra média de 3 meses</h2>
          </div>
          <div className="space-y-2">
            {comparison.categoryTrends.map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700">{item.category}</p>
                  <p className="text-xs text-gray-400">
                    Atual: {formatCurrency(item.currentValue)} · Média 3m: {item.average3Value === null ? 'sem base' : formatCurrency(item.average3Value)}
                  </p>
                </div>
                <TrendBadge value={item.average3ChangePercent} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function HealthCard({ indicator }: { indicator: FinancialHealthIndicator }) {
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
          <p className="mt-1 text-lg font-bold text-gray-900">{valueText}</p>
        </div>
        <Badge color={statusColor[indicator.status]}>{statusLabel[indicator.status]}</Badge>
      </div>
      <p className="mt-2 text-xs text-gray-600">{indicator.explanation}</p>
      <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
        <p className="text-[11px] text-gray-400">Fórmula: {indicator.formula}</p>
        <p className="text-[11px] text-gray-400">{indicator.range}</p>
      </div>
    </div>
  );
}

function ComparisonCard({ metric }: { metric: MonthlyComparisonMetric }) {
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

function DistributionCard({ title, icon, items, total }: { title: string; icon: React.ReactNode; items: { label: string; value: number }[]; total: number }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum gasto em análise neste mês.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <DistributionRow key={item.label} item={item} total={total} />
          ))}
        </div>
      )}
    </Card>
  );
}

function DistributionRow({ item, total }: { item: { label: string; value: number }; total: number }) {
  const percent = total > 0 ? (item.value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-gray-600">{item.label}</span>
        <span className="flex-shrink-0 font-medium text-gray-900">{formatCurrency(item.value)} · {formatPercent(percent)}</span>
      </div>
      <ProgressBar value={percent} max={100} color={percent >= 35 ? 'red' : percent >= 20 ? 'yellow' : 'blue'} />
    </div>
  );
}

function ClassBox({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(value)}</p>
      <p className="mt-1 text-xs text-gray-500">{formatPercent(percent)} dos gastos</p>
    </div>
  );
}

function ComparisonLine({ label, reference, change }: { label: string; reference: string; change: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-400">{label}: {reference}</span>
      <TrendBadge value={change} />
    </div>
  );
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return <Badge color="gray">sem base</Badge>;
  if (Math.abs(value) < 0.05) return <Badge color="gray">estável</Badge>;
  return (
    <Badge color={value > 0 ? 'red' : 'green'}>
      {value > 0 ? '+' : ''}{formatPercent(value)}
    </Badge>
  );
}
