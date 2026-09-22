'use client';

import React from 'react';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { generatePortfolioReportPDF } from '@/lib/pdf-generator';
import {
  exportCompletePortfolioExcel,
  exportClientsExcel,
  exportCreditsExcel,
  exportPaymentsExcel,
} from '@/lib/excel-generator';
import {
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  TrendingUp,
  Users,
  CreditCard,
  Building,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface ReportsViewProps {
  clients: Client[];
  credits: CreditApplication[];
  payments: PaymentRecord[];
  onClearAllData?: () => void;
  onSeedData?: () => void;
  onOpenProfile?: () => void;
  isSeeding?: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  clients,
  credits,
  payments,
}) => {
  const totalDesembolsado = credits
    .filter((c) => c.status === 'desembolsado' || c.status === 'liquidado')
    .reduce((acc, c) => acc + c.requestedAmount, 0);

  const totalRecebido = payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalCarteiraAtiva = credits
    .filter((c) => c.status === 'desembolsado')
    .reduce((acc, c) => acc + c.remainingBalance, 0);

  const taxaRecuperacao = totalDesembolsado > 0 ? ((totalRecebido / totalDesembolsado) * 100).toFixed(1) : '0';

  const handleDownloadPDFReport = () => {
    generatePortfolioReportPDF(clients, credits, payments);
  };

  const handleDownloadFullExcel = () => {
    exportCompletePortfolioExcel(clients, credits, payments);
  };

  const handleDownloadClientsExcel = () => {
    exportClientsExcel(clients);
  };

  const handleDownloadCreditsExcel = () => {
    exportCreditsExcel(credits);
  };

  const handleDownloadPaymentsExcel = () => {
    exportPaymentsExcel(payments);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>Central de Relatórios Oficiais Bayete (PDF & Excel)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Geração instantânea de relatórios operacionais, contábeis e de desempenho financeiro
        </p>
      </div>

      {/* Primary Report Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PDF Master Report */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-emerald-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Formato PDF
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900">Relatório Geral da Carteira de Microcrédito</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Documento executivo completo contendo resumo institucional, indicadores de solvência, volume desembolsado, total arrecadado e listagem analítica de todos os empréstimos.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Pronto para impressão ou auditoria</span>
            <button
              id="btn-download-pdf-portfolio"
              onClick={handleDownloadPDFReport}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descarregar PDF</span>
            </button>
          </div>
        </div>

        {/* Excel Master Workbook */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-emerald-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Formato Excel (.xlsx)
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900">Livro Contábil Completo Multi-Planilha</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Arquivo com abas separadas contendo: Sumário Executivo, Base de Clientes (com BI e NUIT), Matriz de Microcréditos (com scores de risco) e Histórico de Pagamentos.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Compatível com Excel, LibreOffice e Sheets</span>
            <button
              id="btn-download-excel-portfolio"
              onClick={handleDownloadFullExcel}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descarregar Excel Geral</span>
            </button>
          </div>
        </div>
      </div>

      {/* Specific Excel Exports */}
      <div>
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Exportações Específicas por Módulo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Base de Clientes */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs mb-1">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Base Cadastral de Clientes</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Exporta todos os dados pessoais: Nome, Telemóvel, Email, BI, NUIT, Rendimento e Profissão.
              </p>
            </div>
            <button
              id="btn-export-clients-single"
              onClick={handleDownloadClientsExcel}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Clientes (.xlsx)</span>
            </button>
          </div>

          {/* Mapa de Créditos */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Mapa de Créditos & Análises</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Planilha com propostas, taxas de esforço, scores de risco, saldos abertos e estados operacionais.
              </p>
            </div>
            <button
              id="btn-export-credits-single"
              onClick={handleDownloadCreditsExcel}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Exportar Créditos (.xlsx)</span>
            </button>
          </div>

          {/* Histórico de Pagamentos */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs mb-1">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>Histórico de Pagamentos</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Extrato com recibos, amortizações, datas, formas de pagamento (M-Pesa, Bancos) e responsáveis.
              </p>
            </div>
            <button
              id="btn-export-payments-single"
              onClick={handleDownloadPaymentsExcel}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Exportar Pagamentos (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Summary Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Resumo dos Indicadores Contábeis em Tempo Real</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Capital Total Mutuado</span>
            <span className="font-bold text-white font-mono text-sm">{formatCurrencyMT(totalDesembolsado)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Total Reembolsado</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{formatCurrencyMT(totalRecebido)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Carteira em Cobrança</span>
            <span className="font-bold text-amber-400 font-mono text-sm">{formatCurrencyMT(totalCarteiraAtiva)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Taxa de Cobrança</span>
            <span className="font-bold text-white text-sm">{taxaRecuperacao}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
