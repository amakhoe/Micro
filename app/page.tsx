'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/Sidebar';
import { AuthModal } from '@/components/AuthModal';
import { DashboardView } from '@/components/DashboardView';
import { ClientsView } from '@/components/ClientsView';
import { CreditAnalysisView } from '@/components/CreditAnalysisView';
import { PaymentsView } from '@/components/PaymentsView';
import { ReportsView } from '@/components/ReportsView';
import { ClientModal } from '@/components/ClientModal';
import { CreditModal } from '@/components/CreditModal';
import { PaymentModal } from '@/components/PaymentModal';
import { AdminProfileModal } from '@/components/AdminProfileModal';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import {
  fetchClients,
  addClientDoc,
  updateClientDoc,
  deleteClientDoc,
  fetchCredits,
  addCreditDoc,
  updateCreditStatusDoc,
  fetchPayments,
  recordPaymentDoc,
  seedInitialData,
  clearAllSystemData,
} from '@/lib/firestore-service';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';

function BayeteApp() {
  const { user, loading: authLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'credits' | 'payments' | 'reports'>('dashboard');

  // Firestore Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [credits, setCredits] = useState<CreditApplication[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [preselectedCreditClientId, setPreselectedCreditClientId] = useState<string | undefined>(undefined);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preselectedPaymentCreditId, setPreselectedPaymentCreditId] = useState<string | undefined>(undefined);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Data from Firebase
  const loadAppData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [fetchedClients, fetchedCredits, fetchedPayments] = await Promise.all([
        fetchClients(),
        fetchCredits(),
        fetchPayments(),
      ]);

      setClients(fetchedClients);
      setCredits(fetchedCredits);
      setPayments(fetchedPayments);
    } catch (err) {
      console.error('Error loading Firestore data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAppData();
    }
  }, [user, loadAppData]);

  // Seed Data Handler
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const seeded = await seedInitialData();
      setClients(seeded.clients);
      setCredits(seeded.credits);
      setPayments(seeded.payments);
      showToast('Dados de demonstração carregados com sucesso no Firebase!');
    } catch (err) {
      console.error('Error seeding data:', err);
      showToast('Erro ao carregar dados de demonstração.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Clear All System Data Handler
  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await clearAllSystemData();
      setClients([]);
      setCredits([]);
      setPayments([]);
      showToast('Todas as informações foram removidas com sucesso! O sistema está pronto para novos dados.', 'info');
    } catch (err) {
      console.error('Error clearing system data:', err);
      showToast('Erro ao remover informações do sistema.', 'error');
    } finally {
      setIsClearing(false);
      setIsClearConfirmOpen(false);
    }
  };

  // Client Handlers
  const handleSaveClient = async (clientData: Omit<Client, 'id'>) => {
    if (clientToEdit) {
      await updateClientDoc(clientToEdit.id, clientData);
      setClients((prev) => prev.map((c) => (c.id === clientToEdit.id ? { ...c, ...clientData } : c)));
      showToast('Dados do empreendedor atualizados com sucesso!');
    } else {
      const newClient = await addClientDoc(clientData);
      setClients((prev) => [newClient, ...prev]);
      showToast('Novo empreendedor cadastrado com sucesso no Firebase!');
    }
    setClientToEdit(null);
  };

  const handleDeleteClient = async (id: string) => {
    await deleteClientDoc(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    showToast('Empreendedor removido da base de dados.');
  };

  const handleOpenEditClient = (client: Client) => {
    setClientToEdit(client);
    setIsClientModalOpen(true);
  };

  const handleOpenNewCreditForClient = (clientId: string) => {
    setPreselectedCreditClientId(clientId);
    setIsCreditModalOpen(true);
  };

  // Credit Handlers
  const handleSaveCredit = async (creditData: Omit<CreditApplication, 'id'>) => {
    const newCredit = await addCreditDoc(creditData);
    setCredits((prev) => [newCredit, ...prev]);
    showToast('Proposta de microcrédito registada com sucesso!');
  };

  const handleUpdateCreditStatus = async (
    id: string,
    status: CreditApplication['status'],
    notes?: string
  ) => {
    await updateCreditStatusDoc(id, status, notes);
    setCredits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, ...(notes ? { analystNotes: notes } : {}) } : c))
    );
    showToast(`Estado do microcrédito alterado para "${status.toUpperCase()}".`);
  };

  // Payment Handlers
  const handleRecordPayment = async (
    credit: CreditApplication,
    installmentNumber: number,
    amount: number,
    method: PaymentRecord['paymentMethod'],
    notes: string
  ) => {
    const result = await recordPaymentDoc(
      credit,
      installmentNumber,
      amount,
      method,
      notes,
      user?.displayName || 'Gestor Bayete'
    );

    setPayments((prev) => [result.payment, ...prev]);
    setCredits((prev) => prev.map((c) => (c.id === credit.id ? result.updatedCredit : c)));
    showToast(`Pagamento de ${amount} MT registado! Recibo: ${result.payment.receiptNumber}`);
    return result;
  };

  const handleOpenPaymentForCredit = (creditId: string) => {
    setPreselectedPaymentCreditId(creditId);
    setIsPaymentModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">A carregar sistema Bayete Microcrédito...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Toast notification banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border text-xs font-medium flex items-center space-x-2.5 ${
              toastMessage.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : toastMessage.type === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-emerald-900 text-emerald-100 border-emerald-700'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Sidebar (Desktop fixed left & Mobile header/drawer) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenNewClient={() => {
          setClientToEdit(null);
          setIsClientModalOpen(true);
        }}
        onOpenNewCredit={() => {
          setPreselectedCreditClientId(undefined);
          setIsCreditModalOpen(true);
        }}
        onSeedData={handleSeedData}
        onClearAllData={() => setIsClearConfirmOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isSeeding={isSeeding}
        hasData={clients.length > 0 || credits.length > 0 || payments.length > 0}
        clientsCount={clients.length}
        creditsCount={credits.length}
        paymentsCount={payments.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoadingData ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs">Sincronizando base de dados Firebase...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                clients={clients}
                credits={credits}
                payments={payments}
                onOpenNewClient={() => {
                  setClientToEdit(null);
                  setIsClientModalOpen(true);
                }}
                onOpenNewCredit={() => {
                  setPreselectedCreditClientId(undefined);
                  setIsCreditModalOpen(true);
                }}
                onOpenNewPayment={() => {
                  setPreselectedPaymentCreditId(undefined);
                  setIsPaymentModalOpen(true);
                }}
                onOpenPaymentForCredit={handleOpenPaymentForCredit}
                onNavigateTab={setCurrentTab}
                onOpenProfile={() => setIsProfileModalOpen(true)}
              />
            )}

            {currentTab === 'clients' && (
              <ClientsView
                clients={clients}
                credits={credits}
                onOpenNewClient={() => {
                  setClientToEdit(null);
                  setIsClientModalOpen(true);
                }}
                onEditClient={handleOpenEditClient}
                onDeleteClient={handleDeleteClient}
                onNewCreditForClient={handleOpenNewCreditForClient}
              />
            )}

            {currentTab === 'credits' && (
              <CreditAnalysisView
                credits={credits}
                clients={clients}
                onOpenNewCredit={() => {
                  setPreselectedCreditClientId(undefined);
                  setIsCreditModalOpen(true);
                }}
                onUpdateCreditStatus={handleUpdateCreditStatus}
                onOpenPaymentForCredit={handleOpenPaymentForCredit}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                payments={payments}
                credits={credits}
                onOpenNewPayment={(creditId) => {
                  setPreselectedPaymentCreditId(creditId);
                  setIsPaymentModalOpen(true);
                }}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                clients={clients}
                credits={credits}
                payments={payments}
                onClearAllData={() => setIsClearConfirmOpen(true)}
                onSeedData={handleSeedData}
                onOpenProfile={() => setIsProfileModalOpen(true)}
                isSeeding={isSeeding}
              />
            )}
          </>
        )}
      </main>
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setClientToEdit(null);
        }}
        onSave={handleSaveClient}
        clientToEdit={clientToEdit}
      />

      <CreditModal
        isOpen={isCreditModalOpen}
        onClose={() => {
          setIsCreditModalOpen(false);
          setPreselectedCreditClientId(undefined);
        }}
        clients={clients}
        onSave={handleSaveCredit}
        preselectedClientId={preselectedCreditClientId}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPreselectedPaymentCreditId(undefined);
        }}
        credits={credits}
        onRecordPayment={handleRecordPayment}
        preselectedCreditId={preselectedPaymentCreditId}
      />

      {/* Admin Profile & Credentials Modal */}
      <AdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccessToast={(msg) => showToast(msg, 'success')}
      />

      {/* Clear Database Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              Remover Todas as Informações?
            </h3>

            <p className="text-xs text-slate-600 text-center leading-relaxed mb-6">
              Esta ação apagará permanentemente todos os cadastros de empreendedores, análises de microcrédito e registos de pagamentos da base de dados Firebase. O sistema ficará completamente limpo para inserção dos seus novos dados.
            </p>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                id="btn-cancel-clear"
                onClick={() => setIsClearConfirmOpen(false)}
                disabled={isClearing}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-clear"
                onClick={handleClearAllData}
                disabled={isClearing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-colors flex items-center justify-center space-x-1.5"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Limpando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Limpar Tudo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <BayeteApp />
    </AuthProvider>
  );
}
