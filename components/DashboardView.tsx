/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { generatePortfolioReportPDF, generatePaymentReceiptPDF } from '@/lib/pdf-generator';
import { exportCompletePortfolioExcel } from '@/lib/excel-generator';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
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
  Eye,
  Lock,
  PieChart as PieChartIcon,
  BarChart3,
  XCircle,
  FileCheck,
  Filter,
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
  const { user, isAdmin, isViewer } = useAuth();
  const [alertFilter, setAlertFilter] = useState<'7days' | 'overdue' | 'all'>('7days');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Consolidate credit applications by status for donut chart visualization (Approved, Pending, Rejected)
  const creditStatusData = useMemo(() => {
    // 1. Approved (Aprovados): Includes 'aprovado', 'desembolsado', and 'liquidado'
    const approvedList = credits.filter(
      (c) => c.status === 'aprovado' || c.status === 'desembolsado' || c.status === 'liquidado'
    );
    const activeDisbursed = credits.filter((c) => c.status === 'desembolsado');
    const fullyLiquidated = credits.filter((c) => c.status === 'liquidado');
    const pendingDisbursement = credits.filter((c) => c.status === 'aprovado');

    // 2. Pending (Pendentes): 'pendente'
    const pendingList = credits.filter((c) => c.status === 'pendente');

    // 3. Rejected (Recusados): 'recusado'
    const rejectedList = credits.filter((c) => c.status === 'recusado');

    const total = credits.length;

    const approvedAmount = approvedList.reduce((sum, c) => sum + c.requestedAmount, 0);
    const pendingAmount = pendingList.reduce((sum, c) => sum + c.requestedAmount, 0);
    const rejectedAmount = rejectedList.reduce((sum, c) => sum + c.requestedAmount, 0);
    const totalAmount = approvedAmount + pendingAmount + rejectedAmount;

    const approvedPct = total > 0 ? Number(((approvedList.length / total) * 100).toFixed(1)) : 0;
    const pendingPct = total > 0 ? Number(((pendingList.length / total) * 100).toFixed(1)) : 0;
    const rejectedPct = total > 0 ? Number(((rejectedList.length / total) * 100).toFixed(1)) : 0;

    const chartData = [
      {
        id: 'approved',
        name: 'Aprovados (Approved)',
        shortName: 'Aprovados',
        statusKey: 'approved',
        value: approvedList.length,
        amount: approvedAmount,
        color: '#10b981', // emerald-500
        secondaryColor: '#059669',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        barColor: 'bg-emerald-500',
        percentage: approvedPct,
        details: `${activeDisbursed.length} ativos • ${fullyLiquidated.length} liquidados • ${pendingDisbursement.length} por desembolsar`,
        description: 'Propostas com parecer favorável, garantias validadas e contratos firmados.',
      },
      {
        id: 'pending',
        name: 'Pendentes (Pending)',
        shortName: 'Pendentes',
        statusKey: 'pending',
        value: pendingList.length,
        amount: pendingAmount,
        color: '#f59e0b', // amber-500
        secondaryColor: '#d97706',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        dotColor: 'bg-amber-500',
        barColor: 'bg-amber-500',
        percentage: pendingPct,
        details: `${pendingList.length} aguardando análise documental e parecer da comissão`,
        description: 'Simulações submetidas em scoring de risco e validação de rendimentos.',
      },
      {
        id: 'rejected',
        name: 'Recusados (Rejected)',
        shortName: 'Recusados',
        statusKey: 'rejected',
        value: rejectedList.length,
        amount: rejectedAmount,
        color: '#f43f5e', // rose-500
        secondaryColor: '#e11d48',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        barColor: 'bg-rose-500',
        percentage: rejectedPct,
        details: `${rejectedList.length} não qualificados pelo perfil ou taxa de esforço`,
        description: 'Pedidos indeferidos devido a capacidade de pagamento ou garantias insuficientes.',
      },
    ];

    const hasData = total > 0;
    const approvalRate = total > 0 ? ((approvedList.length / total) * 100).toFixed(1) : '0.0';
    const averageTicket = total > 0 ? Math.round(totalAmount / total) : 0;

    return {
      total,
      hasData,
      approvedList,
      pendingList,
      rejectedList,
      activeDisbursed,
      fullyLiquidated,
      pendingDisbursement,
      approvedAmount,
      pendingAmount,
      rejectedAmount,
      totalAmount,
      approvedPct,
      pendingPct,
      rejectedPct,
      approvalRate,
      averageTicket,
      chartData,
    };
  }, [credits]);

  // Volume total de pagamentos recebidos nos últimos 6 meses (Recharts BarChart)
  const monthlyPaymentsData = useMemo(() => {
    const now = new Date();
    const months: Array<{
      key: string;
      shortLabel: string;
      fullLabel: string;
      monthName: string;
      totalAmount: number;
      paymentCount: number;
      averageTicket: number;
    }> = [];

    const monthNamesPt = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const shortNamesPt = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    // Generate last 6 calendar months ending on current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const shortYear = String(year).slice(-2);

      months.push({
        key,
        shortLabel: `${shortNamesPt[monthIdx]}/${shortYear}`,
        fullLabel: `${monthNamesPt[monthIdx]} de ${year}`,
        monthName: shortNamesPt[monthIdx],
        totalAmount: 0,
        paymentCount: 0,
        averageTicket: 0,
      });
    }

    // Aggregate payments
    payments.forEach((p) => {
      if (!p.amountPaid || p.amountPaid <= 0) return;
      const rawDate = p.paymentDate || p.createdAt;
      if (!rawDate) return;

      try {
        const pDate = new Date(rawDate);
        if (isNaN(pDate.getTime())) return;
        const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
        const targetMonth = months.find((m) => m.key === key);
        if (targetMonth) {
          targetMonth.totalAmount += Number(p.amountPaid);
          targetMonth.paymentCount += 1;
        }
      } catch {
        // Skip malformed dates safely
      }
    });

    // Compute average ticket per month
    months.forEach((m) => {
      m.averageTicket = m.paymentCount > 0 ? Math.round(m.totalAmount / m.paymentCount) : 0;
    });

    const totalSemester = months.reduce((acc, m) => acc + m.totalAmount, 0);
    const totalTransactions = months.reduce((acc, m) => acc + m.paymentCount, 0);
    const averageMonthly = Math.round(totalSemester / 6);

    // Peak month
    let peakMonth = months[0];
    months.forEach((m) => {
      if (m.totalAmount > peakMonth.totalAmount) {
        peakMonth = m;
      }
    });

    // Month-over-month growth (last month vs previous month)
    const currentMonthData = months[months.length - 1];
    const prevMonthData = months[months.length - 2];
    let momGrowth: number | null = null;
    if (prevMonthData && prevMonthData.totalAmount > 0) {
      momGrowth = Number(
        (((currentMonthData.totalAmount - prevMonthData.totalAmount) / prevMonthData.totalAmount) * 100).toFixed(1)
      );
    }

    return {
      chartData: months,
      totalSemester,
      totalTransactions,
      averageMonthly,
      peakMonth,
      momGrowth,
    };
  }, [payments]);

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

      {/* Read-Only Notice Banner for Viewer role */}
      {isViewer && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-amber-950 flex items-center space-x-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
              <span>Sessão em Modo de Apenas Leitura</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.2 rounded-full bg-amber-200/60 text-amber-800">
                Consulta Ativa
              </span>
            </h3>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Você tem permissão para visualizar indicadores, carteira de clientes, cronogramas de amortização e exportar relatórios. <strong>Apenas o administrador do sistema pode criar, editar ou registar novos documentos</strong>.
            </p>
          </div>
        </div>
      )}

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
            {isAdmin ? (
              <button
                onClick={onOpenNewClient}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Cliente</span>
              </button>
            ) : (
              <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Criação reservada ao Administrador</span>
              </span>
            )}
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

      {/* SUMMARY DONUT CHART: DISTRIBUIÇÃO DE PROPOSTAS POR ESTADO (APPROVED, PENDING, REJECTED) */}
      <section
        id="section-dashboard-status-donut"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-emerald-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
              <PieChartIcon className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Distribuição de Propostas por Estado
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {creditStatusData.total} {creditStatusData.total === 1 ? 'proposta registada' : 'propostas registadas'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  {creditStatusData.approvalRate}% taxa de aprovação
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Gráfico resumo de candidatos por estado: <strong className="text-emerald-700 font-medium">Aprovados (Approved)</strong>, <strong className="text-amber-700 font-medium">Pendentes (Pending)</strong> e <strong className="text-rose-700 font-medium">Recusados (Rejected)</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-start md:self-auto">
            {isAdmin && (
              <button
                type="button"
                id="btn-donut-new-credit"
                onClick={onOpenNewCredit}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                title="Simular e submeter nova proposta de crédito"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Proposta</span>
              </button>
            )}
            <button
              type="button"
              id="btn-donut-view-all-credits"
              onClick={() => onNavigateTab('credits')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            >
              <span>Ver Propostas</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Card Body: Donut Chart on Left, Status Detail Cards on Right */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left Column: Recharts Donut Chart */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/50 border border-slate-100">
              <div className="relative w-full max-w-[280px] h-64 flex items-center justify-center">
                {isMounted ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload as (typeof creditStatusData.chartData)[0];
                              return (
                                <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[210px] z-50">
                                  <div className="flex items-center space-x-2 mb-2 pb-1.5 border-b border-slate-800">
                                    <span
                                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <span className="font-bold text-slate-100">{item.name}</span>
                                  </div>
                                  <div className="space-y-1.5 font-sans">
                                    <div className="flex justify-between items-center text-slate-300">
                                      <span>Quantidade:</span>
                                      <span className="font-bold text-white font-mono">
                                        {item.value} ({item.percentage}%)
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-300">
                                      <span>Volume Solicitado:</span>
                                      <span className="font-bold text-emerald-400 font-mono">
                                        {formatCurrencyMT(item.amount)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
                                    {item.details}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={
                            creditStatusData.hasData
                              ? creditStatusData.chartData.filter((d) => d.value > 0)
                              : [{ name: 'Sem Propostas', value: 1, color: '#e2e8f0', percentage: 0, amount: 0, details: '' }]
                          }
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={96}
                          paddingAngle={
                            creditStatusData.hasData &&
                            creditStatusData.chartData.filter((d) => d.value > 0).length > 1
                              ? 4
                              : 0
                          }
                          dataKey="value"
                          nameKey="name"
                          animationDuration={700}
                        >
                          {creditStatusData.hasData ? (
                            creditStatusData.chartData
                              .filter((d) => d.value > 0)
                              .map((entry) => (
                                <Cell
                                  key={`donut-slice-${entry.id}`}
                                  fill={entry.color}
                                  stroke="#ffffff"
                                  strokeWidth={2}
                                  className="cursor-pointer transition-opacity hover:opacity-90 outline-none"
                                />
                              ))
                          ) : (
                            <Cell fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1} />
                          )}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="text-3xl font-extrabold font-mono text-slate-900 leading-none">
                        {creditStatusData.total}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {creditStatusData.total === 1 ? 'Proposta' : 'Propostas'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        {creditStatusData.hasData
                          ? `${creditStatusData.approvalRate}% aprovadas`
                          : 'Aguardando dados'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
                )}
              </div>

              {/* Chart Mini-Legend */}
              <div className="w-full flex items-center justify-center flex-wrap gap-2.5 pt-2 border-t border-slate-200/60 mt-2 text-xs">
                {creditStatusData.chartData.map((item) => (
                  <div key={`legend-${item.id}`} className="flex items-center space-x-1.5 text-[11px]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 font-medium">{item.shortName}:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {item.value} <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Detailed Status Breakdown Cards */}
            <div className="lg:col-span-7 space-y-3">
              {creditStatusData.chartData.map((item) => {
                let StatusIcon = CheckCircle2;
                if (item.statusKey === 'pending') StatusIcon = Clock;
                if (item.statusKey === 'rejected') StatusIcon = XCircle;

                return (
                  <div
                    key={`status-card-${item.id}`}
                    id={`status-card-${item.id}`}
                    onClick={() => onNavigateTab('credits')}
                    className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
                    title={`Ver propostas no estado ${item.name}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.color}15`, color: item.color }}
                        >
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5 truncate">
                            <span>{item.name}</span>
                          </h3>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end space-x-1.5">
                          <span
                            className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: `${item.color}12`,
                              color: item.secondaryColor,
                              borderColor: `${item.color}35`,
                            }}
                          >
                            {item.value} {item.value === 1 ? 'proposta' : 'propostas'}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {item.percentage}%
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-700 block mt-0.5">
                          {formatCurrencyMT(item.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Percentage Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1 mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>

                    {/* Card Sub-details Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="truncate pr-2">{item.details}</span>
                      <span className="text-emerald-700 group-hover:underline text-[10px] font-semibold shrink-0 flex items-center space-x-0.5">
                        <span>Filtrar</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Consolidate Key Financial Ratio Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Taxa de Aprovação Global
              </span>
              <span className="text-base font-bold font-mono text-emerald-700">
                {creditStatusData.approvalRate}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                {creditStatusData.approvedList.length} de {creditStatusData.total} propostas validadas
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Ticket Médio por Proposta
              </span>
              <span className="text-base font-bold font-mono text-slate-800">
                {formatCurrencyMT(creditStatusData.averageTicket)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Média do montante solicitado pelos empreendedores
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Volume Total em Propostas
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {formatCurrencyMT(creditStatusData.totalAmount)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Soma de todas as propostas submetidas à Bayete
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: GRÁFICO DE BARRAS - VOLUME TOTAL DE PAGAMENTOS RECEBIDOS (ÚLTIMOS 6 MESES) */}
      <section
        id="section-dashboard-payments-barchart"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-emerald-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Volume de Pagamentos Recebidos (Últimos 6 Meses)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  {formatCurrencyMT(monthlyPaymentsData.totalSemester)} arrecadados
                </span>
                {monthlyPaymentsData.momGrowth !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border font-mono ${
                      monthlyPaymentsData.momGrowth >= 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {monthlyPaymentsData.momGrowth >= 0 ? '+' : ''}
                    {monthlyPaymentsData.momGrowth}% vs mês anterior
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evolução mensal do montante total amortizado pelos microempreendedores para análise rápida de liquidez e desempenho.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-start md:self-auto">
            {isAdmin && (
              <button
                type="button"
                id="btn-barchart-new-payment"
                onClick={onOpenNewPayment}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                title="Registar amortização ou pagamento de parcela"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registar Pagamento</span>
              </button>
            )}
            <button
              type="button"
              id="btn-barchart-view-all-payments"
              onClick={() => onNavigateTab('payments')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            >
              <span>Ver Histórico</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Card Body: Summary KPI Badges + Bar Chart */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total do Semestre (6m)
              </span>
              <span className="text-base font-bold font-mono text-emerald-700">
                {formatCurrencyMT(monthlyPaymentsData.totalSemester)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {monthlyPaymentsData.totalTransactions} recibos liquidados
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Média Mensal
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {formatCurrencyMT(monthlyPaymentsData.averageMonthly)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Recuperação média regular
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Mês de Pico (Maior Volume)
              </span>
              <span className="text-base font-bold font-mono text-emerald-800">
                {monthlyPaymentsData.peakMonth.shortLabel}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                {formatCurrencyMT(monthlyPaymentsData.peakMonth.totalAmount)} ({monthlyPaymentsData.peakMonth.paymentCount} recibos)
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Mês Atual ({monthlyPaymentsData.chartData[monthlyPaymentsData.chartData.length - 1]?.shortLabel})
              </span>
              <span className="text-base font-bold font-mono text-slate-800">
                {formatCurrencyMT(monthlyPaymentsData.chartData[monthlyPaymentsData.chartData.length - 1]?.totalAmount || 0)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {monthlyPaymentsData.chartData[monthlyPaymentsData.chartData.length - 1]?.paymentCount || 0} pagamentos este mês
              </span>
            </div>
          </div>

          {/* Recharts BarChart */}
          <div className="h-72 w-full pt-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyPaymentsData.chartData}
                  margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="paymentBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="paymentBarGradientPeak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#047857" stopOpacity={1} />
                      <stop offset="100%" stopColor="#065f46" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortLabel"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${Math.round(val / 1000)}k MT` : `${val} MT`
                    }
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as (typeof monthlyPaymentsData.chartData)[0];
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[210px] z-50">
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
                              <span className="font-bold text-slate-100">{data.fullLabel}</span>
                              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                                {data.paymentCount} {data.paymentCount === 1 ? 'recibo' : 'recibos'}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-slate-300">
                                <span>Volume Total:</span>
                                <span className="font-bold font-mono text-sm text-emerald-400">
                                  {formatCurrencyMT(data.totalAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                <span>Ticket Médio:</span>
                                <span className="font-mono text-slate-200">
                                  {formatCurrencyMT(data.averageTicket)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="totalAmount"
                    name="Volume Recebido (MT)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={52}
                  >
                    {monthlyPaymentsData.chartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={
                          entry.key === monthlyPaymentsData.peakMonth.key && entry.totalAmount > 0
                            ? 'url(#paymentBarGradientPeak)'
                            : 'url(#paymentBarGradient)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                A carregar gráfico financeiro...
              </div>
            )}
          </div>
        </div>
      </section>

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
                      {isAdmin ? (
                        <button
                          id={`btn-pay-alert-${a.creditId}-${a.installmentNumber}`}
                          onClick={() => handlePayInstallment(a)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Registar Pagamento</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateTab('credits')}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Consultar Detalhes</span>
                        </button>
                      )}

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
