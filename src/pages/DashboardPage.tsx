import { useMemo, useState } from 'react';
import { TrendingUp, CreditCard, Wallet, PieChart as PieChartIcon, AlertCircle, Info, AlertTriangle, LineChart as LineChartIcon, Banknote, ReceiptText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { cardInvoiceDetail, getPlanningMonthDetails, projectMonths, generateAlerts, getCardMonthlyLimit, getFinancialHealthIndicators, getProjectionHorizonSummaries } from '@/lib/projection';
import { formatCurrency, formatPercent, monthLabelShort, formatMonthBR } from '@/lib/format';
import { Card, StatCard, Badge, ProgressBar } from '@/components/ui';
import type { PageId } from '@/components/Layout';
import type { FinancialHealthIndicator } from '@/lib/projection';

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { data, isInvoicePaid } = useData();
  const { selectedMonth } = useMonth();
  const [detailModal, setDetailModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const alerts = useMemo(() => generateAlerts(data, projection), [data, projection]);
  const healthIndicators = useMemo(() => getFinancialHealthIndicators(data, projection), [data, projection]);
  const horizonSummaries = useMemo(() => getProjectionHorizonSummaries(data, projection), [data, projection]);
  const planning = useMemo(() => getPlanningMonthDetails(data, selectedMonth), [data, selectedMonth]);
  const current = projection.months[0];

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
  const unpaidPercent = current.realizedExpenses > 0 ? (current.unpaidExpenses / current.realizedExpenses) * 100 : 0;
  const cardIncomePercent = current.income > 0 ? (current.cardExpenses / current.income) * 100 : 0;
  const incomeContext = current.income > 0 ? 'Base para cobrir as saídas do mês.' : 'Sem entradas previstas neste mês.';
  const expenseContext = current.balance >= 0 ? 'As saídas cabem nas entradas atuais.' : 'As saídas passam das entradas.';
  const unpaidContext = current.unpaidExpenses > 0 ? 'Ainda precisa de atenção no mês.' : 'Não há pendências nas saídas.';
  const balanceContext = current.balance >= 0 ? 'Há folga prevista neste mês.' : 'O mês pode fechar no negativo.';

  const flowData = projection.months.slice(0, 12).map((m) => ({
    month: monthLabelShort(m.monthKey),
    Receitas: Math.round(m.income),
    Despesas: Math.round(m.totalExpenses),
    Saldo: Math.round(m.balance),
  }));

  const openDetail = (title: string, content: React.ReactNode) => {
    setDetailModal({ title, content });
  };

  const showIncomeDetail = () => {
    openDetail(`Receitas · ${formatMonthBR(selectedMonth)}`, (
      <DrillDownList
        items={planning.incomes.map(({ income, amount }) => ({
          id: income.id,
          label: income.name,
          meta: `${income.type} · ${income.person || 'Sem responsável'}`,
          amount,
          colorClass: 'text-emerald-600',
        }))}
        totalLabel="Total receitas"
        total={current.income}
      />
    ));
  };

  const showExpensesDetail = (title: string, mode: 'expected' | 'realized' | 'unpaid') => {
    const isExpensePaidForMonth = (expense: { paidMonths?: Record<string, boolean> }) => expense.paidMonths?.[selectedMonth] ?? false;
    const direct = planning.expenses.map(({ expense, amount }) => ({
      id: expense.id,
      label: expense.description,
      meta: `${expense.category} · ${expense.type} · ${isExpensePaidForMonth(expense) ? 'Pago' : 'Pendente'}`,
      amount,
      category: expense.category,
      paid: isExpensePaidForMonth(expense),
    }));
    const cards = planning.cards.map(({ cardId, amount }) => {
      const card = data.cards.find((item) => item.id === cardId);
      return {
        id: `card-${cardId}`,
        label: `Cartão ${card?.name ?? cardId}`,
        meta: 'Fatura de cartão',
        amount,
        category: 'Cartões',
        paid: isInvoicePaid(cardId, selectedMonth),
      };
    });
    const debts = planning.debts.map(({ debt, amount }) => ({
      id: debt.id,
      label: debt.name,
      meta: `${debt.institution || 'Dívida'} · ${debt.installmentsRemaining}x restantes`,
      amount,
      category: 'Dívidas',
      paid: false,
    }));
    const entries = [...direct, ...cards, ...debts].filter((item) => mode !== 'unpaid' || !item.paid);
    const total = mode === 'expected' ? current.expectedExpenses : mode === 'realized' ? current.realizedExpenses : current.unpaidExpenses;
    openDetail(`${title} · ${formatMonthBR(selectedMonth)}`, (
      <div className="space-y-4">
        <CategorySummary
          entries={entries}
          onCategoryClick={(category) => showCategoryDetail(category)}
        />
        <DrillDownList
          items={entries.map((item) => ({
            id: item.id,
            label: item.label,
            meta: item.meta,
            amount: item.amount,
            colorClass: mode === 'unpaid' ? 'text-amber-600' : 'text-rose-600',
          }))}
          totalLabel="Total"
          total={total}
        />
      </div>
    ));
  };

  const showBalanceDetail = () => {
    openDetail(`Saldo previsto · ${formatMonthBR(selectedMonth)}`, (
      <div className="space-y-2">
        <DetailRow label="Receitas" amount={current.income} colorClass="text-emerald-600" />
        <DetailRow label="Despesas previstas" amount={-current.expectedExpenses} colorClass="text-rose-600" />
        <DetailRow label="Saldo previsto" amount={current.balance} colorClass={current.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'} strong />
      </div>
    ));
  };

  const showCategoryDetail = (category: string) => {
    const includeAllCards = category === 'Cartões';
    const direct = planning.expenses
      .filter(({ expense }) => expense.category === category)
      .map(({ expense, amount }) => ({
        id: expense.id,
        label: expense.description,
        meta: `${expense.type} · Dia ${expense.dueDay}`,
        amount,
        colorClass: 'text-gray-900',
      }));
    const cardDetails = data.cards
      .flatMap((card) => cardInvoiceDetail(data, card.id, selectedMonth)
        .filter((item) => includeAllCards || item.category === category)
        .map((item) => ({
          id: `${card.id}-${item.purchaseId}`,
          label: item.name,
          meta: `Cartão ${card.name} · ${item.installmentNumber}/${item.totalInstallments}`,
          amount: item.amount,
          colorClass: 'text-purple-600',
        })))
      .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
    const debtDetails = category === 'Dívidas'
      ? planning.debts.map(({ debt, amount }) => ({
          id: debt.id,
          label: debt.name,
          meta: `${debt.institution || 'Dívida'} · ${debt.installmentsRemaining}x restantes`,
          amount,
          colorClass: 'text-rose-600',
        }))
      : [];
    openDetail(`${category} · ${formatMonthBR(selectedMonth)}`, (
      <DrillDownList
        items={[...direct, ...cardDetails, ...debtDetails]}
        totalLabel={`Total ${category}`}
        total={current.categoryBreakdown[category] ?? 0}
      />
    ));
  };

  const alertIcons = {
    critical: <AlertCircle className="text-rose-500" size={16} />,
    warning: <AlertTriangle className="text-amber-500" size={16} />,
    info: <Info className="text-blue-500" size={16} />,
  };

  const alertBg = {
    critical: 'bg-rose-50/70',
    warning: 'bg-amber-50/70',
    info: 'bg-blue-50/70',
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
  const topAlertSeverity = alerts[0]?.severity;
  const alertStatusColor = topAlertSeverity === 'critical' ? 'red' : topAlertSeverity === 'warning' ? 'yellow' : topAlertSeverity === 'info' ? 'blue' : 'green';
  const alertStatusLabel = alerts.length === 0 ? 'Sem alertas' : alerts.length === 1 ? '1 alerta' : `${alerts.length} alertas`;
  const showAlertsDetail = () => {
    openDetail(`Alertas · ${formatMonthBR(selectedMonth)}`, (
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum alerta prioritário no momento.</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`rounded-lg p-3 ${alertBg[alert.severity]}`}>
              <div className="mb-1 flex items-center gap-2">
                {alertIcons[alert.severity]}
                <p className="flex-1 text-sm font-semibold text-gray-800">{alert.title}</p>
                <Badge color={alertBadgeColor[alert.severity]}>{alertSeverityLabel[alert.severity]}</Badge>
              </div>
              <p className="text-sm text-gray-700">{alert.description}</p>
              {alert.month && alert.month !== selectedMonth && (
                <p className="mt-1 text-xs text-gray-400">{formatMonthBR(alert.month)}</p>
              )}
            </div>
          ))
        )}
      </div>
    ));
  };
  const futureSummary = horizonSummaries.find((summary) => summary.months === 12) ?? horizonSummaries[horizonSummaries.length - 1];
  const homeHealthIndicators = healthIndicators.filter((indicator) => (
    indicator.id === 'savings-rate'
    || indicator.id === 'fixed-commitment'
    || indicator.id === 'reserve-coverage'
  ));
  const categoryRanking = Object.entries(current.categoryBreakdown)
    .map(([category, value]) => ({ category, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const topCategoryRanking = categoryRanking.slice(0, 5);
  const categoryRankingTotal = categoryRanking.reduce((sum, item) => sum + item.value, 0);
  const showAllCategoriesDetail = () => {
    openDetail(`Onde você mais gastou · ${formatMonthBR(selectedMonth)}`, (
      <div className="space-y-2">
        {categoryRanking.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum gasto encontrado neste mês.</p>
        ) : (
          categoryRanking.map((item, index) => (
            <CategoryRankingRow
              key={item.category}
              item={item}
              index={index}
              total={categoryRankingTotal}
              onClick={() => showCategoryDetail(item.category)}
            />
          ))
        )}
      </div>
    ));
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{monthLabelShort(selectedMonth)} · Visão geral financeira</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={showAlertsDetail}
            className={`rounded-xl border-2 px-4 py-2 transition-colors hover:bg-white ${
              alertStatusColor === 'green' ? 'bg-emerald-50 border-emerald-300' :
              alertStatusColor === 'red' ? 'bg-rose-50 border-rose-300' :
              alertStatusColor === 'yellow' ? 'bg-amber-50 border-amber-300' :
              'bg-blue-50 border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className={
                alertStatusColor === 'green' ? 'text-emerald-500' :
                alertStatusColor === 'red' ? 'text-rose-500' :
                alertStatusColor === 'yellow' ? 'text-amber-500' :
                'text-blue-500'
              } />
              <span className="text-sm font-bold text-gray-700">{alertStatusLabel}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bloco 1: resumo do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-1">
        <StatCard title="Entradas" value={formatCurrency(current.income)} subtitle={incomeContext} color="green" icon={<TrendingUp size={18} />} onClick={showIncomeDetail} tooltip="Receitas previstas do mês." />
        <StatCard title="Saídas" value={formatCurrency(current.realizedExpenses)} subtitle={expenseContext} color="red" icon={<ReceiptText size={18} />} onClick={() => showExpensesDetail('Saídas', 'realized')} tooltip={`Previsto: ${formatCurrency(current.expectedExpenses)}.`} />
        <StatCard title="A pagar" value={formatCurrency(current.unpaidExpenses)} subtitle={`${formatPercent(unpaidPercent)} pendente. ${unpaidContext}`} color={current.unpaidExpenses > 0 ? 'yellow' : 'green'} icon={<Banknote size={18} />} onClick={() => showExpensesDetail('A pagar', 'unpaid')} tooltip="Saídas ainda pendentes." />
        <StatCard title="Saldo do mês" value={formatCurrency(current.balance)} subtitle={balanceContext} color={current.balance >= 0 ? 'green' : 'red'} icon={<Wallet size={18} />} onClick={showBalanceDetail} tooltip={`Saldo em contas: ${formatCurrency(current.projectedAccountsBalance)}.`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {/* Bloco 3: cartões */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Cartões</h3>
              </div>
              <p className="mt-1 text-xs text-gray-400">{formatMonthBR(selectedMonth)}</p>
            </div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => onNavigate('cartoes')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Ver cartões</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <MetricItem label="Fatura do mês" value={formatCurrency(current.cardExpenses)} description={current.cardExpenses > 0 ? 'Valor que entra nas saídas deste mês.' : 'Sem fatura prevista neste mês.'} negative={current.cardExpenses > 0} />
            <MetricItem label="Meta" value={formatCurrency(cardLimit)} description={cardPct > 100 ? 'A fatura passou da meta mensal.' : 'Referência para controlar a fatura.'} />
            <MetricItem label="% da renda" value={formatPercent(cardIncomePercent)} description={cardIncomePercent >= 35 ? 'Cartões estão pesando na renda.' : 'Mostra o peso dos cartões na renda.'} negative={cardIncomePercent >= 35} />
            <MetricItem label="Parcelas futuras" value={formatCurrency(current.parcelasFuturas)} description={current.parcelasFuturas > 0 ? 'Compromisso que já chega nos próximos meses.' : 'Sem parcelas futuras cadastradas.'} negative={current.parcelasFuturas > 0} />
          </div>
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-400">Uso da meta mensal</span>
              <Badge color={cardColor}>{formatPercent(cardPct)}</Badge>
            </div>
            <ProgressBar value={current.cardExpenses} max={cardLimit} color={cardColor} />
          </div>
        </Card>

        {/* Bloco 3: próximos meses */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LineChartIcon size={16} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Próximos meses</h3>
              </div>
              <p className="mt-1 text-xs text-gray-400">Visão rápida dos próximos {futureSummary?.months ?? 12} meses</p>
            </div>
            <button onClick={() => onNavigate('projecao')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Ver projeção</button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
            <MetricItem
              label="Meses negativos"
              value={`${futureSummary?.negativeMonths ?? 0} nos próximos ${futureSummary?.months ?? 12}`}
              description={(futureSummary?.negativeMonths ?? 0) > 0 ? 'Há risco em meses futuros.' : 'Nenhum mês futuro crítico no período.'}
              negative={(futureSummary?.negativeMonths ?? 0) > 0}
              positive={(futureSummary?.negativeMonths ?? 0) === 0}
            />
            <MetricItem
              label="Menor saldo previsto"
              value={formatCurrency(futureSummary?.lowestProjectedAccountsBalance ?? 0)}
              description={(futureSummary?.lowestProjectedAccountsBalance ?? 0) < 0 ? 'Saldo pode ficar negativo.' : 'Pior ponto ainda fica positivo.'}
              negative={(futureSummary?.lowestProjectedAccountsBalance ?? 0) < 0}
            />
            <MetricItem
              label="Maior comprometimento"
              value={formatPercent(futureSummary?.highestIncomeCommitmentPercent ?? 0)}
              description={(futureSummary?.highestIncomeCommitmentPercent ?? 0) >= 90 ? 'Pouco espaço de folga no futuro.' : 'Maior pressão prevista sobre a renda.'}
              negative={(futureSummary?.highestIncomeCommitmentPercent ?? 0) >= 90}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PieChartIcon size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Onde você mais gastou</h3>
            </div>
            {categoryRanking.length > 5 && (
              <button type="button" onClick={showAllCategoriesDetail} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Ver todos
              </button>
            )}
          </div>
          <div className="space-y-2">
            {topCategoryRanking.length === 0 ? (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Nenhum gasto encontrado neste mês.</p>
            ) : (
              topCategoryRanking.map((item, index) => (
                <CategoryRankingRow
                  key={item.category}
                  item={item}
                  index={index}
                  total={categoryRankingTotal}
                  onClick={() => showCategoryDetail(item.category)}
                />
              ))
            )}
          </div>
        </Card>

        {/* Bloco 5: saúde financeira */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LineChartIcon size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Saúde financeira</h3>
            </div>
            <Badge color="blue">{formatMonthBR(selectedMonth)}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {homeHealthIndicators.map((indicator) => (
              <HealthIndicatorCard
                key={indicator.id}
                indicator={indicator}
                onClick={() => openDetail(`Saúde financeira · ${indicator.label}`, (
                  <HealthIndicatorDetail indicator={indicator} />
                ))}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Fluxo financeiro dos próximos meses</h3>
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

function MetricItem({ label, value, description, positive, negative }: { label: string; value: string; description?: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-bold ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-gray-900'}`}>{value}</p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
  );
}

interface DrillDownItem {
  id: string;
  label: string;
  meta: string;
  amount: number;
  colorClass: string;
}

function DrillDownList({ items, totalLabel, total }: { items: DrillDownItem[]; totalLabel: string; total: number }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum lançamento encontrado.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700">{item.label}</p>
              <p className="text-xs text-gray-400">{item.meta}</p>
            </div>
            <span className={`flex-shrink-0 text-sm font-bold ${item.colorClass}`}>{formatCurrency(item.amount)}</span>
          </div>
        ))
      )}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 p-3">
        <span className="text-sm font-semibold text-blue-700">{totalLabel}</span>
        <span className="text-sm font-bold text-blue-900">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function CategorySummary({ entries, onCategoryClick }: {
  entries: { category: string; amount: number }[];
  onCategoryClick: (category: string) => void;
}) {
  const totals = Object.entries(entries.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.amount;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  if (totals.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-500">Composição por categoria</p>
      <div className="space-y-1.5">
        {totals.map(([category, amount]) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryClick(category)}
            className="flex w-full items-center justify-between gap-3 rounded-lg bg-gray-50 p-2 text-left hover:bg-blue-50"
          >
            <span className="text-sm text-gray-700">{category}</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, amount, colorClass, strong = false }: { label: string; amount: number; colorClass: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg p-3 ${strong ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <span className={`text-sm ${strong ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>{formatCurrency(amount)}</span>
    </div>
  );
}

function CategoryRankingRow({ item, index, total, onClick }: {
  item: { category: string; value: number };
  index: number;
  total: number;
  onClick: () => void;
}) {
  const percent = total > 0 ? (item.value / total) * 100 : 0;

  return (
    <button type="button" onClick={onClick} className="w-full rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-blue-50">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-500">
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium text-gray-700">{item.category}</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</span>
          <span className="w-12 text-right text-xs text-gray-400">{percent.toFixed(0)}%</span>
        </div>
      </div>
      <ProgressBar value={percent} max={100} color={percent >= 35 ? 'red' : percent >= 20 ? 'yellow' : 'blue'} />
    </button>
  );
}

function HealthIndicatorCard({ indicator, onClick }: { indicator: FinancialHealthIndicator; onClick: () => void }) {
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
    <button type="button" onClick={onClick} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition-colors hover:bg-blue-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{indicator.label}</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{valueText}</p>
        </div>
        <Badge color={statusColor[indicator.status]}>{statusLabel[indicator.status]}</Badge>
      </div>
      <p className="text-xs text-gray-600 mt-2">{indicator.explanation}</p>
    </button>
  );
}

function HealthIndicatorDetail({ indicator }: { indicator: FinancialHealthIndicator }) {
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
    <div className="space-y-3">
      <div className="rounded-lg bg-gray-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gray-600">{indicator.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{valueText}</p>
          </div>
          <Badge color={statusColor[indicator.status]}>{statusLabel[indicator.status]}</Badge>
        </div>
        <p className="mt-2 text-sm text-gray-700">{indicator.explanation}</p>
      </div>
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="text-xs font-medium text-blue-700">Fórmula</p>
        <p className="mt-1 text-sm text-blue-900">{indicator.formula}</p>
      </div>
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-500">Faixa de leitura</p>
        <p className="mt-1 text-sm text-gray-700">{indicator.range}</p>
      </div>
    </div>
  );
}
