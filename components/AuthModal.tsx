'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Coins, Lock, Mail, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, register, loginDemo, authError, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMsg(null);
    clearError();

    if (!email || !password) {
      setLocalMsg('Por favor preencha o email e a palavra-passe.');
      return;
    }

    if (mode === 'register' && !name) {
      setLocalMsg('Por favor introduza o seu nome completo.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async (role: 'gestor' | 'agente') => {
    setIsSubmitting(true);
    setLocalMsg(null);
    clearError();
    try {
      await loginDemo(role);
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top brand header */}
        <div className="bg-slate-900 px-6 py-7 text-white text-center relative">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-600/30">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">BAYETE MICROCRÉDITO</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Plataforma de Financiamento Rápido a Pequenos Empreendedores Locais
          </p>

          <div className="inline-flex items-center space-x-1.5 mt-3 text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autenticação Segura Firebase</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            id="tab-login-btn"
            type="button"
            onClick={() => {
              setMode('login');
              clearError();
              setLocalMsg(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${
              mode === 'login'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Iniciar Sessão
          </button>
          <button
            id="tab-register-btn"
            type="button"
            onClick={() => {
              setMode('register');
              clearError();
              setLocalMsg(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${
              mode === 'register'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {(authError || localMsg) && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError || localMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="input-auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Armando Sitoe"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Profissional</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gestor@bayetemicrocredito.co.mz"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Palavra-passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <span>
                {isSubmitting
                  ? 'Processando...'
                  : mode === 'login'
                  ? 'Entrar no Sistema'
                  : 'Criar Conta de Gestor'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick 1-Click Access for Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-medium text-slate-500 text-center mb-2.5 uppercase tracking-wider">
              Acesso Rápido de Demonstração
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-demo-gestor"
                type="button"
                onClick={() => handleDemo('gestor')}
                disabled={isSubmitting}
                className="py-2 px-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-[11px] font-medium text-slate-700 text-center transition-colors"
              >
                👔 Gestor de Crédito
              </button>
              <button
                id="btn-demo-agente"
                type="button"
                onClick={() => handleDemo('agente')}
                disabled={isSubmitting}
                className="py-2 px-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-[11px] font-medium text-slate-700 text-center transition-colors"
              >
                📱 Agente de Campo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
