'use client';

import React, { useState, useMemo } from 'react';
import { PaymentRecord, CreditApplication } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { exportPaymentsExcel } from '@/lib/excel-generator';
import { generatePaymentReceiptPDF } from '@/lib/pdf-generator';
import {
  CreditCard,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Receipt,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  ArrowDownRight,
} from 'lucide-react';

interface PaymentsViewProps {
  payments: PaymentRecord[];
  credits: CreditApplication[];
  onOpenNewPayment: (creditId?: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  credits,
  onOpenNewPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('todos');

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesMethod = methodFilter === 'todos' || p.paymentMethod === methodFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        p.clientName.toLowerCase().includes(term) ||
        p.receiptNumber.toLowerCase().includes(term) ||
        p.creditId.toLowerCase().includes(term) ||
        (p.notes && p.notes.toLowerCase().includes(term));
      return matchesMethod && matchesSearch;
    });
  }, [payments, searchTerm, methodFilter]);

  const totalArrecadado = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amountPaid, 0);
  }, [payments]);

  const activeCreditsToPay = useMemo(() => {
    return credits.filter((c) => c.status === 'desembolsado' && c.remainingBalance > 0);
  }, [credits]);

  const handleExportExcel = () => {
    exportPaymentsExcel(payments);
  };

  const handleDownloadReceipt = (payment: PaymentRecord) => {
    const cred = credits.find((c) => c.id === payment.creditId);
    generatePaymentReceiptPDF(payment, cred);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'm-pesa':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">🟢 M-Pesa</span>;
      case 'e-mola':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">🟠 E-Mola</span>;
      case 'm-kesh':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">🔵 M-Kesh</span>;
      case 'transferencia':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">🏦 Banco</span>;
      case 'dinheiro':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">💵 Caixa</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>Gestão de Pagamentos & Cobrança ({payments.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registo de amortizações, liquidação de parcelas e emissão de recibos oficiais
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            id="btn-export-payments-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Pagamentos Excel</span>
          </button>

          <button
            id="btn-open-new-payment-modal"
            onClick={() => onOpenNewPayment()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registar Pagamento</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total de Recebimentos</span>
            <span className="text-xl font-bold text-emerald-700 font-mono mt-0.5 block">
              {formatCurrencyMT(totalArrecadado)}
            </span>
            <span className="text-[10px] text-slate-400">{payments.length} transações liquidadas</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Créditos com Cobrança Ativa</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
              {activeCreditsToPay.length}
            </span>
            <span className="text-[10px] text-slate-400">Empreendedores com saldo em aberto</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Formas de Pagamento Aceites</span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">
              M-Pesa • E-Mola • M-Kesh • Banco
            </span>
            <span className="text-[10px] text-emerald-600">Liquidação imediata de saldo</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Pay Box for Active Loans */}
      {activeCreditsToPay.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Empréstimos Ativos a Aguardar Pagamento ({activeCreditsToPay.length})</span>
            </h2>
            <span className="text-[11px] text-slate-500">Clique para dar baixa rápida</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeCreditsToPay.map((c) => {
              const pendingInst = c.installments.find((i) => i.status === 'pendente') || c.installments[0];
              return (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">{c.clientName}</span>
                    <span className="text-[11px] text-slate-500 block">
                      Próxima: Parcela #{pendingInst?.number} ({pendingInst?.dueDate})
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 font-mono">
                      Saldo: {formatCurrencyMT(c.remainingBalance)}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenNewPayment(c.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors shadow-sm"
                  >
                    Pagar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-payments-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por cliente, recibo nº, notas..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
          />
        </div>

        <div className="flex items-center space-x-1 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'todos', label: 'Todos os Métodos' },
            { id: 'm-pesa', label: 'M-Pesa' },
            { id: 'e-mola', label: 'E-Mola' },
            { id: 'transferencia', label: 'Bancos' },
            { id: 'dinheiro', label: 'Dinheiro' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethodFilter(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                methodFilter === m.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Histórico Oficial de Pagamentos & Recibos
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            {filteredPayments.length} registos encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Recibo Nº</th>
                <th className="py-3 px-4">Empreendedor</th>
                <th className="py-3 px-4">Parcela</th>
                <th className="py-3 px-4">Forma de Pagamento</th>
                <th className="py-3 px-4 text-right">Valor Pago (MT)</th>
                <th className="py-3 px-4">Data do Pagamento</th>
                <th className="py-3 px-4 text-right">Recibo PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                    {p.receiptNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 block">{p.clientName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Crédito ID: {p.creditId.slice(0, 8)}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    Prestação #{p.installmentNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    {getMethodBadge(p.paymentMethod)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-xs">
                    {formatCurrencyMT(p.amountPaid)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                    {new Date(p.paymentDate).toLocaleString('pt-MZ')}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDownloadReceipt(p)}
                      title="Descarregar Recibo Oficial em PDF"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-medium transition-colors"
                    >
                      <Download className="w-3 h-3 text-emerald-600" />
                      <span>Recibo PDF</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum pagamento registado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
