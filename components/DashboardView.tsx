'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { generatePortfolioReportPDF, generatePaymentReceiptPDF } from '@/lib/pdf-generator';
import { exportCompletePortfolioExcel } from '@/lib/excel-generator';
import {
  Users,
  TrendingUp,
  CreditCard,
  FileSpreadsheet,
  Download,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  Coins,
  User,
  Settings,
  Bell,
  AlertTriangle,
  Calendar,
  Phone,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export interface DueAlertItem {
  creditId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientProfession: string;
  purpose: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentAmount: number;
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean;
}

interface DashboardViewProps {
  clients: Client[];
  credits: CreditApplication[];
  payments: PaymentRecord[];
  onOpenNewClient: () => void;
  onOpenNewCredit: () => void;
  onOpenNewPayment: () => void;
  onOpenPaymentForCredit?: (creditId: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports') => void;
  onOpenProfile?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clients,
  credits,
  payments,
  onOpenNewClient,
  onOpenNewCredit,
  onOpenNewPayment,
  onOpenPaymentForCredit,
  onNavigateTab,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const [alertFilter, setAlertFilter] = useState<'7days' | 'overdue' | 'all'>('7days');

  // Compute pending installment alerts
  const allAlerts: DueAlertItem[] = useMemo(() => {
    const list: DueAlertItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const credit of credits) {
      if (credit.status === 'recusado' || credit.status === 'liquidado') continue;
      if (!credit.installments || !Array.isArray(credit.installments)) continue;

      credit.installments.forEach((inst) => {
        if (inst.status === 'pendente') {
          // Parse YYYY-MM-DD safely
          let diffDays = 0;
          try {
            const parts = inst.dueDate.split('T')[0].split('-').map(Number);
            const dueObj = new Date(parts[0], parts[1] - 1, parts[2]);
            dueObj.setHours(0, 0, 0, 0);
            const diffMs = dueObj.getTime() - today.getTime();
            diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          } catch {
            const fallbackDue = new Date(inst.dueDate);
            fallbackDue.setHours(0, 0, 0, 0);
            diffDays = Math.round((fallbackDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }

          list.push({
            creditId: credit.id,
            clientId: credit.clientId,
            clientName: credit.clientName,
            clientPhone: credit.clientPhone,
            clientProfession: credit.clientProfession,
            purpose: credit.purpose,
            installmentNumber: inst.number,
            totalInstallments: credit.termMonths || credit.installments.length,
            installmentAmount: inst.amount,
            dueDate: inst.dueDate,
            daysRemaining: diffDays,
            isOverdue: diffDays < 0,
          });
        }
      });
    }

    // Sort by daysRemaining ascending (most urgent first)
    list.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return list;
  }, [credits]);

  const upcoming7DaysAlerts = useMemo(() => {
    return allAlerts.filter((a) => a.daysRemaining >= 0 && a.daysRemaining <= 7);
  }, [allAlerts]);

  const overdueAlerts = useMemo(() => {
    return allAlerts.filter((a) => a.daysRemaining < 0);
  }, [allAlerts]);

  const displayedAlerts = useMemo(() => {
    if (alertFilter === '7days') return upcoming7DaysAlerts;
    if (alertFilter === 'overdue') return overdueAlerts;
    return allAlerts;
  }, [alertFilter, upcoming7DaysAlerts, overdueAlerts, allAlerts]);

  const total7DaysAmount = useMemo(() => {
    return upcoming7DaysAlerts.reduce((sum, a) => sum + a.installmentAmount, 0);
  }, [upcoming7DaysAlerts]);

  // Format date display (DD/MM/YYYY)
  const formatDueDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-MZ');
    } catch {
      return dateStr;
    }
  };

  const handlePayInstallment = (alertItem: DueAlertItem) => {
    if (onOpenPaymentForCredit) {
      onOpenPaymentForCredit(alertItem.creditId);
    } else {
      onOpenNewPayment();
    }
  };

  // Financial computations
  const totalDesembolsado = credits
    .filter((c) => c.status === 'desembolsado' || c.status === 'liquidado')
    .reduce((acc, c) => acc + c.requestedAmount, 0);

  const totalRecebido = payments.reduce((acc, p) => acc + p.amountPaid, 0);

  const totalCarteiraAtiva = credits
    .filter((c) => c.status === 'desembolsado')
    .reduce((acc, c) => acc + c.remainingBalance, 0);

  const taxaRecuperacao = totalDesembolsado > 0 ? ((totalRecebido / totalDesembolsado) * 100).toFixed(1) : '0';

  // Taxa de inadimplência (créditos com pagamentos em atraso versus totais)
  const creditosOperacionais = credits.filter(
    (c) => c.status === 'desembolsado' || c.status === 'liquidado'
  );
  const totalCreditosBase = creditosOperacionais.length > 0 ? creditosOperacionais.length : credits.length;

  const creditosComAtraso = useMemo(() => {
    return credits.filter((c) => {
      if (c.status !== 'desembolsado') return false;
      return c.installments?.some((inst) => {
        if (inst.status !== 'pendente') return false;
        try {
          const parts = inst.dueDate.split('T')[0].split('-').map(Number);
          const dueObj = new Date(parts[0], parts[1] - 1, parts[2]);
          dueObj.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dueObj.getTime() < today.getTime();
        } catch {
          return false;
        }
      });
    });
  }, [credits]);

  const totalCreditosInadimplentes = creditosComAtraso.length;
  const taxaInadimplencia =
    totalCreditosBase > 0
      ? ((totalCreditosInadimplentes / totalCreditosBase) * 100).toFixed(1)
      : '0.0';

  const handleInadimplenciaCardClick = () => {
    setAlertFilter('overdue');
    const alertsSection = document.getElementById('section-dashboard-alerts');
    if (alertsSection) {
      alertsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Distribution by profession
  const professionCount = clients.reduce((acc: Record<string, number>, c) => {
    const key = c.profession.split('/')[0].trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const handleExportPDF = () => {
    generatePortfolioReportPDF(clients, credits, payments);
  };

  const handleExportExcel = () => {
    exportCompletePortfolioExcel(clients, credits, payments);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero Summary */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Painel Executivo Operacional
              </span>
              <span className="text-xs text-slate-300">Maputo & Matola, Moçambique</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5">
              Bayete Microcrédito
            </h1>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Impulsionando o crescimento de pequenos comerciantes, alfaiates, marceneiros e pequenos empresários através de financiamento ágil e análise de risco responsável.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {upcoming7DaysAlerts.length > 0 && (
              <a
                href="#section-dashboard-alerts"
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-medium transition-all shadow-sm"
                title="Rolar para alertas de vencimento da semana"
              >
                <Bell className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{upcoming7DaysAlerts.length} {upcoming7DaysAlerts.length === 1 ? 'Alerta (7 dias)' : 'Alertas (7 dias)'}</span>
              </a>
            )}
            {onOpenProfile && (
              <button
                id="btn-dashboard-profile"
                onClick={onOpenProfile}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-500/50 text-white text-xs font-medium transition-all shadow-sm"
                title="Editar Perfil do Administrador"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Foto" className="w-4 h-4 rounded-full object-cover border border-emerald-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-300" />
                )}
                <span>Editar Perfil</span>
              </button>
            )}
            <button
              id="btn-quick-export-pdf"
              onClick={handleExportPDF}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/80 border border-emerald-600/50 text-white text-xs font-medium transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Relatório PDF</span>
            </button>
            <button
              id="btn-quick-export-excel"
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/80 border border-emerald-600/50 text-white text-xs font-medium transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fresh/Empty State Welcome Banner */}
      {clients.length === 0 && credits.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-950 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-900">Pronto para Novos Registos</h2>
              <p className="text-xs text-emerald-700 mt-0.5">
                Comece agora a cadastrar os seus clientes e a gerir operações de microcrédito.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenNewClient}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Empreendedores */}
        <div
          id="card-kpi-clients"
          onClick={() => onNavigateTab('clients')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Empreendedores</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{clients.length}</div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span className="text-emerald-600 font-semibold">{clients.filter((c) => c.status === 'ativo').length} ativos</span>
            <span>com docs em dia</span>
          </p>
        </div>

        {/* Card 2: Desembolsado */}
        <div
          id="card-kpi-disbursed"
          onClick={() => onNavigateTab('credits')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Desembolsados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatCurrencyMT(totalDesembolsado)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {credits.filter((c) => c.status === 'desembolsado' || c.status === 'liquidado').length} operações concluídas
          </p>
        </div>

        {/* Card 3: Total Amortizado */}
        <div
          id="card-kpi-repaid"
          onClick={() => onNavigateTab('payments')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Recuperado</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">
            {formatCurrencyMT(totalRecebido)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {payments.length} recibos processados
          </p>
        </div>

        {/* Card 4: Carteira Ativa */}
        <div
          id="card-kpi-active-portfolio"
          onClick={() => onNavigateTab('credits')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-amber-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Carteira Ativa</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 tracking-tight font-mono">
            {formatCurrencyMT(totalCarteiraAtiva)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span>Recuperação:</span>
            <span className="font-semibold text-emerald-700">{taxaRecuperacao}%</span>
          </p>
        </div>

        {/* Card 5: Taxa de Inadimplência */}
        <div
          id="card-kpi-inadimplencia"
          onClick={handleInadimplenciaCardClick}
          className={`bg-white p-4.5 rounded-xl border transition-all cursor-pointer shadow-sm group ${
            totalCreditosInadimplentes > 0
              ? 'border-slate-200 hover:border-rose-500'
              : 'border-slate-200 hover:border-emerald-500'
          }`}
          title="Clique para visualizar os créditos com parcelas em atraso"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Taxa de Inadimplência</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                totalCreditosInadimplentes > 0
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {totalCreditosInadimplentes > 0 ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight font-mono ${
              totalCreditosInadimplentes > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {taxaInadimplencia}%
          </div>
          <p className="text-[11px] mt-1 flex items-center space-x-1 truncate">
            {totalCreditosInadimplentes > 0 ? (
              <>
                <span className="text-rose-600 font-semibold font-mono">
                  {totalCreditosInadimplentes} de {totalCreditosBase}
                </span>
                <span className="text-slate-500">em atraso</span>
              </>
            ) : (
              <>
                <span className="text-emerald-700 font-semibold font-mono">
                  0 de {totalCreditosBase}
                </span>
                <span className="text-slate-500">em mora • Regular</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Quick Action Shortcuts Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          id="dash-action-new-client"
          onClick={onOpenNewClient}
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all flex items-center space-x-3 group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-700">
              Novo Registo de Empreendedor
            </span>
            <span className="text-[11px] text-slate-500">
              Cadastrar BI, NUIT, residência e salário
            </span>
          </div>
        </button>

        <button
          id="dash-action-new-credit"
          onClick={onOpenNewCredit}
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all flex items-center space-x-3 group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-700">
              Nova Análise de Microcrédito
            </span>
            <span className="text-[11px] text-slate-500">
              Simulador financeiro e avaliação de risco
            </span>
          </div>
        </button>

        <button
          id="dash-action-new-payment"
          onClick={onOpenNewPayment}
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all flex items-center space-x-3 group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-700">
              Registar Pagamento de Parcela
            </span>
            <span className="text-[11px] text-slate-500">
              M-Pesa, E-Mola ou Banco com recibo PDF
            </span>
          </div>
        </button>
      </div>

      {/* SECTOR / SECTION: ALERTAS DE VENCIMENTO (PRÓXIMOS 7 DIAS) */}
      <section id="section-dashboard-alerts" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Alerts Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              overdueAlerts.length > 0
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : upcoming7DaysAlerts.length > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {overdueAlerts.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
              ) : upcoming7DaysAlerts.length > 0 ? (
                <Bell className="w-5 h-5 text-amber-700" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-1.5">
                  <span>Alertas de Vencimento</span>
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  upcoming7DaysAlerts.length > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {upcoming7DaysAlerts.length === 1
                    ? '1 parcela nos próximos 7 dias'
                    : `${upcoming7DaysAlerts.length} parcelas nos próximos 7 dias`}
                </span>
                {overdueAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
                    {overdueAlerts.length} em atraso
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Acompanhamento proativo de parcelas a vencer nos próximos 7 dias para cobrança preventiva e gestão de tesouraria.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto border border-slate-200/70">
            <button
              id="tab-alert-filter-7days"
              onClick={() => setAlertFilter('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                alertFilter === '7days'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Próximos 7 Dias</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                alertFilter === '7days' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {upcoming7DaysAlerts.length}
              </span>
            </button>

            <button
              id="tab-alert-filter-overdue"
              onClick={() => setAlertFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                alertFilter === 'overdue'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <span>Em Atraso</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                overdueAlerts.length > 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {overdueAlerts.length}
              </span>
            </button>

            <button
              id="tab-alert-filter-all"
              onClick={() => setAlertFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                alertFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todas as Pendentes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                alertFilter === 'all' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {allAlerts.length}
              </span>
            </button>
          </div>
        </div>

        {/* Informative summary bar if in 7days view */}
        {alertFilter === '7days' && upcoming7DaysAlerts.length > 0 && (
          <div className="bg-amber-50/70 border-b border-amber-100/90 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-amber-950 gap-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                Previsão de cobrança nos próximos 7 dias: <strong className="font-mono text-amber-950 font-bold">{formatCurrencyMT(total7DaysAmount)}</strong> em <strong className="font-semibold">{upcoming7DaysAlerts.length} {upcoming7DaysAlerts.length === 1 ? 'parcela' : 'parcelas'}</strong>.
              </span>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Aconselha-se contacto prévio com os clientes para garantir a liquidação pontual via M-Pesa ou E-Mola.
            </span>
          </div>
        )}

        {/* Content list / grid */}
        <div className="p-4 sm:p-5">
          {displayedAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {displayedAlerts.map((a) => {
                // Determine urgency style
                let urgencyBadge = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Em {a.daysRemaining} dias</span>
                  </span>
                );

                if (a.isOverdue) {
                  urgencyBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1 animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>{Math.abs(a.daysRemaining)}d em atraso</span>
                    </span>
                  );
                } else if (a.daysRemaining === 0) {
                  urgencyBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1 animate-pulse">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Vence Hoje</span>
                    </span>
                  );
                } else if (a.daysRemaining === 1) {
                  urgencyBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Vence Amanhã</span>
                    </span>
                  );
                }

                return (
                  <div
                    key={`${a.creditId}-${a.installmentNumber}`}
                    id={`alert-card-${a.creditId}-${a.installmentNumber}`}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                      a.isOverdue
                        ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
                        : a.daysRemaining <= 1
                        ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      {/* Top Row: Client & Urgency */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-slate-900 truncate" title={a.clientName}>
                            {a.clientName}
                          </h3>
                          <p className="text-[10px] text-slate-500 truncate" title={a.clientProfession}>
                            {a.clientProfession}
                          </p>
                        </div>
                        <div className="shrink-0">{urgencyBadge}</div>
                      </div>

                      {/* Purpose */}
                      {a.purpose && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 mb-3">
                          &ldquo;{a.purpose}&rdquo;
                        </p>
                      )}

                      {/* Installment Info & Due Date */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] py-2 border-t border-b border-slate-100 mb-3">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Parcela</span>
                          <span className="font-semibold text-slate-800">
                            Nº {a.installmentNumber} <span className="text-slate-400 font-normal">de {a.totalInstallments}</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Data Vencimento</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {formatDueDate(a.dueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Amount & Contact */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Valor da Parcela</span>
                          <span className="text-base font-bold text-slate-900 font-mono">
                            {formatCurrencyMT(a.installmentAmount)}
                          </span>
                        </div>

                        {a.clientPhone && (
                          <a
                            href={`tel:${a.clientPhone}`}
                            id={`btn-call-client-${a.creditId}-${a.installmentNumber}`}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[11px] font-semibold transition-colors"
                            title={`Ligar para ${a.clientPhone}`}
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{a.clientPhone}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center space-x-2">
                      <button
                        id={`btn-pay-alert-${a.creditId}-${a.installmentNumber}`}
                        onClick={() => handlePayInstallment(a)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Registar Pagamento</span>
                      </button>

                      <button
                        id={`btn-view-credit-alert-${a.creditId}-${a.installmentNumber}`}
                        onClick={() => onNavigateTab('credits')}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        title="Ver ficha do crédito"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {alertFilter === '7days'
                  ? 'Nenhum crédito com parcela a vencer nos próximos 7 dias'
                  : alertFilter === 'overdue'
                  ? 'Nenhuma parcela em atraso identificada'
                  : 'Nenhuma parcela pendente registada'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                {alertFilter === '7days'
                  ? 'Todas as obrigações da carteira para os próximos 7 dias estão em dia. O gestor pode acompanhar as próximas datas na aba de Créditos ou emitir relatórios.'
                  : alertFilter === 'overdue'
                  ? 'A carteira de microcrédito apresenta excelente disciplina e assiduidade nos reembolsos.'
                  : 'Todos os empréstimos concedidos foram integralmente liquidados ou não existem amortizações ativas.'}
              </p>
              {alertFilter !== '7days' && (
                <button
                  onClick={() => setAlertFilter('7days')}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center space-x-1"
                >
                  <span>Voltar aos alertas dos próximos 7 dias</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Grid: Pending Credits & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending and Active Credit Applications */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Operações de Crédito Recentes ({credits.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('credits')}
              className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {credits.slice(0, 5).map((cr) => (
              <div key={cr.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-slate-900">{cr.clientName}</span>
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                        cr.status === 'desembolsado'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : cr.status === 'aprovado'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : cr.status === 'liquidado'
                          ? 'bg-purple-50 text-purple-700 border-purple-300'
                          : cr.status === 'recusado'
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {cr.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {cr.clientProfession} • Prazo: {cr.termMonths} meses @ {cr.interestRate}%
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Finalidade: {cr.purpose}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-xs text-slate-900 font-mono block">
                    {formatCurrencyMT(cr.requestedAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {cr.status === 'desembolsado'
                      ? `Saldo: ${formatCurrencyMT(cr.remainingBalance)}`
                      : `Prest.: ${formatCurrencyMT(cr.monthlyInstallment)}/m`}
                  </span>
                </div>
              </div>
            ))}

            {credits.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhum crédito registado ainda. Comece criando um cliente e uma nova análise!
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Payment Records & Sectors */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Payments stream */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Últimos Pagamentos Recebidos
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('payments')}
                className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center space-x-0.5"
              >
                <span>Ver todos</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {payments.slice(0, 4).map((p) => (
                <div key={p.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">{p.clientName}</span>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                      <span className="font-mono text-slate-700">{p.receiptNumber}</span>
                      <span>•</span>
                      <span className="uppercase text-emerald-700 font-medium">{p.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-emerald-700 font-mono">
                      {formatCurrencyMT(p.amountPaid)}
                    </span>
                    <button
                      onClick={() => generatePaymentReceiptPDF(p)}
                      title="Descarregar Recibo PDF"
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {payments.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Nenhum pagamento registado ainda.
                </div>
              )}
            </div>
          </div>

          {/* Microentrepreneur Sectors Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>Setores Atendidos pela Bayete</span>
            </h3>

            {Object.keys(professionCount).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(professionCount).slice(0, 5).map(([prof, count]) => {
                  const pct = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;
                  return (
                    <div key={prof}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-700 font-medium truncate max-w-[200px]">{prof}</span>
                        <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-3 text-center italic">
                Nenhum setor registado ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
