'use client';

import React, { useState, useMemo } from 'react';
import { AuditLogRecord } from '@/types';
import {
  ShieldCheck,
  Search,
  Filter,
  X,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogRecord[];
  filterTargetType?: 'credit' | 'payment' | 'client';
  filterTargetId?: string;
  title?: string;
  subtitle?: string;
  onRefresh?: () => Promise<void>;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  filterTargetType,
  filterTargetId,
  title = 'Log de Auditoria & Rastreabilidade Firebase',
  subtitle = 'Registo imutável de todas as alterações efetuadas em créditos e pagamentos',
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'payment' | 'client'>(
    filterTargetType || 'all'
  );
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by targetId if specified (e.g. specific credit)
      if (filterTargetId && log.targetId !== filterTargetId) {
        return false;
      }

      // Filter by targetType
      if (typeFilter !== 'all' && log.targetType !== typeFilter) {
        return false;
      }

      // Filter by actionType
      if (actionFilter !== 'all' && log.actionType !== actionFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesClient = log.clientName?.toLowerCase().includes(term);
        const matchesUser = log.performedBy.toLowerCase().includes(term);
        const matchesEmail = log.performedByEmail?.toLowerCase().includes(term);
        const matchesRef = log.targetReference?.toLowerCase().includes(term);
        const matchesDesc = log.actionDescription.toLowerCase().includes(term);
        const matchesLabel = log.actionLabel.toLowerCase().includes(term);

        if (!matchesClient && !matchesUser && !matchesEmail && !matchesRef && !matchesDesc && !matchesLabel) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filterTargetId, typeFilter, actionFilter, searchTerm]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'criacao':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'pagamento':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'alteracao_status':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'atualizacao':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'eliminacao':
      case 'estorno':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
        };
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Data N/D';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('pt-MZ')} às ${d.toLocaleTimeString('pt-MZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`;
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Firebase Firestore
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Atualizar registos do Firebase"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por utilizador, cliente, recibo ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todos ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('credit')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors flex items-center space-x-1 ${
                  typeFilter === 'credit'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Créditos</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('payment')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors flex items-center space-x-1 ${
                  typeFilter === 'payment'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3 h-3" />
                <span>Pagamentos</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('client')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors flex items-center space-x-1 ${
                  typeFilter === 'client'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Clientes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Nenhum registo de auditoria encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Todas as novas propostas criadas, aprovações, pagamentos amortizados e alterações no sistema são automaticamente registados no Firebase com identificação do utilizador e data.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.actionType);
                return (
                  <div
                    key={log.id}
                    className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{log.actionLabel}</span>
                        </span>

                        {log.targetReference && (
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {log.targetReference}
                          </span>
                        )}

                        {log.clientName && (
                          <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                            • {log.clientName}
                          </span>
                        )}
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="font-medium">{formatDate(log.timestamp)}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-800 leading-relaxed font-normal">
                      {log.actionDescription}
                    </p>

                    {/* Footer with PerformedBy info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="text-slate-600">Realizado por:</span>
                        <span className="font-bold text-slate-900">{log.performedBy}</span>
                        {log.performedByEmail && (
                          <span className="text-slate-400 font-mono text-[10px]">
                            ({log.performedByEmail})
                          </span>
                        )}
                        {log.performedByRole && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {log.performedByRole}
                          </span>
                        )}
                      </div>

                      {log.amount && log.amount > 0 && (
                        <div className="font-mono text-xs font-bold text-emerald-700">
                          {log.amount.toLocaleString('pt-MZ')} MT
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <div>
            Total de registos:{' '}
            <span className="font-bold text-slate-900">{filteredLogs.length}</span> de{' '}
            <span className="font-bold text-slate-900">{logs.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
