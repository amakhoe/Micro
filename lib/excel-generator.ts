import * as XLSX from 'xlsx';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import { OverdueInstallment } from './overdue-service';

export function exportClientsExcel(clients: Client[], filename = 'Bayete_Clientes.xlsx') {
  const data = clients.map((c, index) => ({
    '#': index + 1,
    'Nome Completo': c.name,
    'Telemóvel': c.phone,
    'Email': c.email || 'N/A',
    'Residência': c.address,
    'BI': c.bi,
    'NUIT': c.nuit,
    'Rendimento / Salário (MT)': c.salary,
    'Profissão / Atividade': c.profession,
    'Estado': c.status.toUpperCase(),
    'Data de Registo': new Date(c.createdAt).toLocaleDateString('pt-MZ'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  XLSX.writeFile(workbook, filename);
}

export function exportCreditsExcel(credits: CreditApplication[], filename = 'Bayete_Analises_Creditos.xlsx') {
  const data = credits.map((cr, index) => ({
    '#': index + 1,
    'ID Crédito': cr.id.slice(0, 8),
    'Cliente': cr.clientName,
    'BI': cr.clientBi,
    'Telemóvel': cr.clientPhone,
    'Salário Declarado (MT)': cr.clientSalary,
    'Montante Solicitado (MT)': cr.requestedAmount,
    'Prazo (Meses)': cr.termMonths,
    'Taxa Juro (%)': `${cr.interestRate}%`,
    'Prestação Mensal (MT)': cr.monthlyInstallment,
    'Total a Reembolsar (MT)': cr.totalRepayment,
    'Total Pago (MT)': cr.totalPaid,
    'Saldo Devedor (MT)': cr.remainingBalance,
    'Taxa de Esforço (%)': `${cr.riskAnalysis.effortRate}%`,
    'Score Risco': `${cr.riskAnalysis.score}/100 (${cr.riskAnalysis.riskLevel.toUpperCase()})`,
    'Recomendação': cr.riskAnalysis.recommendation,
    'Estado': cr.status.toUpperCase(),
    'Finalidade': cr.purpose,
    'Data Solicitação': new Date(cr.createdAt).toLocaleDateString('pt-MZ'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Microcréditos');
  XLSX.writeFile(workbook, filename);
}

export function exportPaymentsExcel(payments: PaymentRecord[], filename = 'Bayete_Pagamentos.xlsx') {
  const data = payments.map((p, index) => ({
    '#': index + 1,
    'Recibo Nº': p.receiptNumber,
    'ID Crédito': p.creditId.slice(0, 8),
    'Cliente': p.clientName,
    'Parcela Nº': p.installmentNumber,
    'Valor Pago (MT)': p.amountPaid,
    'Método de Pagamento': p.paymentMethod.toUpperCase(),
    'Data de Pagamento': new Date(p.paymentDate).toLocaleDateString('pt-MZ'),
    'Observações': p.notes || '',
    'Registado Por': p.recordedBy || 'Sistema',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagamentos');
  XLSX.writeFile(workbook, filename);
}

export function exportCompletePortfolioExcel(
  clients: Client[],
  credits: CreditApplication[],
  payments: PaymentRecord[],
  filename = 'Bayete_Microcredito_Relatorio_Geral.xlsx'
) {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const totalDesembolsado = credits
    .filter((c) => c.status === 'desembolsado' || c.status === 'liquidado')
    .reduce((acc, c) => acc + c.requestedAmount, 0);

  const totalRecebido = payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalSaldoDevedor = credits
    .filter((c) => c.status === 'desembolsado')
    .reduce((acc, c) => acc + c.remainingBalance, 0);

  const summaryData = [
    { Indicador: 'Instituição', Valor: 'Bayete Microcrédito' },
    { Indicador: 'Data de Emissão', Valor: new Date().toLocaleString('pt-MZ') },
    { Indicador: 'Total de Empreendedores Registados', Valor: clients.length },
    { Indicador: 'Total de Propostas de Crédito', Valor: credits.length },
    { Indicador: 'Total Desembolsado (MT)', Valor: totalDesembolsado },
    { Indicador: 'Total Reembolsado/Recebido (MT)', Valor: totalRecebido },
    { Indicador: 'Carteira Ativa / Saldo Devedor (MT)', Valor: totalSaldoDevedor },
    {
      Indicador: 'Taxa de Cobrança / Recuperação Global',
      Valor: totalDesembolsado > 0 ? `${((totalRecebido / totalDesembolsado) * 100).toFixed(1)}%` : '0%',
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sumário Executivo');

  // Credits sheet
  const creditsData = credits.map((cr) => ({
    'ID': cr.id.slice(0, 8),
    'Empreendedor': cr.clientName,
    'BI': cr.clientBi,
    'Profissão': cr.clientProfession,
    'Montante (MT)': cr.requestedAmount,
    'Prestação Mensal (MT)': cr.monthlyInstallment,
    'Total Previsto (MT)': cr.totalRepayment,
    'Total Pago (MT)': cr.totalPaid,
    'Saldo Aberto (MT)': cr.remainingBalance,
    'Score Risco': cr.riskAnalysis.score,
    'Nível Risco': cr.riskAnalysis.riskLevel,
    'Estado': cr.status,
    'Data Submissão': new Date(cr.createdAt).toLocaleDateString('pt-MZ'),
  }));
  const creditsSheet = XLSX.utils.json_to_sheet(creditsData);
  XLSX.utils.book_append_sheet(workbook, creditsSheet, 'Créditos');

  // Clients sheet
  const clientsData = clients.map((c) => ({
    'Nome': c.name,
    'Telemóvel': c.phone,
    'Email': c.email,
    'Residência': c.address,
    'BI': c.bi,
    'NUIT': c.nuit,
    'Renda Mensal (MT)': c.salary,
    'Profissão': c.profession,
    'Estado': c.status,
  }));
  const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
  XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clientes');

  // Payments sheet
  const paymentsData = payments.map((p) => ({
    'Recibo': p.receiptNumber,
    'Cliente': p.clientName,
    'Valor (MT)': p.amountPaid,
    'Data': new Date(p.paymentDate).toLocaleDateString('pt-MZ'),
    'Método': p.paymentMethod,
    'ID Crédito': p.creditId.slice(0, 8),
  }));
  const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Histórico Pagamentos');

  XLSX.writeFile(workbook, filename);
}

export function exportOverdueExcel(
  overdueList: OverdueInstallment[],
  filename = `Bayete_Pagamentos_Atraso_${new Date().toISOString().split('T')[0]}.xlsx`
) {
  const data = overdueList.map((item, index) => ({
    '#': index + 1,
    'Nome do Cliente': item.clientName,
    'Telemóvel': item.clientPhone,
    'Email': item.clientEmail,
    'Residência': item.clientAddress,
    'BI': item.clientBi,
    'ID Crédito': item.creditId.slice(0, 8),
    'Parcela Nº': item.installmentNumber,
    'Total Parcelas': item.totalInstallments,
    'Data de Vencimento': item.dueDate,
    'Dias em Atraso': item.daysOverdue,
    'Gravidade': item.severity.toUpperCase(),
    'Valor Parcela (MT)': item.installmentAmount,
    'Multa / Juros Mora (MT)': item.penaltyFee,
    'Total Devido (MT)': item.totalDue,
    'Saldo Devedor Restante (MT)': item.remainingBalance,
    'Finalidade do Empréstimo': item.loanPurpose,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parcelas em Atraso');
  XLSX.writeFile(workbook, filename);
}

