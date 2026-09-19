import { RiskAnalysis, Installment } from '@/types';

export interface CalculationResult {
  monthlyInstallment: number;
  totalRepayment: number;
  totalInterest: number;
  riskAnalysis: RiskAnalysis;
  installments: Installment[];
}

export function calculateCredit(
  amount: number,
  termMonths: number,
  monthlyInterestRate: number,
  salary: number,
  startDate: Date = new Date()
): CalculationResult {
  // Safe defaults
  const P = Math.max(100, Number(amount) || 0);
  const n = Math.max(1, Math.round(Number(termMonths) || 1));
  const r = (Number(monthlyInterestRate) || 0) / 100;
  const sal = Math.max(1, Number(salary) || 1);

  // Microcredit calculation: simple flat interest or amortization
  // In African microfinance, flat rate or simple compound is common.
  // Standard simple monthly rate: Total Interest = P * r * n
  const totalInterest = Math.round(P * r * n);
  const totalRepayment = Math.round(P + totalInterest);
  const monthlyInstallment = Math.round(totalRepayment / n);

  // Risk evaluation
  const effortRate = Number(((monthlyInstallment / sal) * 100).toFixed(1));
  const maxRecommendedInstallment = Math.round(sal * 0.35); // 35% standard max effort

  let score = 100;
  const factors: string[] = [];

  // Deduct based on effort rate
  if (effortRate > 50) {
    score -= 45;
    factors.push(`Taxa de esforço excessiva (${effortRate}% > 50% da renda mensal)`);
  } else if (effortRate > 35) {
    score -= 25;
    factors.push(`Taxa de esforço elevada (${effortRate}% superior aos 35% recomendados)`);
  } else if (effortRate <= 25) {
    factors.push(`Excelente margem de solvência (Taxa de esforço de ${effortRate}%)`);
  } else {
    factors.push(`Taxa de esforço sustentável (${effortRate}%)`);
  }

  // Deduct based on loan size relative to income
  if (P > sal * 4) {
    score -= 20;
    factors.push('Montante solicitado é superior a 4x a renda mensal comprovada');
  } else if (P <= sal * 1.5) {
    factors.push('Montante proporcional e saudável face à capacidade financeira');
  }

  // Deduct based on short term vs high installment
  if (n <= 2 && monthlyInstallment > sal * 0.4) {
    score -= 10;
    factors.push('Prazo curto com amortização concentrada');
  }

  score = Math.max(10, Math.min(99, score));

  let riskLevel: RiskAnalysis['riskLevel'] = 'baixo';
  let recommendation: RiskAnalysis['recommendation'] = 'Aprovação Recomendada';

  if (score >= 75) {
    riskLevel = 'baixo';
    recommendation = 'Aprovação Recomendada';
  } else if (score >= 55) {
    riskLevel = 'moderado';
    recommendation = 'Aprovação Condicional com Garantia';
  } else if (score >= 35) {
    riskLevel = 'alto';
    recommendation = 'Revisar / Reduzir Montante';
  } else {
    riskLevel = 'critico';
    recommendation = 'Risco Elevado - Não Recomendado';
  }

  const riskAnalysis: RiskAnalysis = {
    effortRate,
    score,
    riskLevel,
    recommendation,
    maxRecommendedInstallment,
    factors,
  };

  // Generate schedule
  const installments: Installment[] = [];
  const principalPerMonth = Math.round(P / n);
  const interestPerMonth = Math.round(totalInterest / n);

  for (let i = 1; i <= n; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    installments.push({
      number: i,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: i === n ? totalRepayment - (n - 1) * monthlyInstallment : monthlyInstallment,
      principal: i === n ? P - (n - 1) * principalPerMonth : principalPerMonth,
      interest: i === n ? totalInterest - (n - 1) * interestPerMonth : interestPerMonth,
      status: 'pendente',
    });
  }

  return {
    monthlyInstallment,
    totalRepayment,
    totalInterest,
    riskAnalysis,
    installments,
  };
}

export function formatCurrencyMT(amount: number): string {
  const rounded = Math.round(amount || 0);
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    maximumFractionDigits: 0,
  }).format(rounded).replace('MZN', 'MT');
}
