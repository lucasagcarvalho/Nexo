import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/store/AuthContext';
import { MonthProvider } from '@/store/MonthContext';
import { DataProvider } from '@/store/DataContext';
import { LoginPage } from '@/pages/LoginPage';
import { Layout, type PageId } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { VisaoGeralPage } from '@/pages/VisaoGeralPage';
import { ReceitasPage } from '@/pages/ReceitasPage';
import { GastosPage } from '@/pages/GastosPage';
import { CartoesPage } from '@/pages/CartoesPage';
import { ContasPage } from '@/pages/ContasPage';
import { DividasPage } from '@/pages/DividasPage';
import { ProjecaoPage } from '@/pages/ProjecaoPage';
import { AnalisePage } from '@/pages/AnalisePage';
import { PlanejamentoPage } from '@/pages/PlanejamentoPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { areMoneyValuesHidden, setMoneyValuesHidden } from '@/lib/format';
import { applyThemeMode, persistThemeMode, readThemeMode, type ThemeMode } from '@/lib/theme';

applyThemeMode(readThemeMode());

function routeFromLocation(): { page: PageId; accountId: string | null } {
  const [, firstSegment, secondSegment] = window.location.pathname.split('/');
  if (firstSegment === 'contas' && secondSegment) {
    return { page: 'contas', accountId: decodeURIComponent(secondSegment) };
  }
  if (firstSegment === 'contas') {
    return { page: 'contas', accountId: null };
  }
  return { page: 'dashboard', accountId: null };
}

function AppContent() {
  const { user, loading } = useAuth();
  const initialRoute = routeFromLocation();
  const [page, setPage] = useState<PageId>(initialRoute.page);
  const [accountId, setAccountId] = useState<string | null>(initialRoute.accountId);
  const [moneyValuesHidden, setMoneyValuesHiddenState] = useState(() => areMoneyValuesHidden());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readThemeMode());

  const navigate = (nextPage: PageId) => {
    setPage(nextPage);
    setAccountId(null);
    const nextPath = nextPage === 'contas' ? '/contas' : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  };

  const openAccount = (nextAccountId: string) => {
    setPage('contas');
    setAccountId(nextAccountId);
    window.history.pushState(null, '', `/contas/${encodeURIComponent(nextAccountId)}`);
  };

  const backToAccounts = () => {
    setPage('contas');
    setAccountId(null);
    window.history.pushState(null, '', '/contas');
  };

  const toggleMoneyValuesHidden = () => {
    const next = !moneyValuesHidden;
    setMoneyValuesHidden(next);
    setMoneyValuesHiddenState(next);
  };

  const setThemeMode = (nextThemeMode: ThemeMode) => {
    persistThemeMode(nextThemeMode);
    applyThemeMode(nextThemeMode);
    setThemeModeState(nextThemeMode);
  };

  useEffect(() => {
    applyThemeMode(themeMode);
    if (themeMode !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyThemeMode('system');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [themeMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [page, accountId]);

  useEffect(() => {
    const handlePopState = () => {
      const route = routeFromLocation();
      setPage(route.page);
      setAccountId(route.accountId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MonthProvider>
      <DataProvider>
        <Layout
          current={page}
          onNavigate={navigate}
          moneyValuesHidden={moneyValuesHidden}
          onToggleMoneyValuesHidden={toggleMoneyValuesHidden}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
        >
          {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {page === 'visao-geral' && <VisaoGeralPage onNavigate={navigate} />}
          {page === 'receitas' && <ReceitasPage />}
          {page === 'gastos' && <GastosPage />}
          {page === 'cartoes' && <CartoesPage />}
          {page === 'contas' && <ContasPage accountId={accountId} onOpenAccount={openAccount} onBackToAccounts={backToAccounts} />}
          {page === 'dividas' && <DividasPage />}
          {page === 'projecao' && <ProjecaoPage />}
          {page === 'analise' && <AnalisePage />}
          {page === 'planejamento' && <PlanejamentoPage />}
          {page === 'configuracoes' && <ConfiguracoesPage />}
        </Layout>
      </DataProvider>
    </MonthProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
