import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Eye, TrendingUp, Wallet, CreditCard, Landmark, BarChart3, CalendarDays, Settings, Menu, X, LogOut, ChevronLeft, ChevronRight, Building2, ChevronLeftCircle, ChevronRightCircle, AlertCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import { useData } from '@/store/DataContext';
import { useMonth } from '@/store/MonthContext';
import { monthLabel } from '@/lib/format';
import { Tooltip } from '@/components/ui';

export type PageId = 'dashboard' | 'visao-geral' | 'receitas' | 'gastos' | 'cartoes' | 'contas' | 'dividas' | 'projecao' | 'planejamento' | 'configuracoes';

interface LayoutProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

const MENU_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'visao-geral', label: 'Visão Geral', icon: Eye },
  { id: 'receitas', label: 'Receitas', icon: TrendingUp },
  { id: 'gastos', label: 'Gastos', icon: Wallet },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'contas', label: 'Contas', icon: Building2 },
  { id: 'dividas', label: 'Dívidas', icon: Landmark },
  { id: 'projecao', label: 'Projeção', icon: BarChart3 },
  { id: 'planejamento', label: 'Planejamento', icon: CalendarDays },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const SIDEBAR_KEY = 'sidebar-collapsed';

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* ignore */ }
  };

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const sidebarWidth = collapsed ? 'md:w-16' : 'md:w-60';
  const marginLeft = collapsed ? 'md:ml-16' : 'md:ml-60';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col ${sidebarWidth} bg-white border-r border-gray-200 fixed h-screen transition-all duration-200`}>
        <SidebarContent current={current} onNavigate={handleNavigate} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>
      {/* Collapse toggle — sits on the sidebar edge */}
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className={`hidden md:flex items-center justify-center absolute top-20 z-40 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 ${collapsed ? 'left-12' : 'left-56'}`}
        style={{ transform: 'translateX(-50%)' }}
      >
        {collapsed ? <ChevronRightCircle size={16} /> : <ChevronLeftCircle size={16} />}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-white border-r border-gray-200 flex flex-col">
            <button className="absolute top-4 right-4 text-gray-400" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
              <X size={20} />
            </button>
            <SidebarContent current={current} onNavigate={handleNavigate} collapsed={false} onToggleCollapse={() => {}} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 ${marginLeft} flex flex-col min-w-0 transition-all duration-200`}>
        {/* Top bar with month selector */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-600 p-1" aria-label="Abrir menu">
              <Menu size={22} />
            </button>
            <MonthSelector />
          </div>
          <span className="hidden md:block text-xs text-gray-400">Controle e planejamento financeiro</span>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          <SaveErrorBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

function SaveErrorBanner() {
  const { saveError, clearSaveError } = useData();
  if (!saveError) return null;
  return (
    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
      <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-rose-700">Erro ao salvar dados</p>
        <p className="text-xs text-rose-600 mt-0.5">Não foi possível sincronizar com o servidor. Seus dados continuam preenchidos no formulário e salvos localmente. Tente novamente em alguns instantes.</p>
      </div>
      <button onClick={clearSaveError} className="text-rose-400 hover:text-rose-600" aria-label="Fechar aviso">
        <XCircle size={18} />
      </button>
    </div>
  );
}

function MonthSelector() {
  const { selectedMonth, goToPrevious, goToNext, goToCurrent, isCurrentMonth } = useMonth();

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      <button
        onClick={goToPrevious}
        className="p-1.5 hover:bg-white rounded-lg text-gray-500 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="px-3 py-1 text-sm font-semibold text-gray-800 min-w-[140px] text-center">
        {monthLabel(selectedMonth)}
      </div>
      <button
        onClick={goToNext}
        className="p-1.5 hover:bg-white rounded-lg text-gray-500 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
        aria-label="Mês seguinte"
      >
        <ChevronRight size={18} />
      </button>
      {!isCurrentMonth && (
        <button
          onClick={goToCurrent}
          className="ml-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          title="Ir para o mês atual"
        >
          Mês atual
        </button>
      )}
    </div>
  );
}

function SidebarContent({ current, onNavigate, collapsed }: {
  current: PageId;
  onNavigate: (p: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <>
      <div className={`p-5 border-b border-gray-200 ${collapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-gray-100 p-1">
            <img src="/ic_nexo.png" alt="Nexo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-gray-900">Nexo</h1>
              <p className="text-xs text-gray-400">Controle e planejamento financeiro</p>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          const button = (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} className={`flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              {!collapsed && item.label}
            </button>
          );
          return collapsed ? (
            <Tooltip key={item.id} text={item.label} side="right">
              {button}
            </Tooltip>
          ) : button;
        })}
      </nav>
      <div className={`p-3 border-t border-gray-200 space-y-2 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed && user && (
          <p className="text-xs text-gray-400 text-center truncate">{user.email}</p>
        )}
        <Tooltip text="Sair da conta" side={collapsed ? 'right' : 'top'}>
          <button
            onClick={logout}
            aria-label="Sair da conta"
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-center gap-2'} px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors`}
          >
            <LogOut size={16} />
            {!collapsed && 'Sair da conta'}
          </button>
        </Tooltip>
      </div>
    </>
  );
}
