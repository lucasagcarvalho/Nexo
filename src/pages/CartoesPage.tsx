import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Copy, CreditCard as CreditCardIcon, ArrowLeft, AlertTriangle, TrendingUp, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { cardProjection, cardUtilization, simulatePurchase, cardInvoiceDetail, purchaseInstallmentStatus, getInvoiceStatus, getCardMonthlyLimit, getCardCommitmentSummary, getFutureInstallmentCalendar, getCardInvoiceForMonth, type InvoiceStatus } from '@/lib/projection';
import { formatCurrency, monthLabelShort, monthShort, formatMonthBR, addMonths, formatPercent, formatDateBR } from '@/lib/format';
import { formatBankAccountLabel } from '@/lib/finance/accountRules';
import type { CreditCard, CardPurchase } from '@/lib/types';
import { Card, Badge, Button, Modal, Input, Select, TextArea, ConfirmDialog, ProgressBar, EmptyState, CurrencyInput, PersonSelect, IconButton, BalanceChangeConfirmDialog } from '@/components/ui';

const CARD_COLORS = ['#EC4899', '#F59E0B', '#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#14B8A6', '#6B7280'];

export function CartoesPage() {
  const { data, addCard, addPerson } = useData();
  const { selectedMonth } = useMonth();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [expandedInstallmentMonth, setExpandedInstallmentMonth] = useState<string | null>(null);

  const [cardForm, setCardForm] = useState<Omit<CreditCard, 'id'>>({
    name: '', bank: '', holder: '', limit: 0, closingDay: 1, dueDay: 1, color: '#3B82F6',
  });

  const selectedCard = data.cards.find((c) => c.id === selectedCardId);
  const commitmentSummary = useMemo(() => getCardCommitmentSummary(data, selectedMonth), [data, selectedMonth]);
  const installmentCalendar = useMemo(() => getFutureInstallmentCalendar(data, selectedMonth, 24), [data, selectedMonth]);
  const holderGroups = useMemo(() => {
    const groups = new Map<string, {
      holder: string;
      cards: CreditCard[];
      totalLimit: number;
      committedLimit: number;
      availableLimit: number;
      currentInvoice: number;
      nextInvoice: number;
      futureInstallments: number;
      highestInvoiceNextSixMonths: number;
    }>();

    for (const card of data.cards) {
      const holder = card.holder || 'Sem titular';
      const indicators = commitmentSummary.cards.find((item) => item.cardId === card.id);
      const current = groups.get(holder) ?? {
        holder,
        cards: [],
        totalLimit: 0,
        committedLimit: 0,
        availableLimit: 0,
        currentInvoice: 0,
        nextInvoice: 0,
        futureInstallments: 0,
        highestInvoiceNextSixMonths: 0,
      };
      current.cards.push(card);
      current.totalLimit += indicators?.limit ?? card.limit;
      current.committedLimit += indicators?.committedLimit ?? 0;
      current.availableLimit += indicators?.availableLimit ?? card.limit;
      current.currentInvoice += indicators?.currentInvoice ?? 0;
      current.nextInvoice += indicators?.nextInvoice ?? 0;
      current.futureInstallments += indicators?.futureInstallments ?? 0;
      current.highestInvoiceNextSixMonths = Math.max(current.highestInvoiceNextSixMonths, indicators?.highestInvoiceNextSixMonths ?? 0);
      groups.set(holder, current);
    }

    return Array.from(groups.values()).sort((a, b) => a.holder.localeCompare(b.holder));
  }, [data.cards, commitmentSummary.cards]);

  if (selectedCard) {
    return <CardDetail card={selectedCard} onBack={() => setSelectedCardId(null)} />;
  }

  const openAddCard = () => {
    setCardForm({ name: '', bank: '', holder: '', limit: 0, closingDay: 1, dueDay: 1, color: '#3B82F6' });
    setCardModalOpen(true);
  };

  const saveCard = () => {
    if (!cardForm.name) return;
    addCard(cardForm);
    setCardModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h1>
          <p className="text-sm text-gray-500">Competência: {formatMonthBR(selectedMonth)} · {data.cards.length} cartão(ões)</p>
        </div>
        <Button onClick={openAddCard}><Plus size={16} className="inline mr-1" /> Adicionar cartão</Button>
      </div>

      <CardMonthlyLimitEditor />

      {data.cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3">
            <p className="text-xs text-gray-400">Fatura / renda</p>
            <p className={`text-lg font-bold ${commitmentSummary.currentInvoiceIncomePercent >= 35 ? 'text-rose-600' : 'text-gray-900'}`}>{formatPercent(commitmentSummary.currentInvoiceIncomePercent)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(commitmentSummary.currentInvoiceTotal)} em faturas</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-gray-400">Parcelas futuras / renda</p>
            <p className={`text-lg font-bold ${commitmentSummary.futureInstallmentsIncomePercent >= 35 ? 'text-amber-600' : 'text-gray-900'}`}>{formatPercent(commitmentSummary.futureInstallmentsIncomePercent)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(commitmentSummary.futureInstallmentsTotal)} já comprometidos</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-gray-400">Limite utilizado total</p>
            <p className={`text-lg font-bold ${commitmentSummary.totalLimitUsedPercent >= 80 ? 'text-rose-600' : commitmentSummary.totalLimitUsedPercent >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatPercent(commitmentSummary.totalLimitUsedPercent)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(commitmentSummary.totalCommittedLimit)} de {formatCurrency(commitmentSummary.totalLimit)}</p>
          </Card>
        </div>
      )}

      {data.cards.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={<CreditCardIcon size={48} />} title="Nenhum cartão cadastrado" message="Adicione seu primeiro cartão de crédito para começar a controlar suas faturas e compras parceladas." action={<Button onClick={openAddCard}><Plus size={16} className="inline mr-1" /> Adicionar primeiro cartão</Button>} />
        </Card>
      ) : (
        <div className="space-y-4">
          {holderGroups.map((group) => {
            const groupUtilPct = group.totalLimit > 0 ? (group.committedLimit / group.totalLimit) * 100 : 0;
            const groupColor = groupUtilPct > 80 ? 'red' : groupUtilPct > 50 ? 'yellow' : 'green';
            return (
              <section key={group.holder} className="space-y-3">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-400">Titular</p>
                      <h2 className="text-lg font-bold text-gray-900">{group.holder}</h2>
                      <p className="text-xs text-gray-400 mt-1">{group.cards.length} cartão(ões)</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 min-w-[260px]">
                      <div><p className="text-xs text-gray-400">Fatura atual</p><p className="text-sm font-bold text-gray-900">{formatCurrency(group.currentInvoice)}</p></div>
                      <div><p className="text-xs text-gray-400">Próxima fatura</p><p className="text-sm font-bold text-gray-900">{formatCurrency(group.nextInvoice)}</p></div>
                      <div><p className="text-xs text-gray-400">Disponível</p><p className="text-sm font-bold text-emerald-600">{formatCurrency(group.availableLimit)}</p></div>
                      <div><p className="text-xs text-gray-400">Parcelas futuras</p><p className="text-sm font-bold text-amber-600">{formatCurrency(group.futureInstallments)}</p></div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Limite comprometido</span>
                      <span className="text-gray-600">{formatCurrency(group.committedLimit)} de {formatCurrency(group.totalLimit)} ({groupUtilPct.toFixed(0)}%)</span>
                    </div>
                    <ProgressBar value={group.committedLimit} max={group.totalLimit} color={groupColor} />
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.cards.map((card) => {
                    const util = cardUtilization(data, card, selectedMonth);
                    const indicators = commitmentSummary.cards.find((item) => item.cardId === card.id);
                    const utilPct = card.limit > 0 ? (util.used / card.limit) * 100 : 0;
                    const color = utilPct > 80 ? 'red' : utilPct > 50 ? 'yellow' : 'green';
                    return (
                      <Card key={card.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCardId(card.id)}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: card.color }} />
                            <div>
                              <h3 className="font-semibold text-gray-900">{card.name}</h3>
                              <p className="text-xs text-gray-400">{card.bank} · {card.holder}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm"><span className="text-gray-400">Limite</span><span className="font-medium text-gray-700">{formatCurrency(card.limit)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-400">Fatura de {formatMonthBR(selectedMonth)}</span><span className="font-medium text-gray-900">{formatCurrency(util.currentInvoice)}</span></div>
                          <InvoiceStatusBadge data={data} card={card} monthKey={selectedMonth} invoiceAmount={util.currentInvoice} />
                          <div className="flex justify-between text-sm"><span className="text-gray-400">Próxima fatura</span><span className="font-medium text-gray-700">{formatCurrency(util.nextInvoice)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-400">Parcelado futuro</span><span className="font-medium text-amber-600">{formatCurrency(util.futureInstallments)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-400">Maior fatura 6m</span><span className="font-medium text-blue-600">{formatCurrency(indicators?.highestInvoiceNextSixMonths ?? 0)}</span></div>
                          <div className="pt-1">
                            <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Utilizado</span><span className="text-gray-600">{formatCurrency(util.used)} ({utilPct.toFixed(0)}%)</span></div>
                            <ProgressBar value={util.used} max={card.limit} color={color} />
                          </div>
                          <div className="flex justify-between text-sm pt-1"><span className="text-gray-400">Disponível</span><span className="font-bold text-emerald-600">{formatCurrency(util.available)}</span></div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {installmentCalendar.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCardIcon size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Calendário de parcelas futuras</h3>
          </div>
          <div className="space-y-2">
            {installmentCalendar.map((month) => {
              const expanded = expandedInstallmentMonth === month.monthKey;
              return (
                <div key={month.monthKey} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedInstallmentMonth(expanded ? null : month.monthKey)}
                    className="w-full flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      <span className="text-sm font-medium text-gray-700">{monthLabelShort(month.monthKey)}</span>
                      <Badge color="blue">{month.items.length} parcela(s)</Badge>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(month.total)}</span>
                  </button>
                  {expanded && (
                    <div className="divide-y divide-gray-100 bg-white">
                      {month.items.map((item) => (
                        <div key={`${month.monthKey}-${item.cardId}-${item.purchaseId}-${item.installmentNumber}`} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.cardName} · {item.installmentNumber}/{item.totalInstallments} · {item.category}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={cardModalOpen} onClose={() => setCardModalOpen(false)} title="Novo cartão" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCardModalOpen(false)}>Cancelar</Button>
          <Button onClick={saveCard} disabled={!cardForm.name}>Adicionar</Button>
        </div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); saveCard(); }} className="space-y-3">
          <Input label="Nome do cartão" value={cardForm.name} onChange={(v) => setCardForm({ ...cardForm, name: v })} placeholder="Ex: Itaú Thais" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Banco" value={cardForm.bank} onChange={(v) => setCardForm({ ...cardForm, bank: v })} placeholder="Ex: Itaú" />
            <PersonSelect label="Titular" value={cardForm.holder} onChange={(v) => setCardForm({ ...cardForm, holder: v })} people={data.people} onAddPerson={addPerson} />
          </div>
          <CurrencyInput label="Limite" value={cardForm.limit} onChange={(v) => setCardForm({ ...cardForm, limit: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dia de fechamento" type="number" value={cardForm.closingDay} onChange={(v) => setCardForm({ ...cardForm, closingDay: parseInt(v) || 1 })} />
            <Input label="Dia de vencimento" type="number" value={cardForm.dueDay} onChange={(v) => setCardForm({ ...cardForm, dueDay: parseInt(v) || 1 })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor de identificação</label>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setCardForm({ ...cardForm, color: c })} className={`w-8 h-8 rounded-full border-2 ${cardForm.color === c ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

    </div>
  );

  function CardDetail({ card, onBack }: { card: CreditCard; onBack: () => void }) {
    const { data, updateCard, deleteCard, addPerson, addPurchase, updatePurchase, deletePurchase, duplicatePurchase, payCardInvoice, undoCardInvoicePayment, isInvoicePaid } = useData();
    const { selectedMonth } = useMonth();
    const [cardModalOpen, setCardModalOpen] = useState(false);
    const [confirmDeleteCard, setConfirmDeleteCard] = useState(false);
    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<CardPurchase | null>(null);
    const [confirmDeletePurchase, setConfirmDeletePurchase] = useState<string | null>(null);
    const [invoiceModalMonth, setInvoiceModalMonth] = useState<string | null>(null);
    const [payingInvoice, setPayingInvoice] = useState<{ monthKey: string; amount: number } | null>(null);
    const [confirmInvoicePayment, setConfirmInvoicePayment] = useState(false);
    const [confirmInvoiceReversal, setConfirmInvoiceReversal] = useState<string | null>(null);

    const [cardForm, setCardForm] = useState<Omit<CreditCard, 'id'>>({ ...card });
    const [invoicePaymentForm, setInvoicePaymentForm] = useState({
      date: '',
      accountId: '',
    });

    const [purchaseForm, setPurchaseForm] = useState({
      cardId: '', name: '', installmentAmount: 0, installments: 1, currentInstallment: 1,
      category: 'Outros', note: '',
    });

    const [showImpact, setShowImpact] = useState(false);

    const projection = useMemo(() => cardProjection(data, card, 12, selectedMonth), [data, card, selectedMonth]);
    const util = useMemo(() => cardUtilization(data, card, selectedMonth), [data, card, selectedMonth]);
    const cardCommitment = useMemo(() => getCardCommitmentSummary(data, selectedMonth).cards.find((item) => item.cardId === card.id), [data, card.id, selectedMonth]);
    const cardPurchases = data.purchases.filter((p) => p.cardId === card.id);
    const utilPct = card.limit > 0 ? (util.used / card.limit) * 100 : 0;
    const color = utilPct > 80 ? 'red' : utilPct > 50 ? 'yellow' : 'green';

    const chartData = projection.map((m) => ({ month: monthShort(m.monthKey), Fatura: Math.round(m.amount) }));

    const openAddPurchase = () => {
      setEditingPurchase(null);
      setPurchaseForm({
        cardId: card.id, name: '', installmentAmount: 0, installments: 1, currentInstallment: 1,
        category: 'Outros', note: '',
      });
      setShowImpact(false);
      setPurchaseModalOpen(true);
    };

    const openEditCurrentCard = () => {
      setCardForm({ ...card });
      setCardModalOpen(true);
    };

    const saveCurrentCard = () => {
      if (!cardForm.name) return;
      updateCard(card.id, cardForm);
      setCardModalOpen(false);
    };

    const deleteCurrentCard = () => {
      deleteCard(card.id);
      setConfirmDeleteCard(false);
      onBack();
    };

    const openEditPurchase = (pur: CardPurchase) => {
      setEditingPurchase(pur);
      const instAmt = pur.installments > 0 ? pur.totalAmount / pur.installments : 0;
      const status = purchaseInstallmentStatus(pur, selectedMonth);
      setPurchaseForm({
        cardId: pur.cardId, name: pur.name, installmentAmount: instAmt,
        installments: pur.installments, currentInstallment: status.currentInstallment,
        category: pur.category, note: pur.note ?? '',
      });
      setShowImpact(false);
      setPurchaseModalOpen(true);
    };

    const savePurchase = () => {
      if (!purchaseForm.name || purchaseForm.installmentAmount <= 0 || purchaseForm.installments < 1) return;
      if (purchaseForm.currentInstallment < 1 || purchaseForm.currentInstallment > purchaseForm.installments) return;
      // Calculate total from installment amount × installments
      const totalAmount = Math.round(purchaseForm.installmentAmount * purchaseForm.installments * 100) / 100;
      // Derive firstInvoiceMonth: currentInstallment=1 means first invoice is the selected month
      // currentInstallment=2 means first invoice was previous month, etc.
      const firstInvoiceMonth = addMonths(selectedMonth, -(purchaseForm.currentInstallment - 1));
      const purchaseDate = `${firstInvoiceMonth}-01`;
      const payload: Omit<CardPurchase, 'id'> = {
        cardId: purchaseForm.cardId, name: purchaseForm.name, totalAmount,
        installments: purchaseForm.installments, purchaseDate, firstInvoiceMonth,
        category: purchaseForm.category, note: purchaseForm.note,
      };
      if (editingPurchase) {
        updatePurchase(editingPurchase.id, payload);
      } else {
        addPurchase(payload);
      }
      setPurchaseModalOpen(false);
    };

    const impact = useMemo(() => {
      if (!showImpact || purchaseForm.installmentAmount <= 0 || purchaseForm.installments < 1) return null;
      const total = purchaseForm.installmentAmount * purchaseForm.installments;
      const firstMonth = addMonths(selectedMonth, -(purchaseForm.currentInstallment - 1));
      return simulatePurchase(data, card.id, total, purchaseForm.installments, `${firstMonth}-01`, selectedMonth);
    }, [showImpact, purchaseForm, data, card.id, selectedMonth]);

    const calculatedTotal = purchaseForm.installments > 0 ? purchaseForm.installmentAmount * purchaseForm.installments : 0;

    const invoiceItems = invoiceModalMonth ? cardInvoiceDetail(data, card.id, invoiceModalMonth) : [];
    const invoiceTotal = invoiceItems.reduce((s, i) => s + i.amount, 0);
    const accountOptions = useMemo(() => [
      { value: '', label: 'Selecione a conta' },
      ...data.bankAccounts.map((account) => ({
        value: account.id,
        label: formatBankAccountLabel(account),
      })),
    ], [data.bankAccounts]);

    const dateForDueDay = (monthKey: string, dueDay: number): string => {
      const [year, month] = monthKey.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const day = Math.min(Math.max(dueDay, 1), lastDay);
      return `${monthKey}-${String(day).padStart(2, '0')}`;
    };

    const openInvoicePayment = (monthKey: string, amount: number) => {
      if (amount <= 0 || isInvoicePaid(card.id, monthKey)) return;
      setPayingInvoice({ monthKey, amount });
      setInvoicePaymentForm({
        date: dateForDueDay(monthKey, card.dueDay),
        accountId: data.bankAccounts[0]?.id ?? '',
      });
    };

    const requestInvoicePaymentConfirmation = () => {
      if (!payingInvoice || !invoicePaymentForm.accountId || !invoicePaymentForm.date || payingInvoice.amount <= 0) return;
      setConfirmInvoicePayment(true);
    };

    const saveInvoicePayment = () => {
      if (!payingInvoice || !invoicePaymentForm.accountId || !invoicePaymentForm.date || payingInvoice.amount <= 0) return;
      payCardInvoice({
        cardId: card.id,
        monthKey: payingInvoice.monthKey,
        date: invoicePaymentForm.date,
        accountId: invoicePaymentForm.accountId,
        amount: payingInvoice.amount,
      });
      setConfirmInvoicePayment(false);
      setPayingInvoice(null);
    };

    const selectedInvoicePaymentAccount = invoicePaymentForm.accountId
      ? data.bankAccounts.find((account) => account.id === invoicePaymentForm.accountId) ?? null
      : null;
    const invoicePaymentNextBalance = selectedInvoicePaymentAccount && payingInvoice
      ? selectedInvoicePaymentAccount.balance - payingInvoice.amount
      : undefined;
    const invoicePaymentWarning = invoicePaymentNextBalance !== undefined && invoicePaymentNextBalance < 0
      ? `Este pagamento deixará a conta em ${formatCurrency(invoicePaymentNextBalance)}.`
      : null;
    const reversalInvoicePayment = confirmInvoiceReversal
      ? (data.cardInvoicePayments ?? []).find((payment) => payment.cardId === card.id && payment.monthKey === confirmInvoiceReversal) ?? null
      : null;
    const reversalInvoicePaymentAccount = reversalInvoicePayment
      ? data.bankAccounts.find((account) => account.id === reversalInvoicePayment.accountId) ?? null
      : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} className="text-gray-600" /></button>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: card.color }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{card.name}</h1>
              <p className="text-sm text-gray-500">{card.bank} · {card.holder}</p>
            </div>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openEditCurrentCard}>
              <Edit2 size={14} className="inline mr-1" /> Editar
            </Button>
            <Button variant="danger" onClick={() => setConfirmDeleteCard(true)}>
              <Trash2 size={14} className="inline mr-1" /> Excluir
            </Button>
          </div>
        </div>

        {/* Card info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3"><p className="text-xs text-gray-400">Limite total</p><p className="text-lg font-bold text-gray-900">{formatCurrency(card.limit)}</p></Card>
          <Card className="p-3"><p className="text-xs text-gray-400">Limite comprometido</p><p className="text-lg font-bold text-amber-600">{formatCurrency(cardCommitment?.committedLimit ?? util.used)}</p></Card>
          <Card className="p-3"><p className="text-xs text-gray-400">Fatura de {formatMonthBR(selectedMonth)}</p><p className="text-lg font-bold text-gray-900">{formatCurrency(util.currentInvoice)}</p></Card>
          <Card className="p-3"><p className="text-xs text-gray-400">Próxima fatura</p><p className="text-lg font-bold text-gray-900">{formatCurrency(util.nextInvoice)}</p></Card>
          <Card className="p-3"><p className="text-xs text-gray-400">Limite disponível</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(util.available)}</p></Card>
          <Card className="p-3"><p className="text-xs text-gray-400">Parcelas futuras</p><p className="text-lg font-bold text-amber-600">{formatCurrency(util.futureInstallments)}</p></Card>
          <Card className="p-3"><p className="text-xs text-gray-400">Maior fatura 6m</p><p className="text-lg font-bold text-blue-600">{formatCurrency(cardCommitment?.highestInvoiceNextSixMonths ?? 0)}</p></Card>
        </div>

        {/* Invoice status + pay button */}
        {util.currentInvoice > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <InvoiceStatusBadge data={data} card={card} monthKey={selectedMonth} invoiceAmount={util.currentInvoice} />
                <span className="text-xs text-gray-400">Vencimento: dia {card.dueDay} de {formatMonthBR(selectedMonth)}</span>
              </div>
              {isInvoicePaid(card.id, selectedMonth) ? (
                <button
                  onClick={() => setConfirmInvoiceReversal(selectedMonth)}
                  className="text-sm font-medium py-2 px-4 rounded-lg transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                >
                  <Circle size={14} className="inline mr-1" /> Desfazer pagamento
                </button>
              ) : (
                <button
                  onClick={() => openInvoicePayment(selectedMonth, util.currentInvoice)}
                  className="text-sm font-medium py-2 px-4 rounded-lg transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                >
                  <CheckCircle2 size={14} className="inline mr-1" /> Pagar fatura
                </button>
              )}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Limite utilizado</span>
            <span className="text-gray-600">{formatCurrency(util.used)} ({utilPct.toFixed(0)}%)</span>
          </div>
          <ProgressBar value={util.used} max={card.limit} color={color} />
        </Card>

        {/* Projection chart - clickable months */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Faturas · 12 meses a partir de {formatMonthBR(selectedMonth)}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="Fatura" fill={card.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {projection.map((m) => (
              <button key={m.monthKey} onClick={() => setInvoiceModalMonth(m.monthKey)} className="p-2.5 bg-gray-50 hover:bg-blue-50 rounded-lg text-left transition-colors">
                <p className="text-xs text-gray-400">{monthLabelShort(m.monthKey)}</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(m.amount)}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Purchases */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Compras ({cardPurchases.length})</h3>
            <Button size="sm" onClick={openAddPurchase}><Plus size={14} className="inline mr-1" /> Nova compra</Button>
          </div>
          {cardPurchases.length === 0 ? (
            <EmptyState title="Nenhuma compra" message="Adicione uma compra parcelada para vê-la nas faturas futuras." action={<Button size="sm" onClick={openAddPurchase}><Plus size={14} className="inline mr-1" /> Nova compra</Button>} />
          ) : (
            <div className="space-y-3">
              {cardPurchases.map((pur) => {
                const instAmt = pur.totalAmount / pur.installments;
                const status = purchaseInstallmentStatus(pur, selectedMonth);
                return (
                  <div key={pur.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{pur.name}</p>
                        <p className="text-xs text-gray-400">{pur.installments}x de {formatCurrency(instAmt)} · {formatCurrency(pur.totalAmount)}</p>
                        <p className="text-xs text-gray-400">Categoria: {pur.category} · Primeira fatura: {formatMonthBR(pur.firstInvoiceMonth)}</p>
                      </div>
                      <div className="flex gap-1">
                        <IconButton icon={<Edit2 size={14} />} label="Editar compra" onClick={() => openEditPurchase(pur)} />
                        <IconButton icon={<Copy size={14} />} label="Duplicar compra" onClick={() => duplicatePurchase(pur.id)} />
                        <IconButton icon={<Trash2 size={14} />} label="Excluir compra" variant="danger" onClick={() => setConfirmDeletePurchase(pur.id)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center p-2 bg-white rounded-lg"><p className="text-xs text-gray-400">Parcela atual</p><p className="text-sm font-bold text-blue-600">{status.currentInstallment} de {pur.installments}</p></div>
                      <div className="text-center p-2 bg-white rounded-lg"><p className="text-xs text-gray-400">Restante</p><p className="text-sm font-bold text-amber-600">{status.remaining} parcela(s)</p></div>
                      <div className="text-center p-2 bg-white rounded-lg"><p className="text-xs text-gray-400">Saldo restante</p><p className="text-sm font-bold text-gray-900">{formatCurrency(status.remainingBalance)}</p></div>
                    </div>
                    {pur.note && <p className="text-xs text-gray-500 mt-2 italic">{pur.note}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Purchase Modal */}
        <Modal open={purchaseModalOpen} onClose={() => { setPurchaseModalOpen(false); setShowImpact(false); }} title={editingPurchase ? 'Editar compra' : 'Nova compra'} size="lg" footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setPurchaseModalOpen(false); setShowImpact(false); }}>Cancelar</Button>
            <Button onClick={savePurchase} disabled={!purchaseForm.name || purchaseForm.installmentAmount <= 0 || purchaseForm.installments < 1 || purchaseForm.currentInstallment < 1 || purchaseForm.currentInstallment > purchaseForm.installments}>{editingPurchase ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        }>
          <form onSubmit={(e) => { e.preventDefault(); savePurchase(); }} className="space-y-3">
            <Input label="Nome da compra" value={purchaseForm.name} onChange={(v) => setPurchaseForm({ ...purchaseForm, name: v })} placeholder="Ex: Notebook" required />
            <CurrencyInput label="Valor da parcela" value={purchaseForm.installmentAmount} onChange={(v) => setPurchaseForm({ ...purchaseForm, installmentAmount: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Quantidade de parcelas" type="number" value={purchaseForm.installments} onChange={(v) => {
                const n = parseInt(v) || 1;
                setPurchaseForm({ ...purchaseForm, installments: n, currentInstallment: Math.min(purchaseForm.currentInstallment, n) });
              }} required />
              <Select label="Parcela atual" value={String(purchaseForm.currentInstallment)} onChange={(v) => setPurchaseForm({ ...purchaseForm, currentInstallment: parseInt(v) })} options={Array.from({ length: purchaseForm.installments }, (_, i) => ({ value: String(i + 1), label: `${i + 1} de ${purchaseForm.installments}` }))} />
            </div>
            {purchaseForm.installments > 0 && purchaseForm.installmentAmount > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Total da compra: <strong>{formatCurrency(calculatedTotal)}</strong></p>
                <p className="text-xs text-blue-500 mt-1">{purchaseForm.installments}x de {formatCurrency(purchaseForm.installmentAmount)} · Parcela atual: {purchaseForm.currentInstallment}/{purchaseForm.installments}</p>
              </div>
            )}
            <Select label="Categoria" value={purchaseForm.category} onChange={(v) => setPurchaseForm({ ...purchaseForm, category: v })} options={data.categories.map((c) => ({ value: c, label: c }))} />
            <TextArea label="Observação" value={purchaseForm.note} onChange={(v) => setPurchaseForm({ ...purchaseForm, note: v })} />

            {/* Impact analysis */}
            {!editingPurchase && purchaseForm.installmentAmount > 0 && purchaseForm.installments > 0 && (
              <div>
                <button type="button" onClick={() => setShowImpact(!showImpact)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <TrendingUp size={14} /> {showImpact ? 'Ocultar' : 'Ver'} impacto desta compra
                </button>
                {showImpact && impact && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Impacto nas faturas</h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {impact.before.slice(0, 8).map((before, i) => {
                        const after = impact.after[i];
                        const diff = after.cardByCard[card.id] - before.cardByCard[card.id];
                        if (diff === 0) return null;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{monthShort(before.monthKey)}</span>
                            <span className="text-gray-400">{formatCurrency(before.cardByCard[card.id] || 0)} →</span>
                            <span className="font-medium text-gray-900">{formatCurrency(after.cardByCard[card.id] || 0)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {impact.negativeMonths.length > 0 && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle size={16} className="text-rose-500" />
                          <span className="text-sm font-semibold text-rose-700">ATENÇÃO</span>
                        </div>
                        {impact.negativeMonths.map((nm) => (
                          <p key={nm.monthKey} className="text-xs text-rose-600">Esta compra fará o saldo de {monthLabelShort(nm.monthKey)} ficar negativo em {formatCurrency(Math.abs(nm.after))}.</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        </Modal>

        {/* Invoice detail modal */}
        <Modal open={!!invoiceModalMonth} onClose={() => setInvoiceModalMonth(null)} title={invoiceModalMonth ? `Fatura · ${monthLabelShort(invoiceModalMonth)}` : ''} footer={
          invoiceModalMonth && invoiceTotal > 0 ? (
            <div className="flex items-center justify-between w-full">
              <InvoiceStatusBadge data={data} card={card} monthKey={invoiceModalMonth} invoiceAmount={invoiceTotal} />
              {isInvoicePaid(card.id, invoiceModalMonth) ? (
                <button
                  onClick={() => setConfirmInvoiceReversal(invoiceModalMonth)}
                  className="text-sm font-medium py-2 px-4 rounded-lg transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                >
                  <Circle size={14} className="inline mr-1" /> Desfazer pagamento
                </button>
              ) : (
                <button
                  onClick={() => openInvoicePayment(invoiceModalMonth, invoiceTotal)}
                  className="text-sm font-medium py-2 px-4 rounded-lg transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                >
                  <CheckCircle2 size={14} className="inline mr-1" /> Pagar fatura
                </button>
              )}
            </div>
          ) : undefined
        }>
          {invoiceModalMonth && (
            <div className="space-y-3">
              {invoiceItems.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma parcela neste mês.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {invoiceItems.map((item) => (
                      <div key={`${item.purchaseId}-${item.installmentNumber}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.installmentNumber}/{item.totalInstallments} · {item.category}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-semibold text-blue-700">Total da fatura</span>
                    <span className="text-sm font-bold text-blue-900">{formatCurrency(invoiceTotal)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>

        <Modal open={payingInvoice !== null} onClose={() => setPayingInvoice(null)} title="Pagar fatura" footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayingInvoice(null)}>Cancelar</Button>
            <Button onClick={requestInvoicePaymentConfirmation} disabled={!invoicePaymentForm.accountId || !invoicePaymentForm.date || !payingInvoice || payingInvoice.amount <= 0}>
              Revisar pagamento
            </Button>
          </div>
        }>
          {payingInvoice && (
            <form onSubmit={(e) => { e.preventDefault(); requestInvoicePaymentConfirmation(); }} className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-sm font-semibold text-emerald-700">{card.name} · {monthLabelShort(payingInvoice.monthKey)}</p>
                <p className="text-xs text-gray-500">Total da fatura: {formatCurrency(payingInvoice.amount)}</p>
              </div>
              <Input label="Data paga" type="date" value={invoicePaymentForm.date} onChange={(v) => setInvoicePaymentForm({ ...invoicePaymentForm, date: v })} required />
              <Select label="Conta pagadora" value={invoicePaymentForm.accountId} onChange={(v) => setInvoicePaymentForm({ ...invoicePaymentForm, accountId: v })} options={accountOptions} required />
              <button type="submit" className="hidden" aria-hidden="true" />
            </form>
          )}
        </Modal>

        <BalanceChangeConfirmDialog
          open={confirmInvoicePayment}
          title="Confirmar pagamento?"
          itemName={payingInvoice ? `${card.name} · ${monthLabelShort(payingInvoice.monthKey)}` : card.name}
          amount={payingInvoice?.amount ?? 0}
          accountLabel={selectedInvoicePaymentAccount ? formatBankAccountLabel(selectedInvoicePaymentAccount) : 'Conta não selecionada'}
          date={invoicePaymentForm.date ? formatDateBR(invoicePaymentForm.date) : undefined}
          currentBalance={selectedInvoicePaymentAccount?.balance}
          nextBalance={invoicePaymentNextBalance}
          warning={invoicePaymentWarning}
          confirmText={invoicePaymentWarning ? 'Continuar mesmo assim' : 'Confirmar pagamento'}
          onConfirm={saveInvoicePayment}
          onCancel={() => setConfirmInvoicePayment(false)}
          onChooseAnotherAccount={() => setConfirmInvoicePayment(false)}
        />

        <BalanceChangeConfirmDialog
          open={confirmInvoiceReversal !== null}
          title="Desfazer pagamento?"
          itemName={confirmInvoiceReversal ? `${card.name} · ${monthLabelShort(confirmInvoiceReversal)}` : card.name}
          amount={reversalInvoicePayment?.amount ?? (confirmInvoiceReversal ? getCardInvoiceForMonth(data.purchases, card.id, confirmInvoiceReversal) : 0)}
          accountLabel={reversalInvoicePaymentAccount ? formatBankAccountLabel(reversalInvoicePaymentAccount) : 'Conta não localizada'}
          currentBalance={reversalInvoicePaymentAccount?.balance}
          nextBalance={reversalInvoicePaymentAccount && reversalInvoicePayment ? reversalInvoicePaymentAccount.balance + reversalInvoicePayment.amount : undefined}
          confirmText="Desfazer pagamento"
          onConfirm={() => {
            if (confirmInvoiceReversal) undoCardInvoicePayment(card.id, confirmInvoiceReversal);
            setConfirmInvoiceReversal(null);
          }}
          onCancel={() => setConfirmInvoiceReversal(null)}
        />

        <Modal open={cardModalOpen} onClose={() => setCardModalOpen(false)} title="Editar cartão" footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCardModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveCurrentCard} disabled={!cardForm.name}>Salvar</Button>
          </div>
        }>
          <form onSubmit={(e) => { e.preventDefault(); saveCurrentCard(); }} className="space-y-3">
            <Input label="Nome do cartão" value={cardForm.name} onChange={(v) => setCardForm({ ...cardForm, name: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Banco" value={cardForm.bank} onChange={(v) => setCardForm({ ...cardForm, bank: v })} />
              <PersonSelect label="Titular" value={cardForm.holder} onChange={(v) => setCardForm({ ...cardForm, holder: v })} people={data.people} onAddPerson={addPerson} />
            </div>
            <CurrencyInput label="Limite" value={cardForm.limit} onChange={(v) => setCardForm({ ...cardForm, limit: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Dia de fechamento" type="number" value={cardForm.closingDay} onChange={(v) => setCardForm({ ...cardForm, closingDay: parseInt(v) || 1 })} />
              <Input label="Dia de vencimento" type="number" value={cardForm.dueDay} onChange={(v) => setCardForm({ ...cardForm, dueDay: parseInt(v) || 1 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor de identificação</label>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setCardForm({ ...cardForm, color: c })} className={`w-8 h-8 rounded-full border-2 ${cardForm.color === c ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        </Modal>

        <ConfirmDialog
          open={confirmDeleteCard}
          title="Excluir cartão"
          message="Tem certeza que deseja excluir este cartão? Todas as compras associadas também serão removidas."
          onConfirm={deleteCurrentCard}
          onCancel={() => setConfirmDeleteCard(false)}
          confirmText="Excluir"
        />

        <ConfirmDialog
          open={!!confirmDeletePurchase}
          title="Excluir compra"
          message="Excluir todas as parcelas desta compra? Todas as parcelas futuras serão removidas."
          onConfirm={() => { if (confirmDeletePurchase) deletePurchase(confirmDeletePurchase); setConfirmDeletePurchase(null); }}
          onCancel={() => setConfirmDeletePurchase(null)}
          confirmText="Excluir todas as parcelas"
        />
      </div>
    );
  }
}

function CardMonthlyLimitEditor() {
  const { data, updateCardMonthlyLimit } = useData();
  const { selectedMonth } = useMonth();
  const currentLimit = getCardMonthlyLimit(data.settings, selectedMonth);
  const currentInvoiceTotal = data.cards.reduce((sum, card) => {
    return sum + cardUtilization(data, card, selectedMonth).currentInvoice;
  }, 0);
  const pct = currentLimit > 0 ? (currentInvoiceTotal / currentLimit) * 100 : 0;
  const color = pct > 100 ? 'red' : pct >= 80 ? 'yellow' : 'green';
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentLimit);
  const [scope, setScope] = useState<'this-month' | 'future'>('future');

  const openEditor = () => {
    setAmount(currentLimit);
    setScope('future');
    setOpen(true);
  };

  const save = () => {
    updateCardMonthlyLimit(amount, selectedMonth, scope);
    setOpen(false);
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Meta mensal dos cartões</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-gray-900">{formatCurrency(currentLimit)}</p>
              <span className="text-sm text-gray-400">em {formatMonthBR(selectedMonth)}</span>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={openEditor}>
            <Edit2 size={14} className="inline mr-1" /> Alterar meta
          </Button>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Faturas do mês</span>
            <span className="text-gray-600">{formatCurrency(currentInvoiceTotal)} ({pct.toFixed(0)}%)</span>
          </div>
          <ProgressBar value={currentInvoiceTotal} max={currentLimit} color={color} />
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Meta mensal dos cartões" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={amount < 0}>Salvar</Button>
        </div>
      }>
        <div className="space-y-3">
          <CurrencyInput label="Valor da meta" value={amount} onChange={setAmount} required />
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-700 mb-2">O que deseja alterar?</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={scope === 'this-month'} onChange={() => setScope('this-month')} className="text-blue-600" />
                <span className="text-sm text-gray-700">Somente {formatMonthBR(selectedMonth)}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={scope === 'future'} onChange={() => setScope('future')} className="text-blue-600" />
                <span className="text-sm text-gray-700">A partir de {formatMonthBR(selectedMonth)}</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function InvoiceStatusBadge({ data, card, monthKey, invoiceAmount }: { data: import('@/lib/types').AppData; card: CreditCard; monthKey: string; invoiceAmount: number }) {
  const status = getInvoiceStatus(data, card, monthKey, invoiceAmount);
  if (status === 'sem_fatura') return null;
  const config: Record<InvoiceStatus, { label: string; color: 'green' | 'yellow' | 'red' | 'gray'; icon: React.ReactNode }> = {
    pago: { label: 'Pago', color: 'green', icon: <CheckCircle2 size={12} /> },
    pendente: { label: 'Pendente', color: 'yellow', icon: <Circle size={12} /> },
    vencido: { label: 'Vencido', color: 'red', icon: <AlertCircle size={12} /> },
    sem_fatura: { label: '', color: 'gray', icon: null },
  };
  const c = config[status];
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">Status da fatura</span>
      <Badge color={c.color}>{c.icon} {c.label}</Badge>
    </div>
  );
}
