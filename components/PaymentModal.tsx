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
  Bell,
  Calendar,
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
    notes: string,
    reminderDate?: string,
    reminderNote?: string,
    reminderStatus?: 'pendente' | 'concluido' | 'cancelado'
  ) => Promise<{ payment: PaymentRecord; updatedCredit: CreditApplication }>;
  preselectedCreditId?: string;
  paymentToEdit?: PaymentRecord | null;
  onUpdatePayment?: (id: string, updates: Partial<PaymentRecord>) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  credits,
  onRecordPayment,
  preselectedCreditId,
  paymentToEdit,
  onUpdatePayment,
}) => {
  const getCreditRemaining = (c: CreditApplication) => {
    if (typeof c.remainingBalance === 'number' && !isNaN(c.remainingBalance)) {
      return c.remainingBalance;
    }
    const total = c.totalRepayment || (c.requestedAmount ? c.requestedAmount * 1.15 : 0);
    const paid = c.totalPaid || 0;
    return Math.max(0, total - paid);
  };

  const eligibleCredits = React.useMemo(() => {
    const list = credits.filter((c) => {
      if (c.status === 'recusado' || c.status === 'liquidado') return false;
      const rem = getCreditRemaining(c);
      return rem > 0 || c.id === preselectedCreditId || c.id === paymentToEdit?.creditId;
    });
    // If no credits meet criteria, fallback to any non-rejected credit
    if (list.length === 0) {
      return credits.filter((c) => c.status !== 'recusado');
    }
    return list;
  }, [credits, preselectedCreditId, paymentToEdit]);

  const [selectedCreditId, setSelectedCreditId] = useState<string>(preselectedCreditId || '');
  const [installmentNum, setInstallmentNum] = useState<number>(1);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['paymentMethod']>('m-pesa');
  const [notes, setNotes] = useState<string>('');
  const [enableReminder, setEnableReminder] = useState<boolean>(false);
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderNote, setReminderNote] = useState<string>('');
  const [reminderStatus, setReminderStatus] = useState<'pendente' | 'concluido' | 'cancelado'>('pendente');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRecordedPayment, setLastRecordedPayment] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    if (paymentToEdit) {
      setSelectedCreditId(paymentToEdit.creditId);
      setInstallmentNum(paymentToEdit.installmentNumber);
      setAmountPaid(paymentToEdit.amountPaid.toString());
      setPaymentMethod(paymentToEdit.paymentMethod);
      setNotes(paymentToEdit.notes || '');
      if (paymentToEdit.reminderDate) {
        setEnableReminder(true);
        setReminderDate(paymentToEdit.reminderDate);
        setReminderNote(paymentToEdit.reminderNote || '');
        setReminderStatus(paymentToEdit.reminderStatus || 'pendente');
      } else {
        setEnableReminder(false);
        setReminderDate('');
        setReminderNote('');
        setReminderStatus('pendente');
      }
    } else if (preselectedCreditId) {
      setSelectedCreditId(preselectedCreditId);
      setAmountPaid('');
      setNotes('');
      setEnableReminder(false);
      setReminderDate('');
      setReminderNote('');
      setReminderStatus('pendente');
    } else if (eligibleCredits.length > 0 && !selectedCreditId) {
      setSelectedCreditId(eligibleCredits[0].id);
      setAmountPaid('');
      setNotes('');
      setEnableReminder(false);
      setReminderDate('');
      setReminderNote('');
      setReminderStatus('pendente');
    }
  }, [paymentToEdit, preselectedCreditId, eligibleCredits, selectedCreditId]);

  const selectedCredit =
    credits.find((c) => c.id === (paymentToEdit ? paymentToEdit.creditId : selectedCreditId)) ||
    eligibleCredits.find((c) => c.id === selectedCreditId) ||
    eligibleCredits[0];

  const currentInstallments = React.useMemo(() => {
    if (selectedCredit?.installments && selectedCredit.installments.length > 0) {
      return selectedCredit.installments;
    }
    const term = selectedCredit?.termMonths || 3;
    const monthlyAmt = selectedCredit?.monthlyInstallment || (selectedCredit ? (selectedCredit.requestedAmount / term) : 2500);
    const baseTime = selectedCredit?.createdAt ? new Date(selectedCredit.createdAt).getTime() : 1775000000000;
    return Array.from({ length: term }, (_, i) => ({
      number: i + 1,
      dueDate: new Date(baseTime + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: monthlyAmt,
      principal: Math.round(monthlyAmt * 0.8),
      interest: Math.round(monthlyAmt * 0.2),
      status: 'pendente' as const,
      paidAmount: 0,
    }));
  }, [selectedCredit]);

  // Auto set installment and default amount when selectedCredit changes in creation mode
  useEffect(() => {
    if (!paymentToEdit && selectedCredit) {
      // Find first pending installment
      const nextPending = currentInstallments.find((i) => i.status === 'pendente') || currentInstallments[0];
      if (nextPending) {
        setInstallmentNum(nextPending.number);
        const remainingForInst = Math.max(0, nextPending.amount - (nextPending.paidAmount || 0));
        setAmountPaid((remainingForInst > 0 ? remainingForInst : nextPending.amount).toString());

        // Suggest reminder for subsequent installment if available
        const subsequentInst = currentInstallments.find((i) => i.number === nextPending.number + 1);
        if (subsequentInst) {
          setReminderDate(subsequentInst.dueDate);
          setReminderNote(`Lembrar ${selectedCredit.clientName} sobre a parcela #${subsequentInst.number} (${formatCurrencyMT(subsequentInst.amount)})`);
        } else {
          setReminderDate('');
          setReminderNote(`Lembrar ${selectedCredit.clientName} sobre a regularização final`);
        }
      } else {
        setInstallmentNum(1);
        setAmountPaid((selectedCredit.monthlyInstallment || 2500).toString());
      }
    }
  }, [paymentToEdit, selectedCredit, currentInstallments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanStr = String(amountPaid).trim().replace(/\s+/g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor indique um valor de pagamento válido (maior que zero).');
      return;
    }

    if (enableReminder && !reminderDate) {
      setError('Por favor indique a data do lembrete de cobrança agendado.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (paymentToEdit && onUpdatePayment) {
        await onUpdatePayment(paymentToEdit.id, {
          amountPaid: parsedAmount,
          paymentMethod,
          installmentNumber: installmentNum,
          notes: notes.trim(),
          reminderDate: enableReminder && reminderDate ? reminderDate : undefined,
          reminderNote: enableReminder && reminderDate ? reminderNote.trim() : undefined,
          reminderStatus: enableReminder && reminderDate ? reminderStatus : undefined,
        });
        onClose();
        return;
      }

      if (!selectedCredit) {
        setError('Por favor selecione um crédito para registar o pagamento.');
        return;
      }

      const result = await onRecordPayment(
        selectedCredit,
        installmentNum,
        parsedAmount,
        paymentMethod,
        notes.trim(),
        enableReminder && reminderDate ? reminderDate : undefined,
        enableReminder && reminderDate ? reminderNote.trim() : undefined,
        enableReminder && reminderDate ? reminderStatus : undefined
      );
      setLastRecordedPayment(result.payment);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento.');
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
              <h3 className="font-bold text-base text-white">
                {paymentToEdit ? 'Editar Registo de Pagamento' : 'Registo de Pagamento de Parcela'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {paymentToEdit
                  ? `Recibo Nº ${paymentToEdit.receiptNumber} • ${paymentToEdit.clientName}`
                  : 'Amortização imediata com emissão de recibo oficial'}
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
                        {cr.clientName} — Saldo: {formatCurrencyMT(getCreditRemaining(cr))} (Montante: {formatCurrencyMT(cr.requestedAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCredit && (
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5">
                    <div className="flex justify-between font-semibold text-emerald-900">
                      <span>{selectedCredit.clientName}</span>
                      <span>Saldo Total: {formatCurrencyMT(getCreditRemaining(selectedCredit))}</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 flex justify-between">
                      <span>Total Pago: {formatCurrencyMT(selectedCredit.totalPaid || 0)}</span>
                      <span>Total Previsto: {formatCurrencyMT(selectedCredit.totalRepayment || (selectedCredit.requestedAmount * 1.15))}</span>
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
                      {currentInstallments.map((inst) => (
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
                        step="any"
                        min="1"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="Ex: 2890 ou 1239"
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

                {/* Agendamento de Lembrete de Cobrança Futuro */}
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="payment-toggle-reminder"
                      className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer select-none"
                    >
                      <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <span>Agendar Lembrete de Cobrança Futuro</span>
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="payment-toggle-reminder"
                        type="checkbox"
                        checked={enableReminder}
                        onChange={(e) => setEnableReminder(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {enableReminder && (
                    <div className="space-y-2.5 pt-2 border-t border-amber-200/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label htmlFor="payment-reminder-date" className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Data do Lembrete *
                          </label>
                          <div className="relative">
                            <input
                              id="payment-reminder-date"
                              type="date"
                              required={enableReminder}
                              value={reminderDate}
                              onChange={(e) => setReminderDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="payment-reminder-status" className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Estado do Lembrete
                          </label>
                          <select
                            id="payment-reminder-status"
                            value={reminderStatus}
                            onChange={(e) => setReminderStatus(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 bg-white"
                          >
                            <option value="pendente">🟡 Pendente (A Notificar)</option>
                            <option value="concluido">🟢 Concluído (Notificado)</option>
                            <option value="cancelado">⚪ Cancelado</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="payment-reminder-note" className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nota / Mensagem do Lembrete
                        </label>
                        <textarea
                          id="payment-reminder-note"
                          rows={2}
                          value={reminderNote}
                          onChange={(e) => setReminderNote(e.target.value)}
                          placeholder="Ex: Contactar cliente via WhatsApp sobre a regularização da próxima parcela"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 bg-white resize-none"
                        />
                        <p className="text-[10px] text-amber-800/80 mt-0.5">
                          O alerta ficará disponível no painel de cobranças e na listagem de pagamentos.
                        </p>
                      </div>
                    </div>
                  )}
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
                    <span>
                      {isSubmitting
                        ? 'A Processar...'
                        : paymentToEdit
                        ? 'Guardar Alterações'
                        : 'Confirmar e Emitir Recibo'}
                    </span>
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
