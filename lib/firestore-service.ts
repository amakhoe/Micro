import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import { INITIAL_CLIENTS, generateSeedCreditsAndPayments } from './initial-data';

const CLIENTS_COLLECTION = 'clients';
const CREDITS_COLLECTION = 'credits';
const PAYMENTS_COLLECTION = 'payments';

// Fallback in-memory storage in case firestore has network or rule hiccups
let memoryClients: Client[] = [];
let memoryCredits: CreditApplication[] = [];
let memoryPayments: PaymentRecord[] = [];

// CLIENTS
export async function fetchClients(): Promise<Client[]> {
  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const clients: Client[] = [];
    snapshot.forEach((d) => {
      clients.push({ id: d.id, ...d.data() } as Client);
    });
    if (clients.length > 0) {
      memoryClients = clients;
      return clients;
    }
  } catch (error) {
    console.warn('Firestore fetchClients fallback to local cache:', error);
  }
  return memoryClients;
}

export async function addClientDoc(client: Omit<Client, 'id'>): Promise<Client> {
  const newClientData = {
    ...client,
    createdAt: client.createdAt || new Date().toISOString(),
  };

  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    const docRef = await addDoc(colRef, newClientData);
    const created: Client = { id: docRef.id, ...newClientData };
    memoryClients = [created, ...memoryClients];
    return created;
  } catch (error) {
    console.warn('Firestore addClient error, saving to memory fallback:', error);
    const created: Client = {
      id: 'local_' + Math.random().toString(36).substring(2, 9),
      ...newClientData,
    };
    memoryClients = [created, ...memoryClients];
    return created;
  }
}

export async function updateClientDoc(id: string, updates: Partial<Client>): Promise<void> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.warn('Firestore updateClient error, updating memory fallback:', error);
  }
  memoryClients = memoryClients.map((c) => (c.id === id ? { ...c, ...updates } : c));
}

export async function deleteClientDoc(id: string): Promise<void> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Firestore deleteClient error:', error);
  }
  memoryClients = memoryClients.filter((c) => c.id !== id);
}

// CREDITS
export async function fetchCredits(): Promise<CreditApplication[]> {
  try {
    const colRef = collection(db, CREDITS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const credits: CreditApplication[] = [];
    snapshot.forEach((d) => {
      credits.push({ id: d.id, ...d.data() } as CreditApplication);
    });
    if (credits.length > 0) {
      memoryCredits = credits;
      return credits;
    }
  } catch (error) {
    console.warn('Firestore fetchCredits fallback:', error);
  }
  return memoryCredits;
}

export async function addCreditDoc(credit: Omit<CreditApplication, 'id'>): Promise<CreditApplication> {
  const newCreditData = {
    ...credit,
    createdAt: credit.createdAt || new Date().toISOString(),
  };

  try {
    const colRef = collection(db, CREDITS_COLLECTION);
    const docRef = await addDoc(colRef, newCreditData);
    const created: CreditApplication = { id: docRef.id, ...newCreditData };
    memoryCredits = [created, ...memoryCredits];
    return created;
  } catch (error) {
    console.warn('Firestore addCredit error, saving to memory fallback:', error);
    const created: CreditApplication = {
      id: 'cred_' + Math.random().toString(36).substring(2, 9),
      ...newCreditData,
    };
    memoryCredits = [created, ...memoryCredits];
    return created;
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
    ...(notes ? { analystNotes: notes } : {}),
    ...(approvedAmount ? { approvedAmount } : {}),
    ...(status === 'aprovado' ? { approvedAt: new Date().toISOString() } : {}),
    ...(status === 'desembolsado' ? { disbursedAt: new Date().toISOString() } : {}),
  };

  try {
    const docRef = doc(db, CREDITS_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.warn('Firestore updateCreditStatus error:', error);
  }
  memoryCredits = memoryCredits.map((c) => (c.id === id ? { ...c, ...updates } : c));
}

// PAYMENTS
export async function fetchPayments(): Promise<PaymentRecord[]> {
  try {
    const colRef = collection(db, PAYMENTS_COLLECTION);
    const q = query(colRef, orderBy('paymentDate', 'desc'));
    const snapshot = await getDocs(q);
    const payments: PaymentRecord[] = [];
    snapshot.forEach((d) => {
      payments.push({ id: d.id, ...d.data() } as PaymentRecord);
    });
    if (payments.length > 0) {
      memoryPayments = payments;
      return payments;
    }
  } catch (error) {
    console.warn('Firestore fetchPayments fallback:', error);
  }
  return memoryPayments;
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
    notes,
    recordedBy,
    createdAt: now,
  };

  // Update credit installment and balances
  const updatedInstallments = credit.installments.map((inst) => {
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

  const newTotalPaid = credit.totalPaid + amountPaid;
  const newRemaining = Math.max(0, credit.totalRepayment - newTotalPaid);
  const isFullySettled = newRemaining <= 0;

  const creditUpdates: Partial<CreditApplication> = {
    installments: updatedInstallments,
    totalPaid: newTotalPaid,
    remainingBalance: newRemaining,
    ...(isFullySettled ? { status: 'liquidado' } : {}),
  };

  let savedPayment: PaymentRecord;

  try {
    const payCol = collection(db, PAYMENTS_COLLECTION);
    const payRef = await addDoc(payCol, newPaymentData);
    savedPayment = { id: payRef.id, ...newPaymentData };

    const credRef = doc(db, CREDITS_COLLECTION, credit.id);
    await updateDoc(credRef, creditUpdates);
  } catch (error) {
    console.warn('Firestore recordPayment error, falling back:', error);
    savedPayment = {
      id: 'pay_' + Math.random().toString(36).substring(2, 9),
      ...newPaymentData,
    };
  }

  const updatedCredit: CreditApplication = {
    ...credit,
    ...creditUpdates,
  };

  memoryPayments = [savedPayment, ...memoryPayments];
  memoryCredits = memoryCredits.map((c) => (c.id === credit.id ? updatedCredit : c));

  return { payment: savedPayment, updatedCredit };
}

// INITIAL SEEDING
export async function seedInitialData(): Promise<{
  clients: Client[];
  credits: CreditApplication[];
  payments: PaymentRecord[];
}> {
  const createdClients: Client[] = [];
  const createdCredits: CreditApplication[] = [];
  const createdPayments: PaymentRecord[] = [];

  for (const clientData of INITIAL_CLIENTS) {
    try {
      const colRef = collection(db, CLIENTS_COLLECTION);
      const docRef = await addDoc(colRef, clientData);
      createdClients.push({ id: docRef.id, ...clientData });
    } catch {
      const fallback: Client = {
        id: 'seed_' + Math.random().toString(36).substring(2, 8),
        ...clientData,
      };
      createdClients.push(fallback);
    }
  }

  const { credits, payments } = generateSeedCreditsAndPayments(createdClients);

  for (const cred of credits) {
    try {
      const colRef = collection(db, CREDITS_COLLECTION);
      const docRef = await addDoc(colRef, cred);
      createdCredits.push({ id: docRef.id, ...cred });
    } catch {
      const fallback: CreditApplication = {
        id: 'cred_seed_' + Math.random().toString(36).substring(2, 8),
        ...cred,
      };
      createdCredits.push(fallback);
    }
  }

  // Create payments for esperanca and fatima if applicable
  if (createdCredits.length > 0 && createdCredits[0].installments[0]?.paidAt) {
    const cred1 = createdCredits[0];
    const pay1: Omit<PaymentRecord, 'id'> = {
      creditId: cred1.id,
      clientId: cred1.clientId,
      clientName: cred1.clientName,
      installmentNumber: 1,
      amountPaid: cred1.installments[0].amount,
      paymentDate: cred1.installments[0].paidAt || new Date().toISOString(),
      paymentMethod: 'm-pesa',
      receiptNumber: 'BYT-2026-892410',
      notes: 'Pagamento pontual via M-Pesa',
      recordedBy: 'Agente Zimpeto',
      createdAt: cred1.installments[0].paidAt || new Date().toISOString(),
    };
    try {
      const colRef = collection(db, PAYMENTS_COLLECTION);
      const docRef = await addDoc(colRef, pay1);
      createdPayments.push({ id: docRef.id, ...pay1 });
    } catch {
      createdPayments.push({ id: 'p1', ...pay1 });
    }
  }

  memoryClients = createdClients;
  memoryCredits = createdCredits;
  memoryPayments = createdPayments;

  return { clients: createdClients, credits: createdCredits, payments: createdPayments };
}

// CLEAR ALL SYSTEM DATA
export async function clearAllSystemData(): Promise<void> {
  // Clear clients collection
  try {
    const clientsCol = collection(db, CLIENTS_COLLECTION);
    const clientsSnap = await getDocs(clientsCol);
    for (const d of clientsSnap.docs) {
      await deleteDoc(doc(db, CLIENTS_COLLECTION, d.id));
    }
  } catch (err) {
    console.warn('Error deleting clients from Firestore:', err);
  }

  // Clear credits collection
  try {
    const creditsCol = collection(db, CREDITS_COLLECTION);
    const creditsSnap = await getDocs(creditsCol);
    for (const d of creditsSnap.docs) {
      await deleteDoc(doc(db, CREDITS_COLLECTION, d.id));
    }
  } catch (err) {
    console.warn('Error deleting credits from Firestore:', err);
  }

  // Clear payments collection
  try {
    const payCol = collection(db, PAYMENTS_COLLECTION);
    const paySnap = await getDocs(payCol);
    for (const d of paySnap.docs) {
      await deleteDoc(doc(db, PAYMENTS_COLLECTION, d.id));
    }
  } catch (err) {
    console.warn('Error deleting payments from Firestore:', err);
  }

  memoryClients = [];
  memoryCredits = [];
  memoryPayments = [];
}

