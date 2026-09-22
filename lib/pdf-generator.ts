import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, CreditApplication, PaymentRecord } from '@/types';
import { formatCurrencyMT } from './credit-calculator';
import { OverdueInstallment, OverdueSummary } from './overdue-service';

// Standard styling helper for Bayete documents
function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  // Brand header box
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(0, 0, 210, 26, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BAYETE MICROCRÉDITO', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(209, 250, 229);
  doc.text('Soluções Financeiras Rápidas para Pequenos Empreendedores Locais', 14, 18);

  // Subtitle / Document Title badge
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 40);

  // Date and reference
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-MZ')}`, 145, 35);
  doc.text('Moçambique | Registo Oficial', 145, 40);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 44, 196, 44);
}

function drawFooter(doc: jsPDF, pageNumber: number = 1) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 14, 196, pageHeight - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Bayete Microcrédito, Lda. • Apoio ao Microempreendedor • Maputo / Matola, Moçambique', 14, pageHeight - 9);
  doc.text(`Página ${pageNumber}`, 185, pageHeight - 9);
}

/**
 * PDF: Ficha Cadastral e Histórico do Cliente
 */
export function generateClientFilePDF(client: Client, credits: CreditApplication[]) {
  const doc = new jsPDF();

  drawHeader(doc, 'FICHA CADASTRAL DO EMPREENDEDOR', `Ref: CLI-${client.id.slice(0, 6).toUpperCase()}`);

  let y = 52;

  // Personal & Business Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 58, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 58, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text('DADOS PESSOAIS E PROFISSIONAIS', 18, y + 8);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('Nome Completo:', 18, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(client.name, 50, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Telemóvel:', 18, y + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(client.phone, 50, y + 25);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 18, y + 33);
  doc.setFont('helvetica', 'normal');
  doc.text(client.email || 'Não informado', 50, y + 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Residência:', 18, y + 41);
  doc.setFont('helvetica', 'normal');
  doc.text(client.address, 50, y + 41);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado do Cliente:', 18, y + 49);
  doc.setFont('helvetica', 'normal');
  doc.text(client.status.toUpperCase(), 50, y + 49);

  // Column 2
  const col2X = 110;
  doc.setFont('helvetica', 'bold');
  doc.text('Nº de BI:', col2X, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(client.bi, col2X + 25, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('NUIT:', col2X, y + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(client.nuit, col2X + 25, y + 25);

  doc.setFont('helvetica', 'bold');
  doc.text('Profissão/Ramo:', col2X, y + 33);
  doc.setFont('helvetica', 'normal');
  doc.text(client.profession, col2X + 25, y + 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Renda Declarada:', col2X, y + 41);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrencyMT(client.salary), col2X + 32, y + 41);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Cadastrado em:', col2X, y + 49);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(client.createdAt).toLocaleDateString('pt-MZ'), col2X + 32, y + 49);

  y += 66;

  // History of microcredits
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`HISTÓRICO DE MICROCRÉDITOS (${credits.length})`, 14, y);

  const tableData = credits.map((cr) => [
    cr.id.slice(0, 6).toUpperCase(),
    formatCurrencyMT(cr.requestedAmount),
    `${cr.termMonths} meses`,
    formatCurrencyMT(cr.monthlyInstallment),
    `${cr.riskAnalysis.score} pts (${cr.riskAnalysis.riskLevel})`,
    cr.status.toUpperCase(),
    formatCurrencyMT(cr.totalPaid),
    formatCurrencyMT(cr.remainingBalance),
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Ref.', 'Montante', 'Prazo', 'Prestação', 'Risco', 'Estado', 'Pago', 'Saldo']],
    body: tableData.length > 0 ? tableData : [['Nenhum microcrédito registado para este cliente', '', '', '', '', '', '', '']],
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, 1);
  doc.save(`Bayete_Ficha_Cliente_${client.name.replace(/\s+/g, '_')}.pdf`);
}

/**
 * PDF: Contrato e Análise de Crédito
 */
export function generateLoanAgreementPDF(credit: CreditApplication) {
  const doc = new jsPDF();

  drawHeader(doc, 'PROPOSTA E CONTRATO DE MICROCRÉDITO', `Contrato Nº: BAY-${credit.id.slice(0, 8).toUpperCase()}`);

  let y = 50;

  // Beneficiary Info & Risk Score side by side
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 105, 52, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 105, 52, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('DADOS DO BENEFICIÁRIO', 18, y + 8);

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Nome:', 18, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(credit.clientName, 35, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('BI:', 18, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(credit.clientBi, 35, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.text('NUIT:', 18, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(credit.clientNuit || 'N/A', 35, y + 30);

  doc.setFont('helvetica', 'bold');
  doc.text('Contacto:', 18, y + 37);
  doc.setFont('helvetica', 'normal');
  doc.text(credit.clientPhone, 35, y + 37);

  doc.setFont('helvetica', 'bold');
  doc.text('Atividade:', 18, y + 44);
  doc.setFont('helvetica', 'normal');
  doc.text(credit.clientProfession, 35, y + 44);

  // Financial summary box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(123, y, 73, 52, 2, 2, 'F');
  doc.roundedRect(123, y, 73, 52, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('CONDIÇÕES APROVADAS', 127, y + 8);

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Montante:', 127, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrencyMT(credit.requestedAmount), 160, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('Prazo:', 127, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(`${credit.termMonths} Meses`, 160, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.text('Taxa Juro:', 127, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`${credit.interestRate}% ao mês`, 160, y + 30);

  doc.setFont('helvetica', 'bold');
  doc.text('Prestação:', 127, y + 37);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrencyMT(credit.monthlyInstallment), 160, y + 37);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Total c/ Juros:', 127, y + 44);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrencyMT(credit.totalRepayment), 160, y + 44);

  y += 58;

  // Credit Analysis & Risk Section
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'F');
  doc.roundedRect(14, y, 182, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PARECER DE ANÁLISE DE RISCO BAYETE:', 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Score: ${credit.riskAnalysis.score}/100 • Risco: ${credit.riskAnalysis.riskLevel.toUpperCase()} • Taxa de Esforço: ${credit.riskAnalysis.effortRate}% da Renda Mensal`,
    18,
    y + 14
  );
  doc.text(`Recomendação Técnica: ${credit.riskAnalysis.recommendation} | Finalidade: ${credit.purpose}`, 18, y + 20);

  y += 32;

  // Amortization Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('CRONOGRAMA DE PAGAMENTOS / AMORTIZAÇÃO', 14, y);

  const installmentRows = credit.installments.map((inst) => [
    `Prestação #${inst.number}`,
    new Date(inst.dueDate).toLocaleDateString('pt-MZ'),
    formatCurrencyMT(inst.principal),
    formatCurrencyMT(inst.interest),
    formatCurrencyMT(inst.amount),
    inst.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Parcela', 'Vencimento', 'Capital', 'Juro', 'Total Parcela', 'Situação']],
    body: installmentRows,
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 50;

  // Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Ao assinar, o mutuário confirma a veracidade das informações e o compromisso pontual de liquidação.', 14, finalY + 14);

  // Line for client
  doc.setDrawColor(148, 163, 184);
  doc.line(20, finalY + 32, 85, finalY + 32);
  doc.text('Assinatura do Empreendedor / Mutuário', 22, finalY + 36);

  // Line for Bayete
  doc.line(125, finalY + 32, 190, finalY + 32);
  doc.text('Pela Bayete Microcrédito (Comitê de Crédito)', 127, finalY + 36);

  drawFooter(doc, 1);
  doc.save(`Bayete_Contrato_${credit.clientName.replace(/\s+/g, '_')}_${credit.id.slice(0, 6)}.pdf`);
}

/**
 * PDF: Recibo Oficial de Pagamento
 */
export function generatePaymentReceiptPDF(payment: PaymentRecord, credit?: CreditApplication) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Compact elegant receipt format
  });

  // Green header band
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, 148, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('BAYETE MICROCRÉDITO', 10, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(209, 250, 229);
  doc.text('Recibo Oficial de Pagamento e Amortização', 10, 16);

  // Receipt Number
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`RECIBO Nº: ${payment.receiptNumber}`, 10, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Data do Pagamento: ${new Date(payment.paymentDate).toLocaleDateString('pt-MZ')}`, 10, 36);

  // Receipt Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, 40, 128, 62, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 40, 128, 62, 2, 2, 'S');

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Empreendedor / Cliente:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.clientName, 55, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('ID do Microcrédito:', 14, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.creditId.slice(0, 8).toUpperCase(), 55, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Parcela Referente:', 14, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prestação Nº ${payment.installmentNumber}`, 55, 64);

  doc.setFont('helvetica', 'bold');
  doc.text('Forma de Pagamento:', 14, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.paymentMethod.toUpperCase(), 55, 72);

  doc.setFont('helvetica', 'bold');
  doc.text('Registado Por:', 14, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.recordedBy || 'Operações Bayete', 55, 80);

  if (payment.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 14, 88);
    doc.setFont('helvetica', 'normal');
    doc.text(payment.notes, 55, 88);
  }

  // Amount Callout
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(10, 106, 128, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('VALOR PAGO:', 16, 118);

  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87);
  doc.text(formatCurrencyMT(payment.amountPaid), 70, 119);

  if (credit) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Saldo remanescente do crédito: ${formatCurrencyMT(credit.remainingBalance)}`, 16, 132);
  }

  // Stamp / Signature
  doc.setDrawColor(203, 213, 225);
  doc.line(35, 170, 115, 170);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura e Carimbo Autorizado Bayete', 45, 175);

  doc.setFontSize(6.5);
  doc.text('Documento processado por computador • Validade legal em conformidade com o Banco de Moçambique', 10, 195);

  doc.save(`Recibo_Bayete_${payment.receiptNumber}.pdf`);
}

/**
 * PDF: Relatório Geral da Carteira e Desempenho
 */
export function generatePortfolioReportPDF(
  clients: Client[],
  credits: CreditApplication[],
  payments: PaymentRecord[]
) {
  const doc = new jsPDF();

  drawHeader(doc, 'RELATÓRIO GERAL DA CARTEIRA DE MICROCRÉDITO', 'Desempenho Operacional, Solvência e Amortizações');

  let y = 50;

  const totalDesembolsado = credits
    .filter((c) => c.status === 'desembolsado' || c.status === 'liquidado')
    .reduce((acc, c) => acc + c.requestedAmount, 0);

  const totalRecebido = payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalCarteiraAtiva = credits
    .filter((c) => c.status === 'desembolsado')
    .reduce((acc, c) => acc + c.remainingBalance, 0);

  const totalAprovados = credits.filter((c) => c.status === 'aprovado' || c.status === 'desembolsado').length;
  const taxaRecuperacao = totalDesembolsado > 0 ? ((totalRecebido / totalDesembolsado) * 100).toFixed(1) : '0';

  // KPI boxes (4 metrics)
  const boxWidth = 42;
  const metrics = [
    { title: 'Total Desembolsado', val: formatCurrencyMT(totalDesembolsado), color: [6, 78, 59] },
    { title: 'Total Reembolsado', val: formatCurrencyMT(totalRecebido), color: [16, 185, 129] },
    { title: 'Saldo em Cobrança', val: formatCurrencyMT(totalCarteiraAtiva), color: [217, 119, 6] },
    { title: 'Recuperação Global', val: `${taxaRecuperacao}%`, color: [30, 41, 59] },
  ];

  metrics.forEach((m, idx) => {
    const bx = 14 + idx * (boxWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, y, boxWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title, bx + 3, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, bx + 3, y + 16);
  });

  y += 30;

  // Credits summary table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`OPERAÇÕES E CRÉDITOS REGISTADOS (${credits.length})`, 14, y);

  const creditsTable = credits.map((cr) => [
    cr.clientName,
    cr.clientProfession,
    formatCurrencyMT(cr.requestedAmount),
    `${cr.termMonths}m (${cr.interestRate}%)`,
    formatCurrencyMT(cr.monthlyInstallment),
    formatCurrencyMT(cr.totalPaid),
    formatCurrencyMT(cr.remainingBalance),
    cr.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Cliente', 'Atividade', 'Montante', 'Prazo/Taxa', 'Prestação', 'Amortizado', 'Saldo', 'Estado']],
    body: creditsTable.length > 0 ? creditsTable : [['Nenhum crédito registado', '', '', '', '', '', '', '']],
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, 1);
  doc.save(`Bayete_Relatorio_Geral_Carteira_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * PDF: Relatório Executivo de Pagamentos em Atraso & Cobrança
 */
export function generateOverdueReportPDF(
  overdueList: OverdueInstallment[],
  summary: OverdueSummary
) {
  const doc = new jsPDF();
  drawHeader(
    doc,
    'RELATÓRIO OFICIAL DE PAGAMENTOS EM ATRASO & RECUPERAÇÃO DE CRÉDITO',
    'Auditoria de Inadimplência, Carteira em Risco (PAR) e Gestão de Cobrança'
  );

  let y = 50;

  // Metric Cards
  const kpis = [
    { title: 'Capital em Atraso', val: formatCurrencyMT(summary.totalPrincipalOverdue), color: [185, 28, 28] },
    { title: 'Juros Mora / Multas', val: formatCurrencyMT(summary.totalPenaltyFees), color: [194, 65, 12] },
    { title: 'Total a Regularizar', val: formatCurrencyMT(summary.totalAmountDue), color: [6, 78, 59] },
    { title: 'PAR / Taxa de Risco', val: `${summary.parRate}%`, color: [99, 102, 241] },
  ];

  const boxWidth = 42;
  kpis.forEach((m, idx) => {
    const bx = 14 + idx * (boxWidth + 5);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, y, boxWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title, bx + 3, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, bx + 3, y + 16);
  });

  y += 28;

  // Aging bracket summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTRATIFICAÇÃO TEMPORAL DA MORA', 14, y);

  const bracketsTable = [
    ['1 a 15 Dias (Leve)', `${summary.brackets.leve.count} parcelas`, formatCurrencyMT(summary.brackets.leve.amount), 'Lembrete SMS / WhatsApp'],
    ['16 a 30 Dias (Médio)', `${summary.brackets.medio.count} parcelas`, formatCurrencyMT(summary.brackets.medio.amount), 'Contacto Telefónico Direto'],
    ['31 a 60 Dias (Grave)', `${summary.brackets.grave.count} parcelas`, formatCurrencyMT(summary.brackets.grave.amount), 'Notificação Escrita e Visita'],
    ['+60 Dias (Crítico)', `${summary.brackets.critico.count} parcelas`, formatCurrencyMT(summary.brackets.critico.amount), 'Contencioso / Garantias'],
  ];

  autoTable(doc, {
    startY: y + 3,
    head: [['Faixa de Atraso', 'Qtd.', 'Montante (MT)', 'Procedimento']],
    body: bracketsTable,
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    margin: { left: 14, right: 14 },
  });

  // Next section: Detailed table
  // @ts-expect-error autoTable adds lastAutoTable to doc
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 35;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`CLIENTES COM PARCELAS EM ATRASO (${overdueList.length})`, 14, finalY);

  const detailRows = overdueList.map((item, index) => [
    (index + 1).toString(),
    item.clientName,
    item.clientPhone,
    item.clientBi,
    `#${item.installmentNumber}/${item.totalInstallments}`,
    item.dueDate,
    `${item.daysOverdue} d`,
    formatCurrencyMT(item.installmentAmount),
    formatCurrencyMT(item.penaltyFee),
    formatCurrencyMT(item.totalDue),
  ]);

  autoTable(doc, {
    startY: finalY + 3,
    head: [['#', 'Cliente', 'Telemóvel', 'BI', 'Parc.', 'Venc.', 'Dias', 'Capital', 'Multa', 'Exigível']],
    body: detailRows.length > 0 ? detailRows : [['-', 'Nenhum atraso registado', '-', '-', '-', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, 1);
  doc.save(`Bayete_Relatorio_Pagamentos_Atraso_${new Date().toISOString().split('T')[0]}.pdf`);
}

