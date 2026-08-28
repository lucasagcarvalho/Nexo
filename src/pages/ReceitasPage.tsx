import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Copy, Power, TrendingUp, Repeat, Calendar, CalendarRange, AlertCircle } from 'lucide-react';
import { useData, getActiveVigencia, applyVigenciaChange, applyMonthOverride } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { formatCurrency, formatMonthBR, currentMonthKey, uid, compareMonths } from '@/lib/format';
import type { Income, IncomeType, IncomeKind, Person } from '@/lib/types';
import { Card, Badge, Button, Modal, Input, Select, TextArea, ConfirmDialog, EmptyState, CurrencyInput, MonthPicker, PersonSelect, IconButton } from '@/components/ui';

type ModalMode = 'add' | 'edit';

const KIND_LABELS: Record<IncomeKind, string> = {
  fixa: 'Fixa',
  variavel: 'Variável',
  determinada: 'Determinada',
};

const KIND_BADGE_COLORS: Record<IncomeKind, 'blue' | 'yellow' | 'purple'> = {
  fixa: 'blue',
  variavel: 'yellow',
  determinada: 'purple',
};

const KIND_ICONS: Record<IncomeKind, typeof Repeat> = {
  fixa: Repeat,
  variavel: Calendar,
  determinada: CalendarRange,
};

export function ReceitasPage() {
  const { data, addIncome, updateIncome, deleteIncome, toggleIncome, duplicateIncome, addPerson, addIncomeType } = useData();
  const { selectedMonth } = useMonth();
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editing, setEditing] = useState<Income | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const incomeTypeOptions = useMemo(() => [...data.incomeTypes], [data.incomeTypes]);

  const [form, setForm] = useState({
    name: '',
    amount: 0,
    type: 'Salário' as IncomeType,
    kind: 'fixa' as IncomeKind,
    person: 'Lucas' as Person,
    dueDay: 5,
    startDate: currentMonthKey(),
    endDate: '',
    competenceMonth: currentMonthKey(),
    note: '',
    editMode: 'future' as 'this-month' | 'future',
    changeMonth: currentMonthKey(),
  });

  const resetForm = () => {
    setForm({
      name: '', amount: 0, type: data.incomeTypes[0] ?? 'Salário', kind: 'fixa',
      person: data.people[0]?.name ?? 'Lucas', dueDay: 5,
      startDate: selectedMonth, endDate: '', competenceMonth: selectedMonth,
      note: '', editMode: 'future', changeMonth: selectedMonth,
    });
    setShowNewTypeInput(false);
    setNewTypeName('');
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setModalMode('add');
  };

  const openEdit = (inc: Income) => {
    setEditing(inc);
    const vig = getActiveVigencia(inc.vigencias, selectedMonth);
    const amount = vig?.amount ?? 0;
    setForm({
      name: inc.name, amount, type: inc.type, kind: inc.kind, person: inc.person,
      dueDay: inc.dueDay,
      startDate: inc.kind === 'variavel'
        ? (inc.competenceMonth ?? selectedMonth)
        : (vig?.startDate ?? inc.vigencias[0]?.startDate ?? selectedMonth),
      endDate: vig?.endDate ?? '',
      competenceMonth: inc.competenceMonth ?? selectedMonth,
      note: inc.note ?? '',
      editMode: 'future', changeMonth: selectedMonth,
    });
    setShowNewTypeInput(false);
    setNewTypeName('');
    setModalMode('edit');
  };

  const handleAddNewType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    addIncomeType(trimmed);
    setForm((f) => ({ ...f, type: trimmed }));
    setShowNewTypeInput(false);
    setNewTypeName('');
  };

  const save = () => {
    if (!form.name || form.amount <= 0) return;

    if (modalMode === 'add') {
      if (form.kind === 'fixa') {
        addIncome({
          name: form.name, type: form.type, kind: 'fixa', person: form.person,
          dueDay: form.dueDay, note: form.note || undefined, active: true,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.startDate, endDate: null }],
          status: 'previsto',
        });
      } else if (form.kind === 'variavel') {
        addIncome({
          name: form.name, type: form.type, kind: 'variavel', person: form.person,
          dueDay: form.dueDay, note: form.note || undefined, active: true,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.competenceMonth, endDate: form.competenceMonth }],
          status: 'previsto',
          competenceMonth: form.competenceMonth,
        });
      } else if (form.kind === 'determinada') {
        addIncome({
          name: form.name, type: form.type, kind: 'determinada', person: form.person,
          dueDay: form.dueDay, note: form.note || undefined, active: true,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.startDate, endDate: form.endDate || form.startDate }],
          status: 'previsto',
        });
      }
    } else if (modalMode === 'edit' && editing) {
      if (form.kind === 'variavel') {
        updateIncome(editing.id, {
          name: form.name, type: form.type, person: form.person,
          dueDay: form.dueDay, note: form.note || undefined,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.competenceMonth, endDate: form.competenceMonth }],
          competenceMonth: form.competenceMonth,
        });
      } else if (form.kind === 'determinada') {
        updateIncome(editing.id, {
          name: form.name, type: form.type, person: form.person,
          dueDay: form.dueDay, note: form.note || undefined,
          vigencias: [{ id: uid(), amount: form.amount, startDate: form.startDate, endDate: form.endDate || form.startDate }],
        });
      } else {
        // fixa
        if (form.editMode === 'future') {
          const newVigencias = applyVigenciaChange(editing.vigencias, form.changeMonth, form.amount);
          updateIncome(editing.id, {
            name: form.name, type: form.type, person: form.person,
            dueDay: form.dueDay, note: form.note || undefined,
            vigencias: newVigencias,
          });
        } else {
          const newVigencias = applyMonthOverride(editing.vigencias, selectedMonth, form.amount);
          updateIncome(editing.id, {
            name: form.name, type: form.type, person: form.person,
            dueDay: form.dueDay, note: form.note || undefined,
            vigencias: newVigencias,
          });
        }
      }
    }
    setModalMode(null);
  };

  // Filter incomes for the selected month
  const monthIncomes = useMemo(() => {
    return data.incomes.filter((inc) => {
      if (!inc.active) return false;
      if (inc.kind === 'variavel') {
        return inc.competenceMonth === selectedMonth;
      }
      return getActiveVigencia(inc.vigencias, selectedMonth) !== null;
    });
  }, [data.incomes, selectedMonth]);

  const total = monthIncomes.reduce((s, i) => {
    const vig = getActiveVigencia(i.vigencias, selectedMonth);
    return s + (vig?.amount ?? 0);
  }, 0);

  const getAmount = (inc: Income) => {
    const vig = getActiveVigencia(inc.vigencias, selectedMonth);
    return vig?.amount ?? 0;
  };

  const getKindDescription = (inc: Income): string => {
    if (inc.kind === 'fixa') {
      return `Fixa · ${formatCurrency(getAmount(inc))} · Ativa`;
    }
    if (inc.kind === 'variavel') {
      return `Variável · ${formatCurrency(getAmount(inc))} · ${formatMonthBR(inc.competenceMonth ?? selectedMonth)}`;
    }
    // determinada
    const vig = getActiveVigencia(inc.vigencias, selectedMonth);
    const start = vig?.startDate ?? inc.vigencias[0]?.startDate ?? selectedMonth;
    const end = vig?.endDate ?? '';
    return `Determinada · ${formatCurrency(getAmount(inc))} · ${formatMonthBR(start)} até ${formatMonthBR(end)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
          <p className="text-sm text-gray-500">Competência: {formatMonthBR(selectedMonth)} · Total: {formatCurrency(total)}</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Adicionar receita</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Repeat size={16} className="text-blue-500" /><p className="text-xs text-gray-400">Fixas</p></div>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(monthIncomes.filter((i) => i.kind === 'fixa').reduce((s, i) => s + getAmount(i), 0))}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Calendar size={16} className="text-amber-500" /><p className="text-xs text-gray-400">Variáveis</p></div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(monthIncomes.filter((i) => i.kind === 'variavel').reduce((s, i) => s + getAmount(i), 0))}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><CalendarRange size={16} className="text-purple-500" /><p className="text-xs text-gray-400">Determinadas</p></div>
          <p className="text-xl font-bold text-purple-600">{formatCurrency(monthIncomes.filter((i) => i.kind === 'determinada').reduce((s, i) => s + getAmount(i), 0))}</p>
        </Card>
      </div>

      {/* Unified list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Receitas de {formatMonthBR(selectedMonth)}</h2>
        {monthIncomes.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={<TrendingUp size={48} />}
              title={`Nenhuma receita em ${formatMonthBR(selectedMonth)}`}
              message="Adicione receitas fixas, variáveis ou determinadas para este mês."
              action={<Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Adicionar receita</Button>}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthIncomes.map((inc) => {
              const KindIcon = KIND_ICONS[inc.kind];
              return (
                <Card key={inc.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{inc.name}</h3>
                      <p className="text-xs text-gray-400">{inc.type} · {inc.person} · Dia {inc.dueDay}</p>
                    </div>
                    <Badge color={KIND_BADGE_COLORS[inc.kind]}>{KIND_LABELS[inc.kind]}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 mb-1">{formatCurrency(getAmount(inc))}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <KindIcon size={12} />
                    <span>{getKindDescription(inc)}</span>
                  </div>
                  {inc.note && <p className="text-xs text-gray-500 mb-3 italic">{inc.note}</p>}
                  <div className="flex gap-1">
                    <IconButton icon={<Edit2 size={14} />} label="Editar receita" onClick={() => openEdit(inc)} />
                    <IconButton icon={<Copy size={14} />} label="Duplicar receita" onClick={() => duplicateIncome(inc.id)} />
                    <IconButton icon={<Power size={14} />} label={inc.active ? 'Desativar receita' : 'Ativar receita'} onClick={() => toggleIncome(inc.id)} />
                    <IconButton icon={<Trash2 size={14} />} label="Excluir receita" variant="danger" onClick={() => setConfirmDelete(inc.id)} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalMode !== null} onClose={() => setModalMode(null)} title={modalMode === 'add' ? 'Nova receita' : 'Editar receita'} footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalMode(null)}>Cancelar</Button>
          <Button onClick={save} disabled={!form.name || form.amount <= 0 || (form.kind === 'determinada' && (!form.endDate || compareMonths(form.endDate, form.startDate) < 0))}>
            {modalMode === 'add' ? 'Adicionar' : 'Salvar'}
          </Button>
        </div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          {/* Kind selector — at the top */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo da receita</label>
            <div className="grid grid-cols-3 gap-2">
              {(['fixa', 'variavel', 'determinada'] as IncomeKind[]).map((k) => {
                const Icon = KIND_ICONS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm({ ...form, kind: k })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                      form.kind === k
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-medium">{KIND_LABELS[k]}</span>
                  </button>
                );
              })}
            </div>
            {form.kind === 'fixa' && (
              <p className="text-xs text-gray-400 mt-1.5">Tem início e continua sem data final.</p>
            )}
            {form.kind === 'variavel' && (
              <p className="text-xs text-gray-400 mt-1.5">Pertence somente ao mês informado.</p>
            )}
            {form.kind === 'determinada' && (
              <p className="text-xs text-gray-400 mt-1.5">Possui mês de início e mês de término.</p>
            )}
          </div>

          <Input label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ex: Salário Lucas" required />
          <CurrencyInput label="Valor" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} required />

          {/* Category (income type) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria<span className="text-rose-500"> *</span></label>
            {showNewTypeInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Nome do novo tipo"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoFocus
                />
                <Button size="sm" onClick={handleAddNewType}>Salvar</Button>
                <Button size="sm" variant="secondary" onClick={() => { setShowNewTypeInput(false); setNewTypeName(''); }}>Cancelar</Button>
              </div>
            ) : (
              <Select
                value={form.type}
                onChange={(v) => {
                  if (v === '__new__') { setShowNewTypeInput(true); }
                  else { setForm({ ...form, type: v }); }
                }}
                options={[
                  ...incomeTypeOptions.map((t) => ({ value: t, label: t })),
                  { value: '__new__', label: '+ Novo tipo' },
                ]}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PersonSelect label="Pessoa" value={form.person} onChange={(v) => setForm({ ...form, person: v })} people={data.people} onAddPerson={addPerson} required />
            <Input label="Dia de recebimento" type="number" value={form.dueDay} onChange={(v) => setForm({ ...form, dueDay: parseInt(v) || 1 })} />
          </div>

          {/* Kind-specific fields */}
          {form.kind === 'fixa' && (
            <>
              {modalMode === 'add' && (
                <MonthPicker label="Início da vigência" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
              )}
              {modalMode === 'edit' && (
                <>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-semibold text-blue-700 mb-2">O que deseja alterar?</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.editMode === 'this-month'} onChange={() => setForm({ ...form, editMode: 'this-month' })} className="text-blue-600" />
                        <span className="text-sm text-gray-700">Somente {formatMonthBR(selectedMonth)}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.editMode === 'future'} onChange={() => setForm({ ...form, editMode: 'future' })} className="text-blue-600" />
                        <span className="text-sm text-gray-700">A partir de determinado mês</span>
                      </label>
                    </div>
                  </div>
                  {form.editMode === 'future' && (
                    <MonthPicker label="Aplicar alteração a partir de" value={form.changeMonth} onChange={(v) => setForm({ ...form, changeMonth: v })} required />
                  )}
                </>
              )}
            </>
          )}

          {form.kind === 'variavel' && (
            <MonthPicker label="Mês de competência" value={form.competenceMonth} onChange={(v) => setForm({ ...form, competenceMonth: v })} required />
          )}

          {form.kind === 'determinada' && (
            <>
              <MonthPicker label="Mês de início" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
              <MonthPicker label="Mês de término" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} required />
              {form.endDate && compareMonths(form.endDate, form.startDate) < 0 && (
                <div className="p-2 bg-rose-50 rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-600">O término deve ser posterior ao início.</p>
                </div>
              )}
            </>
          )}

          <TextArea label="Observação" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir receita"
        message="Tem certeza que deseja excluir esta receita?"
        onConfirm={() => { if (confirmDelete) deleteIncome(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Excluir"
      />
    </div>
  );
}
