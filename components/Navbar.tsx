'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Coins,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports';
  onTabChange: (tab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports') => void;
  onOpenNewClient: () => void;
  onOpenNewCredit: () => void;
  onSeedData: () => void;
  isSeeding: boolean;
  hasData: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewClient,
  onOpenNewCredit,
  onSeedData,
  isSeeding,
  hasData,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'credits', label: 'Análise de Crédito', icon: TrendingUp },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 text-white font-bold">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg tracking-tight text-white">BAYETE</span>
                <span className="font-semibold text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  MICROCRÉDITO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Apoio Financeiro Rápido ao Pequeno Negócio</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & User Info */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {!hasData && (
              <button
                id="btn-seed-data"
                onClick={onSeedData}
                disabled={isSeeding}
                className="hidden lg:flex items-center space-x-1.5 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-all"
                title="Carregar dados moçambicanos de teste"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSeeding ? 'Carregando...' : 'Carregar Dados Exemplo'}</span>
              </button>
            )}

            <button
              id="btn-quick-new-credit"
              onClick={onOpenNewCredit}
              className="hidden sm:inline-flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-2 rounded-lg shadow-sm transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Novo Crédito</span>
            </button>

            {/* User Session Info */}
            <div className="flex items-center pl-2 border-l border-slate-800 space-x-2.5">
              <div className="hidden xl:block text-right">
                <p className="text-xs font-medium text-slate-200 leading-tight">
                  {user?.displayName || user?.email?.split('@')[0] || 'Gestor de Crédito'}
                </p>
                <div className="flex items-center justify-end space-x-1 text-[10px] text-emerald-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Firebase Auth Ativo</span>
                </div>
              </div>

              <button
                id="btn-logout"
                onClick={logout}
                title="Terminar Sessão"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-tab-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center py-1 px-2 rounded-md ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
