import { useState } from 'react';
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
import { PlanejamentoPage } from '@/pages/PlanejamentoPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';

function AppContent() {
  const { user } = useAuth();
  const [page, setPage] = useState<PageId>('dashboard');

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MonthProvider>
      <DataProvider>
        <Layout current={page} onNavigate={setPage}>
          {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
          {page === 'visao-geral' && <VisaoGeralPage />}
          {page === 'receitas' && <ReceitasPage />}
          {page === 'gastos' && <GastosPage />}
          {page === 'cartoes' && <CartoesPage />}
          {page === 'contas' && <ContasPage />}
          {page === 'dividas' && <DividasPage />}
          {page === 'projecao' && <ProjecaoPage />}
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
