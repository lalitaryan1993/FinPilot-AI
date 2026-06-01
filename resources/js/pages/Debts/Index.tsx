import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
    Plus, Trash2, Edit2, CreditCard,
    Building2, Home, Car, GraduationCap, AlertTriangle,
    Calendar, Percent, TrendingDown,
    CheckCircle2, BarChart3, Zap, RotateCcw, ChevronDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn, formatCurrency } from '@/lib/utils';
import type { Debt } from '@/types';

// ─── Extended Debt type (with computed fields from API) ──────────
interface DebtExtended extends Debt {
    monthly_interest: number;
    emi_due_soon: boolean;
    paid_off_percent: number;
}
interface EmiEntry {
    debt_id: number; name: string; lender: string;
    emi_amount: number; due_date: string; due_day: number;
    days_until: number; is_due_soon: boolean; type: string;
}

// ─── API ────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const h    = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });

async function fetchDebts(): Promise<DebtExtended[]> {
    const r = await fetch('/api/v1/debts', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data ?? [];
}
async function fetchCalendar(): Promise<EmiEntry[]> {
    const r = await fetch('/api/v1/debts/emi-calendar', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data ?? [];
}
async function updateDebt(id: number, b: Record<string, unknown>): Promise<Debt> {
    const r = await fetch(`/api/v1/debts/${id}`, { method: 'PUT', credentials: 'include', headers: h(), body: JSON.stringify(b) });
    const j = await r.json(); if (!j.success) throw new Error(j.message); return j.data;
}
async function deleteDebt(id: number): Promise<void> {
    await fetch(`/api/v1/debts/${id}`, { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() } });
}
async function fetchTrashedDebts(): Promise<DebtExtended[]> {
    const r = await fetch('/api/v1/debts/trashed', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data ?? [];
}
async function restoreDebt(id: number): Promise<void> {
    await fetch(`/api/v1/debts/${id}/restore`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() } });
}

// ─── Debt type config ───────────────────────────────────────────
const DEBT_TYPES = [
    { id: 'home_loan',       label: 'Home Loan',      icon: Home,          color: '#3B82F6' },
    { id: 'personal_loan',   label: 'Personal Loan',  icon: CreditCard,    color: '#8B5CF6' },
    { id: 'car_loan',        label: 'Car Loan',        icon: Car,           color: '#10B981' },
    { id: 'credit_card',     label: 'Credit Card',     icon: CreditCard,    color: '#F43F5E' },
    { id: 'education_loan',  label: 'Education Loan',  icon: GraduationCap, color: '#F5C842' },
    { id: 'other',           label: 'Other',           icon: Building2,     color: '#94A3B8' },
] as const;

function debtCfg(type: string) {
    return DEBT_TYPES.find((t) => t.id === type) ?? DEBT_TYPES[DEBT_TYPES.length - 1];
}

// ─── Debt Card ──────────────────────────────────────────────────
function DebtCard({ debt, onEdit, onDelete, onClose }: {
    debt: DebtExtended;
    onEdit: (d: DebtExtended) => void;
    onDelete: (d: DebtExtended) => void;
    onClose: (d: DebtExtended) => void;
}) {
    const cfg   = debtCfg(debt.type);
    const Icon  = cfg.icon;
    const color = cfg.color;
    const isClosed = debt.status !== 'active';

    return (
        <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
            <GlassCard className={cn('p-5 group relative overflow-hidden', isClosed && 'opacity-60')}>
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ background: color, opacity: 0.7 }} />

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
                            <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{debt.name}</h3>
                            <p className="text-xs text-white/40">{debt.lender ?? cfg.label}</p>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isClosed && (
                            <button onClick={() => onClose(debt)} title="Mark as closed"
                                className="rounded-md p-1.5 text-white/30 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button onClick={() => onEdit(debt)} className="rounded-md p-1.5 text-white/30 hover:bg-white/8 hover:text-white transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => onDelete(debt)} className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                </div>

                {/* Balance + principal */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/40">Balance remaining</span>
                        <span className="text-white/40">{debt.paid_off_percent}% paid off</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                            animate={{ width: `${debt.paid_off_percent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ background: `linear-gradient(90deg, ${color}aa, ${color})` }}
                        />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs">
                        <span className="font-bold tabular-nums text-white">{formatCurrency(Number(debt.current_balance), 'INR')}</span>
                        <span className="text-white/30 tabular-nums">of {formatCurrency(Number(debt.principal_amount), 'INR')}</span>
                    </div>
                </div>

                {/* Details grid */}
                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-white/6 pt-3.5">
                    <div className="rounded-lg bg-white/3 px-3 py-2">
                        <p className="text-[10px] text-white/35">Interest Rate</p>
                        <p className="mt-0.5 font-semibold tabular-nums text-white">{Number(debt.interest_rate).toFixed(2)}%</p>
                    </div>
                    <div className="rounded-lg bg-white/3 px-3 py-2">
                        <p className="text-[10px] text-white/35">Monthly Interest</p>
                        <p className="mt-0.5 font-semibold tabular-nums text-white">{formatCurrency(debt.monthly_interest, 'INR')}</p>
                    </div>
                    {debt.emi_amount && (
                        <div className="rounded-lg bg-white/3 px-3 py-2">
                            <p className="text-[10px] text-white/35">EMI Amount</p>
                            <p className="mt-0.5 font-semibold tabular-nums text-white">{formatCurrency(Number(debt.emi_amount), 'INR')}</p>
                        </div>
                    )}
                    {debt.emi_due_day && (
                        <div className={cn('rounded-lg px-3 py-2', debt.emi_due_soon ? 'bg-red-500/10' : 'bg-white/3')}>
                            <p className="text-[10px] text-white/35">EMI Due</p>
                            <p className={cn('mt-0.5 font-semibold', debt.emi_due_soon ? 'text-red-400' : 'text-white')}>
                                {debt.emi_due_day}th of month
                            </p>
                        </div>
                    )}
                </div>

                {/* Strategy badge */}
                {debt.strategy && debt.strategy !== 'none' && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-500/8 px-3 py-1.5">
                        <Zap className="h-3 w-3 text-blue-400" />
                        <span className="text-[10px] font-medium text-blue-300 capitalize">{debt.strategy} strategy</span>
                    </div>
                )}

                {/* Due soon alert */}
                {debt.emi_due_soon && !isClosed && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5">
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                        <span className="text-[10px] text-red-300">EMI due within 5 days!</span>
                    </div>
                )}
            </GlassCard>
        </motion.div>
    );
}

// ─── EMI Calendar ───────────────────────────────────────────────
function EmiCalendar({ entries }: { entries: EmiEntry[] }) {
    if (!entries.length) return null;
    return (
        <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Upcoming EMIs</h3>
            </div>
            <div className="space-y-2">
                {entries.map((e) => {
                    const cfg = debtCfg(e.type);
                    return (
                        <div key={e.debt_id} className={cn('flex items-center justify-between rounded-xl px-3.5 py-3 transition-colors', e.is_due_soon ? 'bg-red-500/8 border border-red-500/20' : 'bg-white/3 border border-white/6')}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${cfg.color}15` }}>
                                    <cfg.icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{e.name}</p>
                                    <p className="text-xs text-white/35">{e.lender} · {format(parseISO(e.due_date), 'dd MMM yyyy')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold tabular-nums text-white">{formatCurrency(e.emi_amount, 'INR')}</p>
                                <p className={cn('text-[10px]', e.is_due_soon ? 'text-red-400' : 'text-white/35')}>
                                    {e.days_until === 0 ? 'Due today' : `${e.days_until}d`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}

// ─── Trash Section ──────────────────────────────────────────────
function DebtsTrashSection() {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();
    const { data: trashed = [], isLoading } = useQuery({ queryKey: ['debts-trashed'], queryFn: fetchTrashedDebts, enabled: open });
    const restoreMut = useMutation({
        mutationFn: restoreDebt,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts-trashed'] }); qc.invalidateQueries({ queryKey: ['debts'] }); },
    });
    return (
        <GlassCard className="overflow-hidden">
            <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
                <div className="flex items-center gap-2.5">
                    <Trash2 size={15} className="text-white/30" />
                    <span className="text-sm font-medium text-white/50">Trash</span>
                    {trashed.length > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">{trashed.length}</span>}
                </div>
                <ChevronDown size={15} className={cn('text-white/30 transition-transform', open && 'rotate-180')} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-white/6">
                        {isLoading ? <div className="px-5 py-6 text-center text-sm text-white/30">Loading…</div>
                        : trashed.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-white/25"><RotateCcw size={22} className="mb-2" /><p className="text-sm">Trash is empty</p></div>
                        ) : (
                            <div className="divide-y divide-white/4">
                                {trashed.map((d) => (
                                    <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/60 truncate">{d.name}</p>
                                            <p className="text-xs text-white/30">{d.lender} · {formatCurrency(Number(d.current_balance), 'INR')}</p>
                                        </div>
                                        <button onClick={() => restoreMut.mutate(d.id)} disabled={restoreMut.isPending}
                                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 transition-all disabled:opacity-50">
                                            <RotateCcw size={12} /> Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}

// ─── Page ───────────────────────────────────────────────────────
export default function DebtsIndex() {
    const qc = useQueryClient();
    const [toDelete, setToDelete] = useState<DebtExtended | null>(null);
    const { data: debts = [],    isLoading } = useQuery({ queryKey: ['debts'], queryFn: fetchDebts });
    const { data: calendar = [] }            = useQuery({ queryKey: ['emi-calendar'], queryFn: fetchCalendar });

    const delMut = useMutation({
        mutationFn: () => deleteDebt(toDelete!.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['debts'] });
            qc.invalidateQueries({ queryKey: ['emi-calendar'] });
            qc.invalidateQueries({ queryKey: ['debts-trashed'] });
            setToDelete(null);
        },
    });
    const closeMut = useMutation({
        mutationFn: (d: DebtExtended) => updateDebt(d.id, { status: 'closed' }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); qc.invalidateQueries({ queryKey: ['emi-calendar'] }); },
    });

    const active  = debts.filter((d) => d.status === 'active');
    const closed  = debts.filter((d) => d.status !== 'active');
    const totalBalance = active.reduce((s, d) => s + Number(d.current_balance), 0);
    const totalEmi     = active.reduce((s, d) => s + Number(d.emi_amount ?? 0), 0);
    const totalInterest = active.reduce((s, d) => s + d.monthly_interest, 0);
    const dueSoon = calendar.filter((e) => e.is_due_soon).length;

    return (
        <AppLayout title="Debts & EMIs">
            <Head title="Debts & EMIs" />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Debts & EMIs</h2>
                        <p className="mt-0.5 text-sm text-white/40">{active.length} active · {dueSoon > 0 && <span className="text-red-400">{dueSoon} due soon</span>}</p>
                    </div>
                    <button onClick={() => router.visit('/debts/new')} className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 active:scale-95 transition-all">
                        <Plus className="h-4 w-4" /> Add Debt
                    </button>
                </div>

                {/* Summary */}
                {active.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            { label: 'Total Debt',       val: formatCurrency(totalBalance, 'INR'),  icon: TrendingDown,  color: 'text-red-400',    bg: 'bg-red-400/10' },
                            { label: 'Monthly EMI',      val: formatCurrency(totalEmi, 'INR'),      icon: Calendar,      color: 'text-amber-400',  bg: 'bg-amber-400/10' },
                            { label: 'Monthly Interest', val: formatCurrency(totalInterest, 'INR'), icon: Percent,       color: 'text-orange-400', bg: 'bg-orange-400/10' },
                            { label: 'Due Soon',         val: `${dueSoon} EMI${dueSoon !== 1 ? 's' : ''}`, icon: AlertTriangle, color: dueSoon > 0 ? 'text-red-400' : 'text-white/30', bg: dueSoon > 0 ? 'bg-red-400/10' : 'bg-white/5' },
                        ].map((s) => (
                            <GlassCard key={s.label} className="flex items-center gap-3 p-4">
                                <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', s.bg)}>
                                    <s.icon className={cn('h-4 w-4', s.color)} />
                                </div>
                                <div>
                                    <p className="text-xs text-white/40">{s.label}</p>
                                    <p className="text-sm font-bold tabular-nums text-white">{s.val}</p>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-3">
                    {/* Debt cards — 2/3 width */}
                    <div className="space-y-4 lg:col-span-2">
                        {isLoading ? (
                            Array.from({ length: 2 }).map((_, i) => <GlassCard key={i} className="h-48 animate-pulse" />)
                        ) : active.length === 0 ? (
                            <GlassCard className="py-20 text-center">
                                <BarChart3 className="mx-auto mb-3 h-12 w-12 text-white/15" />
                                <p className="text-base font-medium text-white/40">No active debts</p>
                                <p className="mt-1 text-sm text-white/25">Track loans, EMIs and credit card balances</p>
                                <button onClick={() => router.visit('/debts/new')} className="mt-4 rounded-xl bg-blue-500/15 border border-blue-500/30 px-5 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/25 transition-colors">Add your first debt</button>
                            </GlassCard>
                        ) : (
                            <AnimatePresence>
                                {active.map((d) => (
                                    <DebtCard key={d.id} debt={d}
                                        onEdit={(d) => router.visit(`/debts/${d.id}/edit`)}
                                        onDelete={setToDelete}
                                        onClose={(d) => closeMut.mutate(d)}
                                    />
                                ))}
                            </AnimatePresence>
                        )}

                        {/* Closed debts */}
                        {closed.length > 0 && (
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/25">Closed ({closed.length})</p>
                                {closed.map((d) => (
                                    <DebtCard key={d.id} debt={d}
                                        onEdit={(d) => router.visit(`/debts/${d.id}/edit`)}
                                        onDelete={setToDelete}
                                        onClose={(d) => closeMut.mutate(d)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* EMI calendar — 1/3 */}
                    <div className="space-y-4">
                        <EmiCalendar entries={calendar} />

                        {/* Payoff strategy info card */}
                        {active.length > 1 && (
                            <GlassCard className="p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-400" />
                                    <h3 className="text-sm font-semibold text-white">Payoff Strategy</h3>
                                </div>
                                <p className="text-xs text-white/40 leading-relaxed">
                                    <span className="font-semibold text-white/70">Avalanche</span> saves the most interest — pay highest rate first.<br /><br />
                                    <span className="font-semibold text-white/70">Snowball</span> builds momentum — eliminate smallest balance first.
                                </p>
                                <div className="mt-3 rounded-lg bg-blue-500/8 px-3 py-2.5">
                                    <p className="text-[10px] text-blue-300">Ask the AI for a personalised payoff plan based on your income and goals.</p>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                </div>

                <DebtsTrashSection />
            </div>

            <DeleteConfirmModal
                open={toDelete !== null}
                itemName={toDelete?.name}
                isPending={delMut.isPending}
                onConfirm={() => delMut.mutate()}
                onCancel={() => setToDelete(null)}
            />
        </AppLayout>
    );
}
