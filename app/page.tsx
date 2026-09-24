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
import { UserManagementModal } from '@/components/UserManagementModal';
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
  autoHealMissingCreditsAndPayments,
} from '@/lib/firestore-service';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function BayeteApp() {
  const { user, loading: authLoading, isAdmin, isViewer } = useAuth();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'credits' | 'payments' | 'reports'>('dashboard');

  // Firestore Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [credits, setCredits] = useState<CreditApplication[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [preselectedCreditClientId, setPreselectedCreditClientId] = useState<string | undefined>(undefined);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preselectedPaymentCreditId, setPreselectedPaymentCreditId] = useState<string | undefined>(undefined);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

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
      let [fetchedClients, fetchedCredits, fetchedPayments] = await Promise.all([
        fetchClients(),
        fetchCredits(),
        fetchPayments(),
      ]);

      // If clients exist in Firebase but credits are missing (e.g. from prior runs), synchronize them directly to Firestore
      if (fetchedClients.length > 0 && fetchedCredits.length === 0) {
        console.log('Detectado clientes no Firestore sem propostas salvas. Sincronizando créditos e pagamentos na base de dados...');
        const healed = await autoHealMissingCreditsAndPayments(fetchedClients);
        fetchedCredits = healed.credits;
        fetchedPayments = healed.payments;
      }

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
      showToast('Dados de demonstração gravados e sincronizados com sucesso no Firebase!');
    } catch (err) {
      console.error('Error seeding data:', err);
      showToast('Erro ao carregar dados de demonstração no Firebase.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Client Handlers
  const handleSaveClient = async (clientData: Omit<Client, 'id'>) => {
    if (!isAdmin) {
      showToast('Acesso negado: Apenas o administrador pode criar ou alterar dados de clientes.', 'error');
      return;
    }
    try {
      if (clientToEdit) {
        await updateClientDoc(clientToEdit.id, clientData);
        setClients((prev) => prev.map((c) => (c.id === clientToEdit.id ? { ...c, ...clientData } : c)));
        showToast('Dados do cliente atualizados com sucesso no Firebase!');
      } else {
        const newClient = await addClientDoc(clientData);
        setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
        showToast('Novo cliente cadastrado com sucesso no Firebase!');
      }
      setClientToEdit(null);
    } catch (err: any) {
      console.error('Erro ao guardar cliente:', err);
      showToast(err.message || 'Erro ao guardar cliente na base de dados.', 'error');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!isAdmin) {
      showToast('Acesso negado: Apenas o administrador pode remover clientes.', 'error');
      return;
    }
    try {
      await deleteClientDoc(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      showToast('Cliente removido da base de dados Firebase.');
    } catch (err: any) {
      console.error('Erro ao remover cliente:', err);
      showToast('Erro ao remover cliente do Firebase.', 'error');
    }
  };

  const handleOpenEditClient = (client: Client) => {
    if (!isAdmin) {
      showToast('Apenas o administrador tem permissão para editar dados.', 'error');
      return;
    }
    setClientToEdit(client);
    setIsClientModalOpen(true);
  };

  const handleOpenNewCreditForClient = (clientId: string) => {
    if (!isAdmin) {
      showToast('Apenas o administrador pode criar novas propostas de crédito.', 'error');
      return;
    }
    setPreselectedCreditClientId(clientId);
    setIsCreditModalOpen(true);
  };

  // Credit Handlers (Análise de Crédito)
  const handleSaveCredit = async (creditData: Omit<CreditApplication, 'id'>) => {
    if (!isAdmin) {
      showToast('Acesso negado: Apenas o administrador pode criar propostas de crédito.', 'error');
      return;
    }
    try {
      const newCredit = await addCreditDoc(creditData);
      setCredits((prev) => [newCredit, ...prev.filter((c) => c.id !== newCredit.id)]);
      showToast('Proposta de crédito registada e gravada no Firebase com sucesso!');
    } catch (err: any) {
      console.error('Erro ao registar crédito no Firebase:', err);
      showToast(err.message || 'Erro ao registar proposta no Firebase.', 'error');
      throw err;
    }
  };

  const handleUpdateCreditStatus = async (
    id: string,
    status: CreditApplication['status'],
    notes?: string
  ) => {
    if (!isAdmin) {
      showToast('Acesso negado: Apenas o administrador pode alterar o estado ou aprovar créditos.', 'error');
      return;
    }
    try {
      await updateCreditStatusDoc(id, status, notes);
      setCredits((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, ...(notes ? { analystNotes: notes } : {}) } : c))
      );
      showToast(`Estado do microcrédito alterado para "${status.toUpperCase()}" na base de dados Firebase.`);
    } catch (err: any) {
      console.error('Erro ao atualizar crédito no Firebase:', err);
      showToast('Erro ao atualizar estado na base de dados Firebase.', 'error');
    }
  };

  // Payment Handlers (Pagamentos)
  const handleRecordPayment = async (
    credit: CreditApplication,
    installmentNumber: number,
    amount: number,
    method: PaymentRecord['paymentMethod'],
    notes: string
  ) => {
    if (!isAdmin) {
      showToast('Acesso negado: Apenas o administrador pode registar pagamentos.', 'error');
      throw new Error('Apenas o administrador tem permissão para registar pagamentos.');
    }
    try {
      const result = await recordPaymentDoc(
        credit,
        installmentNumber,
        amount,
        method,
        notes,
        user?.displayName || 'Gestor Bayete'
      );

      setPayments((prev) => [result.payment, ...prev.filter((p) => p.id !== result.payment.id)]);
      setCredits((prev) => prev.map((c) => (c.id === credit.id ? result.updatedCredit : c)));
      showToast(`Pagamento de ${amount} MT registado no Firebase! Recibo: ${result.payment.receiptNumber}`);
      return result;
    } catch (err: any) {
      console.error('Erro ao registar pagamento no Firebase:', err);
      showToast(err.message || 'Erro ao gravar pagamento na base de dados Firebase.', 'error');
      throw err;
    }
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
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenUsersManagement={() => setIsUsersModalOpen(true)}
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
        onOpenUsersManagement={() => setIsUsersModalOpen(true)}
      />

      {/* User Management & RBAC Modal */}
      <UserManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        onSuccessToast={(msg) => showToast(msg, 'success')}
      />
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
