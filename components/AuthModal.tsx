'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Coins,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMsg(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLocalMsg('Por favor preencha o seu email e a palavra-passe.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail, password);
    } catch {
      // Handled and displayed via authError or localMsg
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Brand Header */}
        <div className="bg-slate-900 px-6 py-7 text-white text-center relative border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-600/30">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">BAYETE MICROCRÉDITO</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Plataforma de Financiamento Rápido a Pequenos Empreendedores Locais
          </p>

         
        </div>

        {/* Login Form Section */}
        <div className="p-6 sm:p-7">
          <div className="mb-5 text-center">
            <h3 className="text-base font-bold text-slate-900">Iniciar Sessão</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Introduza as suas credenciais para aceder ao painel
            </p>
          </div>

          {(authError || localMsg) && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError || localMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="input-auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localMsg) setLocalMsg(null);
                  }}
                  placeholder="admin@bayetemicrocredito.co.mz"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="input-auth-password" className="block text-xs font-semibold text-slate-700">
                  Palavra-passe
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localMsg) setLocalMsg(null);
                  }}
                  placeholder="Introduza a sua palavra-passe"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-emerald-950/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>A autenticar na base de dados...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Database Synchronization Notice */}
      
        </div>
      </div>
    </div>
  );
};
