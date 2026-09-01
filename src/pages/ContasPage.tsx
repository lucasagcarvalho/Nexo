import { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, ArrowDownCircle, History, ArrowLeft, Save, X, Search, RotateCcw, ArrowUpRight, ArrowDownLeft, Repeat2 } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { formatCurrency, formatMonthBR, formatDateBR } from '@/lib/format';
import { formatBankAccountLabel } from '@/lib/finance/accountRules';
import { calculateAccountLedgerBalance, getTransactionsForAccount, getTransferTransactions, isTransactionReversed } from '@/lib/finance/accountTransactionRules';
import type { AccountTransaction, AccountTransactionKind, AppData, BankAccount, BankAccountType } from '@/lib/types';
import { Card, Button, Modal, Input, Select, TextArea, ConfirmDialog, EmptyState, CurrencyInput, PersonSelect, MonthPicker, Badge } from '@/components/ui';

const ACCOUNT_TYPE_OPTIONS: { value: '' | BankAccountType; label: string }[] = [
  { value: '', label: 'Tipo não informado' },
  { value: 'Conta Corrente', label: 'Conta Corrente' },
  { value: 'Conta Poupança', label: 'Conta Poupança' },
  { value: 'Conta de Pagamento', label: 'Conta de Pagamento' },
  { value: 'Conta Salário', label: 'Conta Salário' },
  { value: 'Conta Digital', label: 'Conta Digital' },
  { value: 'Conta Investimento', label: 'Conta Investimento' },
  { value: 'Outra', label: 'Outra' },
];

interface ContasPageProps {
  accountId?: string | null;
  onOpenAccount?: (accountId: string) => void;
  onBackToAccounts?: () => void;
}

type AccountForm = {
  bank: string;
  holder: string;
  balance: number;
  accountType: '' | BankAccountType;
  agency: string;
  accountNumber: string;
  note: string;
};

const emptyAccountForm = (): AccountForm => ({
  bank: '',
  holder: '',
  balance: 0,
  accountType: '',
  agency: '',
  accountNumber: '',
  note: '',
});

const formFromAccount = (account: BankAccount): AccountForm => ({
  bank: account.bank,
  holder: account.holder,
  balance: account.balance,
  accountType: account.accountType ?? '',
  agency: account.agency ?? '',
  accountNumber: account.accountNumber ?? '',
  note: account.note ?? '',
});

const accountPayloadFromForm = (form: AccountForm): Omit<BankAccount, 'id'> => ({
  bank: form.bank.trim(),
  holder: form.holder.trim(),
  balance: form.balance,
  accountType: form.accountType || null,
  agency: form.agency.trim() || null,
  accountNumber: form.accountNumber.trim() || null,
  note: form.note.trim() || undefined,
});

const canSaveAccount = (form: AccountForm): boolean => (
  form.bank.trim().length > 0 && form.holder.trim().length > 0 && Number.isFinite(form.balance)
);

const accountDetails = (account: BankAccount) => [
  account.accountType,
  account.agency ? `Ag ${account.agency}` : null,
  account.accountNumber ? `Conta ${account.accountNumber}` : null,
].filter(Boolean).join(' · ');

type StatementTypeFilter = 'all' | AccountTransactionKind;
type StatementFlowFilter = 'all' | 'inflow' | 'outflow';

const STATEMENT_TYPE_OPTIONS: { value: StatementTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'initial_balance', label: 'Saldo inicial' },
  { value: 'income_receipt', label: 'Recebimento' },
  { value: 'expense_payment', label: 'Pagamento' },
  { value: 'card_invoice_payment', label: 'Fatura' },
  { value: 'debt_payment', label: 'Dívida' },
  { value: 'transfer_in', label: 'Transferência recebida' },
  { value: 'transfer_out', label: 'Transferência enviada' },
  { value: 'manual_adjustment', label: 'Ajuste manual' },
  { value: 'reversal', label: 'Estorno' },
  { value: 'goal_contribution', label: 'Objetivo' },
  { value: 'goal_withdrawal', label: 'Resgate de objetivo' },
];

const STATEMENT_FLOW_OPTIONS: { value: StatementFlowFilter; label: string }[] = [
  { value: 'all', label: 'Entradas e saídas' },
  { value: 'inflow', label: 'Entradas' },
  { value: 'outflow', label: 'Saídas' },
];

const transactionTypeLabel: Record<AccountTransactionKind, string> = {
  initial_balance: 'Saldo inicial',
  income_receipt: 'Recebimento',
  expense_payment: 'Pagamento',
  card_invoice_payment: 'Pagamento de fatura',
  debt_payment: 'Pagamento de dívida',
  transfer_in: 'Transferência recebida',
  transfer_out: 'Transferência enviada',
  manual_adjustment: 'Ajuste manual',
  reversal: 'Estorno',
  goal_contribution: 'Objetivo financeiro',
  goal_withdrawal: 'Resgate de objetivo',
};

function transactionTitle(data: AppData, transaction: AccountTransaction): string {
  if (transaction.relatedEntityType === 'income' && transaction.relatedEntityId) {
    return data.incomes.find((income) => income.id === transaction.relatedEntityId)?.name ?? 'Receita removida';
  }
  if (transaction.relatedEntityType === 'expense' && transaction.relatedEntityId) {
    return data.expenses.find((expense) => expense.id === transaction.relatedEntityId)?.description ?? 'Gasto removido';
  }
  if (transaction.relatedEntityType === 'debt' && transaction.relatedEntityId) {
    return data.debts.find((debt) => debt.id === transaction.relatedEntityId)?.name ?? 'Dívida removida';
  }
  if (transaction.relatedEntityType === 'cardInvoice' && transaction.relatedEntityId) {
    return data.cards.find((card) => card.id === transaction.relatedEntityId)?.name ?? 'Cartão removido';
  }
  return transaction.note || transactionTypeLabel[transaction.kind];
}

function transactionRelatedLabel(data: AppData, transaction: AccountTransaction): string | null {
  if (transaction.relatedEntityType === 'transfer' && transaction.relatedEntityId) {
    const counterpart = (data.accountTransactions ?? []).find((item) => (
      item.id !== transaction.id
      && item.relatedEntityType === 'transfer'
      && item.relatedEntityId === transaction.relatedEntityId
    ));
    const counterpartAccount = counterpart
      ? data.bankAccounts.find((account) => account.id === counterpart.accountId)
      : null;
    if (counterpartAccount) {
      return transaction.kind === 'transfer_in'
        ? `Origem: ${formatBankAccountLabel(counterpartAccount)}`
        : `Destino: ${formatBankAccountLabel(counterpartAccount)}`;
    }
    return 'Transferência sem contraparte localizada';
  }
  if (transaction.relatedMonthKey) return `Competência: ${formatMonthBR(transaction.relatedMonthKey)}`;
  if (transaction.relatedEntityType) return `Origem: ${transaction.relatedEntityType}`;
  return null;
}

export function ContasPage({ accountId = null, onOpenAccount, onBackToAccounts }: ContasPageProps) {
  const { data, addBankAccount, updateBankAccount, deleteBankAccount, reconcileBankAccountBalance, transferBalance, undoTransfer, addPerson } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [snapshotModal, setSnapshotModal] = useState<BankAccount | null>(null);
  const [historyModal, setHistoryModal] = useState<BankAccount | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [snapshotAmount, setSnapshotAmount] = useState(0);
  const [snapshotDate, setSnapshotDate] = useState('');
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    date: '',
    note: '',
  });

  const [form, setForm] = useState<AccountForm>(emptyAccountForm);

  const totalBalance = useMemo(() => data.bankAccounts.reduce((s, a) => s + a.balance, 0), [data.bankAccounts]);
  const canSave = canSaveAccount(form);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyAccountForm());
    setModalOpen(true);
  };

  const openTransfer = () => {
    const today = new Date();
    setTransferForm({
      fromAccountId: data.bankAccounts[0]?.id ?? '',
      toAccountId: data.bankAccounts.find((account) => account.id !== data.bankAccounts[0]?.id)?.id ?? '',
      amount: 0,
      date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      note: '',
    });
    setTransferModalOpen(true);
  };

  const save = () => {
    if (!canSave) return;
    const accountPayload = accountPayloadFromForm(form);
    if (editing) {
      updateBankAccount(editing.id, accountPayload);
    } else {
      addBankAccount(accountPayload);
    }
    setModalOpen(false);
  };

  const openSnapshot = (acc: BankAccount) => {
    setSnapshotModal(acc);
    setSnapshotAmount(acc.balance);
    const today = new Date();
    setSnapshotDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  const saveSnapshot = () => {
    if (!snapshotModal || !snapshotDate) return;
    reconcileBankAccountBalance(snapshotModal.id, snapshotAmount, snapshotDate, `Conciliação manual de ${formatMonthBR(snapshotDate.slice(0, 7))}.`);
    setSnapshotModal(null);
  };

  const fromTransferAccount = transferForm.fromAccountId
    ? data.bankAccounts.find((account) => account.id === transferForm.fromAccountId) ?? null
    : null;
  const toTransferAccount = transferForm.toAccountId
    ? data.bankAccounts.find((account) => account.id === transferForm.toAccountId) ?? null
    : null;
  const canTransfer = (
    !!fromTransferAccount
    && !!toTransferAccount
    && transferForm.fromAccountId !== transferForm.toAccountId
    && transferForm.amount > 0
    && !!transferForm.date
  );
  const fromBalanceAfterTransfer = fromTransferAccount ? fromTransferAccount.balance - transferForm.amount : undefined;
  const toBalanceAfterTransfer = toTransferAccount ? toTransferAccount.balance + transferForm.amount : undefined;
  const transferWarning = fromBalanceAfterTransfer !== undefined && fromBalanceAfterTransfer < 0
    ? `Esta transferência deixará a conta de origem em ${formatCurrency(fromBalanceAfterTransfer)}.`
    : null;

  const saveTransfer = () => {
    if (!canTransfer) return;
    transferBalance({
      fromAccountId: transferForm.fromAccountId,
      toAccountId: transferForm.toAccountId,
      amount: transferForm.amount,
      date: transferForm.date,
      note: transferForm.note.trim() || undefined,
    });
    setConfirmTransfer(false);
    setTransferModalOpen(false);
  };

  const accountSnapshots = (accountId: string) =>
    data.bankBalanceSnapshots
      .filter((s) => s.accountId === accountId)
      .sort((a, b) => b.date.localeCompare(a.date));

  const snapshotLedgerBalance = snapshotModal && snapshotDate
    ? calculateAccountLedgerBalance(data, snapshotModal.id, snapshotDate)
    : 0;
  const snapshotDifference = Math.round((snapshotAmount - snapshotLedgerBalance) * 100) / 100;

  const snapshotModalContent = (
    <Modal open={!!snapshotModal} onClose={() => setSnapshotModal(null)} title="Conciliar saldo" size="sm" footer={
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setSnapshotModal(null)}>Cancelar</Button>
        <Button onClick={saveSnapshot} disabled={!snapshotDate}>Confirmar ajuste</Button>
      </div>
    }>
      {snapshotModal && (
        <form onSubmit={(e) => { e.preventDefault(); saveSnapshot(); }} className="space-y-3">
          <p className="text-sm text-gray-600">Confira o saldo de <strong>{formatBankAccountLabel(snapshotModal)}</strong> antes de confirmar.</p>
          <Input label="Data da conciliação" type="date" value={snapshotDate} onChange={setSnapshotDate} required />
          <CurrencyInput label="Saldo real informado" value={snapshotAmount} onChange={setSnapshotAmount} allowNegative required />
          <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Saldo calculado</span>
              <span className="font-medium text-gray-800">{formatCurrency(snapshotLedgerBalance)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Saldo informado</span>
              <span className="font-medium text-gray-800">{formatCurrency(snapshotAmount)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-700">Ajuste manual</span>
              <span className={`font-bold ${snapshotDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(snapshotDifference)}</span>
            </div>
          </div>
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      )}
    </Modal>
  );

  if (accountId) {
    const account = data.bankAccounts.find((acc) => acc.id === accountId);
    return (
      <>
        <AccountDetailView
          account={account}
          data={data}
          onBack={onBackToAccounts ?? (() => undefined)}
          onEdit={(id, updates) => updateBankAccount(id, updates)}
          onDelete={(id) => {
            deleteBankAccount(id);
            onBackToAccounts?.();
          }}
          onOpenSnapshot={openSnapshot}
          onUndoTransfer={undoTransfer}
          addPerson={addPerson}
        />
        {snapshotModalContent}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-sm text-gray-500">{data.bankAccounts.length} conta(s) · Saldo total: {formatCurrency(totalBalance)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openTransfer} disabled={data.bankAccounts.length < 2}>
            <Repeat2 size={16} className="inline mr-1" /> Transferir saldo
          </Button>
          <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Nova conta</Button>
        </div>
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
            <Card key={acc.id} className="p-0 overflow-hidden" hoverable>
              <button
                type="button"
                onClick={() => onOpenAccount?.(acc.id)}
                className="block w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 hover:text-blue-700">{formatBankAccountLabel(acc)}</h3>
                  {accountDetails(acc) && <p className="text-xs text-gray-400">{accountDetails(acc)}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Saldo atual</p>
                  <p className={`text-2xl font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(acc.balance)}</p>
                  <p className="text-xs text-gray-400 mt-1">Ledger: {formatCurrency(calculateAccountLedgerBalance(data, acc.id))}</p>
                </div>
                {acc.note && <p className="text-xs text-gray-500 mt-3 italic">{acc.note}</p>}
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Account modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar conta' : 'Nova conta'} footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!canSave}>{editing ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          <Input label="Banco" value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} placeholder="Ex: Nubank" required />
          <PersonSelect label="Titular" value={form.holder} onChange={(v) => setForm({ ...form, holder: v })} people={data.people} onAddPerson={addPerson} required />
          <CurrencyInput label="Saldo" value={form.balance} onChange={(v) => setForm({ ...form, balance: v })} allowNegative required />
          <Select label="Tipo" value={form.accountType} onChange={(v) => setForm({ ...form, accountType: v as '' | BankAccountType })} options={ACCOUNT_TYPE_OPTIONS} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Agência" value={form.agency} onChange={(v) => setForm({ ...form, agency: v })} placeholder="Ex: 0001" />
            <Input label="Número da conta" value={form.accountNumber} onChange={(v) => setForm({ ...form, accountNumber: v })} placeholder="Ex: 12345-6" />
          </div>
          <TextArea label="Observação" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      {/* Reconciliation modal */}
      {snapshotModalContent}

      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transferir saldo" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTransferModalOpen(false)}>Cancelar</Button>
          <Button onClick={() => setConfirmTransfer(true)} disabled={!canTransfer}>Revisar transferência</Button>
        </div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); if (canTransfer) setConfirmTransfer(true); }} className="space-y-3">
          <Select
            label="Conta de origem"
            value={transferForm.fromAccountId}
            onChange={(value) => setTransferForm({ ...transferForm, fromAccountId: value })}
            options={[
              { value: '', label: 'Selecione a origem' },
              ...data.bankAccounts.map((account) => ({ value: account.id, label: formatBankAccountLabel(account) })),
            ]}
            required
          />
          <Select
            label="Conta de destino"
            value={transferForm.toAccountId}
            onChange={(value) => setTransferForm({ ...transferForm, toAccountId: value })}
            options={[
              { value: '', label: 'Selecione o destino' },
              ...data.bankAccounts.map((account) => ({ value: account.id, label: formatBankAccountLabel(account) })),
            ]}
            required
          />
          <CurrencyInput label="Valor" value={transferForm.amount} onChange={(value) => setTransferForm({ ...transferForm, amount: value })} required />
          <Input label="Data" type="date" value={transferForm.date} onChange={(value) => setTransferForm({ ...transferForm, date: value })} required />
          <TextArea label="Observação" value={transferForm.note} onChange={(value) => setTransferForm({ ...transferForm, note: value })} />
          {transferForm.fromAccountId && transferForm.toAccountId && transferForm.fromAccountId === transferForm.toAccountId && (
            <p className="text-sm text-rose-600">Origem e destino precisam ser contas diferentes.</p>
          )}
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      <Modal open={confirmTransfer} onClose={() => setConfirmTransfer(false)} title="Confirmar transferência" size="sm" footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmTransfer(false)}>Cancelar</Button>
          {transferWarning && <Button variant="secondary" onClick={() => setConfirmTransfer(false)}>Escolher outra conta</Button>}
          <Button onClick={saveTransfer}>{transferWarning ? 'Continuar mesmo assim' : 'Confirmar transferência'}</Button>
        </div>
      }>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Valor</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(transferForm.amount)}</p>
            {transferForm.date && <p className="text-xs text-gray-400">{formatDateBR(transferForm.date)}</p>}
          </div>
          <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
            {fromTransferAccount && (
              <div className="space-y-1">
                <p className="font-semibold text-gray-800">{formatBankAccountLabel(fromTransferAccount)}</p>
                <div className="flex justify-between gap-3"><span className="text-gray-500">Atual</span><span className="font-medium text-gray-800">{formatCurrency(fromTransferAccount.balance)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-500">Depois</span><span className={`font-bold ${fromBalanceAfterTransfer !== undefined && fromBalanceAfterTransfer >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(fromBalanceAfterTransfer ?? 0)}</span></div>
              </div>
            )}
            {toTransferAccount && (
              <div className="space-y-1 border-t border-gray-200 pt-2">
                <p className="font-semibold text-gray-800">{formatBankAccountLabel(toTransferAccount)}</p>
                <div className="flex justify-between gap-3"><span className="text-gray-500">Atual</span><span className="font-medium text-gray-800">{formatCurrency(toTransferAccount.balance)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-500">Depois</span><span className="font-bold text-emerald-600">{formatCurrency(toBalanceAfterTransfer ?? 0)}</span></div>
              </div>
            )}
          </div>
          {transferWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-700">Atenção</p>
              <p className="mt-1 text-sm text-amber-700">{transferWarning}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* History modal */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={historyModal ? `Histórico · ${formatBankAccountLabel(historyModal)}` : ''}>
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

    </div>
  );
}

function AccountDetailView({
  account,
  data,
  onBack,
  onEdit,
  onDelete,
  onOpenSnapshot,
  onUndoTransfer,
  addPerson,
}: {
  account?: BankAccount;
  data: ReturnType<typeof useData>['data'];
  onBack: () => void;
  onEdit: (id: string, updates: Partial<BankAccount>) => void;
  onDelete: (id: string) => void;
  onOpenSnapshot: (account: BankAccount) => void;
  onUndoTransfer: (transferId: string) => void;
  addPerson: (name: string, note?: string) => string;
}) {
  const { selectedMonth } = useMonth();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<AccountForm>(() => account ? formFromAccount(account) : emptyAccountForm());

  useEffect(() => {
    if (!account) return;
    setForm(formFromAccount(account));
    setEditing(false);
  }, [account]);

  if (!account) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} className="inline mr-1" /> Voltar
        </Button>
        <Card className="p-8">
          <EmptyState
            icon={<Building2 size={48} />}
            title="Conta não encontrada"
            message="A conta selecionada não existe mais ou foi removida."
            action={<Button onClick={onBack}>Ver contas</Button>}
          />
        </Card>
      </div>
    );
  }

  const ledgerBalance = calculateAccountLedgerBalance(data, account.id);
  const difference = Math.round((account.balance - ledgerBalance) * 100) / 100;
  const hasDifference = Math.abs(difference) >= 0.01;
  const canSave = canSaveAccount(form);

  const save = () => {
    if (!canSave) return;
    onEdit(account.id, accountPayloadFromForm(form));
    setEditing(false);
  };

  const cancel = () => {
    setForm(formFromAccount(account));
    setEditing(false);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} className="inline mr-1" /> Contas
          </Button>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button variant="secondary" onClick={cancel}>
                  <X size={16} className="inline mr-1" /> Cancelar
                </Button>
                <Button onClick={save} disabled={!canSave}>
                  <Save size={16} className="inline mr-1" /> Salvar
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Edit2 size={16} className="inline mr-1" /> Editar
                </Button>
                <Button onClick={() => onOpenSnapshot(account)}>
                  <ArrowDownCircle size={16} className="inline mr-1" /> Atualizar saldo
                </Button>
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={16} className="inline mr-1" /> Excluir
                </Button>
              </>
            )}
          </div>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Banco" value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} required />
            <PersonSelect label="Titular" value={form.holder} onChange={(v) => setForm({ ...form, holder: v })} people={data.people} onAddPerson={addPerson} required />
            <CurrencyInput label="Saldo" value={form.balance} onChange={(v) => setForm({ ...form, balance: v })} allowNegative required />
            <Select label="Tipo" value={form.accountType} onChange={(v) => setForm({ ...form, accountType: v as '' | BankAccountType })} options={ACCOUNT_TYPE_OPTIONS} />
            <Input label="Agência" value={form.agency} onChange={(v) => setForm({ ...form, agency: v })} />
            <Input label="Número da conta" value={form.accountNumber} onChange={(v) => setForm({ ...form, accountNumber: v })} />
            <div className="md:col-span-2">
              <TextArea label="Observação" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
            </div>
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Banco</p>
                <h1 className="text-2xl font-bold text-gray-900">{account.bank}</h1>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Titular</p>
                  <p className="font-semibold text-gray-800">{account.holder}</p>
                </div>
                {account.accountType && (
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-semibold text-gray-800">{account.accountType}</p>
                  </div>
                )}
                {account.agency && (
                  <div>
                    <p className="text-sm text-gray-500">Agência</p>
                    <p className="font-semibold text-gray-800">{account.agency}</p>
                  </div>
                )}
                {account.accountNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Conta</p>
                    <p className="font-semibold text-gray-800">{account.accountNumber}</p>
                  </div>
                )}
              </div>
              {account.note && (
                <div>
                  <p className="text-sm text-gray-500">Observação</p>
                  <p className="text-sm text-gray-700">{account.note}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Saldo atual</p>
              <p className={`text-3xl font-bold ${account.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(account.balance)}</p>
              <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Saldo por ledger</span>
                  <span className="font-medium text-gray-800">{formatCurrency(ledgerBalance)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Status de conciliação</span>
                  <span className={`font-semibold ${hasDifference ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {hasDifference ? `Diferença ${formatCurrency(difference)}` : 'Conciliado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        </section>

        <AccountStatement account={account} data={data} initialMonth={selectedMonth} onUndoTransfer={onUndoTransfer} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir conta"
        message="Tem certeza que deseja excluir esta conta? Todo o histórico de saldos também será removido."
        onConfirm={() => {
          onDelete(account.id);
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Excluir"
      />
    </>
  );
}

function AccountStatement({
  account,
  data,
  initialMonth,
  onUndoTransfer,
}: {
  account: BankAccount;
  data: AppData;
  initialMonth: string;
  onUndoTransfer: (transferId: string) => void;
}) {
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [typeFilter, setTypeFilter] = useState<StatementTypeFilter>('all');
  const [flowFilter, setFlowFilter] = useState<StatementFlowFilter>('all');
  const [search, setSearch] = useState('');
  const [confirmTransferReversal, setConfirmTransferReversal] = useState<AccountTransaction | null>(null);

  useEffect(() => {
    setMonthFilter(initialMonth);
  }, [initialMonth]);

  const statementRows = useMemo(() => {
    let runningBalance = 0;
    const rows = getTransactionsForAccount(data, account.id).map((transaction) => {
      runningBalance = Math.round((runningBalance + transaction.amount) * 100) / 100;
      return {
        transaction,
        title: transactionTitle(data, transaction),
        relatedLabel: transactionRelatedLabel(data, transaction),
        balanceAfter: runningBalance,
      };
    });

    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter((row) => {
      const { transaction } = row;
      if (monthFilter && transaction.monthKey !== monthFilter) return false;
      if (typeFilter !== 'all' && transaction.kind !== typeFilter) return false;
      if (flowFilter === 'inflow' && transaction.amount <= 0) return false;
      if (flowFilter === 'outflow' && transaction.amount >= 0) return false;
      if (!normalizedSearch) return true;
      return [
        row.title,
        row.relatedLabel,
        transaction.note,
        transactionTypeLabel[transaction.kind],
        transaction.date,
      ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
    });
  }, [account.id, data, flowFilter, monthFilter, search, typeFilter]);

  const monthlyTotal = statementRows.reduce((sum, row) => sum + row.transaction.amount, 0);
  const transferToReverse = confirmTransferReversal?.relatedEntityId
    ? getTransferTransactions(data, confirmTransferReversal.relatedEntityId)
    : [];
  const transferOut = transferToReverse.find((transaction) => transaction.kind === 'transfer_out') ?? null;
  const transferIn = transferToReverse.find((transaction) => transaction.kind === 'transfer_in') ?? null;
  const transferFromAccount = transferOut ? data.bankAccounts.find((item) => item.id === transferOut.accountId) ?? null : null;
  const transferToAccount = transferIn ? data.bankAccounts.find((item) => item.id === transferIn.accountId) ?? null : null;
  const transferAmount = transferOut ? Math.abs(transferOut.amount) : Math.abs(confirmTransferReversal?.amount ?? 0);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Extrato</h2>
            <p className="text-sm text-gray-500">{formatBankAccountLabel(account)} · {formatMonthBR(monthFilter)}</p>
          </div>
          <div className={`text-sm font-semibold ${monthlyTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            Movimento no período: {formatCurrency(monthlyTotal)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_1fr_1.4fr]">
          <MonthPicker label="Mês" value={monthFilter} onChange={setMonthFilter} />
          <Select label="Tipo" value={typeFilter} onChange={(value) => setTypeFilter(value as StatementTypeFilter)} options={STATEMENT_TYPE_OPTIONS} />
          <Select label="Fluxo" value={flowFilter} onChange={(value) => setFlowFilter(value as StatementFlowFilter)} options={STATEMENT_FLOW_OPTIONS} />
          <div className="relative">
            <Input label="Busca" value={search} onChange={setSearch} placeholder="Descrição, origem ou data" />
            <Search size={16} className="pointer-events-none absolute bottom-2.5 right-3 text-gray-400" />
          </div>
        </div>
      </div>

      {statementRows.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<History size={48} />}
            title="Nenhuma movimentação encontrada"
            message="Ajuste os filtros ou selecione outro mês para consultar o extrato desta conta."
          />
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {statementRows.map(({ transaction, title, relatedLabel, balanceAfter }) => {
            const isCredit = transaction.amount >= 0;
            const canReverseTransfer = (
              transaction.relatedEntityType === 'transfer'
              && !!transaction.relatedEntityId
              && (transaction.kind === 'transfer_out' || transaction.kind === 'transfer_in')
              && !isTransactionReversed(data, transaction.id)
            );
            const Icon = transaction.kind === 'reversal'
              ? RotateCcw
              : isCredit
                ? ArrowDownLeft
                : ArrowUpRight;
            return (
              <div key={transaction.id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[96px_1fr_auto] md:items-center">
                <div className="text-sm font-medium text-gray-600">{formatDateBR(transaction.date)}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon size={16} className={isCredit ? 'text-emerald-500' : 'text-rose-500'} />
                    <p className="font-semibold text-gray-900">{title}</p>
                    <Badge color={transaction.kind === 'reversal' ? 'yellow' : isCredit ? 'green' : 'red'}>
                      {transactionTypeLabel[transaction.kind]}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    {relatedLabel && <span>{relatedLabel}</span>}
                    {transaction.note && transaction.note !== title && <span>{transaction.note}</span>}
                    {transaction.reversalOfTransactionId && <span>Estorna: {transaction.reversalOfTransactionId}</span>}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className={`text-base font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isCredit ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                  </p>
                  <p className="text-xs text-gray-400">Saldo após: {formatCurrency(balanceAfter)}</p>
                  {canReverseTransfer && (
                    <button
                      type="button"
                      onClick={() => setConfirmTransferReversal(transaction)}
                      className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800"
                    >
                      Estornar transferência
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={confirmTransferReversal !== null} onClose={() => setConfirmTransferReversal(null)} title="Estornar transferência" size="sm" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmTransferReversal(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (confirmTransferReversal?.relatedEntityId) onUndoTransfer(confirmTransferReversal.relatedEntityId);
            setConfirmTransferReversal(null);
          }}>
            Confirmar estorno
          </Button>
        </div>
      }>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Esta ação cria reversões nas duas contas e preserva os lançamentos originais.</p>
          <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Valor</span>
              <span className="font-semibold text-gray-900">{formatCurrency(transferAmount)}</span>
            </div>
            {transferFromAccount && transferOut && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Origem após estorno</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(transferFromAccount.balance - transferOut.amount)}</span>
              </div>
            )}
            {transferToAccount && transferIn && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Destino após estorno</span>
                <span className="font-semibold text-rose-600">{formatCurrency(transferToAccount.balance - transferIn.amount)}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
}
