import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

interface AuthUser {
  id: string;
  email: string;
  mode: 'local' | 'remote';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  mode: 'local' | 'remote';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();
  const mode = supabase ? 'remote' : 'local';

  useEffect(() => {
    if (!supabase) {
      setUser({ id: 'local', email: 'Modo local', mode: 'local' });
      setLoading(false);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const sessionUser = data.session?.user;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? '', mode: 'remote' } : null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? '', mode: 'remote' } : null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      setUser({ id: 'local', email: 'Modo local', mode: 'local' });
      return { success: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email ?? email.trim(), mode: 'remote' });
      return { success: true };
    }
    return { success: false, error: 'Não foi possível autenticar.' };
  }, [supabase]);

  const logout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao sair:', error.message);
      }
    }
    setUser(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, mode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
