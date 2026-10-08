/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useMemo } from 'react';
import {
  CreditCard,
  Phone,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Send,
  MoreHorizontal,
  Bell,
} from 'lucide-react';
import { CreditApplication, PaymentRecord } from '@/types';
import { formatCurrencyMT } from '@/lib/credit-calculator';

interface RightSidebarProps {
  credits?: CreditApplication[];
  payments?: PaymentRecord[];
  onOpenNewPayment?: (creditId?: string) => void;
  onOpenNewCredit?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  credits = [],
  payments = [],
  onOpenNewPayment,
}) => {
  // Compute imminent or overdue installments from active disbursed credits
  const upcomingDueItems = useMemo(() => {
    const list: Array<{
      creditId: string;
      clientName: string;
      installmentNumber: number;
      amount: number;
      dueDate: string;
      isOverdue: boolean;
      daysRemaining: number;
    }> = [];

    const now = new Date();
    credits
      .filter((c) => c.status === 'desembolsado' && c.remainingBalance > 0)
      .forEach((c) => {
        if (c.installments && c.installments.length > 0) {
          const pendingInst = c.installments.find((i) => i.status !== 'pago');
          if (pendingInst) {
            const dueDateObj = new Date(pendingInst.dueDate);
            const diffDays = Math.ceil(
              (dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            list.push({
              creditId: c.id,
              clientName: c.clientName,
              installmentNumber: pendingInst.number,
              amount: pendingInst.amount,
              dueDate: pendingInst.dueDate,
              isOverdue: diffDays < 0,
              daysRemaining: diffDays,
            });
          }
        }
      });

    return list.slice(0, 3);
  }, [credits]);

  // Recent payments
  const recentPayments = useMemo(() => {
    if (payments.length > 0) {
      return payments.slice(0, 4).map((p) => ({
        id: p.id,
        title: `Amortização de ${formatCurrencyMT(p.amountPaid)}`,
        subtitle: `${p.clientName} (${p.paymentMethod || 'M-Pesa'})`,
        time: new Date(p.paymentDate).toLocaleDateString('pt-MZ'),
      }));
    }
    return [
      {
        id: 'p1',
        title: 'Amortização de 8.500 MT',
        subtitle: 'Amélia Macamo (M-Pesa)',
        time: 'Hoje',
      },
      {
        id: 'p2',
        title: 'Amortização de 12.000 MT',
        subtitle: 'Tomás Sitoe (Transferência BIM)',
        time: 'Ontem',
      },
      {
        id: 'p3',
        title: 'Quitação Total de 25.000 MT',
        subtitle: 'Graça Cossa (E-Mola)',
        time: 'Há 3 dias',
      },
    ];
  }, [payments]);

  // Scheduled collection reminders
  const scheduledReminders = useMemo(() => {
    return payments
      .filter((p) => p.reminderDate && p.reminderStatus !== 'cancelado')
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        clientName: p.clientName,
        date: p.reminderDate!,
        note: p.reminderNote || 'Cobrança agendada',
        status: p.reminderStatus || 'pendente',
      }));
  }, [payments]);

  // Dedicated credit managers and officers
  const managers = [
    {
      id: 1,
      name: 'Natércia Machel',
      role: 'Gestora de Crédito Principal',
      phone: '+258 84 123 4567',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
      isHighlighted: true,
    },
    {
      id: 2,
      name: 'Armando Cuna',
      role: 'Analista de Risco & Balanço',
      phone: '+258 82 987 6543',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
      isHighlighted: false,
    },
    {
      id: 3,
      name: 'Fátima Langa',
      role: 'Oficial de Cobranças',
      phone: '+258 87 555 4321',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
      isHighlighted: false,
    },
  ];

  return (
    <aside className="w-72 xl:w-80 shrink-0 bg-[#12141a] border-l border-[#242731] flex flex-col p-5 space-y-7 select-none overflow-y-auto">
      {/* 1. Alertas de Vencimento e Cobrança */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#c8ff3d]" />
            <span>Cobranças Iminentes</span>
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e271a] text-[#c8ff3d] font-mono border border-[#c8ff3d]/30">
            {upcomingDueItems.length} alertas
          </span>
        </div>

        {upcomingDueItems.length > 0 ? (
          <div className="space-y-2.5">
            {upcomingDueItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  item.isOverdue
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                    : 'bg-[#181b22] border-[#252a36] text-slate-200 hover:border-[#384154]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-white text-xs truncate">
                      {item.clientName}
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      Parcela {item.installmentNumber} •{' '}
                      <span className="font-mono text-[#c8ff3d] font-bold">
                        {formatCurrencyMT(item.amount)}
                      </span>
                    </p>
                  </div>
                  {onOpenNewPayment && (
                    <button
                      type="button"
                      onClick={() => onOpenNewPayment(item.creditId)}
                      className="px-2 py-1 rounded-lg bg-[#c8ff3d] hover:bg-[#bef264] text-[#0d0e12] font-bold text-[10px] shrink-0 transition-colors cursor-pointer"
                    >
                      Cobrar
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[10px]">
                  <span className="text-slate-500">Vencimento: {item.dueDate}</span>
                  <span
                    className={
                      item.isOverdue ? 'text-rose-400 font-bold' : 'text-amber-400 font-medium'
                    }
                  >
                    {item.isOverdue
                      ? `${Math.abs(item.daysRemaining)}d em atraso`
                      : `${item.daysRemaining}d restantes`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#161d16] border border-[#263721] text-center">
            <CheckCircle2 className="w-5 h-5 text-[#c8ff3d] mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-white">Carteira Regularizada</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Não existem parcelas pendentes com prazo vencido hoje.
            </p>
          </div>
        )}
      </div>

      {/* 2. Últimas Amortizações Recebidas */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3.5 tracking-tight flex items-center space-x-1.5">
          <CreditCard className="w-3.5 h-3.5 text-[#c8ff3d]" />
          <span>Últimos Pagamentos</span>
        </h3>
        <div className="relative pl-5 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#282b36]">
          {recentPayments.map((act) => (
            <div key={act.id} className="relative group">
              <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#c8ff3d] ring-4 ring-[#12141a]" />
              <div className="min-w-0">
                <p className="text-xs text-white font-medium truncate">{act.title}</p>
                <p className="text-[10.5px] text-slate-400 truncate">{act.subtitle}</p>
                <p className="text-[9.5px] text-slate-500 mt-0.5">{act.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lembretes de Cobrança Agendados */}
      {scheduledReminders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Lembretes de Cobrança</span>
            </h3>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full">
              {scheduledReminders.length} Ativos
            </span>
          </div>

          <div className="space-y-2">
            {scheduledReminders.map((rem) => (
              <div
                key={rem.id}
                className="p-2.5 rounded-xl bg-[#1c221a] border border-amber-900/40 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white truncate max-w-[150px]">
                    {rem.clientName}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {new Date(rem.date + 'T12:00:00').toLocaleDateString('pt-MZ')}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 line-clamp-2">
                  {rem.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Equipa de Gestão & Apoio */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3.5 tracking-tight">
          Gestores & Analistas de Crédito
        </h3>
        <div className="space-y-2">
          {managers.map((m) => {
            if (m.isHighlighted) {
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c221a] border border-[#c8ff3d]/50 shadow-lg shadow-[#c8ff3d]/10 transition-all"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-8 h-8 rounded-full object-cover border border-[#c8ff3d]"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#c8ff3d] block truncate">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{m.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0 pl-1">
                    <a
                      href={`tel:${m.phone}`}
                      title="Ligar"
                      className="w-7 h-7 rounded-lg bg-[#293a1f] hover:bg-[#344b27] text-[#c8ff3d] flex items-center justify-center transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-7 h-7 rounded-full object-cover border border-white/10"
                  />
                  <div className="min-w-0">
                    <span className="text-xs text-slate-300 group-hover:text-white font-medium block truncate">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">{m.role}</span>
                  </div>
                </div>
                <a
                  href={`tel:${m.phone}`}
                  title="Contactar"
                  className="p-1 text-slate-500 hover:text-white transition-colors shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
