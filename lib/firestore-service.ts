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
import { Client, CreditApplication, PaymentRecord, AuditLogRecord } from '@/types';
import { INITIAL_CLIENTS, generateSeedCreditsAndPayments } from './initial-data';

export const CLIENTS_COLLECTION = 'clients';
export const CREDITS_COLLECTION = 'credits';
export const PAYMENTS_COLLECTION = 'payments';
export const AUDIT_LOGS_COLLECTION = 'audit_logs';

export interface AuditActor {
  name?: string;
  email?: string;
  role?: string;
  uid?: string;
}

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
let memoryAuditLogs: AuditLogRecord[] = [];

function loadLocalCache<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCache<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

// ==========================================
// AUDIT LOGS (LOGS DE AUDITORIA SIMPLIFICADOS)
// ==========================================

export async function fetchAuditLogs(): Promise<AuditLogRecord[]> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const snapshotPromise = getDocs(colRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);

    if (snapshot && typeof (snapshot as any).forEach === 'function') {
      const logs: AuditLogRecord[] = [];
      (snapshot as any).forEach((d: any) => {
        logs.push({ id: d.id, ...d.data() } as AuditLogRecord);
      });
      // Sort in memory by timestamp descending
      logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      memoryAuditLogs = logs;
      saveLocalCache('bayete_cached_audit_logs', logs);
      return logs;
    }
  } catch (error) {
    console.warn('Aviso ao obter logs de auditoria do Firestore (a usar cache):', error);
  }

  if (memoryAuditLogs.length === 0) {
    memoryAuditLogs = loadLocalCache<AuditLogRecord>('bayete_cached_audit_logs');
  }
  return memoryAuditLogs;
}

export async function recordAuditLogDoc(
  log: Omit<AuditLogRecord, 'id'>
): Promise<AuditLogRecord> {
  const temporaryId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanLog = sanitizeForFirestore({
    ...log,
    timestamp: log.timestamp || new Date().toISOString(),
  });

  const fullLog: AuditLogRecord = { id: temporaryId, ...cleanLog };

  // 1. Optimistic save in memory & local storage
  memoryAuditLogs = [fullLog, ...memoryAuditLogs.filter((l) => l.id !== temporaryId)];
  saveLocalCache('bayete_cached_audit_logs', memoryAuditLogs);

  // 2. Persist to Firestore
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const docRef = await addDoc(colRef, cleanLog);
    fullLog.id = docRef.id;
    memoryAuditLogs = memoryAuditLogs.map((l) => (l.id === temporaryId ? fullLog : l));
    saveLocalCache('bayete_cached_audit_logs', memoryAuditLogs);
  } catch (err) {
    console.warn('Aviso: Log de auditoria guardado localmente (Firestore offline):', err);
  }

  return fullLog;
}

export async function clearAllAuditLogs(): Promise<void> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, AUDIT_LOGS_COLLECTION, d.id));
    }
  } catch (err) {
    console.warn('Aviso ao limpar logs de auditoria no Firestore:', err);
  }
  memoryAuditLogs = [];
  saveLocalCache('bayete_cached_audit_logs', []);
}

// ==========================================
// CLIENTS
// ==========================================

export async function fetchClients(): Promise<Client[]> {
  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    // Timeout getDocs after 6 seconds if network is slow to avoid UI freeze
    const snapshotPromise = getDocs(colRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);

    if (snapshot && typeof (snapshot as any).forEach === 'function') {
      const clients: Client[] = [];
      (snapshot as any).forEach((d: any) => {
        clients.push({ id: d.id, ...d.data() } as Client);
      });
      // Sort in memory by createdAt descending
      clients.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      memoryClients = clients;
      saveLocalCache('bayete_cached_clients', clients);
      return clients;
    }
  } catch (error) {
    console.warn('Aviso ao obter clientes do Firestore (a usar cache):', error);
  }

  if (memoryClients.length === 0) {
    memoryClients = loadLocalCache<Client>('bayete_cached_clients');
  }
  return memoryClients;
}

export async function addClientDoc(client: Omit<Client, 'id'>, actor?: AuditActor): Promise<Client> {
  const newClientData = sanitizeForFirestore({
    ...client,
    createdAt: client.createdAt || new Date().toISOString(),
  });

  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    const docRef = await addDoc(colRef, newClientData);
    const created: Client = { id: docRef.id, ...newClientData };
    memoryClients = [created, ...memoryClients.filter((c) => c.id !== created.id)];
    saveLocalCache('bayete_cached_clients', memoryClients);

    // Registo de auditoria no Firebase
    recordAuditLogDoc({
      targetType: 'client',
      targetId: created.id,
      targetReference: created.bi || created.nuit,
      clientName: created.name,
      actionType: 'criacao',
      actionLabel: 'Registo de Novo Cliente',
      actionDescription: `Novo cliente "${created.name}" cadastrado no sistema (BI: ${created.bi}, Salário: ${created.salary} MT).`,
      performedBy: actor?.name || actor?.email || 'Agente / Administrador',
      performedByEmail: actor?.email,
      performedByRole: actor?.role || 'admin',
      performedByUid: actor?.uid,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return created;
  } catch (error) {
    console.error('Erro ao adicionar cliente no Firestore:', error);
    throw error;
  }
}

export async function updateClientDoc(id: string, updates: Partial<Client>, actor?: AuditActor): Promise<void> {
  const cleanUpdates = sanitizeForFirestore(updates);
  const prevClient = memoryClients.find((c) => c.id === id);
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await updateDoc(docRef, cleanUpdates);
    memoryClients = memoryClients.map((c) => (c.id === id ? { ...c, ...cleanUpdates } : c));
    saveLocalCache('bayete_cached_clients', memoryClients);

    // Registo de auditoria no Firebase
    recordAuditLogDoc({
      targetType: 'client',
      targetId: id,
      targetReference: updates.bi || prevClient?.bi || prevClient?.nuit,
      clientName: updates.name || prevClient?.name || 'Cliente',
      actionType: 'atualizacao',
      actionLabel: 'Atualização Cadastral de Cliente',
      actionDescription: `Dados cadastrais de "${updates.name || prevClient?.name}" foram atualizados na base de dados.`,
      performedBy: actor?.name || actor?.email || 'Administrador',
      performedByEmail: actor?.email,
      performedByRole: actor?.role || 'admin',
      performedByUid: actor?.uid,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } catch (error) {
    console.error('Erro ao atualizar cliente no Firestore:', error);
    throw error;
  }
}

export async function deleteClientDoc(id: string, actor?: AuditActor): Promise<void> {
  const prevClient = memoryClients.find((c) => c.id === id);

  // 1. Optimistic removal from memory and local cache
  memoryClients = memoryClients.filter((c) => c.id !== id);
  saveLocalCache('bayete_cached_clients', memoryClients);

  // Also remove associated credits and payments to maintain data consistency
  const clientCredits = memoryCredits.filter((c) => c.clientId === id);
  const creditIds = new Set(clientCredits.map((c) => c.id));
  if (creditIds.size > 0) {
    memoryCredits = memoryCredits.filter((c) => c.clientId !== id);
    saveLocalCache('bayete_cached_credits', memoryCredits);
    memoryPayments = memoryPayments.filter((p) => p.clientId !== id && !creditIds.has(p.creditId));
    saveLocalCache('bayete_cached_payments', memoryPayments);
  }

  // Registo de auditoria no Firebase
  recordAuditLogDoc({
    targetType: 'client',
    targetId: id,
    targetReference: prevClient?.bi || prevClient?.nuit,
    clientName: prevClient?.name || 'Cliente',
    actionType: 'eliminacao',
    actionLabel: 'Eliminação de Registo de Cliente',
    actionDescription: `Registo cadastral de "${prevClient?.name || 'Cliente'}" (BI: ${prevClient?.bi || 'N/A'}) foi removido da base de dados.`,
    performedBy: actor?.name || actor?.email || 'Administrador',
    performedByEmail: actor?.email,
    performedByRole: actor?.role || 'admin',
    performedByUid: actor?.uid,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  // 2. Persist deletion to Firestore
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await deleteDoc(docRef);

    // Also delete associated credits and payments in Firestore
    for (const cr of clientCredits) {
      try {
        await deleteDoc(doc(db, CREDITS_COLLECTION, cr.id));
      } catch (err) {
        console.warn(`Aviso ao eliminar crédito associado ${cr.id} no Firestore:`, err);
      }
    }
  } catch (error) {
    console.warn('Aviso: Cliente removido do cache local, mas Firestore retornou:', error);
  }
}

// ==========================================
// CREDITS (ANÁLISE DE CRÉDITO)
// ==========================================

export async function fetchCredits(): Promise<CreditApplication[]> {
  try {
    const colRef = collection(db, CREDITS_COLLECTION);
    const snapshotPromise = getDocs(colRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);

    if (snapshot && typeof (snapshot as any).forEach === 'function') {
      const credits: CreditApplication[] = [];
      (snapshot as any).forEach((d: any) => {
        credits.push({ id: d.id, ...d.data() } as CreditApplication);
      });
      // Sort in memory by createdAt descending
      credits.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      memoryCredits = credits;
      saveLocalCache('bayete_cached_credits', credits);
      return credits;
    }
  } catch (error) {
    console.warn('Aviso ao obter propostas de crédito do Firestore (a usar cache):', error);
  }

  if (memoryCredits.length === 0) {
    memoryCredits = loadLocalCache<CreditApplication>('bayete_cached_credits');
  }
  return memoryCredits;
}

export async function addCreditDoc(
  credit: Omit<CreditApplication, 'id'>,
  actor?: AuditActor
): Promise<CreditApplication> {
  const newCreditData = sanitizeForFirestore({
    ...credit,
    createdAt: credit.createdAt || new Date().toISOString(),
  });

  try {
    const colRef = collection(db, CREDITS_COLLECTION);
    const docRef = await addDoc(colRef, newCreditData);
    const created: CreditApplication = { id: docRef.id, ...newCreditData };
    memoryCredits = [created, ...memoryCredits.filter((c) => c.id !== created.id)];
    saveLocalCache('bayete_cached_credits', memoryCredits);

    // Registo simplificado de auditoria no Firebase
    recordAuditLogDoc({
      targetType: 'credit',
      targetId: created.id,
      targetReference: `CR-${created.id.substring(0, 6).toUpperCase()}`,
      clientName: created.clientName,
      actionType: 'criacao',
      actionLabel: 'Criação de Proposta de Crédito',
      actionDescription: `Nova proposta de microcrédito no montante de ${created.requestedAmount} MT (${created.termMonths} meses, taxa ${created.interestRate}%) registada para ${created.clientName}. Estado: "${created.status}".`,
      performedBy: actor?.name || actor?.email || 'Agente / Administrador',
      performedByEmail: actor?.email,
      performedByRole: actor?.role || 'admin',
      performedByUid: actor?.uid,
      timestamp: new Date().toISOString(),
      amount: created.requestedAmount,
      newState: created.status,
    }).catch(() => {});

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
  approvedAmount?: number,
  actor?: AuditActor
): Promise<void> {
  const prevCredit = memoryCredits.find((c) => c.id === id);
  const prevStatus = prevCredit?.status || 'pendente';

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
    saveLocalCache('bayete_cached_credits', memoryCredits);

    // Registo de auditoria no Firebase
    const actionLabel =
      status === 'aprovado'
        ? 'Aprovação de Crédito'
        : status === 'desembolsado'
        ? 'Desembolso de Capital'
        : status === 'recusado'
        ? 'Rejeição de Proposta'
        : status === 'liquidado'
        ? 'Liquidação Total de Crédito'
        : `Alteração de Estado [${prevStatus.toUpperCase()} → ${status.toUpperCase()}]`;

    recordAuditLogDoc({
      targetType: 'credit',
      targetId: id,
      targetReference: `CR-${id.substring(0, 6).toUpperCase()}`,
      clientName: prevCredit?.clientName || 'Cliente',
      actionType: 'alteracao_status',
      actionLabel,
      actionDescription: `Estado do crédito de ${prevCredit?.clientName || 'cliente'} alterado de "${prevStatus}" para "${status}".${notes ? ` Observações: "${notes}".` : ''}${approvedAmount ? ` Montante aprovado: ${approvedAmount} MT.` : ''}`,
      performedBy: actor?.name || actor?.email || 'Administrador',
      performedByEmail: actor?.email,
      performedByRole: actor?.role || 'admin',
      performedByUid: actor?.uid,
      timestamp: new Date().toISOString(),
      previousState: prevStatus,
      newState: status,
      amount: approvedAmount || prevCredit?.requestedAmount,
    }).catch(() => {});
  } catch (error) {
    console.error('Erro ao atualizar estado do crédito no Firestore:', error);
    throw error;
  }
}

export async function updateCreditDoc(
  id: string,
  updates: Partial<CreditApplication>,
  actor?: AuditActor
): Promise<void> {
  const cleanUpdates = sanitizeForFirestore(updates);
  const prevCredit = memoryCredits.find((c) => c.id === id);

  try {
    const docRef = doc(db, CREDITS_COLLECTION, id);
    await updateDoc(docRef, cleanUpdates);
    memoryCredits = memoryCredits.map((c) => (c.id === id ? { ...c, ...cleanUpdates } : c));
    saveLocalCache('bayete_cached_credits', memoryCredits);

    // Registo de auditoria no Firebase
    recordAuditLogDoc({
      targetType: 'credit',
      targetId: id,
      targetReference: `CR-${id.substring(0, 6).toUpperCase()}`,
      clientName: prevCredit?.clientName || 'Cliente',
      actionType: 'atualizacao',
      actionLabel: 'Edição de Proposta de Crédito',
      actionDescription: `Parâmetros do microcrédito de ${prevCredit?.clientName || 'cliente'} foram atualizados.${updates.requestedAmount ? ` Montante: ${updates.requestedAmount} MT.` : ''}${updates.status ? ` Estado: ${updates.status}.` : ''}`,
      performedBy: actor?.name || actor?.email || 'Administrador',
      performedByEmail: actor?.email,
      performedByRole: actor?.role || 'admin',
      performedByUid: actor?.uid,
      timestamp: new Date().toISOString(),
      amount: updates.requestedAmount || prevCredit?.requestedAmount,
      previousState: prevCredit?.status,
      newState: updates.status || prevCredit?.status,
    }).catch(() => {});
  } catch (error) {
    console.error('Erro ao atualizar proposta de crédito no Firestore:', error);
    throw error;
  }
}

export async function deleteCreditDoc(id: string, actor?: AuditActor): Promise<void> {
  const prevCredit = memoryCredits.find((c) => c.id === id);

  // 1. Optimistic removal from memory and local cache
  memoryCredits = memoryCredits.filter((c) => c.id !== id);
  saveLocalCache('bayete_cached_credits', memoryCredits);

  // Also remove associated payments from memory and cache
  memoryPayments = memoryPayments.filter((p) => p.creditId !== id);
  saveLocalCache('bayete_cached_payments', memoryPayments);

  // Registo de auditoria no Firebase
  recordAuditLogDoc({
    targetType: 'credit',
    targetId: id,
    targetReference: `CR-${id.substring(0, 6).toUpperCase()}`,
    clientName: prevCredit?.clientName || 'Cliente',
    actionType: 'eliminacao',
    actionLabel: 'Eliminação de Proposta de Crédito',
    actionDescription: `Proposta de microcrédito de ${prevCredit?.clientName || 'cliente'} no montante de ${prevCredit?.requestedAmount || 0} MT foi eliminada do sistema.`,
    performedBy: actor?.name || actor?.email || 'Administrador',
    performedByEmail: actor?.email,
    performedByRole: actor?.role || 'admin',
    performedByUid: actor?.uid,
    timestamp: new Date().toISOString(),
    previousState: prevCredit?.status,
    amount: prevCredit?.requestedAmount,
  }).catch(() => {});

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, CREDITS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Aviso: Proposta de crédito removida localmente, mas Firestore retornou:', error);
  }
}

// ==========================================
// PAYMENTS (PAGAMENTOS)
// ==========================================

export async function fetchPayments(): Promise<PaymentRecord[]> {
  try {
    const colRef = collection(db, PAYMENTS_COLLECTION);
    const snapshotPromise = getDocs(colRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);

    if (snapshot && typeof (snapshot as any).forEach === 'function') {
      const payments: PaymentRecord[] = [];
      (snapshot as any).forEach((d: any) => {
        payments.push({ id: d.id, ...d.data() } as PaymentRecord);
      });
      // Sort in memory by paymentDate or createdAt descending
      payments.sort((a, b) =>
        (b.paymentDate || b.createdAt || '').localeCompare(a.paymentDate || a.createdAt || '')
      );
      memoryPayments = payments;
      saveLocalCache('bayete_cached_payments', payments);
      return payments;
    }
  } catch (error) {
    console.warn('Aviso ao obter histórico de pagamentos do Firestore (a usar cache):', error);
  }

  if (memoryPayments.length === 0) {
    memoryPayments = loadLocalCache<PaymentRecord>('bayete_cached_payments');
  }
  return memoryPayments;
}

export async function recordPaymentDoc(
  credit: CreditApplication,
  installmentNumber: number,
  amountPaid: number,
  paymentMethod: PaymentRecord['paymentMethod'],
  notes: string = '',
  recordedBy: string = 'Agente Bayete',
  reminderDate?: string,
  reminderNote?: string,
  reminderStatus?: 'pendente' | 'concluido' | 'cancelado',
  actor?: AuditActor
): Promise<{ payment: PaymentRecord; updatedCredit: CreditApplication }> {
  const receiptNumber = `BYT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();
  const temporaryId = `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

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
    ...(reminderDate ? { reminderDate } : {}),
    ...(reminderNote ? { reminderNote } : {}),
    ...(reminderDate ? { reminderStatus: reminderStatus || 'pendente' } : {}),
    recordedBy: recordedBy || 'Gestor Bayete',
    createdAt: now,
  };

  const cleanPaymentData = sanitizeForFirestore(newPaymentData);

  // Guarantee installments exist
  let installments = credit.installments && credit.installments.length > 0
    ? [...credit.installments]
    : [];

  if (installments.length === 0) {
    const term = credit.termMonths || 3;
    const monthlyAmt = credit.monthlyInstallment || ((credit.totalRepayment || credit.requestedAmount || amountPaid) / term);
    installments = Array.from({ length: term }, (_, idx) => ({
      number: idx + 1,
      dueDate: new Date(Date.now() + (idx + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: monthlyAmt,
      principal: Math.round(monthlyAmt * 0.8),
      interest: Math.round(monthlyAmt * 0.2),
      status: 'pendente' as const,
      paidAmount: 0,
    }));
  }

  // Update installments array
  let foundTarget = false;
  const updatedInstallments = installments.map((inst) => {
    if (inst.number === installmentNumber) {
      foundTarget = true;
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

  if (!foundTarget) {
    updatedInstallments.push({
      number: installmentNumber,
      dueDate: now.split('T')[0],
      amount: amountPaid,
      principal: Math.round(amountPaid * 0.8),
      interest: Math.round(amountPaid * 0.2),
      status: 'pago',
      paidAmount: amountPaid,
      paidAt: now,
      paymentMethod,
      paymentRef: receiptNumber,
    });
  }

  const totalRepay = credit.totalRepayment || (credit.requestedAmount ? credit.requestedAmount * 1.15 : amountPaid);
  const newTotalPaid = (credit.totalPaid || 0) + amountPaid;
  const newRemaining = Math.max(0, totalRepay - newTotalPaid);
  const isFullySettled = newRemaining <= 0;

  // If registering payment on pending/approved loan, advance to 'desembolsado' (or 'liquidado' if settled)
  const newCreditStatus = isFullySettled ? 'liquidado' : 'desembolsado';

  const creditUpdates: Partial<CreditApplication> = {
    installments: updatedInstallments,
    totalPaid: newTotalPaid,
    remainingBalance: newRemaining,
    status: newCreditStatus,
    disbursedAt: credit.disbursedAt || now,
    approvedAt: credit.approvedAt || now,
  };

  const cleanCreditUpdates = sanitizeForFirestore(creditUpdates);

  const savedPayment: PaymentRecord = { id: temporaryId, ...cleanPaymentData };
  const updatedCredit: CreditApplication = {
    ...credit,
    ...cleanCreditUpdates,
  };

  // 1. Optimistic update in memory and local storage
  memoryPayments = [savedPayment, ...memoryPayments.filter((p) => p.id !== temporaryId)];
  memoryCredits = memoryCredits.map((c) => (c.id === credit.id ? updatedCredit : c));
  saveLocalCache('bayete_cached_payments', memoryPayments);
  saveLocalCache('bayete_cached_credits', memoryCredits);

  // Registo de auditoria no Firebase
  recordAuditLogDoc({
    targetType: 'payment',
    targetId: savedPayment.id,
    targetReference: savedPayment.receiptNumber,
    clientName: credit.clientName,
    actionType: 'pagamento',
    actionLabel: 'Registo de Pagamento de Parcela',
    actionDescription: `Pagamento de ${amountPaid} MT (parcela ${installmentNumber}) recebido via ${paymentMethod.toUpperCase()} para o cliente ${credit.clientName}. Recibo: ${savedPayment.receiptNumber}.${notes ? ` Observações: "${notes}".` : ''}`,
    performedBy: actor?.name || recordedBy || 'Agente / Administrador',
    performedByEmail: actor?.email,
    performedByRole: actor?.role || 'admin',
    performedByUid: actor?.uid,
    timestamp: now,
    amount: amountPaid,
  }).catch(() => {});

  // 2. Persist to Firestore
  try {
    const payCol = collection(db, PAYMENTS_COLLECTION);
    const payRef = await addDoc(payCol, cleanPaymentData);
    savedPayment.id = payRef.id;

    const credRef = doc(db, CREDITS_COLLECTION, credit.id);
    await setDoc(credRef, cleanCreditUpdates, { merge: true });

    // Update with real Firestore ID in memory
    memoryPayments = memoryPayments.map((p) => (p.id === temporaryId ? savedPayment : p));
    saveLocalCache('bayete_cached_payments', memoryPayments);
  } catch (error) {
    console.warn('Aviso: Pagamento salvo com sucesso no cache local (offline/rede Firestore):', error);
  }

  return { payment: savedPayment, updatedCredit };
}

export async function updatePaymentDoc(
  id: string,
  updates: Partial<PaymentRecord>,
  actor?: AuditActor
): Promise<void> {
  const cleanUpdates = sanitizeForFirestore(updates);
  const prevPayment = memoryPayments.find((p) => p.id === id);
  memoryPayments = memoryPayments.map((p) => (p.id === id ? { ...p, ...cleanUpdates } : p));
  saveLocalCache('bayete_cached_payments', memoryPayments);

  // Registo de auditoria no Firebase
  recordAuditLogDoc({
    targetType: 'payment',
    targetId: id,
    targetReference: prevPayment?.receiptNumber || id,
    clientName: prevPayment?.clientName,
    actionType: 'atualizacao',
    actionLabel: 'Edição de Registo de Pagamento',
    actionDescription: `Registo de pagamento ${prevPayment?.receiptNumber || id} de ${prevPayment?.clientName || 'cliente'} foi atualizado.${updates.amountPaid ? ` Novo valor: ${updates.amountPaid} MT.` : ''}${updates.paymentMethod ? ` Método: ${updates.paymentMethod}.` : ''}`,
    performedBy: actor?.name || actor?.email || 'Administrador',
    performedByEmail: actor?.email,
    performedByRole: actor?.role || 'admin',
    performedByUid: actor?.uid,
    timestamp: new Date().toISOString(),
    amount: updates.amountPaid || prevPayment?.amountPaid,
  }).catch(() => {});

  try {
    const docRef = doc(db, PAYMENTS_COLLECTION, id);
    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.warn('Aviso: Pagamento atualizado localmente, mas Firestore retornou:', error);
  }
}

export async function deletePaymentDoc(
  id: string,
  creditId?: string,
  installmentNumber?: number,
  amountPaid?: number,
  actor?: AuditActor
): Promise<void> {
  const prevPayment = memoryPayments.find((p) => p.id === id);
  memoryPayments = memoryPayments.filter((p) => p.id !== id);
  saveLocalCache('bayete_cached_payments', memoryPayments);

  // Registo de auditoria no Firebase
  recordAuditLogDoc({
    targetType: 'payment',
    targetId: id,
    targetReference: prevPayment?.receiptNumber || id,
    clientName: prevPayment?.clientName,
    actionType: 'estorno',
    actionLabel: 'Estorno / Eliminação de Pagamento',
    actionDescription: `Pagamento ${prevPayment?.receiptNumber || id} no montante de ${amountPaid || prevPayment?.amountPaid || 0} MT (parcela ${installmentNumber || prevPayment?.installmentNumber || 'N/A'}) de ${prevPayment?.clientName || 'cliente'} foi estornado/eliminado.`,
    performedBy: actor?.name || actor?.email || 'Administrador',
    performedByEmail: actor?.email,
    performedByRole: actor?.role || 'admin',
    performedByUid: actor?.uid,
    timestamp: new Date().toISOString(),
    amount: amountPaid || prevPayment?.amountPaid,
  }).catch(() => {});

  // If related credit info is provided, adjust remaining balance and installment state
  if (creditId && amountPaid) {
    const credit = memoryCredits.find((c) => c.id === creditId);
    if (credit) {
      const updatedInstallments = (credit.installments || []).map((inst) => {
        if (installmentNumber !== undefined && inst.number === installmentNumber) {
          const newPaid = Math.max(0, (inst.paidAmount || 0) - amountPaid);
          return {
            ...inst,
            paidAmount: newPaid,
            status: (newPaid >= inst.amount ? 'pago' : 'pendente') as 'pago' | 'pendente',
          };
        }
        return inst;
      });
      const newTotalPaid = Math.max(0, (credit.totalPaid || 0) - amountPaid);
      const newRemaining = Math.min(credit.totalRepayment, (credit.remainingBalance || 0) + amountPaid);
      const creditUpdates: Partial<CreditApplication> = {
        installments: updatedInstallments,
        totalPaid: newTotalPaid,
        remainingBalance: newRemaining,
        ...(credit.status === 'liquidado' ? { status: 'desembolsado' } : {}),
      };
      await updateCreditDoc(creditId, creditUpdates, actor);
    }
  }

  try {
    const docRef = doc(db, PAYMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Aviso: Pagamento removido localmente, mas Firestore retornou:', error);
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

  // 4. Seed initial audit log history in Firestore
  for (const cr of createdCredits) {
    await recordAuditLogDoc({
      targetType: 'credit',
      targetId: cr.id,
      targetReference: `CR-${cr.id.substring(0, 6).toUpperCase()}`,
      clientName: cr.clientName,
      actionType: 'criacao',
      actionLabel: 'Criação de Proposta de Crédito',
      actionDescription: `Proposta de microcrédito no montante de ${cr.requestedAmount} MT (${cr.termMonths} meses) registada para ${cr.clientName}.`,
      performedBy: 'Administrador Bayete',
      performedByEmail: 'admin@microcredito.co.mz',
      performedByRole: 'admin',
      timestamp: cr.createdAt,
      amount: cr.requestedAmount,
      newState: cr.status,
    }).catch(() => {});

    if (cr.status === 'desembolsado' || cr.status === 'liquidado') {
      await recordAuditLogDoc({
        targetType: 'credit',
        targetId: cr.id,
        targetReference: `CR-${cr.id.substring(0, 6).toUpperCase()}`,
        clientName: cr.clientName,
        actionType: 'alteracao_status',
        actionLabel: 'Desembolso de Capital',
        actionDescription: `Aprovação e desembolso de capital no valor de ${cr.requestedAmount} MT para ${cr.clientName}.`,
        performedBy: 'Administrador Bayete',
        performedByEmail: 'admin@microcredito.co.mz',
        performedByRole: 'admin',
        timestamp: cr.disbursedAt || cr.createdAt,
        amount: cr.requestedAmount,
        previousState: 'aprovado',
        newState: 'desembolsado',
      }).catch(() => {});
    }
  }

  for (const pay of createdPayments) {
    await recordAuditLogDoc({
      targetType: 'payment',
      targetId: pay.id,
      targetReference: pay.receiptNumber,
      clientName: pay.clientName,
      actionType: 'pagamento',
      actionLabel: 'Registo de Pagamento de Parcela',
      actionDescription: `Pagamento de amortização da parcela ${pay.installmentNumber} no montante de ${pay.amountPaid} MT recebido via ${pay.paymentMethod.toUpperCase()}. Recibo: ${pay.receiptNumber}.`,
      performedBy: pay.recordedBy || 'Agente Bayete',
      performedByEmail: 'agente.zimpeto@microcredito.co.mz',
      performedByRole: 'admin',
      timestamp: pay.paymentDate || pay.createdAt,
      amount: pay.amountPaid,
    }).catch(() => {});
  }

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

  // Clear audit logs collection
  try {
    const auditCol = collection(db, AUDIT_LOGS_COLLECTION);
    const auditSnap = await getDocs(auditCol);
    for (const d of auditSnap.docs) {
      await deleteDoc(doc(db, AUDIT_LOGS_COLLECTION, d.id));
    }
  } catch (err) {
    console.error('Erro ao limpar auditoria do Firestore:', err);
  }

  memoryClients = [];
  memoryCredits = [];
  memoryPayments = [];
  memoryAuditLogs = [];
  saveLocalCache('bayete_cached_audit_logs', []);
}
