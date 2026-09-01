import { useMemo, useState } from 'react';
import { TrendingUp, CreditCard, Wallet, PieChart as PieChartIcon, AlertCircle, Info, AlertTriangle, LineChart as LineChartIcon, Banknote, ReceiptText, ChevronRight, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { cardInvoiceDetail, getPlanningMonthDetails, projectMonths, generateAlerts, getCardMonthlyLimit, getFinancialHealthIndicators, getProjectionHorizonSummaries } from '@/lib/projection';
import { formatCurrency, formatPercent, monthLabelShort, formatMonthBR } from '@/lib/format';
import { formatBankAccountLabel } from '@/lib/finance/accountRules';
import { Card, StatCard, Badge, ProgressBar, Modal } from '@/components/ui';
import type { PageId } from '@/components/Layout';
import type { FinancialHealthIndicator } from '@/lib/projection';

const dashboardText = {
  pageTitle: 'text-2xl font-bold text-gray-900',
  pageSubtitle: 'text-sm text-gray-500',
  sectionTitle: 'text-sm font-semibold text-gray-700',
  label: 'text-xs font-medium text-gray-500',
  secondary: 'text-xs text-gray-400',
  value: 'text-sm font-semibold',
  primaryValue: 'text-lg font-bold',
  help: 'text-xs text-gray-500',
};

const statusText = {
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-rose-600',
  info: 'text-blue-600',
  neutral: 'text-gray-900',
};

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { data, isInvoicePaid } = useData();
  const { selectedMonth } = useMonth();
  const [detailModal, setDetailModal] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState({
    cards: false,
    future: false,
    health: false,
    chart: false,
  });

  const projection = useMemo(() => projectMonths(data, 24, selectedMonth), [data, selectedMonth]);
  const alerts = useMemo(() => generateAlerts(data, projection), [data, projection]);
  const healthIndicators = useMemo(() => getFinancialHealthIndicators(data, projection), [data, projection]);
  const horizonSummaries = useMemo(() => getProjectionHorizonSummaries(data, projection), [data, projection]);
  const planning = useMemo(() => getPlanningMonthDetails(data, selectedMonth), [data, selectedMonth]);
  const current = projection.months[0];

  if (!current) return null;

  const toggleBlock = (block: keyof typeof expandedBlocks) => {
    setExpandedBlocks((prev) => ({ ...prev, [block]: !prev[block] }));
  };

  const cardLimit = getCardMonthlyLimit(data.settings, selectedMonth);
  const cardPct = cardLimit > 0 ? (current.cardExpenses / cardLimit) * 100 : 0;
  const cardColor = cardPct > 100 ? 'red' : cardPct >= 80 ? 'yellow' : 'green';
  const availableBalance = data.bankAccounts.reduce((sum, account) => sum + account.balance, 0);

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
  const resultContext = current.balance >= 0 ? 'Entradas menos saídas do mês.' : 'As saídas superam as entradas.';
  const availableBalanceContext = data.bankAccounts.length > 0 ? `${data.bankAccounts.length} conta(s) cadastrada(s).` : 'Nenhuma conta cadastrada.';

  const flowData = projection.months.slice(0, 12).map((m) => ({
    month: monthLabelShort(m.monthKey),
    Receitas: Math.round(m.income),
    Despesas: Math.round(m.totalExpenses),
    Resultado: Math.round(m.balance),
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
          colorClass: statusText.neutral,
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
            colorClass: mode === 'unpaid' ? statusText.warning : statusText.neutral,
          }))}
          totalLabel="Total"
          total={total}
        />
      </div>
    ));
  };

  const showResultDetail = () => {
    openDetail(`Resultado do mês · ${formatMonthBR(selectedMonth)}`, (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Resultado é o fluxo do mês: entradas menos saídas. Ele não soma o dinheiro que já estava nas contas.</p>
        <DetailRow label="Entradas do mês" amount={current.income} colorClass={statusText.neutral} />
        <DetailRow label="Saídas previstas" amount={-current.expectedExpenses} colorClass={statusText.neutral} />
        <DetailRow label="Resultado do mês" amount={current.balance} colorClass={current.balance >= 0 ? statusText.positive : statusText.critical} strong />
      </div>
    ));
  };

  const showAvailableBalanceDetail = () => {
    openDetail(`Saldo disponível · ${formatMonthBR(selectedMonth)}`, (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Saldo disponível é o estoque atual de dinheiro nas contas. Receitas já recebidas e transferências internas não são somadas de novo como entrada.</p>
        <DrillDownList
          items={data.bankAccounts.map((account) => ({
            id: account.id,
            label: formatBankAccountLabel(account),
            meta: account.accountType ?? 'Conta bancária',
            amount: account.balance,
            colorClass: account.balance >= 0 ? statusText.positive : statusText.critical,
          }))}
          totalLabel="Saldo disponível"
          total={availableBalance}
        />
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
        colorClass: statusText.neutral,
        })))
      .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
    const debtDetails = category === 'Dívidas'
      ? planning.debts.map(({ debt, amount }) => ({
          id: debt.id,
          label: debt.name,
          meta: `${debt.institution || 'Dívida'} · ${debt.installmentsRemaining}x restantes`,
          amount,
          colorClass: statusText.neutral,
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
  const visibleHealthIndicators = expandedBlocks.health ? homeHealthIndicators : homeHealthIndicators.slice(0, 2);
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
      <header className="flex items-start justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h1 className={dashboardText.pageTitle}>Dashboard</h1>
          <p className={dashboardText.pageSubtitle}>{monthLabelShort(selectedMonth)} · Visão geral financeira</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
          <div className={`min-w-0 px-3 py-2 sm:px-4 rounded-xl border-2 ${
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
              <span className="truncate text-sm font-bold text-gray-700">{statusLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={showAlertsDetail}
            aria-label={`${alertStatusLabel}. Ver todos os alertas`}
            className={`min-w-0 rounded-xl border-2 px-3 py-2 transition-colors hover:bg-white sm:px-4 ${
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
              <span className="truncate text-sm font-bold text-gray-700">{alertStatusLabel}</span>
            </div>
          </button>
        </div>
      </header>

      {/* Bloco 1: resumo do mês */}
      <section aria-label="Resumo do mês" className="grid grid-cols-2 xl:grid-cols-5 gap-1">
        <StatCard title="Entradas" value={formatCurrency(current.income)} subtitle={incomeContext} color="blue" icon={<TrendingUp size={18} />} onClick={showIncomeDetail} tooltip="Receitas do mês. Não inclui saldo inicial nem dinheiro já existente nas contas." />
        <StatCard title="Saídas" value={formatCurrency(current.realizedExpenses)} subtitle={expenseContext} color={current.balance < 0 ? 'red' : 'gray'} icon={<ReceiptText size={18} />} onClick={() => showExpensesDetail('Saídas', 'realized')} tooltip={`Despesas do mês conforme o motor financeiro. Previsto: ${formatCurrency(current.expectedExpenses)}.`} />
        <StatCard title="A pagar" value={formatCurrency(current.unpaidExpenses)} subtitle={`${formatPercent(unpaidPercent)} pendente. ${unpaidContext}`} color={current.unpaidExpenses > 0 ? 'yellow' : 'green'} icon={<Banknote size={18} />} onClick={() => showExpensesDetail('A pagar', 'unpaid')} tooltip="Saídas ainda pendentes." />
        <StatCard title="Resultado do mês" value={formatCurrency(current.balance)} subtitle={resultContext} color={current.balance >= 0 ? 'green' : 'red'} icon={<Wallet size={18} />} onClick={showResultDetail} tooltip="Entradas menos saídas do mês. Não representa o dinheiro total disponível." />
        <StatCard title="Saldo disponível" value={formatCurrency(availableBalance)} subtitle={availableBalanceContext} color={availableBalance >= 0 ? 'green' : 'red'} icon={<Building2 size={18} />} onClick={showAvailableBalanceDetail} tooltip="Soma atual dos saldos das contas. Inclui saldo inicial, recebimentos, pagamentos, estornos e transferências internas." />
      </section>

      <section aria-label="Cartões e próximos meses" className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {/* Bloco 3: cartões */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <h3 className={dashboardText.sectionTitle}>Cartões</h3>
              </div>
              <p className={`${dashboardText.secondary} mt-1`}>{formatMonthBR(selectedMonth)}</p>
            </div>
            <DashboardLink onClick={() => onNavigate('cartoes')}>Ver cartões</DashboardLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <MetricItem label="Fatura do mês" value={formatCurrency(current.cardExpenses)} description={current.cardExpenses > 0 ? 'Valor que entra nas saídas deste mês.' : 'Sem fatura prevista neste mês.'} negative={cardPct > 100} />
            <MetricItem label="Meta" value={formatCurrency(cardLimit)} description={cardPct > 100 ? 'A fatura passou da meta mensal.' : 'Referência para controlar a fatura.'} />
            {expandedBlocks.cards && (
              <>
                <MetricItem label="% da renda" value={formatPercent(cardIncomePercent)} description={cardIncomePercent >= 35 ? 'Cartões estão pesando na renda.' : 'Mostra o peso dos cartões na renda.'} negative={cardIncomePercent >= 35} />
                <MetricItem label="Parcelas futuras" value={formatCurrency(current.parcelasFuturas)} description={current.parcelasFuturas > 0 ? 'Compromisso que já chega nos próximos meses.' : 'Sem parcelas futuras cadastradas.'} />
              </>
            )}
          </div>
          {expandedBlocks.cards && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-400">Uso da meta mensal</span>
                <Badge color={cardColor}>{formatPercent(cardPct)}</Badge>
              </div>
              <ProgressBar value={current.cardExpenses} max={cardLimit} color={cardColor} />
            </div>
          )}
          <DashboardExpandButton expanded={expandedBlocks.cards} onClick={() => toggleBlock('cards')} />
        </Card>

        {/* Bloco 3: próximos meses */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LineChartIcon size={16} className="text-blue-600" />
                <h3 className={dashboardText.sectionTitle}>Próximos meses</h3>
              </div>
              <p className={`${dashboardText.secondary} mt-1`}>Visão rápida dos próximos {futureSummary?.months ?? 12} meses</p>
            </div>
            <DashboardLink onClick={() => onNavigate('projecao')}>Ver projeção</DashboardLink>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
            <MetricItem
              label="Meses negativos"
              value={`${futureSummary?.negativeMonths ?? 0} nos próximos ${futureSummary?.months ?? 12}`}
              description={(futureSummary?.negativeMonths ?? 0) > 0 ? 'Há risco em meses futuros.' : 'Nenhum mês futuro crítico no período.'}
              negative={(futureSummary?.negativeMonths ?? 0) > 0}
              positive={(futureSummary?.negativeMonths ?? 0) === 0}
            />
            {expandedBlocks.future && (
              <>
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
              </>
            )}
          </div>
          <DashboardExpandButton expanded={expandedBlocks.future} onClick={() => toggleBlock('future')} />
        </Card>
      </section>

      <section aria-label="Categorias e saúde financeira" className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PieChartIcon size={18} className="text-blue-600" />
              <h3 className={dashboardText.sectionTitle}>Onde você mais gastou</h3>
            </div>
            {categoryRanking.length > 5 && (
              <DashboardLink onClick={showAllCategoriesDetail}>Ver categorias</DashboardLink>
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
              <h3 className={dashboardText.sectionTitle}>Saúde financeira</h3>
            </div>
            <DashboardLink onClick={() => onNavigate('analise')}>Ver análise</DashboardLink>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {visibleHealthIndicators.map((indicator) => (
              <HealthIndicatorCard
                key={indicator.id}
                indicator={indicator}
                onClick={() => openDetail(`Saúde financeira · ${indicator.label}`, (
                  <HealthIndicatorDetail indicator={indicator} />
                ))}
              />
            ))}
          </div>
          {homeHealthIndicators.length > 2 && (
            <DashboardExpandButton expanded={expandedBlocks.health} onClick={() => toggleBlock('health')} />
          )}
        </Card>
      </section>

      <section aria-labelledby="dashboard-flow-title">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 id="dashboard-flow-title" className={dashboardText.sectionTitle}>Fluxo financeiro dos próximos meses</h3>
            <DashboardExpandButton expanded={expandedBlocks.chart} onClick={() => toggleBlock('chart')} compact />
          </div>
          {expandedBlocks.chart && (
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Receitas" stroke="#64748B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Despesas" stroke="#94A3B8" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Resultado" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.title ?? ''}>
        {detailModal?.content}
      </Modal>
    </div>
  );
}

function MetricItem({ label, value, description, positive, negative }: { label: string; value: string; description?: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="rounded-md bg-gray-50/70 p-3">
      <p className={dashboardText.secondary}>{label}</p>
      <p className={`${dashboardText.value} break-words [overflow-wrap:anywhere] ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-gray-900'}`}>{value}</p>
      {description && <p className={`${dashboardText.help} mt-1`}>{description}</p>}
    </div>
  );
}

function DashboardLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
    >
      {children}
      <ChevronRight size={14} />
    </button>
  );
}

function DashboardExpandButton({ expanded, onClick, compact = false }: { expanded: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={`${compact ? '' : 'mt-3'} inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded`}
    >
      {expanded ? 'Mostrar menos' : 'Mostrar mais'}
      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
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
          <div key={item.id} className="flex items-start justify-between gap-3 border-b border-gray-100 py-2.5 last:border-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700">{item.label}</p>
              <p className={dashboardText.secondary}>{item.meta}</p>
            </div>
            <span className={`max-w-[45%] flex-shrink-0 text-right break-words [overflow-wrap:anywhere] ${dashboardText.value} ${item.colorClass}`}>{formatCurrency(item.amount)}</span>
          </div>
        ))
      )}
      <div className="flex items-center justify-between gap-3 rounded-md bg-blue-50/70 p-3">
        <span className="text-sm font-semibold text-blue-700">{totalLabel}</span>
        <span className={`${dashboardText.value} text-blue-900`}>{formatCurrency(total)}</span>
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
      <p className={`mb-2 ${dashboardText.label}`}>Composição por categoria</p>
      <div className="space-y-1.5">
        {totals.map(([category, amount]) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryClick(category)}
            className="flex w-full items-center justify-between gap-3 border-b border-gray-100 py-2 text-left transition-colors last:border-0 hover:text-blue-700"
          >
            <span className="text-sm text-gray-700">{category}</span>
            <span className={`max-w-[45%] text-right break-words [overflow-wrap:anywhere] ${dashboardText.value} text-gray-900`}>{formatCurrency(amount)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, amount, colorClass, strong = false }: { label: string; amount: number; colorClass: string; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 border-b border-gray-100 py-2.5 last:border-0 ${strong ? 'rounded-md border-b-0 bg-blue-50/70 px-3' : ''}`}>
      <span className={`text-sm ${strong ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>{label}</span>
      <span className={`max-w-[45%] text-right break-words [overflow-wrap:anywhere] ${dashboardText.value} ${colorClass}`}>{formatCurrency(amount)}</span>
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
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver detalhes da categoria ${item.category}`}
      className="w-full rounded-md px-1 py-2.5 text-left transition-colors hover:bg-blue-50/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium text-gray-700">{item.category}</span>
        </div>
        <div className="flex min-w-0 flex-shrink-0 items-center justify-end gap-2">
          <span className={`break-words text-right [overflow-wrap:anywhere] ${dashboardText.value} text-gray-900`}>{formatCurrency(item.value)}</span>
          <span className={`w-12 text-right ${dashboardText.secondary}`}>{percent.toFixed(0)}%</span>
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
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver detalhes de ${indicator.label}`}
      className="rounded-md bg-gray-50/70 p-3 text-left transition-colors hover:bg-blue-50/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={dashboardText.label}>{indicator.label}</p>
          <p className={`${dashboardText.primaryValue} mt-1 text-gray-900`}>{valueText}</p>
        </div>
        <Badge color={statusColor[indicator.status]}>{statusLabel[indicator.status]}</Badge>
      </div>
      <p className={`${dashboardText.help} mt-2 text-gray-600`}>{indicator.explanation}</p>
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
        <p className={dashboardText.label}>Faixa de leitura</p>
        <p className="mt-1 text-sm text-gray-700">{indicator.range}</p>
      </div>
    </div>
  );
}
