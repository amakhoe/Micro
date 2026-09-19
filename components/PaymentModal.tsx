'use client';

import React, { useState, useEffect } from 'react';
import { CreditApplication, PaymentRecord } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { generatePaymentReceiptPDF } from '@/lib/pdf-generator';
import {
  X,
  CreditCard,
  DollarSign,
  Receipt,
  FileCheck,
  AlertCircle,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: CreditApplication[];
  onRecordPayment: (
    credit: CreditApplication,
    installmentNumber: number,
    amount: number,
    method: PaymentRecord['paymentMethod'],
    notes: string
  ) => Promise<{ payment: PaymentRecord; updatedCredit: CreditApplication }>;
  preselectedCreditId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  credits,
  onRecordPayment,
  preselectedCreditId,
}) => {
  const eligibleCredits = credits.filter(
    (c) => (c.status === 'desembolsado' || c.status === 'aprovado') && c.remainingBalance > 0
  );

  const [selectedCreditId, setSelectedCreditId] = useState<string>(preselectedCreditId || '');
  const [installmentNum, setInstallmentNum] = useState<number>(1);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['paymentMethod']>('m-pesa');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRecordedPayment, setLastRecordedPayment] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    if (preselectedCreditId) {
      setSelectedCreditId(preselectedCreditId);
    } else if (eligibleCredits.length > 0 && !selectedCreditId) {
      setSelectedCreditId(eligibleCredits[0].id);
    }
  }, [preselectedCreditId, eligibleCredits, selectedCreditId]);

  const selectedCredit = eligibleCredits.find((c) => c.id === selectedCreditId);

  // Auto set installment and default amount when selectedCredit changes
  useEffect(() => {
    if (selectedCredit) {
      // Find first pending installment
      const nextPending = selectedCredit.installments.find((i) => i.status === 'pendente');
      if (nextPending) {
        setInstallmentNum(nextPending.number);
        const remainingForInst = nextPending.amount - (nextPending.paidAmount || 0);
        setAmountPaid(remainingForInst.toString());
      } else {
        setInstallmentNum(1);
        setAmountPaid(selectedCredit.monthlyInstallment.toString());
      }
    }
  }, [selectedCredit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCredit) {
      setError('Por favor selecione um crédito ativo.');
      return;
    }

    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor indique um valor de pagamento válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onRecordPayment(
        selectedCredit,
        installmentNum,
        parsedAmount,
        paymentMethod,
        notes.trim()
      );
      setLastRecordedPayment(result.payment);
    } catch (err: any) {
      setError(err.message || 'Erro ao registar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (lastRecordedPayment) {
      generatePaymentReceiptPDF(lastRecordedPayment, selectedCredit);
    }
  };

  const handleFinish = () => {
    setLastRecordedPayment(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4.5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Registo de Pagamento de Parcela</h3>
              <p className="text-[11px] text-slate-300">
                Amortização imediata com emissão de recibo oficial
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen after recording */}
        {lastRecordedPayment ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Pagamento Registado com Sucesso!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Recibo Nº <span className="font-mono font-bold text-slate-800">{lastRecordedPayment.receiptNumber}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Empreendedor:</span>
                <span className="font-semibold text-slate-800">{lastRecordedPayment.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Amortizado:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatCurrencyMT(lastRecordedPayment.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma de Pagamento:</span>
                <span className="font-semibold text-slate-800">{lastRecordedPayment.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parcela:</span>
                <span className="font-semibold text-slate-800">Prestação #{lastRecordedPayment.installmentNumber}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-download-receipt-pdf"
                type="button"
                onClick={handleDownloadReceipt}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descarregar Recibo PDF</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {eligibleCredits.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Não há microcréditos ativos com saldo pendente para pagamento no momento.
              </div>
            ) : (
              <>
                {/* Select Credit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selecionar Crédito em Aberto *
                  </label>
                  <select
                    id="payment-select-credit"
                    value={selectedCreditId}
                    onChange={(e) => setSelectedCreditId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                  >
                    {eligibleCredits.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.clientName} — Saldo: {formatCurrencyMT(cr.remainingBalance)} (Montante: {formatCurrencyMT(cr.requestedAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCredit && (
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5">
                    <div className="flex justify-between font-semibold text-emerald-900">
                      <span>{selectedCredit.clientName}</span>
                      <span>Saldo Total: {formatCurrencyMT(selectedCredit.remainingBalance)}</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 flex justify-between">
                      <span>Total Pago: {formatCurrencyMT(selectedCredit.totalPaid)}</span>
                      <span>Total Previsto: {formatCurrencyMT(selectedCredit.totalRepayment)}</span>
                    </div>
                  </div>
                )}

                {/* Installment selection & Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número da Parcela *
                    </label>
                    <select
                      id="payment-select-installment"
                      value={installmentNum}
                      onChange={(e) => setInstallmentNum(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                    >
                      {selectedCredit?.installments.map((inst) => (
                        <option key={inst.number} value={inst.number}>
                          Parcela {inst.number} — {formatCurrencyMT(inst.amount)} ({inst.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor a Pagar (MT) *
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="payment-input-amount"
                        type="number"
                        required
                        step="10"
                        min="1"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="Ex: 5000"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    id="payment-select-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white font-medium"
                  >
                    <option value="m-pesa">🟢 M-Pesa (Vodacom)</option>
                    <option value="e-mola">🟠 E-Mola (Movitel)</option>
                    <option value="m-kesh">🔵 M-Kesh (Tmcel)</option>
                    <option value="transferencia">🏦 Transferência Bancária (BIM / BCI / Standard Bank)</option>
                    <option value="dinheiro">💵 Dinheiro em Caixa (Balcão Bayete)</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Referência / Observações do Pagamento
                  </label>
                  <input
                    id="payment-input-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: ID de transação M-Pesa ou nº do talão de depósito"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    id="payment-btn-confirm"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-60"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'A Processar...' : 'Confirmar e Emitir Recibo'}</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
