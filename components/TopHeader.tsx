'use client';

import React, { useState } from 'react';
import {
  Layers,
  Star,
  Moon,
  RotateCcw,
  Bell,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';

interface TopHeaderProps {
  currentTab: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleRightSidebar?: () => void;
  hasUnreadAlerts?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onRefresh,
  isRefreshing = false,
  onToggleRightSidebar,
  hasUnreadAlerts = false,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Este Mês');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const tabLabels: Record<string, string> = {
    dashboard: 'Visão Geral',
    clients: 'Clientes',
    credits: 'Análise de Crédito',
    payments: 'Pagamentos',
    reports: 'Relatórios',
  };

  const periodOptions = ['Hoje', 'Últimos 7 Dias', 'Este Mês', 'Este Trimestre', 'Este Ano'];

  return (
    <header className="h-16 border-b border-[#242731] px-6 flex items-center justify-between bg-[#12141a] select-none sticky top-0 z-30">
      {/* Left: Layers icon, Star, Breadcrumbs */}
      <div className="flex items-center space-x-3 text-xs">
        <button
          type="button"
          title="Alternar vista"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsStarred(!isStarred)}
          title="Favorito"
          className={`p-1.5 rounded-lg transition-colors ${
            isStarred ? 'text-[#c8ff3d]' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Star className={`w-4 h-4 ${isStarred ? 'fill-[#c8ff3d]' : ''}`} />
        </button>

        <div className="flex items-center space-x-1.5 text-slate-400">
          <span className="hover:text-slate-200 cursor-pointer">Dashboards</span>
          <span className="text-slate-600">/</span>
          <span className="text-white font-medium capitalize">
            {tabLabels[currentTab] || currentTab}
          </span>
        </div>
      </div>

      {/* Right: Theme, Refresh, Notifications, Language, Period Dropdown */}
      <div className="flex items-center space-x-3.5">
        <button
          type="button"
          title="Modo Escuro (Ativo)"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Moon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          title="Sincronizar Dados Firebase"
          className={`p-1.5 text-slate-400 hover:text-[#c8ff3d] hover:bg-white/5 rounded-lg transition-colors ${
            isRefreshing ? 'animate-spin text-[#c8ff3d]' : ''
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleRightSidebar}
          title="Notificações e Atividades"
          className="relative p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#c8ff3d] ring-2 ring-[#12141a]"></span>
        </button>

        <button
          type="button"
          title="Idioma: Português (Moçambique)"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center space-x-1"
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Period Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPeriodOpen(!isPeriodOpen)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#1a1d24] hover:bg-[#222631] text-xs font-medium text-white border border-[#272b38] transition-colors"
          >
            <span>{selectedPeriod}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isPeriodOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-[#181b22] border border-[#282c3a] rounded-xl shadow-2xl py-1 z-50 text-xs text-slate-300">
              {periodOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSelectedPeriod(opt);
                    setIsPeriodOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#232733] hover:text-white transition-colors ${
                    selectedPeriod === opt ? 'text-[#c8ff3d] font-semibold' : ''
                  }`}
                >
                  <span>{opt}</span>
                  {selectedPeriod === opt && <Check className="w-3.5 h-3.5 text-[#c8ff3d]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
