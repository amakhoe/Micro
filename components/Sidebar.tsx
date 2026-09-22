/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
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
  Settings,
  UserPlus,
  Menu,
  X,
  PlusCircle,
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports';
  onTabChange: (tab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports') => void;
  onOpenNewClient: () => void;
  onOpenNewCredit: () => void;
  onSeedData: () => void;
  onOpenProfile?: () => void;
  isSeeding: boolean;
  hasData: boolean;
  clientsCount?: number;
  creditsCount?: number;
  paymentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewClient,
  onOpenNewCredit,
  onSeedData,
  onOpenProfile,
  isSeeding,
  hasData,
  clientsCount,
  creditsCount,
  paymentsCount,
}) => {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getInitials = (name?: string | null) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  interface NavItem {
    id: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports';
    label: string;
    icon: React.ElementType;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users, badge: clientsCount },
    { id: 'credits', label: 'Análise de Crédito', icon: TrendingUp, badge: creditsCount },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard, badge: paymentsCount },
    { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
  ];

  const handleNavClick = (tab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports') => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  // Sidebar content markup reused in desktop and mobile drawer
  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => handleNavClick('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 text-white font-bold group-hover:scale-105 transition-transform">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">BAYETE</span>
              <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                MICROCRÉDITO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Apoio Financeiro Rápido</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action CTAs */}
      <div className="p-4 space-y-2 border-b border-slate-800/80">
        <button
          id="btn-sidebar-new-credit"
          onClick={() => {
            onOpenNewCredit();
            setIsMobileOpen(false);
          }}
          className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 hover:shadow-emerald-900/50 transition-all group"
        >
          <PlusCircle className="w-4 h-4 text-emerald-100 group-hover:rotate-90 transition-transform duration-200" />
          <span>Simular Novo Crédito</span>
        </button>

        <button
          id="btn-sidebar-new-client"
          onClick={() => {
            onOpenNewClient();
            setIsMobileOpen(false);
          }}
          className="w-full inline-flex items-center justify-center space-x-2 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 text-xs font-medium transition-all"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navegação Principal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    isActive
                      ? 'bg-emerald-700 text-emerald-100'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* System & Data Tools */}
        <div className="pt-5 px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-800/80 mt-4">
          Base de Dados & Sistema
        </div>

        {!hasData && (
          <button
            id="btn-sidebar-seed-data"
            onClick={() => {
              onSeedData();
              setIsMobileOpen(false);
            }}
            disabled={isSeeding}
            className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all"
            title="Carregar dados moçambicanos de teste"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{isSeeding ? 'Carregando...' : 'Carregar Dados Exemplo'}</span>
          </button>
        )}
      </nav>

      {/* User Session & Admin Profile Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <button
            type="button"
            id="btn-sidebar-admin-profile"
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              setIsMobileOpen(false);
            }}
            className="flex items-center space-x-2.5 py-1.5 px-2 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700/80 transition-all text-left flex-1 min-w-0 group"
            title="Editar perfil de administrador (nome, email, telemóvel, password, foto)"
          >
            <div className="relative shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Foto de Perfil"
                  className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-xs flex items-center justify-center border-2 border-emerald-500 shadow-sm">
                  {getInitials(user?.displayName || user?.email)}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>

            <div className="truncate flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 leading-tight truncate flex items-center space-x-1">
                <span className="truncate">{user?.displayName || user?.email?.split('@')[0] || 'Administrador'}</span>
                <Settings className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-[10px] text-emerald-400/90 leading-tight flex items-center space-x-1 mt-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Admin • Editar Perfil</span>
              </p>
            </div>
          </button>

          <button
            id="btn-sidebar-logout"
            onClick={logout}
            title="Terminar Sessão"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/90 transition-colors shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-900 border-r border-slate-800 min-h-screen shrink-0 sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Top Header with Hamburger */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onTabChange('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Coins className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm tracking-tight">BAYETE</span>
          <span className="font-bold text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            MICROCRÉDITO
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onOpenProfile?.()}
            className="p-1 rounded-full border border-emerald-500 overflow-hidden"
            title="Editar Perfil"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Foto" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {getInitials(user?.displayName || user?.email)}
              </div>
            )}
          </button>

          <button
            type="button"
            id="btn-open-mobile-sidebar"
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Drawer & Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-4/5 max-w-xs h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
