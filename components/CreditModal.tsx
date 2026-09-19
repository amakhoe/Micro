'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Client, CreditApplication } from '@/types';
import { calculateCredit, formatCurrencyMT } from '@/lib/credit-calculator';
import {
  X,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  Briefcase,
  UserCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSave: (creditData: Omit<CreditApplication, 'id'>) => Promise<void>;
  preselectedClientId?: string;
}

export const CreditModal: React.FC<CreditModalProps> = ({
  isOpen,
  onClose,
  clients,
  onSave,
  preselectedClientId,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');
  const [amount, setAmount] = useState<number>(20000);
  const [termMonths, setTermMonths] = useState<number>(3);
  const [interestRate, setInterestRate] = useState<number>(5);
  const [purpose, setPurpose] = useState<string>('Compra de mercadorias e capital de giro');
  const [analystNotes, setAnalystNotes] = useState<string>('');
  const [initialStatus, setInitialStatus] = useState<CreditApplication['status']>('pendente');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    } else if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [preselectedClientId, clients, selectedClientId]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0];
  }, [clients, selectedClientId]);

  const calcResult = useMemo(() => {
    const salary = selectedClient ? selectedClient.salary : 25000;
    return calculateCredit(amount, termMonths, interestRate, salary, new Date());
  }, [amount, termMonths, interestRate, selectedClient]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedClient) {
      setError('Por favor selecione um cliente cadastrado.');
      return;
    }
    if (amount < 1000) {
      setError('O montante mínimo de microcrédito é 1.000 MT.');
      return;
    }
    if (!purpose.trim()) {
      setError('Por favor especifique a finalidade do crédito.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const creditData: Omit<CreditApplication, 'id'> = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        clientEmail: selectedClient.email,
        clientBi: selectedClient.bi,
        clientNuit: selectedClient.nuit,
        clientSalary: selectedClient.salary,
        clientProfession: selectedClient.profession,
        requestedAmount: amount,
        termMonths,
        interestRate,
        purpose: purpose.trim(),
        monthlyInstallment: calcResult.monthlyInstallment,
        totalRepayment: calcResult.totalRepayment,
        totalInterest: calcResult.totalInterest,
        riskAnalysis: calcResult.riskAnalysis,
        status: initialStatus,
        analystNotes: analystNotes.trim(),
        approvedAmount: initialStatus !== 'recusado' ? amount : undefined,
        approvedAt: initialStatus === 'aprovado' || initialStatus === 'desembolsado' ? now : undefined,
        disbursedAt: initialStatus === 'desembolsado' ? now : undefined,
        createdAt: now,
        installments: calcResult.installments,
        totalPaid: 0,
        remainingBalance: calcResult.totalRepayment,
      };

      await onSave(creditData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao submeter proposta de crédito.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'baixo':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'moderado':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'alto':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critico':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Header */}
        <div className="bg-slate-900 px-6 py-4.5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Nova Proposta & Análise de Crédito</h3>
              <p className="text-[11px] text-slate-300">
                Simulador financeiro rápido com análise automatizada de esforço e risco
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Inputs */}
            <div className="lg:col-span-7 space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecionar Empreendedor Registado *
                </label>
                <select
                  id="credit-select-client"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.profession} (BI: {c.bi} | Renda: {formatCurrencyMT(c.salary)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Quick Review Card */}
              {selectedClient && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 block">{selectedClient.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {selectedClient.phone} • BI: {selectedClient.bi} • NUIT: {selectedClient.nuit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Renda Declarada</span>
                    <span className="font-bold text-emerald-700">{formatCurrencyMT(selectedClient.salary)}</span>
                  </div>
                </div>
              )}

              {/* Amount Slider & Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Montante Solicitado (MT) *
                  </label>
                  <span className="font-bold text-sm text-emerald-700 font-mono">
                    {formatCurrencyMT(amount)}
                  </span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="150000"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>2.000 MT</span>
                  <span>50.000 MT</span>
                  <span>100.000 MT</span>
                  <span>150.000 MT</span>
                </div>
              </div>

              {/* Term and Interest Rate in 2 Columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prazo de Pagamento *
                  </label>
                  <select
                    id="credit-term-select"
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                  >
                    <option value={1}>1 Mês (Micro-giro rápido)</option>
                    <option value={2}>2 Meses</option>
                    <option value={3}>3 Meses (Trimestral)</option>
                    <option value={4}>4 Meses</option>
                    <option value={6}>6 Meses (Semestral)</option>
                    <option value={9}>9 Meses</option>
                    <option value={12}>12 Meses (Anual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Taxa de Juro Mensal (%) *
                  </label>
                  <div className="relative">
                    <input
                      id="credit-interest-rate"
                      type="number"
                      step="0.5"
                      min="1"
                      max="25"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400">% / mês</span>
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Finalidade do Microcrédito *
                </label>
                <input
                  id="credit-purpose"
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Ex: Compra de lote de peças de reposição e ferramentas"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>

              {/* Initial Action / Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Decisão Preliminar do Comitê de Crédito
                </label>
                <select
                  id="credit-status-decision"
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                >
                  <option value="pendente">⏳ Submeter para Análise (Pendente)</option>
                  <option value="aprovado">✅ Aprovar Imediatamente (Aprovado)</option>
                  <option value="desembolsado">🚀 Aprovar e Desembolsar Agora (Disponibilizar)</option>
                </select>
              </div>

              {/* Analyst Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parecer do Analista / Justificação
                </label>
                <textarea
                  id="credit-analyst-notes"
                  rows={2}
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  placeholder="Ex: Empreendedor com fluxo comprovado no mercado local. Prazos adequados ao ciclo de vendas."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* Right Column: Dynamic Analysis & Simulation Dashboard */}
            <div className="lg:col-span-5 space-y-4">
              {/* Financial Box */}
              <div className="bg-emerald-950 text-white p-4.5 rounded-xl shadow-md border border-emerald-800">
                <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider block mb-1">
                  Simulação Financeira
                </span>
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <span className="text-2xl font-extrabold text-white">
                      {formatCurrencyMT(calcResult.monthlyInstallment)}
                    </span>
                    <span className="text-xs text-emerald-300 block">por mês ({termMonths}x)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-300 block">Total a Devolver:</span>
                    <span className="text-sm font-bold text-emerald-200">
                      {formatCurrencyMT(calcResult.totalRepayment)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-emerald-400 block">Capital Mutuado:</span>
                    <span className="font-semibold text-white">{formatCurrencyMT(amount)}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 block">Juros Totais ({interestRate}%/mês):</span>
                    <span className="font-semibold text-amber-300">
                      {formatCurrencyMT(calcResult.totalInterest)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk & Effort Engine Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Motor de Análise de Risco</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskBadgeColor(
                      calcResult.riskAnalysis.riskLevel
                    )}`}
                  >
                    {calcResult.riskAnalysis.score} pts • {calcResult.riskAnalysis.riskLevel.toUpperCase()}
                  </span>
                </div>

                {/* Effort Meter */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 font-medium">Taxa de Esforço sobre a Renda:</span>
                    <span
                      className={`font-bold ${
                        calcResult.riskAnalysis.effortRate > 40 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {calcResult.riskAnalysis.effortRate}% (Máx rec.: 35%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        calcResult.riskAnalysis.effortRate > 50
                          ? 'bg-rose-500'
                          : calcResult.riskAnalysis.effortRate > 35
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, calcResult.riskAnalysis.effortRate)}%` }}
                    />
                  </div>
                </div>

                {/* Recommendation Banner */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">Recomendação Automática:</span>
                  <p className="text-slate-900 font-medium">{calcResult.riskAnalysis.recommendation}</p>
                </div>

                {/* Factors List */}
                <div className="space-y-1 text-[11px]">
                  {calcResult.riskAnalysis.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installment preview list */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white max-h-36 overflow-y-auto">
                <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                  Previsão de Parcelas ({calcResult.installments.length})
                </span>
                <div className="space-y-1.5 text-[11px]">
                  {calcResult.installments.map((inst) => (
                    <div
                      key={inst.number}
                      className="flex items-center justify-between py-1 px-2 rounded bg-slate-50 border border-slate-100"
                    >
                      <span className="font-medium text-slate-700">Parcela {inst.number}</span>
                      <span className="text-slate-500 text-[10px]">{inst.dueDate}</span>
                      <span className="font-bold text-slate-900">{formatCurrencyMT(inst.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              id="credit-form-cancel"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              id="credit-form-submit"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'A Gravar...' : 'Confirmar e Criar Microcrédito'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
