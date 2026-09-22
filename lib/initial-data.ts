import { Client, CreditApplication, PaymentRecord } from '@/types';
import { calculateCredit } from './credit-calculator';

export const INITIAL_CLIENTS: Omit<Client, 'id'>[] = [
  {
    name: 'Esperança Mabunda',
    phone: '+258 84 312 8840',
    email: 'esperanca.mabunda@gmail.com',
    address: 'Bairro do Zimpeto, Quarteirão 14, Casa 28, Maputo',
    bi: '110100482914B',
    nuit: '109823451',
    salary: 28500,
    profession: 'Comércio de Frutas e Hortícolas a Grosso',
    notes: 'Vendedora no Mercado Grossista do Zimpeto há mais de 6 anos. Excelente movimentação de caixa.',
    status: 'ativo',
    createdAt: '2026-08-10T09:00:00.000Z',
  },
  {
    name: 'António Cuamba',
    phone: '+258 86 541 2099',
    email: 'antonio.cuamba.carp@gmail.com',
    address: 'Matola Gare, Rua da Cerâmica, Parcela 402, Matola',
    bi: '110200843105C',
    nuit: '104718920',
    salary: 42000,
    profession: 'Carpintaria e Mobiliário em Madeira',
    notes: 'Oficina própria com 3 aprendizes. Fabrica móveis por encomenda para residências e escritórios.',
    status: 'ativo',
    createdAt: '2026-08-15T11:30:00.000Z',
  },
  {
    name: 'Fátima Sulemane',
    phone: '+258 87 908 4431',
    email: 'fatima.sulemane@yahoo.com',
    address: 'Polana Caniço B, Avenida Vladimir Lenine, Maputo',
    bi: '110199723418D',
    nuit: '108834199',
    salary: 35000,
    profession: 'Alfaiataria e Confecção de Capulanas',
    notes: 'Fornecedora de uniformes e vestidos tradicionais. Ponto de venda estabelecido na Polana.',
    status: 'ativo',
    createdAt: '2026-08-22T14:15:00.000Z',
  },
  {
    name: 'Mateus Nhaca',
    phone: '+258 82 411 7890',
    email: 'mateus.nhaca@outlook.com',
    address: 'Bairro Chamanculo C, Rua 12, Maputo',
    bi: '110100654129M',
    nuit: '102948110',
    salary: 19000,
    profession: 'Oficina de Motociclos e Peças',
    notes: 'Mecânico local focado em manutenção de motas de entrega e taximotos.',
    status: 'ativo',
    createdAt: '2026-09-01T08:20:00.000Z',
  },
  {
    name: 'Joana Cossa',
    phone: '+258 84 990 1205',
    email: 'joana.cossa@gmail.com',
    address: 'Bairro Liberdade, Estrada Nacional Nº 4, Matola',
    bi: '110200194822F',
    nuit: '107412890',
    salary: 50000,
    profession: 'Mercearia e Pequena Panificação Comunitária',
    notes: 'Mercearia de bairro com fornecimento diário de pão fresco aos residentes.',
    status: 'ativo',
    createdAt: '2026-09-05T16:00:00.000Z',
  },
];

export function generateSeedCreditsAndPayments(clientsWithIds: Client[]): {
  credits: Omit<CreditApplication, 'id'>[];
  payments: Omit<PaymentRecord, 'id'>[];
} {
  const credits: Omit<CreditApplication, 'id'>[] = [];
  const payments: Omit<PaymentRecord, 'id'>[] = [];

  if (clientsWithIds.length === 0) return { credits, payments };

  // 1. Credit for Esperança Mabunda: 25.000 MT for 3 months (desembolsado com 2 pagamentos feitos)
  const c1 = clientsWithIds[0];
  const calc1 = calculateCredit(25000, 3, 5, c1.salary, new Date('2026-07-01'));
  const inst1 = [...calc1.installments];
  inst1[0].status = 'pago';
  inst1[0].paidAmount = inst1[0].amount;
  inst1[0].paidAt = '2026-08-01T10:00:00.000Z';
  inst1[0].paymentMethod = 'm-pesa';
  inst1[0].paymentRef = 'MP-892410';

  inst1[1].status = 'pago';
  inst1[1].paidAmount = inst1[1].amount;
  inst1[1].paidAt = '2026-09-01T14:30:00.000Z';
  inst1[1].paymentMethod = 'm-pesa';
  inst1[1].paymentRef = 'MP-910244';

  // Dynamic due dates for upcoming demo alerts within the next 7 days
  const upcomingDue1 = new Date();
  upcomingDue1.setDate(upcomingDue1.getDate() + 3);
  inst1[2].dueDate = upcomingDue1.toISOString().split('T')[0];

  const paidAmount1 = inst1[0].amount + inst1[1].amount;
  const cred1: Omit<CreditApplication, 'id'> = {
    clientId: c1.id,
    clientName: c1.name,
    clientPhone: c1.phone,
    clientEmail: c1.email,
    clientBi: c1.bi,
    clientNuit: c1.nuit,
    clientSalary: c1.salary,
    clientProfession: c1.profession,
    requestedAmount: 25000,
    termMonths: 3,
    interestRate: 5,
    purpose: 'Compra de 2 toneladas de cebola e batata a grosso no Zimpeto',
    monthlyInstallment: calc1.monthlyInstallment,
    totalRepayment: calc1.totalRepayment,
    totalInterest: calc1.totalInterest,
    riskAnalysis: calc1.riskAnalysis,
    status: 'desembolsado',
    approvedAmount: 25000,
    approvedAt: '2026-07-01T10:00:00.000Z',
    disbursedAt: '2026-07-02T12:00:00.000Z',
    createdAt: '2026-06-30T15:00:00.000Z',
    installments: inst1,
    totalPaid: paidAmount1,
    remainingBalance: calc1.totalRepayment - paidAmount1,
  };
  credits.push(cred1);

  // 2. Credit for António Cuamba: 60.000 MT for 6 months (aprovado recente)
  if (clientsWithIds.length > 1) {
    const c2 = clientsWithIds[1];
    const calc2 = calculateCredit(60000, 6, 4.5, c2.salary, new Date('2026-09-10'));
    credits.push({
      clientId: c2.id,
      clientName: c2.name,
      clientPhone: c2.phone,
      clientEmail: c2.email,
      clientBi: c2.bi,
      clientNuit: c2.nuit,
      clientSalary: c2.salary,
      clientProfession: c2.profession,
      requestedAmount: 60000,
      termMonths: 6,
      interestRate: 4.5,
      purpose: 'Aquisição de serra circular de bancada e lixadeira industrial',
      monthlyInstallment: calc2.monthlyInstallment,
      totalRepayment: calc2.totalRepayment,
      totalInterest: calc2.totalInterest,
      riskAnalysis: calc2.riskAnalysis,
      status: 'aprovado',
      approvedAmount: 60000,
      approvedAt: '2026-09-12T09:00:00.000Z',
      createdAt: '2026-09-10T10:00:00.000Z',
      installments: calc2.installments,
      totalPaid: 0,
      remainingBalance: calc2.totalRepayment,
    });
  }

  // 3. Credit for Fátima Sulemane: 40.000 MT for 4 months (desembolsado, 1 pagamento feito)
  if (clientsWithIds.length > 2) {
    const c3 = clientsWithIds[2];
    const calc3 = calculateCredit(40000, 4, 5, c3.salary, new Date('2026-08-20'));
    const inst3 = [...calc3.installments];
    inst3[0].status = 'pago';
    inst3[0].paidAmount = inst3[0].amount;
    inst3[0].paidAt = '2026-09-20T11:00:00.000Z';
    inst3[0].paymentMethod = 'e-mola';
    inst3[0].paymentRef = 'EM-44910';

    // Upcoming due date within 6 days for Fátima Sulemane
    const upcomingDue2 = new Date();
    upcomingDue2.setDate(upcomingDue2.getDate() + 6);
    if (inst3[1]) {
      inst3[1].dueDate = upcomingDue2.toISOString().split('T')[0];
    }

    credits.push({
      clientId: c3.id,
      clientName: c3.name,
      clientPhone: c3.phone,
      clientEmail: c3.email,
      clientBi: c3.bi,
      clientNuit: c3.nuit,
      clientSalary: c3.salary,
      clientProfession: c3.profession,
      requestedAmount: 40000,
      termMonths: 4,
      interestRate: 5,
      purpose: 'Estoque de 50 fardos de capulanas e tecidos para festa de final de ano',
      monthlyInstallment: calc3.monthlyInstallment,
      totalRepayment: calc3.totalRepayment,
      totalInterest: calc3.totalInterest,
      riskAnalysis: calc3.riskAnalysis,
      status: 'desembolsado',
      approvedAmount: 40000,
      approvedAt: '2026-08-21T10:00:00.000Z',
      disbursedAt: '2026-08-22T08:00:00.000Z',
      createdAt: '2026-08-20T14:00:00.000Z',
      installments: inst3,
      totalPaid: inst3[0].amount,
      remainingBalance: calc3.totalRepayment - inst3[0].amount,
    });
  }

  // 4. Credit for Mateus Nhaca: 15.000 MT for 2 months (em análise de risco)
  if (clientsWithIds.length > 3) {
    const c4 = clientsWithIds[3];
    const calc4 = calculateCredit(15000, 2, 6, c4.salary, new Date());
    credits.push({
      clientId: c4.id,
      clientName: c4.name,
      clientPhone: c4.phone,
      clientEmail: c4.email,
      clientBi: c4.bi,
      clientNuit: c4.nuit,
      clientSalary: c4.salary,
      clientProfession: c4.profession,
      requestedAmount: 15000,
      termMonths: 2,
      interestRate: 6,
      purpose: 'Reposição de kits de ferramentas e jogo de chaves pneumáticas',
      monthlyInstallment: calc4.monthlyInstallment,
      totalRepayment: calc4.totalRepayment,
      totalInterest: calc4.totalInterest,
      riskAnalysis: calc4.riskAnalysis,
      status: 'pendente',
      createdAt: '2026-09-18T10:30:00.000Z',
      installments: calc4.installments,
      totalPaid: 0,
      remainingBalance: calc4.totalRepayment,
    });
  }

  return { credits, payments };
}
