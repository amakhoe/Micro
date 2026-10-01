/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
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
  Eye,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports';
  onTabChange: (tab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports') => void;
  onOpenNewClient: () => void;
  onOpenNewCredit: () => void;
  onSeedData: () => void;
  onOpenProfile?: () => void;
  onOpenUsersManagement?: () => void;
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
  onOpenUsersManagement,
  isSeeding,
  hasData,
  clientsCount,
  creditsCount,
  paymentsCount,
}) => {
  const { user, logout, isAdmin, isViewer } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent background scroll when sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    description: string;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, description: 'Métricas e alertas' },
    { id: 'clients', label: 'Clientes', icon: Users, badge: clientsCount, description: 'Gestão de carteira' },
    { id: 'credits', label: 'Análise de Crédito', icon: TrendingUp, badge: creditsCount, description: 'Simulações e propostas' },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard, badge: paymentsCount, description: 'Cobranças e recibos' },
    { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet, description: 'Exportação e auditoria' },
  ];

  const currentTabObj = navItems.find((item) => item.id === currentTab) || navItems[0];
  const CurrentIcon = currentTabObj.icon;

  const handleNavClick = (tab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports') => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* 
        RESPONSIVE TOP HEADER BAR (Always visible at the top)
        Contains the Menu button to trigger the sidebar, brand logo, current active section, and quick actions
      */}
      <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Left section: Hamburger / Menu Trigger & Brand Logo */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* The Responsive Menu Button (Sidebar only appears when clicked) */}
            <button
              type="button"
              id="btn-toggle-sidebar"
              onClick={() => setIsOpen((prev) => !prev)}
              className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                isOpen
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700/80 hover:border-slate-600 shadow-sm'
              }`}
              aria-label={isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={isOpen}
              title="Clique para abrir o menu do sidebar"
            >
              <Menu className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold tracking-wide">Menu</span>
            </button>

            {/* Brand Logo & Name */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none group"
              onClick={() => handleNavClick('dashboard')}
              title="Voltar à Visão Geral"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-600/30 text-white font-bold group-hover:scale-105 transition-transform shrink-0">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-none">
                    BAYETE
                  </span>
                  <span className="font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 leading-none">
                    MICROCRÉDITO
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline leading-tight mt-0.5">
                  Apoio Financeiro Rápido
                </span>
              </div>
            </div>

            {/* Current Active Section Badge (sm+ screens) */}
            <div className="hidden md:flex items-center space-x-2 pl-3 border-l border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Secção:</span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 font-medium text-emerald-400">
                <CurrentIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{currentTabObj.label}</span>
              </span>
            </div>
          </div>

          {/* Right section: Quick action shortcuts, profile avatar, and logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isAdmin && (
              <>
                <button
                  type="button"
                  id="btn-header-new-credit"
                  onClick={onOpenNewCredit}
                  className="hidden sm:inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                  title="Simular e criar nova proposta de microcrédito"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Novo Crédito</span>
                </button>

                <button
                  type="button"
                  id="btn-header-new-client"
                  onClick={onOpenNewClient}
                  className="hidden lg:inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
                  title="Cadastrar novo cliente"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Novo Cliente</span>
                </button>
              </>
            )}

            {/* User Profile Button */}
            <button
              type="button"
              id="btn-header-profile"
              onClick={() => onOpenProfile?.()}
              className="flex items-center space-x-2 py-1.5 px-2 sm:px-2.5 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700/80 transition-all text-left group cursor-pointer"
              title="Gerir perfil de utilizador"
            >
              <div className="relative shrink-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Foto de Perfil"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-xs flex items-center justify-center border-2 border-emerald-500 shadow-sm">
                    {getInitials(user?.displayName || user?.email)}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>

              <div className="hidden sm:block text-left max-w-[120px] truncate">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 leading-tight truncate flex items-center space-x-1">
                  <span className="truncate">{user?.displayName || user?.email?.split('@')[0] || 'Utilizador'}</span>
                </p>
                <p className="text-[10px] leading-tight mt-0.5">
                  {isAdmin ? (
                    <span className="text-emerald-400 font-medium">Administrador</span>
                  ) : (
                    <span className="text-amber-300 font-medium">Modo Leitor</span>
                  )}
                </p>
              </div>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              id="btn-header-logout"
              onClick={logout}
              title="Terminar Sessão"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/90 transition-colors shrink-0"
              aria-label="Terminar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 
        RESPONSIVE SIDEBAR DRAWER (Only appears when clicked)
        Opens smoothly over content, with backdrop and quick dismiss
      */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar Drawer Panel */}
          <aside
            id="responsive-sidebar-drawer"
            className="relative w-80 sm:w-84 max-w-[88vw] h-full bg-slate-900 text-white border-r border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 ease-out select-none"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal de navegação"
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div
                className="flex items-center space-x-3 cursor-pointer group"
                onClick={() => handleNavClick('dashboard')}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 text-white font-bold group-hover:scale-105 transition-transform">
                  <Coins className="w-5 h-5 text-white" />
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

              {/* Close Button (X) */}
              <button
                type="button"
                id="btn-close-sidebar"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar menu"
                title="Fechar menu (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action CTAs */}
            <div className="p-4 space-y-2 border-b border-slate-800/80 bg-slate-900/60">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    id="btn-sidebar-new-credit"
                    onClick={() => {
                      onOpenNewCredit();
                      setIsOpen(false);
                    }}
                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 hover:shadow-emerald-900/50 transition-all group cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-100 group-hover:rotate-90 transition-transform duration-200" />
                    <span>Simular Novo Crédito</span>
                  </button>

                  <button
                    type="button"
                    id="btn-sidebar-new-client"
                    onClick={() => {
                      onOpenNewClient();
                      setIsOpen(false);
                    }}
                    className="w-full inline-flex items-center justify-center space-x-2 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 text-xs font-medium transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cadastrar Novo Cliente</span>
                  </button>
                </>
              ) : (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-center">
                  <span className="inline-flex items-center space-x-1.5 text-xs text-amber-300 font-semibold">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modo Apenas Leitura</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Apenas o administrador pode criar ou alterar documentos.
                  </p>
                </div>
              )}
            </div>

            {/* Main Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Navegação do Sistema</span>
                <span className="text-[9px] text-slate-500 font-normal">Clique para aceder</span>
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-emerald-700/80 text-white'
                            : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700/80'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left truncate">
                        <p className="truncate leading-tight">{item.label}</p>
                        <p
                          className={`text-[10px] leading-tight truncate ${
                            isActive ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            isActive
                              ? 'bg-emerald-700 text-emerald-100'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}

              {/* System & Data Tools */}
              <div className="pt-4 px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-800/80 mt-3">
                Acessos & Sistema
              </div>

              {isAdmin && onOpenUsersManagement && (
                <button
                  type="button"
                  id="btn-sidebar-manage-users"
                  onClick={() => {
                    onOpenUsersManagement();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-emerald-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-sm mb-1.5 cursor-pointer"
                  title="Adicionar e gerir mais utilizadores no sistema"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Adicionar Utilizadores</span>
                </button>
              )}

              {(!hasData || (creditsCount === 0 && clientsCount !== undefined && clientsCount > 0)) && (
                <button
                  type="button"
                  id="btn-sidebar-seed-data"
                  onClick={() => {
                    onSeedData();
                    setIsOpen(false);
                  }}
                  disabled={isSeeding}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all mb-2 cursor-pointer"
                  title="Gravar propostas de crédito e pagamentos de exemplo no Firebase"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    {isSeeding ? 'A gravar no Firebase...' : 'Sincronizar Dados Firebase'}
                  </span>
                </button>
              )}

              {/* Firebase Connected Indicator */}
              <div className="mt-2 mx-1 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-300">Firebase Firestore</span>
                </div>
                <span className="text-[9px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium">
                  Ativo
                </span>
              </div>
            </nav>

            {/* Drawer User Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/70">
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  id="btn-sidebar-admin-profile"
                  onClick={() => {
                    if (onOpenProfile) onOpenProfile();
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-2.5 py-1.5 px-2 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700/80 transition-all text-left flex-1 min-w-0 group cursor-pointer"
                  title="Editar perfil de utilizador (nome, email, telemóvel, password, foto)"
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
                      <span className="truncate">
                        {user?.displayName || user?.email?.split('@')[0] || 'Utilizador'}
                      </span>
                      <Settings className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[10px] leading-tight flex items-center space-x-1 mt-0.5">
                      {isAdmin ? (
                        <>
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-400/90 font-medium">Admin • Perfil</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="text-amber-300 font-medium">Leitor • Sem Edição</span>
                        </>
                      )}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-sidebar-logout"
                  onClick={logout}
                  title="Terminar Sessão"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/90 transition-colors shrink-0 cursor-pointer"
                  aria-label="Terminar Sessão"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
