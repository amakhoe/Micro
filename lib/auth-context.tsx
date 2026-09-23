'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AdminProfilePayload {
  displayName: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
}

export type ExtendedUser = User & {
  phoneNumber?: string | null;
  role?: 'admin' | 'viewer';
};

interface AuthContextType {
  user: ExtendedUser | null;
  isAdmin: boolean;
  isViewer: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: (role?: 'gestor' | 'agente') => Promise<void>;
  updateUserProfile: (
    dataOrName: string | AdminProfilePayload,
    legacyPhoto?: string
  ) => Promise<void>;
  changeUserPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  authError: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if there are cached profile attributes in localStorage or Firestore
        let enhancedUser: any = { ...currentUser };
        try {
          const cachedAvatar = localStorage.getItem(`bayete_avatar_${currentUser.uid}`);
          const cachedName = localStorage.getItem(`bayete_name_${currentUser.uid}`);
          const cachedPhone = localStorage.getItem(`bayete_phone_${currentUser.uid}`);
          const cachedEmail = localStorage.getItem(`bayete_email_${currentUser.uid}`);
          
          if (cachedAvatar && !currentUser.photoURL) {
            enhancedUser.photoURL = cachedAvatar;
          }
          if (cachedName && !currentUser.displayName) {
            enhancedUser.displayName = cachedName;
          }
          if (cachedPhone) {
            enhancedUser.phoneNumber = cachedPhone;
          }
          if (cachedEmail) {
            enhancedUser.email = cachedEmail;
          }

          // Try fetching from Firestore user_profiles
          try {
            const profileRef = doc(db, 'user_profiles', currentUser.uid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
              const data = profileSnap.data();
              if (data.photoURL) enhancedUser.photoURL = data.photoURL;
              if (data.displayName) enhancedUser.displayName = data.displayName;
              if (data.phoneNumber) enhancedUser.phoneNumber = data.phoneNumber;
              if (data.email) enhancedUser.email = data.email;
              if (data.role) enhancedUser.role = data.role;
            }
          } catch {
            // Non-blocking Firestore read
          }
        } catch {
          // Ignore localStorage errors
        }
        setUser(enhancedUser);
      } else {
        // Check for active demo user in localStorage
        try {
          const savedDemo = localStorage.getItem('bayete_active_demo_user');
          if (savedDemo) {
            setUser(JSON.parse(savedDemo));
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setAuthError(null);

  const login = async (email: string, pass: string) => {
    setAuthError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !pass) {
      const msg = 'Por favor introduza o seu email e palavra-passe.';
      setAuthError(msg);
      throw new Error(msg);
    }

    try {
      localStorage.removeItem('bayete_active_demo_user');
      let currentUser: User | null = null;

      try {
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        currentUser = userCred.user;
      } catch (signInErr: any) {
        // If user doesn't exist in Auth yet, handle seamless first-time administrator login
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential'
        ) {
          try {
            const createRes = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
            currentUser = createRes.user;
            const defaultName = cleanEmail.split('@')[0];
            await updateProfile(createRes.user, { displayName: defaultName });
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw new Error('Palavra-passe incorreta para este utilizador.');
            }
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      if (!currentUser) throw new Error('Não foi possível obter dados do utilizador.');

      // Fetch user profile data directly from Firestore database
      let enhancedUser: any = {
        ...currentUser,
      };

      try {
        const profileRef = doc(db, 'user_profiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.displayName) enhancedUser.displayName = data.displayName;
          if (data.photoURL) enhancedUser.photoURL = data.photoURL;
          if (data.phoneNumber) enhancedUser.phoneNumber = data.phoneNumber;
          if (data.email) enhancedUser.email = data.email;
          if (data.role) enhancedUser.role = data.role;
        } else {
          // Store initial record in Firestore user_profiles collection
          await setDoc(
            doc(db, 'user_profiles', currentUser.uid),
            {
              displayName: currentUser.displayName || cleanEmail.split('@')[0],
              email: cleanEmail,
              photoURL: currentUser.photoURL || null,
              phoneNumber: null,
              role: 'admin',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn('Erro ao carregar dados do perfil da base de dados:', dbErr);
      }

      setUser(enhancedUser as ExtendedUser);
    } catch (err: any) {
      console.error('Login error:', err);
      let message = err.message || 'Falha ao autenticar. Verifique o email e palavra-passe.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        message = 'Email ou palavra-passe incorretos.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Formato de email inválido.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Autenticação por email e senha não ativada no console Firebase.';
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    setAuthError(null);
    try {
      localStorage.removeItem('bayete_active_demo_user');
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user && name) {
        await updateProfile(res.user, { displayName: name });
        try {
          localStorage.setItem(`bayete_name_${res.user.uid}`, name);
        } catch {}
      }
    } catch (err: any) {
      console.error('Register error:', err);
      let message = 'Não foi possível criar a conta.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Este email já se encontra registado.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  const loginDemo = async (role: 'gestor' | 'agente' = 'gestor') => {
    setAuthError(null);
    const demoEmail = role === 'gestor' ? 'gestor.bayete@microcredito.co.mz' : 'agente.zimpeto@microcredito.co.mz';
    const demoPass = 'Bayete@2026';
    const demoName = role === 'gestor' ? 'Dr. Armando Sitoe (Gestor)' : 'Marta Cumbane (Agente de Crédito)';

    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      localStorage.removeItem('bayete_active_demo_user');
    } catch (err: any) {
      // If doesn't exist, create it on the fly
      try {
        const res = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        await updateProfile(res.user, { displayName: demoName });
        localStorage.removeItem('bayete_active_demo_user');
      } catch (innerErr) {
        // Fallback simulation for quick preview if firebase auth blocks demo signups
        const mockUser: any = {
          uid: 'demo_' + role,
          email: demoEmail,
          displayName: demoName,
          emailVerified: true,
          role: role === 'gestor' ? 'admin' : 'viewer',
          photoURL: role === 'gestor'
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        };
        try {
          // Check if previously updated mock user exists
          const cached = localStorage.getItem(`bayete_demo_${role}_user`);
          if (cached) {
            const parsed = JSON.parse(cached);
            mockUser.displayName = parsed.displayName || mockUser.displayName;
            mockUser.photoURL = parsed.photoURL || mockUser.photoURL;
          }
          localStorage.setItem('bayete_active_demo_user', JSON.stringify(mockUser));
        } catch {}
        setUser(mockUser);
      }
    }
  };

  const updateUserProfile = async (
    dataOrName: string | AdminProfilePayload,
    legacyPhoto?: string
  ) => {
    setAuthError(null);
    if (!user) throw new Error('Nenhum utilizador autenticado');

    const payload: AdminProfilePayload =
      typeof dataOrName === 'string'
        ? { displayName: dataOrName, photoURL: legacyPhoto }
        : dataOrName;

    const cleanName = (payload.displayName || '').trim();
    if (!cleanName) throw new Error('O nome do utilizador não pode estar vazio.');

    const cleanEmail = payload.email?.trim() || user.email || '';
    const cleanPhone = payload.phoneNumber?.trim() || '';
    const photoURL = payload.photoURL;

    try {
      // If current real Firebase auth user
      if (auth.currentUser && !user.uid.startsWith('demo_')) {
        // If photoURL is a data URI or long string, Firebase Auth updateProfile might reject it if >2048 chars
        const isLongUrl = photoURL && photoURL.length > 1500;
        await updateProfile(auth.currentUser, {
          displayName: cleanName,
          photoURL: isLongUrl ? undefined : photoURL,
        });

        // Try updating email in Firebase Auth if changed
        if (cleanEmail && cleanEmail !== user.email) {
          try {
            await updateEmail(auth.currentUser, cleanEmail);
          } catch (emailErr: any) {
            console.warn('Firebase Auth updateEmail notice:', emailErr?.message || emailErr);
          }
        }

        // Store long avatar or custom avatar and profile fields in localStorage
        try {
          if (photoURL) {
            localStorage.setItem(`bayete_avatar_${user.uid}`, photoURL);
          } else {
            localStorage.removeItem(`bayete_avatar_${user.uid}`);
          }
          localStorage.setItem(`bayete_name_${user.uid}`, cleanName);
          if (cleanPhone) localStorage.setItem(`bayete_phone_${user.uid}`, cleanPhone);
          if (cleanEmail) localStorage.setItem(`bayete_email_${user.uid}`, cleanEmail);
        } catch {}

        // Persist in Firestore user_profiles collection
        try {
          await setDoc(
            doc(db, 'user_profiles', user.uid),
            {
              displayName: cleanName,
              photoURL: photoURL || null,
              email: cleanEmail,
              phoneNumber: cleanPhone,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (dbErr) {
          console.warn('Could not save profile in Firestore user_profiles:', dbErr);
        }

        // Update active React user object
        const updatedUser: ExtendedUser = {
          ...auth.currentUser,
          displayName: cleanName,
          email: cleanEmail,
          phoneNumber: cleanPhone,
          photoURL: photoURL !== undefined ? photoURL : auth.currentUser.photoURL,
        } as unknown as ExtendedUser;
        setUser(updatedUser);
      } else {
        // Handle Demo User Profile Updates
        const updatedUser: any = {
          ...user,
          displayName: cleanName,
          email: cleanEmail,
          phoneNumber: cleanPhone,
          photoURL: photoURL !== undefined ? photoURL : (user as any).photoURL,
        };
        try {
          localStorage.setItem('bayete_active_demo_user', JSON.stringify(updatedUser));
          const role = user.uid.replace('demo_', '');
          localStorage.setItem(`bayete_demo_${role}_user`, JSON.stringify(updatedUser));
          if (photoURL) localStorage.setItem(`bayete_avatar_${user.uid}`, photoURL);
          localStorage.setItem(`bayete_name_${user.uid}`, cleanName);
          if (cleanPhone) localStorage.setItem(`bayete_phone_${user.uid}`, cleanPhone);
          if (cleanEmail) localStorage.setItem(`bayete_email_${user.uid}`, cleanEmail);
        } catch {}
        setUser(updatedUser);
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      const msg = err.message || 'Erro ao atualizar perfil do utilizador.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const changeUserPassword = async (newPassword: string, currentPassword?: string) => {
    setAuthError(null);
    if (!user) throw new Error('Nenhum utilizador autenticado');

    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova palavra-passe deve ter no mínimo 6 caracteres.');
    }

    try {
      if (auth.currentUser && !user.uid.startsWith('demo_')) {
        // If current password provided, reauthenticate first to ensure session is fresh
        if (currentPassword && user.email) {
          try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
          } catch (reauthErr: any) {
            console.error('Re-auth error:', reauthErr);
            if (reauthErr.code === 'auth/wrong-password' || reauthErr.code === 'auth/invalid-credential') {
              throw new Error('A palavra-passe atual está incorreta.');
            }
            throw new Error('Não foi possível validar a palavra-passe atual.');
          }
        }

        // Now update password
        try {
          await updatePassword(auth.currentUser, newPassword);
        } catch (pwErr: any) {
          if (pwErr.code === 'auth/requires-recent-login') {
            throw new Error(
              'Por motivos de segurança, esta operação requer confirmação da palavra-passe atual ou um novo início de sessão.'
            );
          }
          throw pwErr;
        }
      } else {
        // Demo user simulation
        try {
          localStorage.setItem(`bayete_demo_pw_${user.uid}`, newPassword);
        } catch {}
      }
    } catch (err: any) {
      console.error('Change password error:', err);
      const msg = err.message || 'Falha ao alterar a palavra-passe.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('bayete_active_demo_user');
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
  };

  const isAdmin = user ? (user.role === 'viewer' ? false : true) : false;
  const isViewer = user ? user.role === 'viewer' : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isViewer,
        loading,
        login,
        register,
        logout,
        loginDemo,
        updateUserProfile,
        changeUserPassword,
        authError,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
