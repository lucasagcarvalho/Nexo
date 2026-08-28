import { useState, useMemo, useRef, type FormEvent } from 'react';
import { Plus, Edit2, Trash2, Copy, Check, X, Wallet, Search, Repeat, Calendar, Clock, Info, Power, AlertTriangle } from 'lucide-react';
import { useData, getActiveVigencia, applyVigenciaChange, applyMonthOverride } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { formatCurrency, formatMonthBR, formatDateBR, currentMonthKey, uid, compareMonths, addMonths } from '@/lib/format';
import type { Expense, ExpenseType, PaymentMethod, EntryStatus, Vigencia } from '@/lib/types';
import { Card, Badge, Button, Modal, Input, Select, TextArea, EmptyState, CurrencyInput, MonthPicker, IconButton } from '@/components/ui';

const PAYMENT_METHODS: PaymentMethod[] = ['Dinheiro', 'Débito', 'Crédito', 'PIX', 'Boleto', 'Transferência'];

const TYPE_META: Record<ExpenseType, { label: string; color: 'blue' | 'purple' | 'amber'; icon: typeof Repeat; badgeColor: 'blue' | 'purple' | 'yellow' }> = {
  Fixo: { label: 'Fixo', color: 'blue', icon: Repeat, badgeColor: 'blue' },
  Prazo: { label: 'Prazo', color: 'purple', icon: Clock, badgeColor: 'purple' },
  Pontual: { label: 'Pontual', color: 'amber', icon: Calendar, badgeColor: 'yellow' },
};

type ModalMode = 'add' | 'edit' | 'deactivate';
type DeleteMode = null | { expense: Expense; monthKey: string };

interface FormState {
  description: string;
  amount: number;
  category: string;
  type: ExpenseType;
  paymentMethod: PaymentMethod;
  dueDay: number;
  startDate: string;
  endDate: string;
  competenceDate: string;
  note: string;
  paid: boolean;
  status: EntryStatus;
  realizedAmount: number;
  editMode: 'this-month' | 'future';
  changeMonth: string;
  deactivateMonth: string;
}

/** Calculate total months in a Prazo vigência (inclusive) */
function countMonths(start: string, end: string): number {
  return compareMonths(end, start) + 1;
}

/** Calculate current installment number for a Prazo expense in a given month */
function currentInstallment(exp: Expense, monthKey: string): number {
  const vig = getActiveVigencia(exp.vigencias, monthKey);
  if (!vig) return 0;
  return compareMonths(monthKey, vig.startDate) + 1;
}

/** Calculate total installments for a Prazo expense */
function totalInstallments(exp: Expense): number {
  const vig = exp.vigencias[0];
  if (!vig || !vig.endDate) return 0;
  return countMonths(vig.startDate, vig.endDate);
}

export function GastosPage() {
  const { data, addExpense, updateExpense, deleteExpense, duplicateExpense, togglePaidMonth, isExpensePaidForMonth, deleteExpenseMonth, addCategory } = useData();
  const { selectedMonth } = useMonth();
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMinValue, setFilterMinValue] = useState('');
  const [filterMaxValue, setFilterMaxValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [form, setForm] = useState<FormState>({
    description: '', amount: 0, category: 'Moradia', type: 'Fixo',
    paymentMethod: 'Transferência',
    dueDay: 10, startDate: selectedMonth, endDate: '',
    competenceDate: '', note: '', paid: false,
    status: 'previsto', realizedAmount: 0,
    editMode: 'future', changeMonth: selectedMonth, deactivateMonth: selectedMonth,
  });

  const resetForm = () => {
    setForm({
      description: '', amount: 0, category: data.categories[0] ?? 'Outros', type: 'Fixo',
      paymentMethod: 'Transferência',
      dueDay: 10, startDate: selectedMonth, endDate: '',
      competenceDate: '', note: '', paid: false,
      status: 'previsto', realizedAmount: 0,
      editMode: 'future', changeMonth: selectedMonth, deactivateMonth: selectedMonth,
    });
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setModalMode('add');
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    const vig = getActiveVigencia(exp.vigencias, selectedMonth);
    const amount = vig?.amount ?? 0;
    setForm({
      description: exp.description, amount, category: exp.category, type: exp.type,
      paymentMethod: exp.paymentMethod,
      dueDay: exp.dueDay,
      startDate: exp.type === 'Pontual' ? (exp.competenceMonth ?? selectedMonth) : (vig?.startDate ?? exp.vigencias[0]?.startDate ?? selectedMonth),
      endDate: vig?.endDate ?? '',
      competenceDate: exp.type === 'Pontual' ? (exp.competenceMonth ?? selectedMonth) : '',
      note: exp.note ?? '', paid: isExpensePaidForMonth(exp, selectedMonth),
      status: exp.status, realizedAmount: exp.realizedAmount ?? 0,
      editMode: 'this-month', changeMonth: selectedMonth, deactivateMonth: selectedMonth,
    });
    setModalMode('edit');
  };

  const openDeactivate = (exp: Expense) => {
    setEditing(exp);
    setForm((f) => ({ ...f, deactivateMonth: selectedMonth }));
    setModalMode('deactivate');
  };

  const openDelete = (exp: Expense) => {
    setDeleteMode({ expense: exp, monthKey: selectedMonth });
  };

  const isFormValid = () => {
    if (!form.description || form.amount <= 0) return false;
    if (form.type === 'Prazo' && !form.endDate) return false;
    if (form.type === 'Prazo' && form.endDate && compareMonths(form.endDate, form.startDate) < 0) return false;
    if (form.type === 'Pontual' && !form.competenceDate) return false;
    return true;
  };

  // Auto-calculate installments for Prazo
  const prazoInstallments = useMemo(() => {
    if (form.type !== 'Prazo' || !form.startDate || !form.endDate) return 0;
    return countMonths(form.startDate, form.endDate);
  }, [form.type, form.startDate, form.endDate]);

  const save = () => {
    if (!isFormValid()) return;

    if (modalMode === 'add') {
      const paidMonths: Record<string, boolean> = {};
      if (form.paid) {
        const month = form.type === 'Pontual' ? form.competenceDate : form.startDate;
        paidMonths[month] = true;
      }
      const base = {
        description: form.description, category: form.category, type: form.type,
        person: '', paymentMethod: form.paymentMethod, dueDay: form.dueDay,
        note: form.note || undefined, paid: form.type === 'Pontual' ? form.paid : false, paidMonths, active: true, status: form.status,
        realizedAmount: form.status === 'realizado' ? form.realizedAmount : null,
      };
      if (form.type === 'Fixo') {
        addExpense({
          ...base,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.startDate, endDate: null }],
        });
      } else if (form.type === 'Prazo') {
        addExpense({
          ...base,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.startDate, endDate: form.endDate || null }],
        });
      } else {
        addExpense({
          ...base,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.competenceDate, endDate: form.competenceDate }],
          competenceMonth: form.competenceDate,
        });
      }
    } else if (modalMode === 'edit' && editing) {
      const paidMonths = { ...(editing.paidMonths ?? {}) };
      const monthToToggle = form.type === 'Pontual' ? form.competenceDate : selectedMonth;
      if (form.paid !== isExpensePaidForMonth(editing, monthToToggle)) {
        paidMonths[monthToToggle] = form.paid;
      }

      if (form.type === 'Pontual') {
        updateExpense(editing.id, {
          description: form.description, category: form.category,
          paymentMethod: form.paymentMethod, dueDay: form.dueDay, note: form.note || undefined,
          paid: form.paid, paidMonths, status: form.status,
          realizedAmount: form.status === 'realizado' ? form.realizedAmount : null,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.competenceDate, endDate: form.competenceDate }],
          competenceMonth: form.competenceDate,
        });
      } else {
        if (form.editMode === 'this-month') {
          const newVigencias = applyMonthOverride(editing.vigencias, selectedMonth, form.amount);
          updateExpense(editing.id, {
            description: form.description, category: form.category,
            paymentMethod: form.paymentMethod, dueDay: form.dueDay, note: form.note || undefined,
            paidMonths, vigencias: newVigencias, status: form.status,
            realizedAmount: form.status === 'realizado' ? form.realizedAmount : null,
          });
        } else {
          const newVigencias = applyVigenciaChange(editing.vigencias, form.changeMonth, form.amount);
          updateExpense(editing.id, {
            description: form.description, category: form.category,
            paymentMethod: form.paymentMethod, dueDay: form.dueDay, note: form.note || undefined,
            paidMonths, vigencias: newVigencias, status: form.status,
            realizedAmount: form.status === 'realizado' ? form.realizedAmount : null,
          });
        }
      }
    } else if (modalMode === 'deactivate' && editing) {
      const deactMonth = form.deactivateMonth;
      const prevMonthKey = addMonths(deactMonth, -1);
      const newVigencias = editing.vigencias.map((v) => {
        if (!v.endDate || compareMonths(v.endDate, deactMonth) >= 0) {
          if (compareMonths(v.startDate, deactMonth) < 0) {
            return { ...v, endDate: prevMonthKey };
          }
        }
        return v;
      });
      updateExpense(editing.id, { vigencias: newVigencias, active: false });
    }
    setModalMode(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    save();
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !data.categories.includes(newCategory.trim())) {
      addCategory(newCategory.trim());
      setForm((f) => ({ ...f, category: newCategory.trim() }));
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteMode) return;
    const { expense, monthKey } = deleteMode;
    if (expense.type === 'Pontual') {
      deleteExpense(expense.id);
    } else {
      deleteExpenseMonth(expense.id, monthKey, 'future');
    }
    setDeleteMode(null);
  };

  const handleDeleteThisMonth = () => {
    if (!deleteMode) return;
    const { expense, monthKey } = deleteMode;
    deleteExpenseMonth(expense.id, monthKey, 'this-month');
    setDeleteMode(null);
  };

  // Filter expenses for the selected month
  const monthExpenses = useMemo(() => {
    return data.expenses.filter((exp) => {
      if (exp.type === 'Fixo' || exp.type === 'Prazo') {
        return getActiveVigencia(exp.vigencias, selectedMonth) !== null;
      }
      return exp.competenceMonth === selectedMonth;
    });
  }, [data.expenses, selectedMonth]);

  const filtered = useMemo(() => {
    return monthExpenses.filter((e) => {
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType && e.type !== filterType) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      const isPaid = isExpensePaidForMonth(e, selectedMonth);
      if (filterStatus === 'paid' && !isPaid) return false;
      if (filterStatus === 'pending' && isPaid) return false;
      const vig = getActiveVigencia(e.vigencias, selectedMonth);
      const amt = vig?.amount ?? 0;
      if (filterMinValue && amt < parseFloat(filterMinValue)) return false;
      if (filterMaxValue && amt > parseFloat(filterMaxValue)) return false;
      return true;
    });
  }, [monthExpenses, search, filterType, filterCategory, filterStatus, filterMinValue, filterMaxValue, selectedMonth, isExpensePaidForMonth]);

  const totalFiltered = filtered.reduce((s, e) => {
    const vig = getActiveVigencia(e.vigencias, selectedMonth);
    return s + (vig?.amount ?? 0);
  }, 0);
  const totalPaid = filtered.filter((e) => isExpensePaidForMonth(e, selectedMonth)).reduce((s, e) => {
    const vig = getActiveVigencia(e.vigencias, selectedMonth);
    return s + (vig?.amount ?? 0);
  }, 0);
  const totalPending = totalFiltered - totalPaid;

  const fixedTotal = filtered.filter((e) => e.type === 'Fixo').reduce((s, e) => s + (getActiveVigencia(e.vigencias, selectedMonth)?.amount ?? 0), 0);
  const prazoTotal = filtered.filter((e) => e.type === 'Prazo').reduce((s, e) => s + (getActiveVigencia(e.vigencias, selectedMonth)?.amount ?? 0), 0);
  const pontualTotal = filtered.filter((e) => e.type === 'Pontual').reduce((s, e) => s + (getActiveVigencia(e.vigencias, selectedMonth)?.amount ?? 0), 0);

  const activeCategories = data.categoryEntries.filter((c) => c.active).map((c) => c.name);

  const modalTitle = modalMode === 'add' ? 'Adicionar gasto' : modalMode === 'edit' ? 'Editar gasto' : modalMode === 'deactivate' ? 'Desativar gasto' : '';

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500">Competência: {formatMonthBR(selectedMonth)} · {filtered.length} despesa(s) · {formatCurrency(totalFiltered)}</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Adicionar gasto</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-xs text-gray-400">Total</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totalFiltered)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Pago</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Pendente</p><p className="text-lg font-bold text-amber-600">{formatCurrency(totalPending)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Fixos</p><p className="text-lg font-bold text-blue-600">{formatCurrency(fixedTotal)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Prazo + Pontual</p><p className="text-lg font-bold text-purple-600">{formatCurrency(prazoTotal + pontualTotal)}</p></Card>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
            <Search size={14} /> Filtros {showFilters ? '▲' : '▼'}
          </button>
          {(filterType || filterCategory || filterStatus || filterMinValue || filterMaxValue) && (
            <button onClick={() => { setFilterType(''); setFilterCategory(''); setFilterStatus(''); setFilterMinValue(''); setFilterMaxValue(''); }} className="text-xs text-gray-400 hover:text-gray-600">Limpar filtros</button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar gasto..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Select value={filterType} onChange={setFilterType} options={[{ value: '', label: 'Todos tipos' }, { value: 'Fixo', label: 'Fixo' }, { value: 'Prazo', label: 'Prazo' }, { value: 'Pontual', label: 'Pontual' }]} />
          <Select value={filterCategory} onChange={setFilterCategory} options={[{ value: '', label: 'Todas categorias' }, ...activeCategories.map((c) => ({ value: c, label: c }))]} />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <Select value={filterStatus} onChange={setFilterStatus} options={[{ value: '', label: 'Todos status' }, { value: 'paid', label: 'Pagos' }, { value: 'pending', label: 'Pendentes' }]} />
            <div className="flex gap-2">
              <Input type="number" value={filterMinValue} onChange={setFilterMinValue} placeholder="Valor mín." />
              <Input type="number" value={filterMaxValue} onChange={setFilterMaxValue} placeholder="Valor máx." />
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<Wallet size={48} />} title={`Nenhum gasto em ${formatMonthBR(selectedMonth)}`} message="Adicione um gasto fixo, com prazo ou pontual." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Vencimento</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => {
                  const vig = getActiveVigencia(exp.vigencias, selectedMonth);
                  const amount = vig?.amount ?? 0;
                  const meta = TYPE_META[exp.type];
                  const Icon = meta.icon;
                  const isPaid = isExpensePaidForMonth(exp, selectedMonth);
                  const current = exp.type === 'Prazo' ? currentInstallment(exp, selectedMonth) : 0;
                  const total = exp.type === 'Prazo' ? totalInstallments(exp) : 0;
                  return (
                    <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {exp.description}
                        {exp.type === 'Prazo' && total > 0 && (
                          <span className="ml-2 text-xs text-purple-500 font-medium">{current}/{total}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{exp.category}</td>
                      <td className="px-4 py-3"><Badge color={meta.badgeColor}><Icon size={10} className="inline mr-1" />{meta.label}</Badge></td>
                      <td className="px-4 py-3 text-gray-500">
                        {exp.type === 'Pontual' ? formatDateBR((exp.competenceMonth ?? selectedMonth) + '-01') : `Dia ${exp.dueDay}`}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(amount)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePaidMonth(exp.id, selectedMonth)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                        >
                          {isPaid ? <><Check size={12} /> Pago</> : <><X size={12} /> Pendente</>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <IconButton icon={<Edit2 size={14} />} label="Editar gasto" onClick={() => openEdit(exp)} />
                          <IconButton icon={<Copy size={14} />} label="Duplicar gasto" onClick={() => duplicateExpense(exp.id)} />
                          {(exp.type === 'Fixo' || exp.type === 'Prazo') && (
                            <IconButton icon={<Power size={14} />} label="Desativar gasto" onClick={() => openDeactivate(exp)} />
                          )}
                          <IconButton icon={<Trash2 size={14} />} label="Excluir gasto" variant="danger" onClick={() => openDelete(exp)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalTitle}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalMode(null)}>Cancelar</Button>
            <Button onClick={save} disabled={!isFormValid()}>
              {modalMode === 'add' ? 'Adicionar' : modalMode === 'deactivate' ? 'Desativar' : 'Salvar'}
            </Button>
          </div>
        }
      >
        {modalMode === 'deactivate' && editing ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Desativar <strong>{editing.description}</strong> a partir de qual mês?</p>
            <MonthPicker label="Desativar a partir de" value={form.deactivateMonth} onChange={(v) => setForm({ ...form, deactivateMonth: v })} required />
            <div className="p-2 bg-amber-50 rounded-lg flex items-start gap-2">
              <Info size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600">O gasto continuará visível nos meses anteriores e desaparecerá a partir do mês selecionado. O histórico não será apagado.</p>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            {/* Type selector */}
            {modalMode === 'add' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de gasto</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_META) as ExpenseType[]).map((t) => {
                    const meta = TYPE_META[t];
                    const Icon = meta.icon;
                    const selected = form.type === t;
                    const colorClasses = {
                      blue: selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-300',
                      purple: selected ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-purple-300',
                      amber: selected ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-amber-300',
                    };
                    return (
                      <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`p-3 rounded-lg border-2 transition-colors text-center ${colorClasses[meta.color]}`}>
                        <Icon size={20} className="mx-auto mb-1" />
                        <span className="text-sm font-medium">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Input label="Nome" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required />
            <CurrencyInput label="Valor" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} required />

            {/* Category with add-new */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Categoria</label>
                <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="text-xs text-blue-600 hover:underline">+ Nova categoria</button>
              </div>
              {showAddCategory ? (
                <div className="flex gap-2 mb-2">
                  <Input value={newCategory} onChange={setNewCategory} placeholder="Nome da categoria" />
                  <Button variant="secondary" onClick={handleAddCategory}>Adicionar</Button>
                </div>
              ) : null}
              <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={activeCategories.map((c) => ({ value: c, label: c }))} />
            </div>

            <Select label="Forma de pagamento" value={form.paymentMethod} onChange={(v) => setForm({ ...form, paymentMethod: v as PaymentMethod })} options={PAYMENT_METHODS.map((p) => ({ value: p, label: p }))} />

            {/* Type-specific fields */}
            {form.type === 'Fixo' && (
              <>
                <Input label="Dia de vencimento" type="number" value={form.dueDay} onChange={(v) => setForm({ ...form, dueDay: parseInt(v) || 1 })} />
                {modalMode === 'add' && (
                  <MonthPicker label="Mês de início" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
                )}
              </>
            )}

            {form.type === 'Prazo' && (
              <>
                <Input label="Dia de vencimento" type="number" value={form.dueDay} onChange={(v) => setForm({ ...form, dueDay: parseInt(v) || 1 })} />
                <div className="grid grid-cols-2 gap-3">
                  <MonthPicker label="Mês de início" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
                  <MonthPicker label="Mês de término" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} required />
                </div>
                {prazoInstallments > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700">
                      Total de parcelas: <strong>{prazoInstallments}x</strong> de {formatCurrency(form.amount)}
                    </p>
                    <p className="text-xs text-purple-500 mt-0.5">
                      Período: {formatMonthBR(form.startDate)} a {formatMonthBR(form.endDate)}
                    </p>
                  </div>
                )}
              </>
            )}

            {form.type === 'Pontual' && (
              <>
                <Input label="Data" type="date" value={form.competenceDate ? form.competenceDate + '-01' : ''} onChange={(v) => setForm({ ...form, competenceDate: v.slice(0, 7) })} required />
              </>
            )}

            {/* Edit mode for recurring */}
            {modalMode === 'edit' && (form.type === 'Fixo' || form.type === 'Prazo') && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-700 mb-2">O que deseja alterar?</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.editMode === 'this-month'} onChange={() => setForm({ ...form, editMode: 'this-month' })} className="text-blue-600" />
                    <span className="text-sm text-gray-700">Somente {formatMonthBR(selectedMonth)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.editMode === 'future'} onChange={() => setForm({ ...form, editMode: 'future' })} className="text-blue-600" />
                    <span className="text-sm text-gray-700">Este mês e os próximos</span>
                  </label>
                </div>
                {form.editMode === 'future' && (
                  <div className="mt-2">
                    <MonthPicker label="Aplicar alteração a partir de" value={form.changeMonth} onChange={(v) => setForm({ ...form, changeMonth: v })} required />
                  </div>
                )}
                {form.editMode === 'this-month' && (
                  <div className="p-2 bg-amber-50 rounded-lg flex items-start gap-2 mt-2">
                    <Info size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600">Esta alteração só vale para {formatMonthBR(selectedMonth)}. Os outros meses continuam com o valor original. Meses anteriores nunca são alterados.</p>
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, status: 'previsto' })} className={`flex-1 p-2 rounded-lg text-sm font-medium border-2 transition-colors ${form.status === 'previsto' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500'}`}>Previsto</button>
                <button type="button" onClick={() => setForm({ ...form, status: 'realizado' })} className={`flex-1 p-2 rounded-lg text-sm font-medium border-2 transition-colors ${form.status === 'realizado' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>Realizado</button>
              </div>
            </div>
            {form.status === 'realizado' && (
              <CurrencyInput label="Valor realizado" value={form.realizedAmount} onChange={(v) => setForm({ ...form, realizedAmount: v })} />
            )}

            <TextArea label="Observação" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
            {/* Hidden submit button to enable Enter-to-submit */}
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        )}
      </Modal>

      {/* Delete confirmation with scope options */}
      <Modal
        open={!!deleteMode}
        onClose={() => setDeleteMode(null)}
        title="Excluir gasto"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteMode(null)}>Cancelar</Button>
          </div>
        }
      >
        {deleteMode && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-lg">
              <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-700">Excluir "{deleteMode.expense.description}"</p>
                <p className="text-xs text-rose-600 mt-0.5">Escolha o escopo da exclusão. Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            {deleteMode.expense.type === 'Pontual' ? (
              <button
                onClick={handleDeleteConfirm}
                className="w-full p-3 rounded-lg border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-left transition-colors"
              >
                <p className="text-sm font-medium text-rose-700">Excluir gasto pontual</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove este gasto permanentemente.</p>
              </button>
            ) : (
              <>
                <button
                  onClick={handleDeleteThisMonth}
                  className="w-full p-3 rounded-lg border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-left transition-colors"
                >
                  <p className="text-sm font-medium text-amber-700">Excluir somente {formatMonthBR(deleteMode.monthKey)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">O gasto some apenas deste mês. Meses anteriores e posteriores não são afetados.</p>
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="w-full p-3 rounded-lg border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-left transition-colors"
                >
                  <p className="text-sm font-medium text-rose-700">Excluir este mês e os próximos</p>
                  <p className="text-xs text-gray-500 mt-0.5">Encerra o gasto a partir de {formatMonthBR(deleteMode.monthKey)}. Meses anteriores são preservados.</p>
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
