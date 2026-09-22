'use client';

import React, { useState, useMemo } from 'react';
import { Client, CreditApplication } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';
import { exportClientsExcel } from '@/lib/excel-generator';
import { generateClientFilePDF } from '@/lib/pdf-generator';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Edit2,
  Trash2,
  Filter,
  DollarSign,
  Briefcase,
  ExternalLink,
  Download,
} from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  credits: CreditApplication[];
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => Promise<void>;
  onNewCreditForClient: (clientId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  credits,
  onOpenNewClient,
  onEditClient,
  onDeleteClient,
  onNewCreditForClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'em_analise' | 'bloqueado'>('todos');
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(term) ||
        c.bi.toLowerCase().includes(term) ||
        c.nuit.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.profession.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [clients, searchTerm, statusFilter]);

  const handleExportExcel = () => {
    exportClientsExcel(clients);
  };

  const handleExportPDF = (client: Client) => {
    const clientCredits = credits.filter((cr) => cr.clientId === client.id);
    generateClientFilePDF(client, clientCredits);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Registo de Clientes ({clients.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro cadastral completo: BI, NUIT, contacto, residência, rendimento e profissão
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            id="btn-export-clients-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            id="btn-add-new-client"
            onClick={onOpenNewClient}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-clients-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, BI, NUIT, telemóvel, profissão..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
          />
        </div>

        <div className="flex items-center space-x-1 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['todos', 'ativo', 'em_analise', 'bloqueado'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'todos' ? 'Todos' : st === 'ativo' ? 'Ativos' : st === 'em_analise' ? 'Em Análise' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Empreendedor / Contacto</th>
                <th className="py-3 px-4">BI & NUIT</th>
                <th className="py-3 px-4">Profissão & Negócio</th>
                <th className="py-3 px-4">Residência / Bairro</th>
                <th className="py-3 px-4 text-right">Renda Mensal (MT)</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => {
                const clientCredits = credits.filter((cr) => cr.clientId === client.id);
                return (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Nome, telemóvel e email */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs">{client.name}</div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                      {client.email && (
                        <div className="flex items-center space-x-1 text-[10.5px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{client.email}</span>
                        </div>
                      )}
                    </td>

                    {/* BI e NUIT */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block">BI:</span>
                        <span className="font-semibold text-slate-800">{client.bi}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 text-[10px] uppercase block">NUIT:</span>
                        <span className="text-slate-600">{client.nuit}</span>
                      </div>
                    </td>

                    {/* Profissão */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800 block text-xs">{client.profession}</span>
                      <span className="text-[10px] text-slate-400">
                        {clientCredits.length} microcrédito(s)
                      </span>
                    </td>

                    {/* Residência */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px]">
                      <div className="flex items-start space-x-1 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    </td>

                    {/* Salário / Rendimento */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900 font-mono text-xs block">
                        {formatCurrencyMT(client.salary)}
                      </span>
                      <span className="text-[10px] text-emerald-600">Capacidade ativa</span>
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          client.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : client.status === 'em_analise'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        {client.status === 'ativo' ? 'Ativo' : client.status === 'em_analise' ? 'Em Análise' : 'Bloqueado'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Nova proposta de crédito */}
                        <button
                          onClick={() => onNewCreditForClient(client.id)}
                          title="Solicitar Novo Microcrédito"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Ficha PDF */}
                        <button
                          onClick={() => handleExportPDF(client)}
                          title="Descarregar Ficha Cadastral em PDF"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => onEditClient(client)}
                          title="Editar Dados do Empreendedor"
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Tem a certeza que deseja remover o cadastro de ${client.name}?`)) {
                              onDeleteClient(client.id);
                            }
                          }}
                          title="Remover Cliente"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum cliente encontrado com os filtros selecionados.
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
