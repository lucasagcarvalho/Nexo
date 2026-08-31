import { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Landmark, Wallet, Percent, CalendarCheck, ListChecks, Hash, UserRound } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { getDebtCommitmentSummary } from '@/lib/projection';
import { useMonth } from '@/store/MonthContext';
import { formatCurrency, formatDate, formatMonthBR, formatPercent } from '@/lib/format';
import type { Debt, DebtStatus } from '@/lib/types';
import { Card, Badge, Button, Modal, Input, Select, TextArea, ConfirmDialog, EmptyState, PersonSelect, IconButton, StatCard } from '@/components/ui';

const DEBT_STATUSES: DebtStatus[] = ['Em aberto', 'Negociação', 'Parcelada', 'Quitada'];
const STATUS_COLORS: Record<DebtStatus, 'red' | 'yellow' | 'blue' | 'green'> = {
  'Em aberto': 'red',
  'Negociação': 'yellow',
  'Parcelada': 'blue',
  'Quitada': 'green',
};

export function DividasPage() {
  const { data, addDebt, updateDebt, deleteDebt, addPerson } = useData();
  const { selectedMonth } = useMonth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<Debt, 'id'>>({
    name: '', institution: '', balance: 0, installmentAmount: 0, installmentsRemaining: 0,
    interestRate: 0, dueDate: `${new Date().toISOString().slice(0, 7)}-10`, status: 'Em aberto', person: '', note: '',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', institution: '', balance: 0, installmentAmount: 0, installmentsRemaining: 0, interestRate: 0, dueDate: `${new Date().toISOString().slice(0, 7)}-10`, status: 'Em aberto', person: '', note: '' });
    setModalOpen(true);
  };

  const openEdit = (debt: Debt) => {
    setEditing(debt);
    setForm({ ...debt });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name) return;
    if (editing) {
      updateDebt(editing.id, form);
    } else {
      addDebt(form);
    }
    setModalOpen(false);
  };

  const debtSummary = useMemo(() => getDebtCommitmentSummary(data, selectedMonth), [data, selectedMonth]);
  const activeDebtIds = new Set(debtSummary.debts.map((debt) => debt.debtId));
  const activeDebts = data.debts.filter((d) => activeDebtIds.has(d.id));
  const paidDebts = data.debts.filter((d) => d.status === 'Quitada');
  const debtById = useMemo(() => new Map(data.debts.map((debt) => [debt.id, debt])), [data.debts]);
  const debtsByPerson = useMemo(() => {
    const groups = new Map<string, { person: string; count: number; balance: number; monthlyPayment: number; payoffMonth: string | null }>();
    for (const item of debtSummary.debts) {
      const debt = debtById.get(item.debtId);
      const person = debt?.person || 'Sem responsável';
      const current = groups.get(person) ?? { person, count: 0, balance: 0, monthlyPayment: 0, payoffMonth: null };
      current.count += 1;
      current.balance += item.currentBalance;
      current.monthlyPayment += item.monthlyPayment;
      if (item.payoffMonth && (!current.payoffMonth || item.payoffMonth > current.payoffMonth)) {
        current.payoffMonth = item.payoffMonth;
      }
      groups.set(person, current);
    }
    return Array.from(groups.values()).sort((a, b) => b.balance - a.balance);
  }, [debtSummary.debts, debtById]);
  const statusSummary = useMemo(() => DEBT_STATUSES.map((status) => ({
    status,
    count: data.debts.filter((debt) => debt.status === status).length,
    balance: data.debts
      .filter((debt) => debt.status === status && debt.status !== 'Quitada')
      .reduce((sum, debt) => sum + debt.balance, 0),
  })).filter((item) => item.count > 0), [data.debts]);
  const priorityDebts = useMemo(() => [...debtSummary.debts].sort((a, b) => {
    const interestDiff = (b.interestRate ?? -1) - (a.interestRate ?? -1);
    if (interestDiff !== 0) return interestDiff;
    const paymentDiff = b.monthlyPayment - a.monthlyPayment;
    if (paymentDiff !== 0) return paymentDiff;
    return b.currentBalance - a.currentBalance;
  }), [debtSummary.debts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dívidas</h1>
          <p className="text-sm text-gray-500">Competência: {formatMonthBR(selectedMonth)} · dívida total ativa: {formatCurrency(debtSummary.totalBalance)}</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Nova dívida</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Saldo devedor" value={formatCurrency(debtSummary.totalBalance)} subtitle={`${debtSummary.activeDebtCount} dívida(s) ativa(s)`} color="red" icon={<Wallet size={18} />} />
        <StatCard title="Parcelas mensais" value={formatCurrency(debtSummary.monthlyPaymentTotal)} subtitle={`${formatPercent(debtSummary.incomeCommitmentPercent)} da renda`} color={debtSummary.incomeCommitmentPercent >= 15 ? 'red' : 'yellow'} icon={<Percent size={18} />} />
        <StatCard title="Número de dívidas" value={String(data.debts.length)} subtitle={`${paidDebts.length} quitada(s)`} color="gray" icon={<Hash size={18} />} />
        <StatCard title="Quitação prevista" value={debtSummary.payoffMonth ? formatMonthBR(debtSummary.payoffMonth) : 'Sem previsão'} subtitle={debtSummary.averageInterestRate === null ? 'Juros não informados' : `Juros médios: ${formatPercent(debtSummary.averageInterestRate)} a.m.`} color="blue" icon={<CalendarCheck size={18} />} />
      </div>

      {debtSummary.debts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserRound size={18} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-700">Resumo por responsável</h2>
            </div>
            <div className="space-y-3">
              {debtsByPerson.map((group) => (
                <div key={group.person} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{group.person}</p>
                      <p className="text-xs text-gray-400">{group.count} dívida(s) ativa(s)</p>
                    </div>
                    <p className="text-sm font-bold text-rose-600">{formatCurrency(group.balance)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-gray-400">Parcelas mensais</p><p className="font-semibold text-gray-800">{formatCurrency(group.monthlyPayment)}</p></div>
                    <div><p className="text-xs text-gray-400">Quitação prevista</p><p className="font-semibold text-gray-800">{group.payoffMonth ? formatMonthBR(group.payoffMonth) : 'Sem previsão'}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks size={18} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-700">Prioridade de acompanhamento</h2>
            </div>
            <div className="space-y-2">
              {priorityDebts.map((debt, index) => (
                <div key={debt.debtId} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge color={index === 0 ? 'red' : index === 1 ? 'yellow' : 'gray'}>{index + 1}</Badge>
                      <p className="text-sm font-semibold text-gray-800 truncate">{debt.name}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {debt.interestRate === null ? 'Juros não informados' : `${formatPercent(debt.interestRate)} a.m.`} · {formatCurrency(debt.monthlyPayment)}/mês
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-rose-600">{formatCurrency(debt.currentBalance)}</p>
                    <p className="text-xs text-gray-400">{debt.payoffMonth ? formatMonthBR(debt.payoffMonth) : 'Sem previsão'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {statusSummary.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Situação das dívidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statusSummary.map((item) => (
              <div key={item.status} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">{item.status}</p>
                  <Badge color={STATUS_COLORS[item.status]}>{item.count}</Badge>
                </div>
                <p className="text-sm font-bold text-gray-800 mt-2">{item.status === 'Quitada' ? 'Sem saldo ativo' : formatCurrency(item.balance)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Dívidas Ativas ({activeDebts.length})</h2>
        {activeDebts.length === 0 ? (
          <Card className="p-8"><EmptyState icon={<Landmark size={48} />} title="Nenhuma dívida ativa" message="Todas as dívidas foram quitadas!" /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDebts.map((debt) => {
              const indicators = debtSummary.debts.find((item) => item.debtId === debt.id);
              return (
              <Card key={debt.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{debt.name}</h3>
                    <p className="text-xs text-gray-400">{debt.institution}</p>
                  </div>
                  <Badge color={STATUS_COLORS[debt.status]}>{debt.status}</Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Saldo atual</span><span className="font-bold text-rose-600">{formatCurrency(indicators?.currentBalance ?? debt.balance)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Parcela mensal</span><span className="text-gray-700">{formatCurrency(indicators?.monthlyPayment ?? debt.installmentAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Parcelas restantes</span><span className="text-gray-700">{indicators?.installmentsRemaining ?? debt.installmentsRemaining}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Término estimado</span><span className="text-gray-700">{indicators?.payoffMonth ? formatMonthBR(indicators.payoffMonth) : 'Sem previsão'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Juros / custo</span><span className="text-gray-700">{indicators?.interestRate === null || indicators?.interestRate === undefined ? 'Não informado' : `${formatPercent(indicators.interestRate)} a.m.`}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Vencimento</span><span className="text-gray-700">{formatDate(debt.dueDate)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Responsável</span><span className="text-gray-700">{debt.person || 'Sem responsável'}</span></div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-500">
                  <ListChecks size={14} className="text-blue-500" />
                  <span>{indicators?.payoffMonth ? `Última parcela prevista em ${formatMonthBR(indicators.payoffMonth)}.` : 'Sem parcelas futuras configuradas.'}</span>
                </div>
                <div className="flex gap-1 mt-3">
                  <IconButton icon={<Edit2 size={14} />} label="Editar dívida" onClick={() => openEdit(debt)} />
                  <IconButton icon={<Trash2 size={14} />} label="Excluir dívida" variant="danger" onClick={() => setConfirmDelete(debt.id)} />
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Paid debts */}
      {paidDebts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Dívidas Quitadas ({paidDebts.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paidDebts.map((debt) => (
              <Card key={debt.id} className="p-4 opacity-75">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-700">{debt.name}</h3>
                    <p className="text-xs text-gray-400">{debt.institution}</p>
                  </div>
                  <Badge color="green">Quitada</Badge>
                </div>
                {debt.note && <p className="text-xs text-gray-500 italic">{debt.note}</p>}
                <div className="flex gap-1 mt-2">
                  <IconButton icon={<Edit2 size={14} />} label="Editar dívida" onClick={() => openEdit(debt)} />
                  <IconButton icon={<Trash2 size={14} />} label="Excluir dívida" variant="danger" onClick={() => setConfirmDelete(debt.id)} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar dívida' : 'Nova dívida'} footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!form.name}>{editing ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          <Input label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Instituição" value={form.institution} onChange={(v) => setForm({ ...form, institution: v })} />
          <PersonSelect label="Responsável" value={form.person ?? ''} onChange={(v) => setForm({ ...form, person: v })} people={data.people} onAddPerson={addPerson} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Saldo devedor (R$)" type="number" step="0.01" value={form.balance} onChange={(v) => setForm({ ...form, balance: parseFloat(v) || 0 })} />
            <Input label="Valor da parcela (R$)" type="number" step="0.01" value={form.installmentAmount} onChange={(v) => setForm({ ...form, installmentAmount: parseFloat(v) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Parcelas restantes" type="number" value={form.installmentsRemaining} onChange={(v) => setForm({ ...form, installmentsRemaining: parseInt(v) || 0 })} />
            <Input label="Juros (% a.m.)" type="number" step="0.01" value={form.interestRate ?? 0} onChange={(v) => setForm({ ...form, interestRate: parseFloat(v) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vencimento (AAAA-MM-DD)" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v as DebtStatus })} options={DEBT_STATUSES.map((s) => ({ value: s, label: s }))} />
          </div>
          <TextArea label="Observação" value={form.note ?? ''} onChange={(v) => setForm({ ...form, note: v })} />
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir dívida"
        message="Tem certeza que deseja excluir esta dívida?"
        onConfirm={() => { if (confirmDelete) deleteDebt(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Excluir"
      />
    </div>
  );
}
