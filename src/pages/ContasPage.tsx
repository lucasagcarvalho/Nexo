import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Building2, ArrowDownCircle, History } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { formatCurrency, formatMonthBR, formatDateBR, currentMonthKey } from '@/lib/format';
import type { BankAccount } from '@/lib/types';
import { Card, Badge, Button, Modal, Input, TextArea, ConfirmDialog, EmptyState, CurrencyInput, PersonSelect, IconButton } from '@/components/ui';

export function ContasPage() {
  const { data, addBankAccount, updateBankAccount, deleteBankAccount, addBalanceSnapshot, addPerson } = useData();
  const { selectedMonth } = useMonth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [snapshotModal, setSnapshotModal] = useState<BankAccount | null>(null);
  const [historyModal, setHistoryModal] = useState<BankAccount | null>(null);
  const [snapshotAmount, setSnapshotAmount] = useState(0);

  const [form, setForm] = useState({
    bank: '', name: '', holder: '', balance: 0, note: '',
  });

  const totalBalance = useMemo(() => data.bankAccounts.reduce((s, a) => s + a.balance, 0), [data.bankAccounts]);

  const openAdd = () => {
    setEditing(null);
    setForm({ bank: '', name: '', holder: '', balance: 0, note: '' });
    setModalOpen(true);
  };

  const openEdit = (acc: BankAccount) => {
    setEditing(acc);
    setForm({ bank: acc.bank, name: acc.name, holder: acc.holder, balance: acc.balance, note: acc.note ?? '' });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name) return;
    if (editing) {
      updateBankAccount(editing.id, { ...form, note: form.note || undefined });
    } else {
      addBankAccount({ ...form, note: form.note || undefined });
    }
    setModalOpen(false);
  };

  const openSnapshot = (acc: BankAccount) => {
    setSnapshotModal(acc);
    setSnapshotAmount(acc.balance);
  };

  const saveSnapshot = () => {
    if (!snapshotModal) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    addBalanceSnapshot({
      accountId: snapshotModal.id,
      balance: snapshotAmount,
      date: dateStr,
      monthKey: selectedMonth,
    });
    updateBankAccount(snapshotModal.id, { balance: snapshotAmount });
    setSnapshotModal(null);
  };

  const accountSnapshots = (accountId: string) =>
    data.bankBalanceSnapshots
      .filter((s) => s.accountId === accountId)
      .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-sm text-gray-500">{data.bankAccounts.length} conta(s) · Saldo total: {formatCurrency(totalBalance)}</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Nova conta</Button>
      </div>

      {/* Total balance card */}
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Saldo total em contas</p>
            <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(totalBalance)}</p>
          </div>
          <Building2 size={40} className="text-blue-200" />
        </div>
      </Card>

      {data.bankAccounts.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={<Building2 size={48} />} title="Nenhuma conta cadastrada" message="Adicione suas contas bancárias para acompanhar o saldo total e a evolução patrimonial." action={<Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Nova conta</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.bankAccounts.map((acc) => (
            <Card key={acc.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{acc.name}</h3>
                  <p className="text-xs text-gray-400">{acc.bank} · {acc.holder}</p>
                </div>
                <div className="flex gap-1">
                  <IconButton icon={<Edit2 size={14} />} label="Editar conta" onClick={() => openEdit(acc)} />
                  <IconButton icon={<Trash2 size={14} />} label="Excluir conta" variant="danger" onClick={() => setConfirmDelete(acc.id)} />
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-400">Saldo atual</p>
                <p className={`text-2xl font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(acc.balance)}</p>
              </div>
              {acc.note && <p className="text-xs text-gray-500 mb-3 italic">{acc.note}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openSnapshot(acc)}>
                  <ArrowDownCircle size={14} className="inline mr-1" /> Atualizar saldo
                </Button>
                {accountSnapshots(acc.id).length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setHistoryModal(acc)} title="Ver histórico de saldos">
                    <History size={14} className="inline mr-1" /> Histórico
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Account modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar conta' : 'Nova conta'} footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!form.name}>{editing ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          <Input label="Banco" value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} placeholder="Ex: Nubank" required />
          <Input label="Nome da conta" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ex: Conta Principal" required />
          <PersonSelect label="Titular" value={form.holder} onChange={(v) => setForm({ ...form, holder: v })} people={data.people} onAddPerson={addPerson} />
          <CurrencyInput label="Saldo" value={form.balance} onChange={(v) => setForm({ ...form, balance: v })} allowNegative required />
          <TextArea label="Observação" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      {/* Snapshot modal */}
      <Modal open={!!snapshotModal} onClose={() => setSnapshotModal(null)} title="Atualizar saldo" size="sm" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSnapshotModal(null)}>Cancelar</Button>
          <Button onClick={saveSnapshot}>Salvar</Button>
        </div>
      }>
        {snapshotModal && (
          <form onSubmit={(e) => { e.preventDefault(); saveSnapshot(); }} className="space-y-3">
            <p className="text-sm text-gray-600">Regist o saldo de <strong>{snapshotModal.name}</strong> para {formatMonthBR(selectedMonth)}.</p>
            <CurrencyInput label="Saldo" value={snapshotAmount} onChange={setSnapshotAmount} allowNegative required />
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        )}
      </Modal>

      {/* History modal */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={historyModal ? `Histórico · ${historyModal.name}` : ''}>
        {historyModal && (
          <div className="space-y-2">
            {accountSnapshots(historyModal.id).map((snap) => (
              <div key={snap.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">{formatDateBR(snap.date)}</p>
                  <p className="text-xs text-gray-400">{formatMonthBR(snap.monthKey)}</p>
                </div>
                <span className={`text-sm font-bold ${snap.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(snap.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir conta"
        message="Tem certeza que deseja excluir esta conta? Todo o histórico de saldos também será removido."
        onConfirm={() => { if (confirmDelete) deleteBankAccount(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Excluir"
      />
    </div>
  );
}
