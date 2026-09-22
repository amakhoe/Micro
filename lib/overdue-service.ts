import { CreditApplication, Client } from '@/types';
import { formatCurrencyMT } from './credit-calculator';

export type OverdueSeverity = 'leve' | 'medio' | 'grave' | 'critico';

export interface OverdueInstallment {
  creditId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientBi: string;
  clientAddress: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  daysOverdue: number;
  installmentAmount: number;
  penaltyFee: number;
  totalDue: number;
  remainingBalance: number;
  loanPurpose: string;
  severity: OverdueSeverity;
  monthlyIncome?: number;
}

export interface OverdueSummary {
  totalOverdueCount: number;
  affectedClientsCount: number;
  totalPrincipalOverdue: number;
  totalPenaltyFees: number;
  totalAmountDue: number;
  totalActivePortfolio: number;
  parRate: number; // Portfolio at Risk %
  brackets: {
    leve: { count: number; amount: number; label: string };   // 1 - 15 dias
    medio: { count: number; amount: number; label: string };  // 16 - 30 dias
    grave: { count: number; amount: number; label: string };  // 31 - 60 dias
    critico: { count: number; amount: number; label: string }; // > 60 dias
  };
}

/**
 * Calculates all overdue installments based on active credits and reference date
 */
export function getOverdueInstallments(
  credits: CreditApplication[],
  clients: Client[] = [],
  referenceDate: Date = new Date()
): OverdueInstallment[] {
  const overdueList: OverdueInstallment[] = [];
  const refTime = referenceDate.getTime();
  const refDateStr = referenceDate.toISOString().slice(0, 10);

  // Map clients for quick lookup
  const clientMap = new Map<string, Client>();
  clients.forEach((c) => clientMap.set(c.id, c));

  credits.forEach((credit) => {
    // Only disbursed loans with balance can be overdue
    if (credit.status !== 'desembolsado' || credit.remainingBalance <= 0) {
      return;
    }

    const client = clientMap.get(credit.clientId);
    const clientEmail = client?.email || credit.clientEmail || 'cliente@bayete.co.mz';
    const clientPhone = client?.phone || credit.clientPhone || '+258 84 000 0000';
    const clientBi = client?.bi || credit.clientBi || 'N/A';
    const clientAddress = client?.address || 'Moçambique';
    const clientSalary = client?.salary || credit.clientSalary || 0;

    credit.installments.forEach((inst) => {
      // Check if installment is unpaid and due date has passed or status is explicitly 'atrasado'
      const isPastDue = inst.dueDate < refDateStr;
      const isUnpaid = inst.status !== 'pago';

      if (isUnpaid && (isPastDue || inst.status === 'atrasado')) {
        const dueDateObj = new Date(inst.dueDate + 'T23:59:59');
        const diffMs = refTime - dueDateObj.getTime();
        const rawDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const daysOverdue = isPastDue ? rawDays : 1;

        // Calculate severity bracket
        let severity: OverdueSeverity = 'leve';
        if (daysOverdue > 60) {
          severity = 'critico';
        } else if (daysOverdue > 30) {
          severity = 'grave';
        } else if (daysOverdue > 15) {
          severity = 'medio';
        } else {
          severity = 'leve';
        }

        // Standard late fee/penalty: 2% of installment + 25 MT per week of delay
        const basePenalty = Math.round(inst.amount * 0.02);
        const weeklyPenalty = Math.round(Math.floor(daysOverdue / 7) * 25);
        const penaltyFee = Math.max(50, basePenalty + weeklyPenalty);
        const totalDue = inst.amount + penaltyFee;

        overdueList.push({
          creditId: credit.id,
          clientId: credit.clientId,
          clientName: credit.clientName,
          clientPhone,
          clientEmail,
          clientBi,
          clientAddress,
          installmentNumber: inst.number,
          totalInstallments: credit.installments.length,
          dueDate: inst.dueDate,
          daysOverdue,
          installmentAmount: inst.amount,
          penaltyFee,
          totalDue,
          remainingBalance: credit.remainingBalance,
          loanPurpose: credit.purpose,
          severity,
          monthlyIncome: clientSalary,
        });
      }
    });
  });

  // Sort by highest days overdue first
  return overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Aggregates overdue statistics and portfolio risk
 */
export function getOverdueSummary(
  overdueList: OverdueInstallment[],
  credits: CreditApplication[] = []
): OverdueSummary {
  const uniqueClients = new Set<string>();
  let totalPrincipal = 0;
  let totalPenalty = 0;

  const brackets = {
    leve: { count: 0, amount: 0, label: '1 - 15 dias (Atraso Leve)' },
    medio: { count: 0, amount: 0, label: '16 - 30 dias (Alerta Médio)' },
    grave: { count: 0, amount: 0, label: '31 - 60 dias (Cobrança Ativa)' },
    critico: { count: 0, amount: 0, label: '> 60 dias (Contencioso / Crítico)' },
  };

  overdueList.forEach((item) => {
    uniqueClients.add(item.clientId);
    totalPrincipal += item.installmentAmount;
    totalPenalty += item.penaltyFee;

    brackets[item.severity].count += 1;
    brackets[item.severity].amount += item.installmentAmount;
  });

  const totalActivePortfolio = credits
    .filter((c) => c.status === 'desembolsado')
    .reduce((sum, c) => sum + c.remainingBalance, 0);

  const parRate =
    totalActivePortfolio > 0
      ? Number(((totalPrincipal / totalActivePortfolio) * 100).toFixed(1))
      : 0;

  return {
    totalOverdueCount: overdueList.length,
    affectedClientsCount: uniqueClients.size,
    totalPrincipalOverdue: totalPrincipal,
    totalPenaltyFees: totalPenalty,
    totalAmountDue: totalPrincipal + totalPenalty,
    totalActivePortfolio,
    parRate,
    brackets,
  };
}

/**
 * Builds standard email subject line
 */
export function buildOverdueEmailSubject(
  summary: OverdueSummary,
  type: 'executivo' | 'diario' | 'cliente' = 'executivo',
  clientName?: string
): string {
  const today = new Date().toLocaleDateString('pt-MZ');
  if (type === 'cliente' && clientName) {
    return `[BAYETE MICROCRÉDITO] Aviso de Vencimento e Regularização de Parcela - ${clientName}`;
  }
  if (type === 'diario') {
    return `[BAYETE] Resumo Diário de Cobrança - ${summary.totalOverdueCount} Parcelas em Atraso (${today})`;
  }
  return `[BAYETE] Relatório Executivo de Pagamentos em Atraso & PAR (${today})`;
}

/**
 * Generates rich HTML email for Management/Executive Overdue Report
 */
export function generateOverdueEmailHTML(
  summary: OverdueSummary,
  overdueList: OverdueInstallment[],
  options: {
    recipientName?: string;
    customNote?: string;
  } = {}
): string {
  const todayFormatted = new Date().toLocaleDateString('pt-MZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tableRows = overdueList
    .map((item, idx) => {
      const severityColor =
        item.severity === 'critico'
          ? '#991b1b'
          : item.severity === 'grave'
          ? '#c2410c'
          : item.severity === 'medio'
          ? '#b45309'
          : '#047857';

      const severityBg =
        item.severity === 'critico'
          ? '#fee2e2'
          : item.severity === 'grave'
          ? '#ffedd5'
          : item.severity === 'medio'
          ? '#fef3c7'
          : '#d1fae5';

      return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 10px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 10px;">
          <strong style="color: #0f172a; font-size: 13px; display: block;">${item.clientName}</strong>
          <span style="color: #64748b; font-size: 11px;">BI: ${item.clientBi} | Tel: ${item.clientPhone}</span>
        </td>
        <td style="padding: 10px; color: #334155;">Parcela ${item.installmentNumber}/${item.totalInstallments}</td>
        <td style="padding: 10px; color: #64748b;">${item.dueDate}</td>
        <td style="padding: 10px; text-align: center;">
          <span style="background-color: ${severityBg}; color: ${severityColor}; padding: 3px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">
            ${item.daysOverdue} dias
          </span>
        </td>
        <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">
          ${formatCurrencyMT(item.installmentAmount)}
        </td>
        <td style="padding: 10px; text-align: right; font-family: monospace; color: #b91c1c;">
          ${formatCurrencyMT(item.penaltyFee)}
        </td>
        <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: bold; color: #b91c1c; background-color: #fef2f2;">
          ${formatCurrencyMT(item.totalDue)}
        </td>
      </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório de Cobrança Bayete Microcrédito</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- Top Brand Header -->
    <div style="background-color: #064e3b; padding: 24px; color: #ffffff;">
      <table style="width: 100%;">
        <tr>
          <td>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">BAYETE MICROCRÉDITO</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #a7f3d0;">Departamento de Risco, Cobrança & Gestão de Crédito</p>
          </td>
          <td style="text-align: right;">
            <span style="display: inline-block; background-color: #047857; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold;">
              RELATÓRIO OFICIAL
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Subheader Info -->
    <div style="padding: 20px 24px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
      <table style="width: 100%;">
        <tr>
          <td>
            <h2 style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 700;">Relatório de Inadimplência & Pagamentos em Atraso</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Emitido para: <strong>${options.recipientName || 'Direção e Gestão Operacional'}</strong> • Data: ${todayFormatted}</p>
          </td>
        </tr>
      </table>
      ${options.customNote ? `
      <div style="margin-top: 12px; padding: 10px 14px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 12px; color: #92400e;">
        <strong>Nota da Gestão:</strong> ${options.customNote}
      </div>` : ''}
    </div>

    <!-- Main KPI Cards Strip -->
    <div style="padding: 20px 24px;">
      <table style="width: 100%; border-spacing: 12px 0; margin-left: -12px; margin-right: -12px;">
        <tr>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
            <span style="font-size: 11px; color: #64748b; font-weight: 600; display: block; text-transform: uppercase;">Total em Atraso</span>
            <span style="font-size: 18px; font-weight: 800; color: #b91c1c; font-family: monospace; display: block; margin-top: 4px;">${formatCurrencyMT(summary.totalPrincipalOverdue)}</span>
            <span style="font-size: 10px; color: #94a3b8;">Capital Vencido</span>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
            <span style="font-size: 11px; color: #64748b; font-weight: 600; display: block; text-transform: uppercase;">Juros Mora / Multas</span>
            <span style="font-size: 18px; font-weight: 800; color: #c2410c; font-family: monospace; display: block; margin-top: 4px;">${formatCurrencyMT(summary.totalPenaltyFees)}</span>
            <span style="font-size: 10px; color: #94a3b8;">Penalizações</span>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
            <span style="font-size: 11px; color: #64748b; font-weight: 600; display: block; text-transform: uppercase;">Montante a Cobrar</span>
            <span style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace; display: block; margin-top: 4px;">${formatCurrencyMT(summary.totalAmountDue)}</span>
            <span style="font-size: 10px; color: #059669; font-weight: bold;">Total Exigível</span>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
            <span style="font-size: 11px; color: #64748b; font-weight: 600; display: block; text-transform: uppercase;">Carteira em Risco (PAR)</span>
            <span style="font-size: 18px; font-weight: 800; color: #6366f1; font-family: monospace; display: block; margin-top: 4px;">${summary.parRate}%</span>
            <span style="font-size: 10px; color: #94a3b8;">${summary.affectedClientsCount} cliente(s)</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Aging Distribution Section -->
    <div style="padding: 0 24px 16px;">
      <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
        Estratificação de Atraso por Faixa Temporal
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <tr style="border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">
          <th style="padding: 8px 12px; text-align: left;">Faixa de Atraso</th>
          <th style="padding: 8px 12px; text-align: center;">Qtd. Parcelas</th>
          <th style="padding: 8px 12px; text-align: right;">Volume (MT)</th>
          <th style="padding: 8px 12px; text-align: right;">Ação Recomendada</th>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px;">🟢 1 a 15 Dias (Leve)</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold;">${summary.brackets.leve.count}</td>
          <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${formatCurrencyMT(summary.brackets.leve.amount)}</td>
          <td style="padding: 8px 12px; text-align: right; color: #047857; font-size: 11px;">Lembrete SMS / WhatsApp</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px;">🟡 16 a 30 Dias (Médio)</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold;">${summary.brackets.medio.count}</td>
          <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${formatCurrencyMT(summary.brackets.medio.amount)}</td>
          <td style="padding: 8px 12px; text-align: right; color: #b45309; font-size: 11px;">Contacto Telefónico Direto</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px;">🟠 31 a 60 Dias (Grave)</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold;">${summary.brackets.grave.count}</td>
          <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${formatCurrencyMT(summary.brackets.grave.amount)}</td>
          <td style="padding: 8px 12px; text-align: right; color: #c2410c; font-size: 11px;">Visita Presencial ao Negócio</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px;">🔴 Acima de 60 Dias (Crítico)</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold;">${summary.brackets.critico.count}</td>
          <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${formatCurrencyMT(summary.brackets.critico.amount)}</td>
          <td style="padding: 8px 12px; text-align: right; color: #991b1b; font-size: 11px;">Execução de Garantias / Cobrança Formal</td>
        </tr>
      </table>
    </div>

    <!-- Detailed Borrowers Table -->
    <div style="padding: 8px 24px 24px;">
      <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
        Lista de Empreendedores com Parcelas em Atraso (${overdueList.length})
      </h3>

      ${
        overdueList.length === 0
          ? `
        <div style="padding: 24px; text-align: center; background-color: #ecfdf5; border: 1px dashed #10b981; border-radius: 8px; color: #065f46;">
          <p style="margin: 0; font-weight: bold;">Excelente notícia! Não existem parcelas em atraso na carteira da Bayete.</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #047857;">Todos os microempréstimos ativos estão em dia com os seus pagamentos.</p>
        </div>
      `
          : `
        <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px; text-align: center;">#</th>
                <th style="padding: 10px; text-align: left;">Cliente / Contacto</th>
                <th style="padding: 10px; text-align: left;">Parcela</th>
                <th style="padding: 10px; text-align: left;">Vencimento</th>
                <th style="padding: 10px; text-align: center;">Atraso</th>
                <th style="padding: 10px; text-align: right;">Valor</th>
                <th style="padding: 10px; text-align: right;">Multa</th>
                <th style="padding: 10px; text-align: right;">Total Devido</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `
      }
    </div>

    <!-- Settlement Instructions & Official Channels -->
    <div style="padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px;">
      <h4 style="margin: 0 0 8px; font-size: 12px; color: #0f172a; text-transform: uppercase; font-weight: 700;">
        Canais Oficiais de Liquidação Bayete Microcrédito:
      </h4>
      <table style="width: 100%; font-size: 11px; color: #475569;">
        <tr>
          <td>🟢 <strong>M-Pesa:</strong> 84 990 0000 (Bayete Microcrédito)</td>
          <td>🟠 <strong>E-Mola:</strong> 86 500 0000 (Bayete Microcrédito)</td>
        </tr>
        <tr>
          <td>🏦 <strong>Millennium BIM:</strong> Conta 198234710 • NIB: 0001.0000.19823471012.33</td>
          <td>🏦 <strong>BCI:</strong> Conta 881240901 • NIB: 0008.0000.88124090123.44</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 24px; background-color: #064e3b; color: #a7f3d0; font-size: 11px; text-align: center;">
      <p style="margin: 0;">Bayete Microcrédito, Lda. • Apoio Financeiro ao Pequeno Empreendedor</p>
      <p style="margin: 4px 0 0; color: #6ee7b7; font-size: 10px;">Avenida 25 de Setembro, Maputo / Matola, Moçambique • Linha de Apoio: +258 84 000 0000</p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Generates plain text version for standard email clients or clipboard
 */
export function generateOverdueEmailPlainText(
  summary: OverdueSummary,
  overdueList: OverdueInstallment[],
  options: { recipientName?: string; customNote?: string } = {}
): string {
  const dateStr = new Date().toLocaleDateString('pt-MZ');
  const divider = '============================================================';
  const subDivider = '------------------------------------------------------------';

  let text = `${divider}\n`;
  text += `BAYETE MICROCRÉDITO - RELATÓRIO DE PAGAMENTOS EM ATRASO\n`;
  text += `Data de Emissão: ${dateStr}\n`;
  text += `Destinatário: ${options.recipientName || 'Direção e Gestão Operacional'}\n`;
  text += `${divider}\n\n`;

  if (options.customNote) {
    text += `NOTA DA GESTÃO:\n${options.customNote}\n\n`;
  }

  text += `RESUMO EXECUTIVO DE COBRANÇA:\n`;
  text += `• Total de Parcelas Vencidas: ${summary.totalOverdueCount}\n`;
  text += `• Clientes com Atraso: ${summary.affectedClientsCount}\n`;
  text += `• Capital Vencido (Principal): ${formatCurrencyMT(summary.totalPrincipalOverdue)}\n`;
  text += `• Multas / Juros de Mora: ${formatCurrencyMT(summary.totalPenaltyFees)}\n`;
  text += `• TOTAL EXIGÍVEL: ${formatCurrencyMT(summary.totalAmountDue)}\n`;
  text += `• Taxa de Carteira em Risco (PAR): ${summary.parRate}%\n\n`;

  text += `ESTRATIFICAÇÃO POR DIAS DE ATRASO:\n`;
  text += `• 1 a 15 Dias:  ${summary.brackets.leve.count} parcelas | ${formatCurrencyMT(summary.brackets.leve.amount)}\n`;
  text += `• 16 a 30 Dias: ${summary.brackets.medio.count} parcelas | ${formatCurrencyMT(summary.brackets.medio.amount)}\n`;
  text += `• 31 a 60 Dias: ${summary.brackets.grave.count} parcelas | ${formatCurrencyMT(summary.brackets.grave.amount)}\n`;
  text += `• +60 Dias:     ${summary.brackets.critico.count} parcelas | ${formatCurrencyMT(summary.brackets.critico.amount)}\n\n`;

  text += `${subDivider}\n`;
  text += `LISTA ANALÍTICA DE CLIENTES EM MORA (${overdueList.length}):\n`;
  text += `${subDivider}\n`;

  if (overdueList.length === 0) {
    text += `Nenhum crédito em atraso na carteira da Bayete. Todos os pagamentos em dia.\n\n`;
  } else {
    overdueList.forEach((item, i) => {
      text += `${i + 1}. ${item.clientName.toUpperCase()}\n`;
      text += `   BI: ${item.clientBi} | Tel: ${item.clientPhone} | Email: ${item.clientEmail}\n`;
      text += `   Parcela: #${item.installmentNumber}/${item.totalInstallments} | Venceu a: ${item.dueDate} (${item.daysOverdue} dias de atraso)\n`;
      text += `   Valor Parcela: ${formatCurrencyMT(item.installmentAmount)} | Mora: ${formatCurrencyMT(item.penaltyFee)}\n`;
      text += `   TOTAL A REGULARIZAR: ${formatCurrencyMT(item.totalDue)}\n`;
      text += `   Saldo Global do Crédito: ${formatCurrencyMT(item.remainingBalance)}\n\n`;
    });
  }

  text += `${divider}\n`;
  text += `CANAIS DE PAGAMENTO BAYETE:\n`;
  text += `• M-Pesa: 84 990 0000 (Bayete Microcrédito)\n`;
  text += `• E-Mola: 86 500 0000 (Bayete Microcrédito)\n`;
  text += `• Millennium BIM: Conta 198234710 (NIB: 0001.0000.19823471012.33)\n`;
  text += `• Linha de Apoio / Cobrança: +258 84 000 0000 / +258 86 000 0000\n`;
  text += `${divider}\n`;

  return text;
}

/**
 * Generates an Individual Formal Notice HTML Email for a specific overdue debtor
 */
export function generateClientNoticeEmailHTML(item: OverdueInstallment): string {
  const dateStr = new Date().toLocaleDateString('pt-MZ');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aviso de Regularização de Parcela - Bayete Microcrédito</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
    
    <div style="background-color: #064e3b; padding: 20px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 18px; font-weight: bold;">BAYETE MICROCRÉDITO</h1>
      <p style="margin: 4px 0 0; font-size: 11px; color: #a7f3d0;">Aviso Formal de Vencimento e Regularização Financeira</p>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 14px; margin: 0 0 16px;">
        Exmo(a). Sr(a). <strong>${item.clientName}</strong>,
      </p>

      <p style="font-size: 13px; color: #334155; line-height: 1.6; margin: 0 0 16px;">
        Vimos por este meio informar que a <strong>Parcela nº ${item.installmentNumber}</strong> referente ao seu microempréstimo contraído na <strong>Bayete Microcrédito</strong> encontrava-se com vencimento previsto para o dia <strong>${item.dueDate}</strong>, encontrando-se atualmente com <strong>${item.daysOverdue} dia(s) de atraso</strong>.
      </p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px; font-size: 12px; color: #991b1b; text-transform: uppercase;">
          Demonstrativo da Parcela em Atraso:
        </h4>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="color: #64748b; padding: 3px 0;">Valor Original da Parcela:</td>
            <td style="text-align: right; font-weight: bold; font-family: monospace;">${formatCurrencyMT(item.installmentAmount)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 3px 0;">Juros de Mora / Encargos:</td>
            <td style="text-align: right; font-weight: bold; color: #b91c1c; font-family: monospace;">${formatCurrencyMT(item.penaltyFee)}</td>
          </tr>
          <tr style="border-top: 1px solid #fca5a5; font-size: 13px;">
            <td style="padding: 8px 0 0; font-weight: bold; color: #991b1b;">TOTAL A REGULARIZAR:</td>
            <td style="padding: 8px 0 0; text-align: right; font-weight: 800; color: #991b1b; font-family: monospace;">${formatCurrencyMT(item.totalDue)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #334155; line-height: 1.6; margin: 0 0 16px;">
        Solicitamos a liquidação do montante acima através dos nossos canais imediatos para evitar penalizações adicionais e preservar o seu bom histórico de crédito para renovações futuras.
      </p>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12px;">
        <strong style="display: block; margin-bottom: 6px; color: #0f172a;">Como Efetuar o Pagamento:</strong>
        <div style="margin-bottom: 4px;">🟢 <strong>M-Pesa:</strong> 84 990 0000 (Bayete Microcrédito)</div>
        <div style="margin-bottom: 4px;">🟠 <strong>E-Mola:</strong> 86 500 0000 (Bayete Microcrédito)</div>
        <div>🏦 <strong>BIM / BCI:</strong> Transferência bancária para a conta oficial da Bayete</div>
      </div>

      <p style="font-size: 12px; color: #64748b; margin: 0;">
        Após o pagamento, envie o comprovativo por WhatsApp para <strong>+258 84 000 0000</strong> ou responda a este email.
      </p>
    </div>

    <div style="padding: 12px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #64748b;">
      Emitido em ${dateStr} • Bayete Microcrédito, Lda.
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Generates an Individual Formal Notice Plain Text for a specific overdue debtor
 */
export function generateClientNoticePlainText(item: OverdueInstallment): string {
  const dateStr = new Date().toLocaleDateString('pt-MZ');
  return `BAYETE MICROCRÉDITO - AVISO DE COBRANÇA
Data: ${dateStr}

Prezado(a) ${item.clientName},

Informamos que a Parcela nº ${item.installmentNumber} do seu microcrédito venceu em ${item.dueDate} e está com ${item.daysOverdue} dia(s) de atraso.

• Valor da Parcela: ${formatCurrencyMT(item.installmentAmount)}
• Juros de Mora / Multa: ${formatCurrencyMT(item.penaltyFee)}
• TOTAL A REGULARIZAR: ${formatCurrencyMT(item.totalDue)}

CANAIS DE PAGAMENTO:
- M-Pesa: 84 990 0000 (Bayete Microcrédito)
- E-Mola: 86 500 0000 (Bayete Microcrédito)
- Millennium BIM: Conta 198234710

Após pagar, envie o comprovativo para o WhatsApp +258 84 000 0000.
Evite encargos adicionais e proteja o seu acesso a novos créditos.

Atenciosamente,
Equipa de Crédito da Bayete Microcrédito`;
}

/**
 * Generates polite WhatsApp direct notification text
 */
export function generateClientWhatsAppNotice(item: OverdueInstallment): string {
  return `Olá ${item.clientName}! Vimos da *Bayete Microcrédito* para lembrar que a Parcela #${item.installmentNumber} no valor de ${formatCurrencyMT(item.installmentAmount)} venceu em ${item.dueDate} (${item.daysOverdue} dias de atraso). Montante com mora atualizado: *${formatCurrencyMT(item.totalDue)}*. Pode efetuar o pagamento via M-Pesa 84 990 0000 ou E-Mola 86 500 0000 e nos enviar o comprovativo por aqui. Estamos disponíveis para ajudar!`;
}
