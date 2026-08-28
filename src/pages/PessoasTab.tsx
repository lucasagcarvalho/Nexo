import { useState } from 'react';
import { Users, Plus, Edit2, Power, Trash2 } from 'lucide-react';
import type { PersonEntry } from '@/lib/types';
import { Card, Button, Input, TextArea, Modal, ConfirmDialog, EmptyState, IconButton, Badge } from '@/components/ui';

interface PessoasTabProps {
  people: PersonEntry[];
  addPerson: (name: string, note?: string) => string;
  updatePerson: (id: string, updates: Partial<PersonEntry>) => void;
  deletePerson: (id: string) => void;
  togglePerson: (id: string) => void;
}

export function PessoasTab({ people, addPerson, updatePerson, deletePerson, togglePerson }: PessoasTabProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonEntry | null>(null);
  const [confirm, setConfirm] = useState<PersonEntry | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const openAdd = () => { setEditing(null); setName(''); setNote(''); setOpen(true); };
  const openEdit = (person: PersonEntry) => { setEditing(person); setName(person.name); setNote(person.note ?? ''); setOpen(true); };
  const save = () => {
    if (!name.trim()) return;
    if (editing) updatePerson(editing.id, { name: name.trim(), note: note.trim() || undefined });
    else addPerson(name.trim(), note.trim() || undefined);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-gray-800">Pessoas e responsáveis</h3><p className="text-sm text-gray-500">Uma única lista para receitas, gastos, cartões, contas e dívidas.</p></div>
        <Button onClick={openAdd}><Plus size={16} className="inline mr-1" /> Nova pessoa</Button>
      </div>
      <Card className="overflow-hidden">
        {people.length === 0 ? <EmptyState icon={<Users size={48} />} title="Nenhuma pessoa cadastrada" action={<Button onClick={openAdd}>Adicionar pessoa</Button>} /> : (
          <div className="divide-y divide-gray-100">
            {people.map((person) => (
              <div key={person.id} className="p-4 flex items-center justify-between gap-3">
                <div><p className="font-medium text-gray-800">{person.name}</p>{person.note && <p className="text-xs text-gray-400">{person.note}</p>}</div>
                <div className="flex items-center gap-2"><Badge color={person.active ? 'green' : 'gray'}>{person.active ? 'Ativa' : 'Inativa'}</Badge><IconButton icon={<Edit2 size={15} />} label="Editar pessoa" onClick={() => openEdit(person)} /><IconButton icon={<Power size={15} />} label={person.active ? 'Desativar pessoa' : 'Ativar pessoa'} onClick={() => togglePerson(person.id)} /><IconButton icon={<Trash2 size={15} />} label="Excluir pessoa" variant="danger" onClick={() => setConfirm(person)} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar pessoa' : 'Nova pessoa'} footer={
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!name.trim()}>Salvar</Button></div>
      }>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3"><Input label="Nome" value={name} onChange={setName} required /><TextArea label="Observação (opcional)" value={note} onChange={setNote} /><button type="submit" className="hidden" aria-hidden="true" /></form>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Excluir pessoa" message="Se houver dados vinculados, é preferível desativar a pessoa para preservar o histórico. Deseja excluir mesmo assim?" onConfirm={() => { if (confirm) deletePerson(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} confirmText="Excluir" />
    </div>
  );
}
