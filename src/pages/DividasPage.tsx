import { useState } from 'react';
import { Plus, Edit2, Trash2, Landmark } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { totalDebt } from '@/lib/projection';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Debt, DebtStatus } from '@/lib/types';
import { Card, Badge, Button, Modal, Input, Select, TextArea, ConfirmDialog, EmptyState, ProgressBar, PersonSelect, IconButton } from '@/components/ui';

const DEBT_STATUSES: DebtStatus[] = ['Em aberto', 'Negociação', 'Parcelada', 'Quitada'];
const STATUS_COLORS: Record<DebtStatus, 'red' | 'yellow' | 'blue' | 'green'> = {
  'Em aberto': 'red',
  'Negociação': 'yellow',
  'Parcelada': 'blue',
  'Quitada': 'green',
};

export function DividasPage() {
  const { data, addDebt, updateDebt, deleteDebt, addPerson } = useData();
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

  const totalDebtValue = totalDebt(data);
  const activeDebts = data.debts.filter((d) => d.status !== 'Quitada');
  const paidDebts = data.debts.filter((d) => d.status === 'Quitada');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dívidas</h1>
          <p className="text-sm text-gray-500">Dívida total ativa: {formatCurrency(totalDebtValue)}</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Nova dívida</Button>
      </div>

      {/* Active debts */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Dívidas Ativas ({activeDebts.length})</h2>
        {activeDebts.length === 0 ? (
          <Card className="p-8"><EmptyState icon={<Landmark size={48} />} title="Nenhuma dívida ativa" message="Todas as dívidas foram quitadas!" /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDebts.map((debt) => (
              <Card key={debt.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{debt.name}</h3>
                    <p className="text-xs text-gray-400">{debt.institution}</p>
                  </div>
                  <Badge color={STATUS_COLORS[debt.status]}>{debt.status}</Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Saldo devedor</span><span className="font-bold text-rose-600">{formatCurrency(debt.balance)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Parcela</span><span className="text-gray-700">{formatCurrency(debt.installmentAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Parcelas restantes</span><span className="text-gray-700">{debt.installmentsRemaining}</span></div>
                  {debt.interestRate !== undefined && debt.interestRate > 0 && (
                    <div className="flex justify-between"><span className="text-gray-400">Juros</span><span className="text-gray-700">{debt.interestRate}% a.m.</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-400">Vencimento</span><span className="text-gray-700">{formatDate(debt.dueDate)}</span></div>
                </div>
                {debt.installmentsRemaining > 0 && debt.installmentAmount > 0 && (
                  <div className="mt-3">
                    <ProgressBar value={1} max={debt.installmentsRemaining + 1} color="blue" />
                  </div>
                )}
                <div className="flex gap-1 mt-3">
                  <IconButton icon={<Edit2 size={14} />} label="Editar dívida" onClick={() => openEdit(debt)} />
                  <IconButton icon={<Trash2 size={14} />} label="Excluir dívida" variant="danger" onClick={() => setConfirmDelete(debt.id)} />
                </div>
              </Card>
            ))}
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
