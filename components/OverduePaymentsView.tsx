'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Mail,
  FileSpreadsheet,
  Download,
  Search,
  MessageSquare,
  CreditCard,
  User,
  Phone,
  Clock,
  Calendar,
  DollarSign,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  OverdueInstallment,
  OverdueSummary,
  OverdueSeverity,
  generateClientWhatsAppNotice,
} from '@/lib/overdue-service';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { generateOverdueReportPDF } from '@/lib/pdf-generator';
import { exportOverdueExcel } from '@/lib/excel-generator';

interface OverduePaymentsViewProps {
  overdueList: OverdueInstallment[];
  summary: OverdueSummary;
  onOpenEmailModal: (clientItem?: OverdueInstallment) => void;
  onOpenPaymentModal: (creditId: string) => void;
}

export const OverduePaymentsView: React.FC<OverduePaymentsViewProps> = ({
  overdueList,
  summary,
  onOpenEmailModal,
  onOpenPaymentModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'todas' | OverdueSeverity>('todas');

  // Filtered overdue list
  const filteredList = useMemo(() => {
    return overdueList.filter((item) => {
      const matchesSeverity =
        severityFilter === 'todas' || item.severity === severityFilter;

      const term = searchTerm.toLowerCase();
      const matchesSearch =
        item.clientName.toLowerCase().includes(term) ||
        item.clientBi.toLowerCase().includes(term) ||
        item.clientPhone.toLowerCase().includes(term) ||
        item.creditId.toLowerCase().includes(term) ||
        item.loanPurpose.toLowerCase().includes(term);

      return matchesSeverity && matchesSearch;
    });
  }, [overdueList, searchTerm, severityFilter]);

  const handleDownloadPDF = () => {
    generateOverdueReportPDF(overdueList, summary);
  };

  const handleExportExcel = () => {
    exportOverdueExcel(overdueList);
  };

  const handleOpenWhatsApp = (item: OverdueInstallment) => {
    const cleanPhone = item.clientPhone.replace(/\D/g, '');
    const text = encodeURIComponent(generateClientWhatsAppNotice(item));
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const getSeverityBadge = (severity: OverdueSeverity, days: number) => {
    switch (severity) {
      case 'critico':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>{days} dias (Crítico)</span>
          </span>
        );
      case 'grave':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>{days} dias (Grave)</span>
          </span>
        );
      case 'medio':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{days} dias (Médio)</span>
          </span>
        );
      case 'leve':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{days} dias (Leve)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Pagamentos em Atraso & Cobrança</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              {summary.totalOverdueCount} {summary.totalOverdueCount === 1 ? 'parcela' : 'parcelas'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitorização de parcelas vencidas, cálculo automático de juros de mora e envio de relatórios oficiais
          </p>
        </div>

        {/* Global Export and Email Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-email-report-modal"
            onClick={() => onOpenEmailModal()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Relatório por Email</span>
          </button>

          <button
            id="btn-export-overdue-pdf"
            onClick={handleDownloadPDF}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF de Cobrança</span>
          </button>

          <button
            id="btn-export-overdue-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Capital Vencido */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Capital em Atraso</span>
            <span className="text-xl font-bold text-rose-600 font-mono mt-0.5 block">
              {formatCurrencyMT(summary.totalPrincipalOverdue)}
            </span>
            <span className="text-[10px] text-slate-400">
              +{formatCurrencyMT(summary.totalPenaltyFees)} de multas/mora
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Total a Regularizar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Exigível (Com Mora)</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
              {formatCurrencyMT(summary.totalAmountDue)}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">Valor total a recuperar</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Empreendedores Inadimplentes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Clientes Inadimplentes</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
              {summary.affectedClientsCount}
            </span>
            <span className="text-[10px] text-slate-400">
              {summary.totalOverdueCount} parcelas vencidas
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Risco da Carteira (PAR) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Carteira em Risco (PAR)</span>
            <span className="text-xl font-bold text-indigo-700 font-mono mt-0.5 block">
              {summary.parRate}%
            </span>
            <span className="text-[10px] text-slate-400">Rácio de risco sobre carteira ativa</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Aging Stratification Summary Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>Estratificação Temporal da Inadimplência</span>
          </h2>
          <span className="text-[11px] text-slate-500">Faixas de maturidade do atraso</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setSeverityFilter('leve')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              severityFilter === 'leve'
                ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                : 'border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800">1 a 15 Dias</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {summary.brackets.leve.count}
              </span>
            </div>
            <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
              {formatCurrencyMT(summary.brackets.leve.amount)}
            </span>
            <span className="text-[10px] text-slate-400 block">Lembrete amigável</span>
          </div>

          <div
            onClick={() => setSeverityFilter('medio')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              severityFilter === 'medio'
                ? 'border-amber-600 bg-amber-50/40 ring-1 ring-amber-600'
                : 'border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800">16 a 30 Dias</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                {summary.brackets.medio.count}
              </span>
            </div>
            <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
              {formatCurrencyMT(summary.brackets.medio.amount)}
            </span>
            <span className="text-[10px] text-slate-400 block">Contacto telefónico</span>
          </div>

          <div
            onClick={() => setSeverityFilter('grave')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              severityFilter === 'grave'
                ? 'border-orange-600 bg-orange-50/40 ring-1 ring-orange-600'
                : 'border-slate-200 hover:border-orange-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-orange-800">31 a 60 Dias</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                {summary.brackets.grave.count}
              </span>
            </div>
            <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
              {formatCurrencyMT(summary.brackets.grave.amount)}
            </span>
            <span className="text-[10px] text-slate-400 block">Notificação presencial</span>
          </div>

          <div
            onClick={() => setSeverityFilter('critico')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              severityFilter === 'critico'
                ? 'border-rose-600 bg-rose-50/40 ring-1 ring-rose-600'
                : 'border-slate-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-800">+60 Dias</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                {summary.brackets.critico.count}
              </span>
            </div>
            <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
              {formatCurrencyMT(summary.brackets.critico.amount)}
            </span>
            <span className="text-[10px] text-slate-400 block">Cobrança formal</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-overdue-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por empreendedor, BI, telefone, crédito..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-900"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'todas', label: 'Todas as Faixas' },
            { id: 'leve', label: '1 - 15 Dias' },
            { id: 'medio', label: '16 - 30 Dias' },
            { id: 'grave', label: '31 - 60 Dias' },
            { id: 'critico', label: '+60 Dias' },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setSeverityFilter(b.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                severityFilter === b.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Overdue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Carteira de Parcelas Vencidas ({filteredList.length})
            </h2>
            {severityFilter !== 'todas' && (
              <span className="text-[11px] text-slate-500">
                • Filtrado por {severityFilter}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Ações diretas: Email, WhatsApp e Liquidação imediata
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {overdueList.length === 0
                ? 'Nenhum Pagamento em Atraso na Carteira!'
                : 'Nenhum registo encontrado com este filtro.'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {overdueList.length === 0
                ? 'Excelente desempenho de cobrança. Todos os microcréditos ativos estão dentro dos seus prazos regulares de amortização.'
                : 'Tente alterar os termos de pesquisa ou selecionar outra faixa de vencimento.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Empreendedor / Contacto</th>
                  <th className="py-3 px-4">Parcela & Crédito</th>
                  <th className="py-3 px-4">Data Vencimento</th>
                  <th className="py-3 px-4 text-center">Dias de Atraso</th>
                  <th className="py-3 px-4 text-right">Capital</th>
                  <th className="py-3 px-4 text-right">Multa / Mora</th>
                  <th className="py-3 px-4 text-right">Total Devido</th>
                  <th className="py-3 px-4 text-center">Ações de Cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredList.map((item) => (
                  <tr
                    key={`${item.creditId}-${item.installmentNumber}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Empreendedor */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block text-sm">
                          {item.clientName}
                        </span>
                        <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
                          <span>BI: {item.clientBi}</span>
                          <span>•</span>
                          <span className="font-mono">{item.clientPhone}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[220px]">
                          {item.clientAddress}
                        </span>
                      </div>
                    </td>

                    {/* Parcela & Crédito */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Parcela #{item.installmentNumber} de {item.totalInstallments}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                          {item.loanPurpose}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Saldo Cred: {formatCurrencyMT(item.remainingBalance)}
                        </span>
                      </div>
                    </td>

                    {/* Vencimento */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.dueDate}</span>
                      </div>
                    </td>

                    {/* Dias de Atraso Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getSeverityBadge(item.severity, item.daysOverdue)}
                    </td>

                    {/* Capital */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrencyMT(item.installmentAmount)}
                    </td>

                    {/* Multa / Mora */}
                    <td className="py-3.5 px-4 text-right font-mono text-rose-600 whitespace-nowrap">
                      +{formatCurrencyMT(item.penaltyFee)}
                    </td>

                    {/* Total Devido */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700 text-sm whitespace-nowrap bg-rose-50/40">
                      {formatCurrencyMT(item.totalDue)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Email Notice Button */}
                        <button
                          onClick={() => onOpenEmailModal(item)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                          title="Enviar Aviso de Cobrança por Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp Button */}
                        <button
                          onClick={() => handleOpenWhatsApp(item)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                          title="Enviar Lembrete por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Pay / Settle Button */}
                        <button
                          onClick={() => onOpenPaymentModal(item.creditId)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-sm"
                          title="Dar baixa e registar pagamento desta parcela"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Pagar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Bayete Settlement Channels Reminder */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Procedimento Padrão de Recuperação de Crédito Bayete</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Priorize contactos telefónicos cordiais nos primeiros 15 dias. Todos os recebimentos devem ser amortizados com indicação do número de recibo e forma de pagamento (M-Pesa, E-Mola ou Transferência Bancária).
            </p>
          </div>

          <button
            onClick={() => onOpenEmailModal()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 shadow-md transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Disparar Relatório Geral por Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};
