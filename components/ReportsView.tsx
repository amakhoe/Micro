'use client';

import React, { useState } from 'react';
import { Client, CreditApplication, PaymentRecord, AuditLogRecord } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { generatePortfolioReportPDF } from '@/lib/pdf-generator';
import {
  exportCompletePortfolioExcel,
  exportClientsExcel,
  exportCreditsExcel,
  exportPaymentsExcel,
  exportAuditLogsExcel,
} from '@/lib/excel-generator';
import { AuditLogModal } from '@/components/AuditLogModal';
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
  Clock,
  User,
  ExternalLink,
  Filter,
} from 'lucide-react';

interface ReportsViewProps {
  clients: Client[];
  credits: CreditApplication[];
  payments: PaymentRecord[];
  auditLogs?: AuditLogRecord[];
  onRefreshAuditLogs?: () => Promise<void>;
  onSeedData?: () => void;
  onOpenProfile?: () => void;
  isSeeding?: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  clients,
  credits,
  payments,
  auditLogs = [],
  onRefreshAuditLogs,
}) => {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditTargetFilter, setAuditTargetFilter] = useState<'all' | 'credit' | 'payment'>('all');

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

  const handleDownloadAuditLogsExcel = () => {
    exportAuditLogsExcel(auditLogs);
  };

  const recentFilteredLogs = auditLogs
    .filter((l) => auditTargetFilter === 'all' || l.targetType === auditTargetFilter)
    .slice(0, 5);

  const getBadgeStyle = (actionType: string) => {
    switch (actionType) {
      case 'criacao':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pagamento':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'alteracao_status':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'atualizacao':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'eliminacao':
      case 'estorno':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatLogDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('pt-MZ')} às ${d.toLocaleTimeString('pt-MZ', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>Central de Relatórios & Auditoria Bayete</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Geração instantânea de relatórios operacionais, contábeis e trilha de auditoria no Firebase
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

      {/* Specific Excel Exports including Audit Trail */}
      <div>
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Exportações Específicas por Módulo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Base de Clientes */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs mb-1">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Base de Clientes</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Nome, Telemóvel, Email, BI, NUIT, Rendimento e Profissão.
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
                <span>Mapa de Créditos</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Propostas, taxas de esforço, scores de risco, saldos e estados.
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
                <span>Histórico Pagamentos</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Recibos, amortizações, datas, formas de pagamento e operadores.
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

          {/* Log de Auditoria Firebase */}
          <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-sm flex flex-col justify-between space-y-3 bg-gradient-to-b from-white to-emerald-50/20">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Trilha de Auditoria</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Log completo no Firebase: quem alterou cada crédito ou pagamento, data e tipo de ação.
              </p>
            </div>
            <button
              id="btn-export-audit-single"
              onClick={handleDownloadAuditLogsExcel}
              className="w-full py-1.5 px-3 rounded-lg border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Auditoria (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Firebase Audit Trail Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Log de Auditoria Simplificado no Firebase</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {auditLogs.length} Registos
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rastreamento automático de quem realizou alterações em cada crédito ou pagamento
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAuditTargetFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  auditTargetFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setAuditTargetFilter('credit')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  auditTargetFilter === 'credit' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Créditos
              </button>
              <button
                type="button"
                onClick={() => setAuditTargetFilter('payment')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  auditTargetFilter === 'payment' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pagamentos
              </button>
            </div>

            <button
              type="button"
              id="btn-open-full-audit-modal"
              onClick={() => setIsAuditModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
            >
              <span>Ver Trilha Completa</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Audit Items Preview */}
        <div className="divide-y divide-slate-100">
          {recentFilteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhuma alteração recente registada para o filtro selecionado.
            </div>
          ) : (
            recentFilteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(log.actionType)}`}>
                      {log.actionLabel}
                    </span>
                    {log.targetReference && (
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                        {log.targetReference}
                      </span>
                    )}
                    {log.clientName && (
                      <span className="font-medium text-slate-800">
                        {log.clientName}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs">
                    {log.actionDescription}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-[11px] text-slate-500 shrink-0 gap-1">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-emerald-600" />
                    <span className="font-bold text-slate-800">{log.performedBy}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatLogDate(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
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

      {/* Full Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        filterTargetType={auditTargetFilter === 'all' ? undefined : auditTargetFilter}
        onRefresh={onRefreshAuditLogs}
      />
    </div>
  );
};

