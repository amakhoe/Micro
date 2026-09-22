'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  X,
  Send,
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertTriangle,
  User,
  Eye,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  OverdueInstallment,
  OverdueSummary,
  generateOverdueEmailHTML,
  generateOverdueEmailPlainText,
  generateClientNoticeEmailHTML,
  generateClientNoticePlainText,
  buildOverdueEmailSubject,
} from '@/lib/overdue-service';
import { generateOverdueReportPDF } from '@/lib/pdf-generator';
import { exportOverdueExcel } from '@/lib/excel-generator';
import { useAuth } from '@/lib/auth-context';

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueList: OverdueInstallment[];
  summary: OverdueSummary;
  initialSelectedClient?: OverdueInstallment | null;
  onSuccessToast?: (msg: string) => void;
}

export const EmailReportModal: React.FC<EmailReportModalProps> = ({
  isOpen,
  onClose,
  overdueList,
  summary,
  initialSelectedClient = null,
  onSuccessToast,
}) => {
  const { user } = useAuth();
  const defaultUserEmail = user?.email || 'amakhoekars@gmail.com';

  const [reportType, setReportType] = useState<'executivo' | 'cliente'>(
    initialSelectedClient ? 'cliente' : 'executivo'
  );
  const [selectedClientIndex, setSelectedClientIndex] = useState<number>(0);
  const [recipientEmail, setRecipientEmail] = useState<string>(defaultUserEmail);
  const [customNote, setCustomNote] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'visual' | 'text'>('visual');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Sync selected client when opened with preselection
  useEffect(() => {
    if (initialSelectedClient) {
      setReportType('cliente');
      const idx = overdueList.findIndex(
        (o) =>
          o.creditId === initialSelectedClient.creditId &&
          o.installmentNumber === initialSelectedClient.installmentNumber
      );
      if (idx >= 0) {
        setSelectedClientIndex(idx);
      }
      setRecipientEmail(initialSelectedClient.clientEmail || defaultUserEmail);
    } else {
      setRecipientEmail(defaultUserEmail);
    }
    setSendSuccessMessage(null);
  }, [initialSelectedClient, isOpen, defaultUserEmail, overdueList]);

  // Current active overdue item if in single client mode
  const activeClientItem = useMemo(() => {
    if (overdueList.length === 0) return null;
    return overdueList[selectedClientIndex] || overdueList[0];
  }, [overdueList, selectedClientIndex]);

  // Handle report type change
  const handleTypeChange = (type: 'executivo' | 'cliente') => {
    setReportType(type);
    setSendSuccessMessage(null);
    if (type === 'cliente' && activeClientItem) {
      setRecipientEmail(activeClientItem.clientEmail || defaultUserEmail);
    } else {
      setRecipientEmail(defaultUserEmail);
    }
  };

  // When selected debtor changes in individual mode
  const handleSelectClient = (index: number) => {
    setSelectedClientIndex(index);
    const item = overdueList[index];
    if (item && reportType === 'cliente') {
      setRecipientEmail(item.clientEmail || defaultUserEmail);
    }
  };

  // Generate HTML & Text based on selected mode
  const emailContent = useMemo(() => {
    if (reportType === 'cliente' && activeClientItem) {
      const subject = buildOverdueEmailSubject(summary, 'cliente', activeClientItem.clientName);
      const html = generateClientNoticeEmailHTML(activeClientItem);
      const text = generateClientNoticePlainText(activeClientItem);
      return { subject, html, text };
    } else {
      const subject = buildOverdueEmailSubject(summary, 'executivo');
      const html = generateOverdueEmailHTML(summary, overdueList, {
        recipientName: recipientEmail.split('@')[0],
        customNote,
      });
      const text = generateOverdueEmailPlainText(summary, overdueList, {
        recipientName: recipientEmail.split('@')[0],
        customNote,
      });
      return { subject, html, text };
    }
  }, [reportType, activeClientItem, summary, overdueList, recipientEmail, customNote]);

  if (!isOpen) return null;

  // 1. Send via Server API
  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      alert('Por favor, indique um endereço de email válido.');
      return;
    }

    setIsSending(true);
    setSendSuccessMessage(null);

    try {
      const res = await fetch('/api/send-email-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          reportType: reportType === 'cliente' ? 'aviso_cliente' : 'relatorio_executivo_atrasos',
          clientName: reportType === 'cliente' ? activeClientItem?.clientName : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccessMessage(`Relatório enviado com sucesso para ${recipientEmail}!`);
        if (onSuccessToast) {
          onSuccessToast(`Relatório oficial enviado por email para ${recipientEmail}!`);
        }
      } else {
        alert(data.error || 'Erro ao enviar email.');
      }
    } catch (err) {
      console.error('Email send error:', err);
      alert('Ocorreu um erro ao comunicar com o servidor.');
    } finally {
      setIsSending(false);
    }
  };

  // 2. Open in Native Mail Client (mailto)
  const handleOpenMailClient = () => {
    const encodedSubject = encodeURIComponent(emailContent.subject);
    const encodedBody = encodeURIComponent(emailContent.text);
    window.location.href = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  // 3. Copy text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(emailContent.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // 4. Download PDF
  const handleDownloadPDF = () => {
    generateOverdueReportPDF(overdueList, summary);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Envio de Relatório por Email • Pagamentos em Atraso
              </h2>
              <p className="text-xs text-slate-400">
                Geração de relatórios executivos e avisos formais de cobrança para envio eletrónico
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Notification / Success Banner */}
          {sendSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs font-medium">{sendSuccessMessage}</div>
            </div>
          )}

          {/* Report Type Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('executivo')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                reportType === 'executivo'
                  ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  reportType === 'executivo' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Relatório Executivo de Inadimplência
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                  Para Gestão, Direção ou Auditoria: visão global do PAR, montantes em risco e lista devedores.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('cliente')}
              disabled={overdueList.length === 0}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                overdueList.length === 0
                  ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                  : reportType === 'cliente'
                  ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  reportType === 'cliente' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Aviso de Cobrança ao Empreendedor
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                  Notificação formal com valor da parcela, encargos de mora e coordenadas M-Pesa / Bancos.
                </span>
              </div>
            </button>
          </div>

          {/* Form Settings Strip */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            {/* If Client Mode: Choose which debtor */}
            {reportType === 'cliente' && overdueList.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Selecionar Empreendedor Inadimplente ({overdueList.length} disponíveis):
                </label>
                <select
                  value={selectedClientIndex}
                  onChange={(e) => handleSelectClient(Number(e.target.value))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {overdueList.map((item, idx) => (
                    <option key={`${item.creditId}-${item.installmentNumber}`} value={idx}>
                      {item.clientName} • Parcela #{item.installmentNumber} ({item.daysOverdue} dias atraso) • {item.installmentAmount} MT
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipient Email Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Email do Destinatário:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="ex: gestao@bayete.co.mz ou cliente@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Atalhos Rápidos:</span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setRecipientEmail(defaultUserEmail)}
                    className="px-2.5 py-1.5 text-[11px] rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium truncate max-w-[140px]"
                    title={defaultUserEmail}
                  >
                    Meu Email
                  </button>
                  {reportType === 'cliente' && activeClientItem?.clientEmail && (
                    <button
                      type="button"
                      onClick={() => setRecipientEmail(activeClientItem.clientEmail)}
                      className="px-2.5 py-1.5 text-[11px] rounded bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-emerald-200 font-medium truncate max-w-[140px]"
                      title={activeClientItem.clientEmail}
                    >
                      Email Cliente
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Custom Note (Only for Executive Report) */}
            {reportType === 'executivo' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nota / Instruções Especiais da Gestão (Opcional):
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="ex: 'Prioridade para cobrança telefónica esta semana nas faixas acima de 15 dias.'"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            )}
          </div>

          {/* Email Subject Line Display */}
          <div className="px-3.5 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            <span className="font-bold text-slate-600 mr-2">Assunto do Email:</span>
            <span className="font-mono text-slate-900 font-medium">{emailContent.subject}</span>
          </div>

          {/* Preview Tabs Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pt-1">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPreviewTab('visual')}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  previewTab === 'visual'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pré-visualização do Email Formatado</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('text')}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  previewTab === 'text'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Versão Texto Simples</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 pb-1">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                title="Copiar texto para colar em qualquer cliente de email"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                title="Baixar relatório em PDF oficial"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>PDF Anexo</span>
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            {previewTab === 'visual' ? (
              <div className="p-4 bg-slate-100 max-h-[380px] overflow-y-auto">
                <div
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: emailContent.html }}
                />
              </div>
            ) : (
              <div className="p-4 max-h-[380px] overflow-y-auto bg-slate-900 text-emerald-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {emailContent.text}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Canal Bayete:</span> Envio automático e compatível com clientes de correio externos (Gmail, Outlook, Mail).
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenMailClient}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-sm"
              title="Abre o Gmail/Outlook/Apple Mail configurado no computador ou telemóvel"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Abrir no Mailto</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando Relatório...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Relatório por Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
