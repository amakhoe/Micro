'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Upload,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
  onOpenUsersManagement?: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  onOpenUsersManagement,
}) => {
  const { user, updateUserProfile, changeUserPassword, isAdmin } = useAuth();

  // Exactly the 5 requested fields:
  // 1. Foto de perfil (disposta pelo utilizador)
  const [photoURL, setPhotoURL] = useState('');
  // 2. Nome do utilizador
  const [displayName, setDisplayName] = useState('');
  // 3. Email
  const [email, setEmail] = useState('');
  // 4. Número de telemóvel
  const [phoneNumber, setPhoneNumber] = useState('');
  // 5. Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal is opened
  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.displayName || user.email?.split('@')[0] || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setPhotoURL(user.photoURL || '');
      setPassword('');
      setConfirmPassword('');
      setStatusMessage(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Handle image upload from user's device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, selecione um ficheiro de imagem válido (PNG, JPG, JPEG ou WEBP).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'A imagem selecionada deve ter no máximo 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize to max 320px for fast loading and crisp avatar display
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setPhotoURL(dataUrl);
          setStatusMessage({ type: 'success', text: 'Fotografia carregada com sucesso!' });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStatusMessage({ type: 'success', text: 'Fotografia removida.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const cleanName = displayName.trim();
      const cleanEmail = email.trim();
      const cleanPhone = phoneNumber.trim();

      if (!cleanName) {
        throw new Error('O nome do utilizador é obrigatório.');
      }

      if (!cleanEmail) {
        throw new Error('O email é obrigatório.');
      }

      // 1. Update Profile (Nome, Email, Telemóvel, Foto de Perfil)
      await updateUserProfile({
        displayName: cleanName,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        photoURL: photoURL || undefined,
      });

      // 2. Update Password if provided
      if (password.trim()) {
        if (password.length < 6) {
          throw new Error('A palavra-passe deve ter pelo menos 6 caracteres.');
        }
        if (password !== confirmPassword) {
          throw new Error('A confirmação da palavra-passe não coincide.');
        }
        await changeUserPassword(password.trim());
      }

      const successMsg = 'Perfil do administrador atualizado com sucesso!';
      setStatusMessage({ type: 'success', text: successMsg });
      if (onSuccessToast) onSuccessToast(successMsg);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao guardar dados do perfil.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper initials for preview when no photo is set
  const getInitials = (name?: string | null) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold tracking-tight">Editar Perfil de Administrador</h2>
            <p className="text-xs text-slate-300">
              Gerir dados de identificação, contacto e credenciais
            </p>
          </div>
          <button
            type="button"
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Notification Feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start space-x-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Foto de Perfil (o utilizador quem dispõe) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-2.5">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Foto de Perfil"
                    className="w-18 h-18 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-lg flex items-center justify-center border-2 border-slate-300 shadow-inner">
                    {getInitials(displayName || user?.displayName)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 text-white rounded-full shadow-md hover:bg-emerald-500 transition-colors"
                  title="Carregar fotografia do dispositivo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-upload-admin-photo"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Carregar Foto</span>
                  </button>

                  {photoURL && (
                    <button
                      type="button"
                      id="btn-remove-admin-photo"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Selecione uma fotografia a partir do seu telemóvel ou computador (PNG, JPG ou WEBP).
                </p>
              </div>
            </div>
          </div>

          {/* 2. Nome do Utilizador */}
          <div>
            <label htmlFor="admin-display-name" className="block text-xs font-bold text-slate-800 mb-1.5">
              Nome do Utilizador <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="admin-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Ex: Dr. Armando Sitoe"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* 3. Email */}
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold text-slate-800 mb-1.5">
              Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                id="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="exemplo@microcredito.co.mz"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* 4. Número de Telemóvel */}
          <div>
            <label htmlFor="admin-phone" className="block text-xs font-bold text-slate-800 mb-1.5">
              Número de Telemóvel
            </label>
            <div className="relative">
              <input
                type="tel"
                id="admin-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+258 84 123 4567"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* 5. Password */}
          <div className="space-y-3 pt-1 border-t border-slate-200">
            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (Deixe em branco para manter a atual)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduza a nova palavra-passe"
                  className="w-full px-3.5 py-2.5 pl-10 pr-10 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {password && (
              <div>
                <label htmlFor="admin-confirm-password" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Confirmar Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="admin-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova palavra-passe"
                    className="w-full px-3.5 py-2.5 pl-10 pr-10 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p
                    className={`text-[10px] mt-1 ${
                      confirmPassword === password ? 'text-emerald-600 font-medium' : 'text-rose-500'
                    }`}
                  >
                    {confirmPassword === password
                      ? '✓ As palavras-passe coincidem'
                      : '✕ As palavras-passe não coincidem'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick link to User Management (if Admin) */}
          {isAdmin && onOpenUsersManagement && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Controlo de Utilizadores</p>
                <p className="text-[11px] text-slate-500">Adicionar mais utilizadores no sistema (apenas leitura ou admin)</p>
              </div>
              <button
                type="button"
                id="btn-profile-to-users"
                onClick={() => {
                  onClose();
                  onOpenUsersManagement();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center space-x-1.5 shadow-sm transition-colors shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gerir Utilizadores</span>
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              id="btn-cancel-admin-profile"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-admin-profile"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A guardar...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
