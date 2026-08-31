import { type ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { parseCurrencyFromDigits, formatCurrencyInput, currentMonthKey, formatMonthBR } from '@/lib/format';
import { Plus, Search } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${hoverable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'purple';
  onClick?: () => void;
  tooltip?: string;
}

const colorMap = {
  green: 'text-emerald-600 bg-emerald-50',
  red: 'text-rose-600 bg-rose-50',
  blue: 'text-blue-600 bg-blue-50',
  yellow: 'text-amber-600 bg-amber-50',
  gray: 'text-gray-600 bg-gray-100',
  purple: 'text-purple-600 bg-purple-50',
};

const statTypography = {
  label: 'text-xs font-medium text-gray-500',
  value: 'text-xl font-bold text-gray-900',
  secondary: 'text-xs text-gray-400',
};

export function StatCard({ title, value, subtitle, icon, color = 'gray', onClick, tooltip }: StatCardProps) {
  const content = (
    <div className="flex h-full min-h-[92px] flex-col justify-between gap-3 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={statTypography.label}>{title}</p>
          {subtitle && <p className={`${statTypography.secondary} mt-1`}>{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${colorMap[color]} flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
      <p className={`${statTypography.value} leading-tight break-words [overflow-wrap:anywhere]`}>{value}</p>
    </div>
  );

  return (
    <Tooltip text={tooltip ?? ''} className="w-full h-full">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full h-full p-4 bg-white rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {content}
        </button>
      ) : (
        <Card className="w-full h-full p-4">{content}</Card>
      )}
    </Tooltip>
  );
}

interface BadgeProps {
  children: ReactNode;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'purple';
}

const badgeColorMap = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-rose-100 text-rose-700',
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-amber-100 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColorMap[color]}`}>
      {children}
    </span>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

export function Button({ children, onClick, variant = 'primary', size = 'md', type = 'button', className = '', disabled = false, title, 'aria-label': ariaLabel }: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 0);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!mounted) return null;
  return (
    <ModalInner open={open} onClose={onClose} title={title} size={size} footer={footer}>
      {children}
    </ModalInner>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function ModalInner({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement;
    const node = containerRef.current;
    if (!node) return;
    const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      node.focus();
    }
    return () => {
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
        prevFocusRef.current.focus();
      }
    };
  }, [open]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const node = containerRef.current;
    if (!node) return;
    const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !node.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !node.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface InputProps {
  label?: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
}

export function Input({ label, type = 'text', value, onChange, placeholder, required, step }: InputProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</label>}
      <input
        type={type}
        value={value}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />
    </div>
  );
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}

export function Select({ label, value, onChange, options, required }: SelectProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function TextArea({ label, value, onChange, placeholder }: TextAreaProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
      />
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'green' | 'yellow' | 'red' | 'blue';
}

export function ProgressBar({ value, max, color = 'blue' }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500',
    blue: 'bg-blue-500',
  };
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div className={`${colors[color]} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Confirmar' }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm" footer={
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmText}</Button>
      </div>
    }>
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-gray-300 mb-3">{icon}</div>}
      <p className="text-gray-500 font-medium">{title}</p>
      {message && <p className="text-gray-400 text-sm mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── CurrencyInput ───────────────────────────────────────────────
interface CurrencyInputProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  required?: boolean;
  allowNegative?: boolean;
}

export function CurrencyInput({ label, value, onChange, placeholder, required, allowNegative }: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => value !== 0 ? formatCurrencyInput(Math.abs(value)) : '');
  const [isNegative, setIsNegative] = useState(value < 0);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      if (value === 0) {
        setDisplay('');
      } else {
        setDisplay(formatCurrencyInput(Math.abs(value)));
      }
      setIsNegative(value < 0);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseCurrencyFromDigits(raw);
    setDisplay(num !== 0 ? formatCurrencyInput(num) : '');
    const finalVal = isNegative && allowNegative ? -num : num;
    onChange(finalVal);
  };

  const handleFocus = () => {
    focusedRef.current = true;
    if (value === 0) setDisplay('');
  };

  const handleBlur = () => {
    focusedRef.current = false;
    if (value === 0) {
      setDisplay('');
    } else {
      setDisplay(formatCurrencyInput(Math.abs(value)));
    }
  };

  const toggleNegative = () => {
    if (!allowNegative) return;
    const newNeg = !isNegative;
    setIsNegative(newNeg);
    const absVal = parseCurrencyFromDigits(display);
    onChange(newNeg ? -absVal : absVal);
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</label>}
      <div className="flex gap-1">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">{isNegative && allowNegative ? '- ' : ''}R$</span>
          <input
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder ?? '0,00'}
            required={required}
            className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        {allowNegative && (
          <button
            type="button"
            onClick={toggleNegative}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isNegative
                ? 'bg-rose-50 border-rose-300 text-rose-600'
                : 'bg-gray-50 border-gray-300 text-gray-400 hover:bg-gray-100'
            }`}
            title="Alternar saldo negativo"
          >
            −
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MonthPicker ──────────────────────────────────────────────────
interface MonthPickerProps {
  label?: string;
  value: string; // YYYY-MM
  onChange: (v: string) => void;
  required?: boolean;
}

export function MonthPicker({ label, value, onChange, required }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => {
    const y = parseInt(value?.split('-')[0] ?? '');
    return isNaN(y) ? new Date().getFullYear() : y;
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const y = parseInt(value.split('-')[0]);
      if (!isNaN(y)) setYear(y);
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const selectMonth = (m: number) => {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    onChange(key);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? formatMonthBR(value) : 'Selecione'}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setYear(year - 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">‹</button>
            <span className="font-semibold text-gray-900">{year}</span>
            <button type="button" onClick={() => setYear(year + 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">›</button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((m, i) => {
              const key = `${year}-${String(i + 1).padStart(2, '0')}`;
              const isSelected = value === key;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectMonth(i + 1)}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => { onChange(currentMonthKey()); setOpen(false); }}
            className="w-full mt-2 pt-2 border-t border-gray-200 text-xs text-blue-600 hover:underline"
          >
            Mês atual
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────
interface TooltipProps {
  text: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ text, children, side = 'top', className = '' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleEnter = () => {
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const gap = 8;
        let top = rect.top;
        let left = rect.left + rect.width / 2;
        if (side === 'top') top = rect.top - gap;
        else if (side === 'bottom') top = rect.bottom + gap;
        else if (side === 'left') { top = rect.top + rect.height / 2; left = rect.left - gap; }
        else if (side === 'right') { top = rect.top + rect.height / 2; left = rect.right + gap; }
        if (side === 'top' || side === 'bottom') {
          left = Math.min(Math.max(left, 136), window.innerWidth - 136);
        }
        setCoords({ top, left });
      }
      setShow(true);
    }, 400);
  };
  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  };

  const translateClass = side === 'top' || side === 'bottom' ? '-translate-x-1/2' : '-translate-y-1/2';

  return (
    <>
      <div ref={wrapperRef} className={`relative inline-flex ${className}`} onMouseEnter={handleEnter} onMouseLeave={handleLeave} onFocus={handleEnter} onBlur={handleLeave}>
        {children}
      </div>
      {show && text && typeof document !== 'undefined' && document.body && createPortal(
        <div
          className={`fixed z-[9999] ${translateClass} max-w-[min(17rem,calc(100vw-2rem))] px-2.5 py-1.5 bg-gray-900 text-white text-xs leading-snug rounded-lg whitespace-normal break-words pointer-events-none shadow-lg`}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── IconButton ───────────────────────────────────────────────────
interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'ghost' | 'danger' | 'default';
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export function IconButton({ icon, label, onClick, variant = 'ghost', size = 'sm', className = '', disabled = false }: IconButtonProps) {
  const variants = {
    ghost: 'text-gray-500 hover:bg-gray-100',
    danger: 'text-rose-500 hover:bg-rose-50',
    default: 'text-gray-600 hover:bg-gray-100',
  };
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
  };
  return (
    <Tooltip text={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={`${variants[variant]} ${sizes[size]} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:outline-none ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

// ─── PersonSelect ─────────────────────────────────────────────────
export interface PersonEntry {
  id: string;
  name: string;
  note?: string;
  active: boolean;
}

interface PersonSelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  people: PersonEntry[];
  onAddPerson: (name: string, note?: string) => string;
  required?: boolean;
}

export function PersonSelect({ label, value, onChange, people, onAddPerson, required }: PersonSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNote, setNewNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAddForm(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activePeople = people.filter((p) => p.active);
  const filtered = activePeople.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const handleSelect = (person: PersonEntry) => {
    onChange(person.name);
    setOpen(false);
    setSearch('');
  };

  const handleAddPerson = () => {
    if (!newName.trim()) return;
    onAddPerson(newName.trim(), newNote.trim() || undefined);
    onChange(newName.trim());
    setShowAddForm(false);
    setNewName('');
    setNewNote('');
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={ref}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Selecione'}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-72 overflow-y-auto">
          {!showAddForm ? (
            <>
              <div className="relative p-2 border-b border-gray-100">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pessoa..."
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="py-1">
                {filtered.length === 0 && !search && (
                  <p className="px-3 py-2 text-sm text-gray-400">Nenhuma pessoa cadastrada.</p>
                )}
                {filtered.length === 0 && search && (
                  <p className="px-3 py-2 text-sm text-gray-400">Nenhum resultado.</p>
                )}
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${value === p.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                  >
                    {p.name}
                    {p.note && <span className="text-xs text-gray-400 ml-2">{p.note}</span>}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 transition-colors"
              >
                <Plus size={14} /> Adicionar nova pessoa
              </button>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da pessoa"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Observação (opcional)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="button" onClick={handleAddPerson} className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
