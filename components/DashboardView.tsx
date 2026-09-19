'use client';

import React from 'react';
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
  Clock,
  Briefcase,
  AlertCircle,
  Coins,
} from 'lucide-react';

interface DashboardViewProps {
  clients: Client[];
  credits: CreditApplication[];
  payments: PaymentRecord[];
  onOpenNewClient: () => void;
  onOpenNewCredit: () => void;
  onOpenNewPayment: () => void;
  onNavigateTab: (tab: 'dashboard' | 'clients' | 'credits' | 'payments' | 'reports') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clients,
  credits,
  payments,
  onOpenNewClient,
  onOpenNewCredit,
  onOpenNewPayment,
  onNavigateTab,
}) => {
  // Financial computations
  const totalDesembolsado = credits
    .filter((c) => c.status === 'desembolsado' || c.status === 'liquidado')
    .reduce((acc, c) => acc + c.requestedAmount, 0);

  const totalRecebido = payments.reduce((acc, p) => acc + p.amountPaid, 0);

  const totalCarteiraAtiva = credits
    .filter((c) => c.status === 'desembolsado')
    .reduce((acc, c) => acc + c.remainingBalance, 0);

  const taxaRecuperacao = totalDesembolsado > 0 ? ((totalRecebido / totalDesembolsado) * 100).toFixed(1) : '0';

  const pendingAnalyses = credits.filter((c) => c.status === 'pendente');
  const activeLoans = credits.filter((c) => c.status === 'desembolsado');

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

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Empreendedores */}
        <div
          onClick={() => onNavigateTab('clients')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Empreendedores Registados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{clients.length}</div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span className="text-emerald-600 font-semibold">{clients.filter((c) => c.status === 'ativo').length} ativos</span>
            <span>com documentação validada</span>
          </p>
        </div>

        {/* Card 2: Desembolsado */}
        <div
          onClick={() => onNavigateTab('credits')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Créditos Desembolsados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatCurrencyMT(totalDesembolsado)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {credits.filter((c) => c.status === 'desembolsado' || c.status === 'liquidado').length} micro-operações concluídas
          </p>
        </div>

        {/* Card 3: Total Amortizado */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Recuperado / Pago</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">
            {formatCurrencyMT(totalRecebido)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {payments.length} recibos processados via M-Pesa e Banco
          </p>
        </div>

        {/* Card 4: Carteira Ativa */}
        <div
          onClick={() => onNavigateTab('credits')}
          className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-amber-500 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Carteira Ativa em Aberto</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 tracking-tight font-mono">
            {formatCurrencyMT(totalCarteiraAtiva)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span>Taxa de Recuperação:</span>
            <span className="font-semibold text-emerald-700">{taxaRecuperacao}%</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};
