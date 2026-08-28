import { useState } from 'react';
import { LineChart, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import { Button, Input } from '@/components/ui';

export function LoginPage() {
  const { login, mode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'remote' && (!email || !password)) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-50 rounded-xl mb-3">
            <LineChart className="text-blue-600" size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Nexo</h1>
          <p className="text-sm text-gray-400">Controle e planejamento financeiro</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          {mode === 'local' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Modo local</p>
              <p className="text-xs text-blue-600 mt-1">Sem Supabase configurado. Os dados ficam somente neste navegador.</p>
            </div>
          )}

          {mode === 'remote' && (
            <>
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="seu@email.com"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha<span className="text-rose-500"> *</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Entrando...' : 'Entrar'}</Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          {mode === 'remote' ? 'Sessão gerenciada pelo Supabase Auth.' : 'Bloqueio local sem senha. Não é autenticação remota.'}
        </p>
      </div>
    </div>
  );
}
