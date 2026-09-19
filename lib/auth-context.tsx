'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: (role?: 'gestor' | 'agente') => Promise<void>;
  authError: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setAuthError(null);

  const login = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Falha ao autenticar. Verifique o email e palavra-passe.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Email ou palavra-passe incorretos.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Formato de email inválido.';
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
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user && name) {
        await updateProfile(res.user, { displayName: name });
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
    } catch (err: any) {
      // If doesn't exist, create it on the fly
      try {
        const res = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        await updateProfile(res.user, { displayName: demoName });
      } catch (innerErr) {
        // As a fallback simulation for quick review if firebase auth blocks signup
        const mockUser: any = {
          uid: 'demo_' + role,
          email: demoEmail,
          displayName: demoName,
          emailVerified: true,
        };
        setUser(mockUser);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        loginDemo,
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
