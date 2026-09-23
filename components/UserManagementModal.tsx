'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppUser, UserRole } from '@/types';
import {
  fetchSystemUsers,
  addSystemUser,
  updateSystemUserRole,
  deleteSystemUser,
} from '@/lib/users-service';
import {
  X,
  UserPlus,
  Users,
  ShieldCheck,
  Eye,
  Lock,
  Mail,
  User,
  Phone,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { user: currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer'); // default to read-only as requested
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete confirmation
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const users = await fetchSystemUsers();

      // If list is empty or doesn't have current user, include current user
      if (currentUser && !users.some((u) => u.email.toLowerCase() === currentUser.email?.toLowerCase())) {
        const adminEntry: AppUser = {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Administrador',
          email: currentUser.email || '',
          role: 'admin',
          phoneNumber: currentUser.phoneNumber || null,
          photoURL: currentUser.photoURL || null,
          createdAt: new Date().toISOString(),
          status: 'ativo',
        };
        setUsersList([adminEntry, ...users]);
      } else {
        setUsersList(users);
      }
    } catch (err) {
      console.error('Failed to load users list:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, [currentUser]);

  // Load users on open
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setStatusMessage(null);
    }
  }, [isOpen, loadUsers]);

  const resetForm = () => {
    setDisplayName('');
    setEmail('');
    setPhoneNumber('');
    setPassword('');
    setRole('viewer');
    setShowPassword(false);
    setStatusMessage(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!displayName.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor preencha o nome do novo utilizador.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Por favor forneça um endereço de email válido.' });
      return;
    }
    if (!password.trim() || password.length < 6) {
      setStatusMessage({ type: 'error', text: 'A palavra-passe inicial deve ter no mínimo 6 caracteres.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addSystemUser({
        displayName: displayName.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        phoneNumber: phoneNumber.trim() || undefined,
        createdBy: currentUser?.email || 'admin',
      });

      setUsersList((prev) => [created, ...prev.filter((u) => u.uid !== created.uid)]);
      resetForm();
      const successText =
        role === 'viewer'
          ? `Utilizador "${created.displayName}" adicionado com sucesso em modo de Apenas Leitura!`
          : `Administrador "${created.displayName}" adicionado com sucesso!`;

      setStatusMessage({ type: 'success', text: successText });
      if (onSuccessToast) onSuccessToast(successText);
      setActiveTab('list');
    } catch (err: any) {
      console.error('Error creating user:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Falha ao cadastrar utilizador. Verifique os dados.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRole = async (targetUser: AppUser) => {
    if (targetUser.uid === currentUser?.uid) {
      setStatusMessage({
        type: 'error',
        text: 'Não é possível alterar as permissões da sua própria conta em sessão.',
      });
      return;
    }
    const newRole: UserRole = targetUser.role === 'admin' ? 'viewer' : 'admin';
    try {
      await updateSystemUserRole(targetUser.uid, newRole);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: newRole } : u))
      );
      const roleMsg = `Permissão de "${targetUser.displayName}" alterada para ${
        newRole === 'admin' ? 'Administrador' : 'Apenas Leitura'
      }.`;
      setStatusMessage({ type: 'success', text: roleMsg });
      if (onSuccessToast) onSuccessToast(roleMsg);
    } catch (err: any) {
      console.error('Failed to update user role:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Falha ao atualizar papel.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    if (userToDelete.uid === currentUser?.uid) {
      setStatusMessage({
        type: 'error',
        text: 'Não é permitido remover o seu próprio utilizador em sessão.',
      });
      setUserToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSystemUser(userToDelete.uid);
      setUsersList((prev) => prev.filter((u) => u.uid !== userToDelete.uid));
      const deletedMsg = `Utilizador "${userToDelete.displayName}" removido do sistema.`;
      setStatusMessage({ type: 'success', text: deletedMsg });
      if (onSuccessToast) onSuccessToast(deletedMsg);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Falha ao remover utilizador.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Gestão de Utilizadores</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Segurança RBAC
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Adicione utilizadores de consulta sem permissões para alterar dados ou novos administradores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-slate-50/70">
          <button
            type="button"
            onClick={() => {
              setActiveTab('add');
              setStatusMessage(null);
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'add'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Novo Utilizador</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              setStatusMessage(null);
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'list'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Utilizadores Cadastrados ({usersList.length})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-center space-x-2 mb-5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: ADD USER FORM */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateUser} className="space-y-5">
              {/* Informative Security Callout */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-950">
                    Regra de Acesso e Integridade de Documentos
                  </p>
                  <p className="text-emerald-800/90 leading-relaxed text-[11px]">
                    Utilizadores configurados com o perfil de <strong>Apenas Leitura</strong> podem navegar pelo sistema, visualizar clientes, simulações de crédito, pagamentos e emitir relatórios, <strong>sem permissão para alterar nenhum dado ou criar documentos</strong>. Apenas administradores podem criar documentos no sistema.
                  </p>
                </div>
              </div>

              {/* 1. Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Completo do Utilizador <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Beatriz Nhantumbo"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* 2. Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email de Acesso <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="utilizador@bayetemicrocredito.co.mz"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Número de Telemóvel <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+258 84 000 0000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Palavra-passe Inicial de Acesso <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres (Ex: Bayete@2026)"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Forneça esta palavra-passe ao utilizador para o primeiro acesso ao sistema.
                </p>
              </div>

              {/* 4. Role Selection (RBAC) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Nível de Permissão e Papel <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Read-Only / Viewer Card */}
                  <label
                    className={`relative flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      role === 'viewer'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <Eye className={`w-4 h-4 ${role === 'viewer' ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold text-slate-900">Apenas Leitura</span>
                      </div>
                      <input
                        type="radio"
                        name="user-role"
                        value="viewer"
                        checked={role === 'viewer'}
                        onChange={() => setRole('viewer')}
                        className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full w-fit mb-1">
                      Sem Permissão de Alteração
                    </span>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Pode consultar clientes, créditos e relatórios. <strong>Não pode criar, editar ou apagar nenhum dado</strong>.
                    </p>
                  </label>

                  {/* Admin Card */}
                  <label
                    className={`relative flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className={`w-4 h-4 ${role === 'admin' ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold text-slate-900">Administrador</span>
                      </div>
                      <input
                        type="radio"
                        name="user-role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full w-fit mb-1">
                      Acesso Total • Pode Criar Documentos
                    </span>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Permissão completa para cadastrar clientes, aprovar créditos, amortizações e gerir outros utilizadores.
                    </p>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Adicionar Utilizador</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTERED USERS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por nome ou email..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shrink-0 transition-colors shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Novo Utilizador</span>
                </button>
              </div>

              {isLoadingList ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                  <p className="text-xs">Carregando lista de utilizadores...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Nenhum utilizador encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {filteredUsers.map((u) => {
                    const isSelf = u.uid === currentUser?.uid || u.email.toLowerCase() === currentUser?.email?.toLowerCase();
                    const isUserAdmin = u.role === 'admin';

                    return (
                      <div
                        key={u.uid}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isUserAdmin
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {u.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {u.displayName}
                              </p>
                              {isSelf && (
                                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                  Você
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                            {u.phoneNumber && (
                              <p className="text-[10px] text-slate-400">{u.phoneNumber}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                          {/* Role Badge */}
                          <span
                            className={`inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                              isUserAdmin
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {isUserAdmin ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Administrador</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-amber-600" />
                                <span>Apenas Leitura</span>
                              </>
                            )}
                          </span>

                          {/* Role Toggle Button */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              title={
                                isUserAdmin
                                  ? 'Alterar para Apenas Leitura'
                                  : 'Promover a Administrador'
                              }
                              className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                            >
                              Mudar para {isUserAdmin ? 'Leitor' : 'Admin'}
                            </button>
                          )}

                          {/* Delete Button */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              title="Remover Utilizador"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 text-center mb-1">
                Remover Utilizador?
              </h3>
              <p className="text-xs text-slate-600 text-center mb-4 leading-relaxed">
                Tem a certeza que deseja remover o utilizador <strong>{userToDelete.displayName}</strong> ({userToDelete.email})?
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center space-x-1"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Remover</span>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
