import {
  collection,
  getDocs,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import { INITIAL_CLIENTS, generateSeedCreditsAndPayments } from './initial-data';

export const CLIENTS_COLLECTION = 'clients';
export const CREDITS_COLLECTION = 'credits';
export const PAYMENTS_COLLECTION = 'payments';

/**
 * Deeply sanitizes any object or array to remove undefined fields,
 * which Firebase Firestore strictly rejects with Unsupported field value: undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as any;
  }
  return data;
}

// Memory caches to provide instantaneous UI updates
let memoryClients: Client[] = [];
let memoryCredits: CreditApplication[] = [];
let memoryPayments: PaymentRecord[] = [];

// ==========================================
// CLIENTS
// ==========================================

export async function fetchClients(): Promise<Client[]> {
  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const clients: Client[] = [];
    snapshot.forEach((d) => {
      clients.push({ id: d.id, ...d.data() } as Client);
    });
    // Sort in memory by createdAt descending
    clients.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    memoryClients = clients;
    return clients;
  } catch (error) {
    console.error('Erro ao obter clientes do Firestore:', error);
    return memoryClients;
  }
}

export async function addClientDoc(client: Omit<Client, 'id'>): Promise<Client> {
  const newClientData = sanitizeForFirestore({
    ...client,
    createdAt: client.createdAt || new Date().toISOString(),
  });

  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    const docRef = await addDoc(colRef, newClientData);
    const created: Client = { id: docRef.id, ...newClientData };
    memoryClients = [created, ...memoryClients.filter((c) => c.id !== created.id)];
    return created;
  } catch (error) {
    console.error('Erro ao adicionar cliente no Firestore:', error);
    throw error;
  }
}

export async function updateClientDoc(id: string, updates: Partial<Client>): Promise<void> {
  const cleanUpdates = sanitizeForFirestore(updates);
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await updateDoc(docRef, cleanUpdates);
    memoryClients = memoryClients.map((c) => (c.id === id ? { ...c, ...cleanUpdates } : c));
  } catch (error) {
    console.error('Erro ao atualizar cliente no Firestore:', error);
    throw error;
  }
}

export async function deleteClientDoc(id: string): Promise<void> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await deleteDoc(docRef);
    memoryClients = memoryClients.filter((c) => c.id !== id);
  } catch (error) {
    console.error('Erro ao eliminar cliente no Firestore:', error);
    throw error;
  }
}

// ==========================================
// CREDITS (ANÁLISE DE CRÉDITO)
// ==========================================

export async function fetchCredits(): Promise<CreditApplication[]> {
  try {
    const colRef = collection(db, CREDITS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const credits: CreditApplication[] = [];
    snapshot.forEach((d) => {
      credits.push({ id: d.id, ...d.data() } as CreditApplication);
    });
    // Sort in memory by createdAt descending
    credits.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    memoryCredits = credits;
    return credits;
  } catch (error) {
    console.error('Erro ao obter propostas de crédito do Firestore:', error);
    return memoryCredits;
  }
}

export async function addCreditDoc(credit: Omit<CreditApplication, 'id'>): Promise<CreditApplication> {
  const newCreditData = sanitizeForFirestore({
    ...credit,
    createdAt: credit.createdAt || new Date().toISOString(),
  });

  try {
    const colRef = collection(db, CREDITS_COLLECTION);
    const docRef = await addDoc(colRef, newCreditData);
    const created: CreditApplication = { id: docRef.id, ...newCreditData };
    memoryCredits = [created, ...memoryCredits.filter((c) => c.id !== created.id)];
    return created;
  } catch (error) {
    console.error('Erro crítico ao gravar proposta de crédito no Firestore:', error);
    throw error;
  }
}

export async function updateCreditStatusDoc(
  id: string,
  status: CreditApplication['status'],
  notes?: string,
  approvedAmount?: number
): Promise<void> {
  const updates: Partial<CreditApplication> = {
    status,
    ...(notes !== undefined && notes !== '' ? { analystNotes: notes } : {}),
    ...(approvedAmount !== undefined ? { approvedAmount } : {}),
    ...(status === 'aprovado' ? { approvedAt: new Date().toISOString() } : {}),
    ...(status === 'desembolsado' ? { disbursedAt: new Date().toISOString() } : {}),
  };

  const cleanUpdates = sanitizeForFirestore(updates);

  try {
    const docRef = doc(db, CREDITS_COLLECTION, id);
    await setDoc(docRef, cleanUpdates, { merge: true });
    memoryCredits = memoryCredits.map((c) => (c.id === id ? { ...c, ...cleanUpdates } : c));
  } catch (error) {
    console.error('Erro ao atualizar estado do crédito no Firestore:', error);
    throw error;
  }
}

// ==========================================
// PAYMENTS (PAGAMENTOS)
// ==========================================

export async function fetchPayments(): Promise<PaymentRecord[]> {
  try {
    const colRef = collection(db, PAYMENTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const payments: PaymentRecord[] = [];
    snapshot.forEach((d) => {
      payments.push({ id: d.id, ...d.data() } as PaymentRecord);
    });
    // Sort in memory by paymentDate or createdAt descending
    payments.sort((a, b) =>
      (b.paymentDate || b.createdAt || '').localeCompare(a.paymentDate || a.createdAt || '')
    );
    memoryPayments = payments;
    return payments;
  } catch (error) {
    console.error('Erro ao obter histórico de pagamentos do Firestore:', error);
    return memoryPayments;
  }
}

export async function recordPaymentDoc(
  credit: CreditApplication,
  installmentNumber: number,
  amountPaid: number,
  paymentMethod: PaymentRecord['paymentMethod'],
  notes: string = '',
  recordedBy: string = 'Agente Bayete'
): Promise<{ payment: PaymentRecord; updatedCredit: CreditApplication }> {
  const receiptNumber = `BYT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();

  const newPaymentData: Omit<PaymentRecord, 'id'> = {
    creditId: credit.id,
    clientId: credit.clientId,
    clientName: credit.clientName,
    installmentNumber,
    amountPaid,
    paymentDate: now,
    paymentMethod,
    receiptNumber,
    notes: notes || '',
    recordedBy: recordedBy || 'Gestor Bayete',
    createdAt: now,
  };

  const cleanPaymentData = sanitizeForFirestore(newPaymentData);

  // Update credit installments and balances
  const updatedInstallments = (credit.installments || []).map((inst) => {
    if (inst.number === installmentNumber) {
      const alreadyPaid = inst.paidAmount || 0;
      const newTotalForInst = alreadyPaid + amountPaid;
      return {
        ...inst,
        paidAmount: newTotalForInst,
        paidAt: now,
        paymentMethod,
        paymentRef: receiptNumber,
        status: (newTotalForInst >= inst.amount ? 'pago' : 'pendente') as 'pago' | 'pendente',
      };
    }
    return inst;
  });

  const newTotalPaid = (credit.totalPaid || 0) + amountPaid;
  const newRemaining = Math.max(0, (credit.totalRepayment || 0) - newTotalPaid);
  const isFullySettled = newRemaining <= 0;

  const creditUpdates: Partial<CreditApplication> = {
    installments: updatedInstallments,
    totalPaid: newTotalPaid,
    remainingBalance: newRemaining,
    ...(isFullySettled ? { status: 'liquidado' } : {}),
  };

  const cleanCreditUpdates = sanitizeForFirestore(creditUpdates);

  try {
    // 1. Add payment record to 'payments' collection in Firestore
    const payCol = collection(db, PAYMENTS_COLLECTION);
    const payRef = await addDoc(payCol, cleanPaymentData);
    const savedPayment: PaymentRecord = { id: payRef.id, ...cleanPaymentData };

    // 2. Update the parent credit in 'credits' collection in Firestore
    const credRef = doc(db, CREDITS_COLLECTION, credit.id);
    await setDoc(credRef, cleanCreditUpdates, { merge: true });

    const updatedCredit: CreditApplication = {
      ...credit,
      ...cleanCreditUpdates,
    };

    memoryPayments = [savedPayment, ...memoryPayments];
    memoryCredits = memoryCredits.map((c) => (c.id === credit.id ? updatedCredit : c));

    return { payment: savedPayment, updatedCredit };
  } catch (error) {
    console.error('Erro crítico ao gravar pagamento no Firestore:', error);
    throw error;
  }
}

// ==========================================
// SEEDING & AUTO-SYNCHRONIZATION WITH FIRESTORE
// ==========================================

export async function seedInitialData(): Promise<{
  clients: Client[];
  credits: CreditApplication[];
  payments: PaymentRecord[];
}> {
  const createdClients: Client[] = [];
  const createdCredits: CreditApplication[] = [];
  const createdPayments: PaymentRecord[] = [];

  // 1. Write clients to Firestore
  for (const clientData of INITIAL_CLIENTS) {
    const cleanClient = sanitizeForFirestore(clientData);
    try {
      const colRef = collection(db, CLIENTS_COLLECTION);
      const docRef = await addDoc(colRef, cleanClient);
      createdClients.push({ id: docRef.id, ...cleanClient });
    } catch (err) {
      console.error('Erro ao semear cliente:', err);
    }
  }

  // 2. Generate and write credits to Firestore using real client Firestore IDs
  const { credits } = generateSeedCreditsAndPayments(createdClients);

  for (const cred of credits) {
    const cleanCredit = sanitizeForFirestore(cred);
    try {
      const colRef = collection(db, CREDITS_COLLECTION);
      const docRef = await addDoc(colRef, cleanCredit);
      const fullCredit: CreditApplication = { id: docRef.id, ...cleanCredit };
      createdCredits.push(fullCredit);

      // 3. For any paid installments in this credit, create corresponding payment records in Firestore
      for (const inst of fullCredit.installments || []) {
        if (inst.status === 'pago' && inst.paidAmount && inst.paidAmount > 0) {
          const payDoc: Omit<PaymentRecord, 'id'> = {
            creditId: fullCredit.id,
            clientId: fullCredit.clientId,
            clientName: fullCredit.clientName,
            installmentNumber: inst.number,
            amountPaid: inst.paidAmount,
            paymentDate: inst.paidAt || fullCredit.createdAt,
            paymentMethod: (inst.paymentMethod as PaymentRecord['paymentMethod']) || 'm-pesa',
            receiptNumber: inst.paymentRef || `BYT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
            notes: `Amortização regular da parcela ${inst.number}`,
            recordedBy: 'Agente Bayete',
            createdAt: inst.paidAt || fullCredit.createdAt,
          };
          const cleanPay = sanitizeForFirestore(payDoc);
          try {
            const payCol = collection(db, PAYMENTS_COLLECTION);
            const payRef = await addDoc(payCol, cleanPay);
            createdPayments.push({ id: payRef.id, ...cleanPay });
          } catch (payErr) {
            console.error('Erro ao semear pagamento:', payErr);
          }
        }
      }
    } catch (credErr) {
      console.error('Erro ao semear crédito:', credErr);
    }
  }

  // Update memory caches
  memoryClients = createdClients;
  memoryCredits = createdCredits;
  memoryPayments = createdPayments;

  return { clients: createdClients, credits: createdCredits, payments: createdPayments };
}

/**
 * If the database already has clients but 0 credits or 0 payments
 * (e.g. from previous sessions where credits/payments failed to save to Firestore),
 * this function automatically populates and synchronizes the missing credits and payments into Firestore!
 */
export async function autoHealMissingCreditsAndPayments(
  existingClients: Client[]
): Promise<{ credits: CreditApplication[]; payments: PaymentRecord[] }> {
  if (existingClients.length === 0) {
    return { credits: [], payments: [] };
  }

  const createdCredits: CreditApplication[] = [];
  const createdPayments: PaymentRecord[] = [];

  const { credits } = generateSeedCreditsAndPayments(existingClients);

  for (const cred of credits) {
    const cleanCredit = sanitizeForFirestore(cred);
    try {
      const colRef = collection(db, CREDITS_COLLECTION);
      const docRef = await addDoc(colRef, cleanCredit);
      const fullCredit: CreditApplication = { id: docRef.id, ...cleanCredit };
      createdCredits.push(fullCredit);

      // Create payments for paid installments
      for (const inst of fullCredit.installments || []) {
        if (inst.status === 'pago' && inst.paidAmount && inst.paidAmount > 0) {
          const payDoc: Omit<PaymentRecord, 'id'> = {
            creditId: fullCredit.id,
            clientId: fullCredit.clientId,
            clientName: fullCredit.clientName,
            installmentNumber: inst.number,
            amountPaid: inst.paidAmount,
            paymentDate: inst.paidAt || fullCredit.createdAt,
            paymentMethod: (inst.paymentMethod as PaymentRecord['paymentMethod']) || 'm-pesa',
            receiptNumber: inst.paymentRef || `BYT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
            notes: `Amortização regular da parcela ${inst.number}`,
            recordedBy: 'Agente Bayete',
            createdAt: inst.paidAt || fullCredit.createdAt,
          };
          const cleanPay = sanitizeForFirestore(payDoc);
          try {
            const payCol = collection(db, PAYMENTS_COLLECTION);
            const payRef = await addDoc(payCol, cleanPay);
            createdPayments.push({ id: payRef.id, ...cleanPay });
          } catch (payErr) {
            console.error('Erro ao gravar pagamento sincronizado:', payErr);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao gravar crédito sincronizado no Firestore:', err);
    }
  }

  memoryCredits = createdCredits;
  memoryPayments = createdPayments;

  return { credits: createdCredits, payments: createdPayments };
}

// ==========================================
// CLEAR ALL SYSTEM DATA FROM FIRESTORE
// ==========================================

export async function clearAllSystemData(): Promise<void> {
  // Clear clients collection
  try {
    const clientsCol = collection(db, CLIENTS_COLLECTION);
    const clientsSnap = await getDocs(clientsCol);
    for (const d of clientsSnap.docs) {
      await deleteDoc(doc(db, CLIENTS_COLLECTION, d.id));
    }
  } catch (err) {
    console.error('Erro ao limpar clientes do Firestore:', err);
  }

  // Clear credits collection
  try {
    const creditsCol = collection(db, CREDITS_COLLECTION);
    const creditsSnap = await getDocs(creditsCol);
    for (const d of creditsSnap.docs) {
      await deleteDoc(doc(db, CREDITS_COLLECTION, d.id));
    }
  } catch (err) {
    console.error('Erro ao limpar créditos do Firestore:', err);
  }

  // Clear payments collection
  try {
    const payCol = collection(db, PAYMENTS_COLLECTION);
    const paySnap = await getDocs(payCol);
    for (const d of paySnap.docs) {
      await deleteDoc(doc(db, PAYMENTS_COLLECTION, d.id));
    }
  } catch (err) {
    console.error('Erro ao limpar pagamentos do Firestore:', err);
  }

  memoryClients = [];
  memoryCredits = [];
  memoryPayments = [];
}
