'use client';

import React, { useState, useMemo } from 'react';
import { CreditApplication, Client } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { exportCreditsExcel } from '@/lib/excel-generator';
import { generateLoanAgreementPDF } from '@/lib/pdf-generator';
import {
  TrendingUp,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Send,
  XCircle,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
} from 'lucide-react';

interface CreditAnalysisViewProps {
  credits: CreditApplication[];
  clients: Client[];
  onOpenNewCredit: () => void;
  onUpdateCreditStatus: (
    id: string,
    status: CreditApplication['status'],
    notes?: string
  ) => Promise<void>;
  onOpenPaymentForCredit: (creditId: string) => void;
}

export const CreditAnalysisView: React.FC<CreditAnalysisViewProps> = ({
  credits,
  clients,
  onOpenNewCredit,
  onUpdateCreditStatus,
  onOpenPaymentForCredit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'desembolsado' | 'liquidado' | 'recusado'>('todos');
  const [expandedCreditId, setExpandedCreditId] = useState<string | null>(null);

  const filteredCredits = useMemo(() => {
    return credits.filter((cr) => {
      const matchesStatus = statusFilter === 'todos' || cr.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        cr.clientName.toLowerCase().includes(term) ||
        cr.clientBi.toLowerCase().includes(term) ||
        cr.clientPhone.toLowerCase().includes(term) ||
        cr.purpose.toLowerCase().includes(term) ||
        cr.id.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [credits, searchTerm, statusFilter]);

  const handleExportExcel = () => {
    exportCreditsExcel(credits);
  };

  const handleExportPDF = (credit: CreditApplication) => {
    generateLoanAgreementPDF(credit);
  };

  const getRiskBadge = (riskLevel: string, score: number) => {
    switch (riskLevel) {
      case 'baixo':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            {score} pts • Baixo Risco
          </span>
        );
      case 'moderado':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {score} pts • Moderado
          </span>
        );
      case 'alto':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
            {score} pts • Alto Risco
          </span>
        );
      case 'critico':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            {score} pts • Crítico
          </span>
        );
    }
  };

  const getStatusBadge = (status: CreditApplication['status']) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-300 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Em Análise</span>
          </span>
        );
      case 'aprovado':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-300 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Aprovado</span>
          </span>
        );
      case 'desembolsado':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center space-x-1">
            <Send className="w-3 h-3" />
            <span>Ativo / Desembolsado</span>
          </span>
        );
      case 'liquidado':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-300 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Liquidado</span>
          </span>
        );
      case 'recusado':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-300 flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Recusado</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Análise de Crédito & Gestão de Empréstimos ({credits.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Avaliação de solvência, taxa de esforço, emissão de contratos e ciclo de aprovação
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            id="btn-export-credits-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            id="btn-new-credit-proposal"
            onClick={onOpenNewCredit}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Proposta de Crédito</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-credits-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por cliente, BI, telemóvel, finalidade..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
          />
        </div>

        <div className="flex items-center space-x-1 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['todos', 'pendente', 'aprovado', 'desembolsado', 'liquidado', 'recusado'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'todos'
                ? 'Todos'
                : st === 'pendente'
                ? 'Em Análise'
                : st === 'aprovado'
                ? 'Aprovados'
                : st === 'desembolsado'
                ? 'Ativos'
                : st === 'liquidado'
                ? 'Liquidados'
                : 'Recusados'}
            </button>
          ))}
        </div>
      </div>

      {/* Credits Card List */}
      <div className="space-y-3.5">
        {filteredCredits.map((cr) => {
          const isExpanded = expandedCreditId === cr.id;
          return (
            <div
              key={cr.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all overflow-hidden"
            >
              {/* Summary Bar */}
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-sm text-slate-900">{cr.clientName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Ref: {cr.id.slice(0, 8)}</span>
                      {getRiskBadge(cr.riskAnalysis.riskLevel, cr.riskAnalysis.score)}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {cr.clientProfession} • BI: {cr.clientBi} • Contacto: {cr.clientPhone}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">Finalidade:</span> {cr.purpose}
                    </p>
                  </div>
                </div>

                {/* Financial Callout & Status */}
                <div className="flex items-center justify-between md:justify-end space-x-4">
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 font-mono block">
                      {formatCurrencyMT(cr.requestedAmount)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {cr.termMonths} meses ({cr.interestRate}%/m) • Prest.: {formatCurrencyMT(cr.monthlyInstallment)}
                    </span>
                    {cr.status === 'desembolsado' && (
                      <span className="text-[10.5px] font-medium text-amber-700 block">
                        Saldo: {formatCurrencyMT(cr.remainingBalance)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-1.5">
                    {getStatusBadge(cr.status)}

                    <button
                      onClick={() => setExpandedCreditId(isExpanded ? null : cr.id)}
                      className="text-[11px] text-slate-500 hover:text-emerald-700 font-medium flex items-center space-x-1"
                    >
                      <span>{isExpanded ? 'Ocultar detalhes' : 'Ver análise & parcelas'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Toolbar on the Card */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Taxa de Esforço:</span>
                  <span
                    className={`font-bold ${
                      cr.riskAnalysis.effortRate > 40 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {cr.riskAnalysis.effortRate}% da Renda Mensal
                  </span>
                  <span>•</span>
                  <span>Submetido em {new Date(cr.createdAt).toLocaleDateString('pt-MZ')}</span>
                </div>

                {/* Workflow Buttons */}
                <div className="flex items-center space-x-1.5">
                  {/* Download Contract PDF */}
                  <button
                    onClick={() => handleExportPDF(cr)}
                    title="Baixar Contrato e Cronograma em PDF"
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition-colors"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Contrato PDF</span>
                  </button>

                  {/* If Pending -> Approve or Reject */}
                  {cr.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => onUpdateCreditStatus(cr.id, 'aprovado')}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Aprovar</span>
                      </button>
                      <button
                        onClick={() => onUpdateCreditStatus(cr.id, 'recusado', 'Risco incompatível')}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-medium transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Recusar</span>
                      </button>
                    </>
                  )}

                  {/* If Approved -> Disburse */}
                  {cr.status === 'aprovado' && (
                    <button
                      onClick={() => onUpdateCreditStatus(cr.id, 'desembolsado')}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Desembolsar / Ativar</span>
                    </button>
                  )}

                  {/* If Disbursed -> Register Payment */}
                  {cr.status === 'desembolsado' && (
                    <button
                      onClick={() => onOpenPaymentForCredit(cr.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>Registar Pagamento</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Deep Analysis & Installments Schedule */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-4">
                  {/* Risk analysis highlights */}
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center space-x-1.5 mb-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Parecer da Análise de Crédito</span>
                      </h4>
                      <p className="text-slate-700 font-medium">{cr.riskAnalysis.recommendation}</p>
                      <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                        {cr.riskAnalysis.factors.map((f, i) => (
                          <div key={i} className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-slate-100 md:pl-4 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Renda Declarada:</span>
                        <span className="font-semibold text-slate-800">{formatCurrencyMT(cr.clientSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Prestação Máx. Recomendada:</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrencyMT(cr.riskAnalysis.maxRecommendedInstallment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total com Juros ({cr.termMonths} meses):</span>
                        <span className="font-bold text-slate-900">{formatCurrencyMT(cr.totalRepayment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Já Amortizado:</span>
                        <span className="font-bold text-emerald-700">{formatCurrencyMT(cr.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Saldo Devedor Restante:</span>
                        <span className="font-bold text-amber-700">{formatCurrencyMT(cr.remainingBalance)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amortization Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2">
                      Cronograma de Amortização das Prestações ({cr.installments.length})
                    </h4>
                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10.5px] uppercase font-semibold">
                            <th className="py-2 px-3">Parcela</th>
                            <th className="py-2 px-3">Vencimento</th>
                            <th className="py-2 px-3 text-right">Capital</th>
                            <th className="py-2 px-3 text-right">Juro</th>
                            <th className="py-2 px-3 text-right">Total Parcela</th>
                            <th className="py-2 px-3 text-center">Estado</th>
                            <th className="py-2 px-3 text-right">Pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cr.installments.map((inst) => (
                            <tr key={inst.number} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-semibold text-slate-800">Prestação #{inst.number}</td>
                              <td className="py-2 px-3 text-slate-600 text-[11px]">{inst.dueDate}</td>
                              <td className="py-2 px-3 text-right text-slate-700 font-mono">
                                {formatCurrencyMT(inst.principal)}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-700 font-mono">
                                {formatCurrencyMT(inst.interest)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                                {formatCurrencyMT(inst.amount)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                                    inst.status === 'pago'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {inst.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                                {inst.paidAmount ? formatCurrencyMT(inst.paidAmount) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCredits.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            Nenhuma operação de crédito encontrada para os critérios selecionados.
          </div>
        )}
      </div>
    </div>
  );
};
