import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AuthUser {
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AUTH_KEY = 'rec-fin-auth-v1';
const USERS_KEY = 'rec-fin-users-v1';

interface StoredUser {
  email: string;
  passwordHash: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Simple hash — not cryptographically secure, but avoids storing plaintext passwords.
// When migrating to Supabase Auth, this entire file gets replaced with Supabase calls.
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return String(hash);
}

function ensureDefaultUser(): void {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const users = JSON.parse(raw) as StoredUser[];
      if (users.some((u) => u.email === 'lukas.ag.carvalho@gmail.com')) return;
    }
    const users: StoredUser[] = [
      { email: 'lukas.ag.carvalho@gmail.com', passwordHash: simpleHash('Luna@2025') },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    ensureDefaultUser();
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as AuthUser;
        setUser(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback((email: string, password: string): boolean => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return false;
      const users = JSON.parse(raw) as StoredUser[];
      const found = users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === simpleHash(password)
      );
      if (found) {
        const authUser: AuthUser = { email: found.email };
        setUser(authUser);
        localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
