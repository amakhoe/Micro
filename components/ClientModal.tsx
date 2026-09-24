'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/types';
import { X, Save, User, Phone, Mail, MapPin, FileText, Briefcase, DollarSign, AlertCircle } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id'>) => Promise<void>;
  clientToEdit?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clientToEdit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bi, setBi] = useState('');
  const [nuit, setNuit] = useState('');
  const [salary, setSalary] = useState('');
  const [profession, setProfession] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Client['status']>('ativo');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setPhone(clientToEdit.phone);
      setEmail(clientToEdit.email || '');
      setAddress(clientToEdit.address);
      setBi(clientToEdit.bi);
      setNuit(clientToEdit.nuit);
      setSalary(clientToEdit.salary.toString());
      setProfession(clientToEdit.profession);
      setNotes(clientToEdit.notes || '');
      setStatus(clientToEdit.status);
    } else {
      setName('');
      setPhone('+258 ');
      setEmail('');
      setAddress('');
      setBi('');
      setNuit('');
      setSalary('');
      setProfession('');
      setNotes('');
      setStatus('ativo');
    }
    setError(null);
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor indique o nome completo do cliente.');
      return;
    }
    if (!phone.trim() || phone.trim() === '+258') {
      setError('Por favor indique o número de telemóvel do cliente.');
      return;
    }
    if (!address.trim()) {
      setError('Por favor indique a residência / bairro do cliente.');
      return;
    }
    if (!bi.trim()) {
      setError('Por favor indique o número de BI (Bilhete de Identidade).');
      return;
    }
    if (!nuit.trim()) {
      setError('Por favor indique o NUIT do cliente.');
      return;
    }
    const parsedSalary = parseFloat(salary);
    if (isNaN(parsedSalary) || parsedSalary <= 0) {
      setError('Por favor indique um salário ou renda mensal válido em Meticais (MT).');
      return;
    }
    if (!profession.trim()) {
      setError('Por favor indique a profissão ou ramo de atividade do pequeno negócio.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        bi: bi.trim().toUpperCase(),
        nuit: nuit.trim(),
        salary: parsedSalary,
        profession: profession.trim(),
        notes: notes.trim(),
        status,
        createdAt: clientToEdit?.createdAt || new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar dados do cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const professionSuggestions = [
    'Comércio Informal / Banca de Mercado',
    'Alfaiataria e Costura de Capulanas',
    'Carpintaria e Móveis de Madeira',
    'Oficina Mecânica de Motos e Carros',
    'Mercearia de Bairro',
    'Panificação e Pastelaria Comunitária',
    'Venda de Peixe e Frutos do Mar',
    'Agropecuária e Hortícolas',
    'Barbearia e Salão de Beleza',
    'Serviços Elétricos e Eletrônicos',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4.5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {clientToEdit ? 'Editar Cadastro de Empreendedor' : 'Registo de Novo Cliente'}
              </h3>
              <p className="text-[11px] text-slate-300">
                Cadastro completo para concessão de microcrédito rápido
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Completo do Cliente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="client-form-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Esperança Mabunda"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* NR de Telemóvel */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NR de Telemóvel
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="client-form-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+258 84 XXX XXXX"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="client-form-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* BI */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de BI (Bilhete de Identidade) *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="client-form-bi"
                  type="text"
                  required
                  value={bi}
                  onChange={(e) => setBi(e.target.value)}
                  placeholder="Ex: 110100482914B"
                  className="w-full pl-9 pr-3 py-2 text-xs uppercase rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* NUIT */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de NUIT (Fiscal) *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="client-form-nuit"
                  type="text"
                  required
                  value={nuit}
                  onChange={(e) => setNuit(e.target.value)}
                  placeholder="Ex: 109823451"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Salário / Renda Mensal Declarada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Salário / Faturação Líquida Mensal (MT) *
              </label>
              <div className="relative">
                <input
                  id="client-form-salary"
                  type="number"
                  required
                  min="500"
                  step="100"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="Ex: 30000 MZN"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Base para cálculo da capacidade de pagamento e taxa de esforço
              </p>
            </div>

            {/* Estado do Cadastro */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Cadastral</label>
              <select
                id="client-form-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
              >
                <option value="ativo">Ativo (Apto para crédito)</option>
                <option value="em_analise">Em Análise Documental</option>
                <option value="bloqueado">Restrito / Bloqueado</option>
              </select>
            </div>

            {/* Profissão */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profissão / Ramo de Atividade do Negócio *
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="client-form-profession"
                  type="text"
                  required
                  list="profession-list"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Ex: Comércio de Frutas e Legumes no Zimpeto"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
                <datalist id="profession-list">
                  {professionSuggestions.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Residência */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residência (Bairro, Quarteirão, Cidade / Província) *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="client-form-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Bairro Chamanculo C, Rua 12, Maputo"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* Notas adicionais */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações / Informações do Estabelecimento Local
              </label>
              <textarea
                id="client-form-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Ponto de venda fixo há 4 anos. Movimentação regular diária..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              id="client-form-cancel"
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              id="client-form-save"
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'A Guardar no Firebase...' : 'Guardar Empreendedor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
