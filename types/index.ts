export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  bi: string;
  nuit: string;
  salary: number;
  profession: string;
  notes?: string;
  status: 'ativo' | 'em_analise' | 'bloqueado';
  createdAt: string;
  createdBy?: string;
}

export interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  status: 'pendente' | 'pago' | 'atrasado';
  paidAmount?: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentRef?: string;
}

export interface RiskAnalysis {
  effortRate: number; // Taxa de esforço (%)
  score: number; // 0 - 100
  riskLevel: 'baixo' | 'moderado' | 'alto' | 'critico';
  recommendation: 'Aprovação Recomendada' | 'Aprovação Condicional com Garantia' | 'Revisar / Reduzir Montante' | 'Risco Elevado - Não Recomendado';
  maxRecommendedInstallment: number;
  factors: string[];
}

export interface CreditApplication {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientBi: string;
  clientNuit: string;
  clientSalary: number;
  clientProfession: string;
  requestedAmount: number;
  termMonths: number;
  interestRate: number; // % mensal
  purpose: string;
  monthlyInstallment: number;
  totalRepayment: number;
  totalInterest: number;
  riskAnalysis: RiskAnalysis;
  status: 'pendente' | 'aprovado' | 'recusado' | 'desembolsado' | 'liquidado';
  analystNotes?: string;
  approvedAmount?: number;
  approvedAt?: string;
  disbursedAt?: string;
  createdAt: string;
  createdBy?: string;
  installments: Installment[];
  totalPaid: number;
  remainingBalance: number;
}

export interface PaymentRecord {
  id: string;
  creditId: string;
  clientId: string;
  clientName: string;
  installmentNumber: number;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: 'm-pesa' | 'e-mola' | 'm-kesh' | 'transferencia' | 'dinheiro' | 'outro';
  receiptNumber: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'gestor' | 'analista' | 'agente';
}
