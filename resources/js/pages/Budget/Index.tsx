import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, addMonths } from 'date-fns';
import {
    Plus, Wallet, AlertTriangle, CheckCircle2, ChevronLeft,
    ChevronRight, Trash2, Edit2, TrendingUp, Bell, RotateCcw, ChevronDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn, formatCurrency } from '@/lib/utils';
import type { Budget } from '@/types';

// ─── API ────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchBudgets(month: string): Promise<Budget[]> {
    const res = await fetch(`/api/v1/budgets?month=${month}`, { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await res.json()).data ?? [];
}
async function deleteBudget(id: number): Promise<void> {
    await fetch(`/api/v1/budgets/${id}`, { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() } });
}
async function fetchTrashedBudgets(): Promise<Budget[]> {
    const res = await fetch('/api/v1/budgets/trashed', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await res.json()).data ?? [];
}
async function restoreBudget(id: number): Promise<void> {
    await fetch(`/api/v1/budgets/${id}/restore`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() } });
}

// ─── Radial Progress Ring ───────────────────────────────────────
function RadialRing({ percent, color, size = 88 }: { percent: number; color: string; size?: number }) {
    const r   = (size - 12) / 2;
    const c   = 2 * Math.PI * r;
    const off = c - (Math.min(percent, 100) / 100) * c;
    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
                strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
    );
}

function budgetColor(pct: number): string {
    if (pct >= 100) return '#EF4444';
    if (pct >= 80)  return '#F59E0B';
    return '#10B981';
}

// ─── Budget Card ────────────────────────────────────────────────
function BudgetCard({ budget, onEdit, onDelete }: { budget: Budget; onEdit: (b: Budget) => void; onDelete: (b: Budget) => void }) {
    const pct   = budget.percent_used ?? 0;
    const color = budgetColor(pct);
    return (
        <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
            <GlassCard className="p-5 group relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ background: color, opacity: 0.7 }} />
                <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                        <RadialRing percent={pct} color={color} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-bold tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
                            <span className="text-[9px] text-white/30 leading-none mt-0.5">used</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-white truncate">{budget.name}</h3>
                                {budget.category && (
                                    <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                        style={{ background: `${budget.category.color ?? '#3B82F6'}18`, color: budget.category.color ?? '#3B82F6' }}>
                                        {budget.category.icon && <span>{budget.category.icon}</span>}
                                        {budget.category.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(budget)} className="rounded-md p-1.5 text-white/30 hover:bg-white/8 hover:text-white transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => onDelete(budget)} className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Spent</span>
                                <span className="font-semibold tabular-nums text-white">{formatCurrency(budget.spent_amount, 'INR')}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Budget</span>
                                <span className="tabular-nums text-white/60">{formatCurrency(budget.amount, 'INR')}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Remaining</span>
                                <span className={cn('font-semibold tabular-nums', budget.is_breached ? 'text-red-400' : 'text-emerald-400')}>
                                    {budget.is_breached ? '−' : ''}{formatCurrency(Math.abs(budget.remaining ?? 0), 'INR')}
                                </span>
                            </div>
                        </div>
                        {budget.is_breached && (
                            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5">
                                <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                                <span className="text-[10px] text-red-300">Over budget by {formatCurrency(Math.abs(budget.remaining ?? 0), 'INR')}</span>
                            </div>
                        )}
                        {!budget.is_breached && budget.is_near_limit && (
                            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
                                <Bell className="h-3 w-3 text-amber-400 flex-shrink-0" />
                                <span className="text-[10px] text-amber-300">Approaching limit — {formatCurrency(budget.remaining ?? 0, 'INR')} left</span>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}

// ─── Trash Section ──────────────────────────────────────────────
function TrashSection() {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();
    const { data: trashed = [], isLoading } = useQuery({
        queryKey: ['budgets-trashed'],
        queryFn: fetchTrashedBudgets,
        enabled: open,
    });
    const restoreMut = useMutation({
        mutationFn: restoreBudget,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['budgets-trashed'] });
            qc.invalidateQueries({ queryKey: ['budgets'] });
        },
    });
    return (
        <GlassCard className="overflow-hidden">
            <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
                <div className="flex items-center gap-2.5">
                    <Trash2 size={15} className="text-white/30" />
                    <span className="text-sm font-medium text-white/50">Trash</span>
                    {trashed.length > 0 && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">{trashed.length}</span>
                    )}
                </div>
                <ChevronDown size={15} className={cn('text-white/30 transition-transform', open && 'rotate-180')} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-white/6">
                        {isLoading ? (
                            <div className="px-5 py-6 text-center text-sm text-white/30">Loading…</div>
                        ) : trashed.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-white/25">
                                <RotateCcw size={22} className="mb-2" />
                                <p className="text-sm">Trash is empty</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/4">
                                {trashed.map((b) => (
                                    <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/60 truncate">{b.name}</p>
                                            <p className="text-xs text-white/30">{formatCurrency(b.amount, 'INR')} · {b.period}</p>
                                        </div>
                                        <button onClick={() => restoreMut.mutate(b.id)} disabled={restoreMut.isPending}
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
export default function BudgetIndex() {
    const qc     = useQueryClient();
    const [month, setMonth]     = useState(new Date());
    const [toDelete, setToDelete] = useState<Budget | null>(null);
    const monthStr = format(month, 'yyyy-MM');

    const { data: budgets = [], isLoading } = useQuery({
        queryKey: ['budgets', monthStr],
        queryFn:  () => fetchBudgets(monthStr),
    });

    const delMutation = useMutation({
        mutationFn: () => deleteBudget(toDelete!.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['budgets'] });
            qc.invalidateQueries({ queryKey: ['budgets-trashed'] });
            setToDelete(null);
        },
    });

    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
    const totalSpent  = budgets.reduce((s, b) => s + Number(b.spent_amount), 0);
    const overBudget  = budgets.filter((b) => b.is_breached).length;
    const overallPct  = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <AppLayout title="Budget">
            <Head title="Budget" />
            <div className="p-6 space-y-5">

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Budget</h2>
                        <p className="mt-0.5 text-sm text-white/40">{budgets.length} budget{budgets.length !== 1 ? 's' : ''} this month</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/4 p-1">
                            <button onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                            <span className="min-w-[90px] text-center text-sm font-medium text-white">{format(month, 'MMM yyyy')}</span>
                            <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white transition-colors"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                        <button onClick={() => router.visit('/budget/new')} className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 active:scale-95 transition-all">
                            <Plus className="h-4 w-4" /> New Budget
                        </button>
                    </div>
                </div>

                {budgets.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            { label: 'Total Budget', val: formatCurrency(totalBudget, 'INR'), icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                            { label: 'Total Spent', val: formatCurrency(totalSpent, 'INR'), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                            { label: 'Remaining', val: formatCurrency(totalBudget - totalSpent, 'INR'), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                            { label: 'Over Budget', val: `${overBudget} budget${overBudget !== 1 ? 's' : ''}`, icon: AlertTriangle, color: overBudget > 0 ? 'text-red-400' : 'text-white/30', bg: overBudget > 0 ? 'bg-red-400/10' : 'bg-white/5' },
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

                {budgets.length > 0 && (
                    <GlassCard className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white/70">Overall spending</span>
                            <span className="text-sm font-bold tabular-nums" style={{ color: budgetColor(overallPct) }}>{Math.round(overallPct)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                                animate={{ width: `${Math.min(overallPct, 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                style={{ background: budgetColor(overallPct) }} />
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-white/30">
                            <span>{formatCurrency(totalSpent, 'INR')} spent</span>
                            <span>{formatCurrency(totalBudget, 'INR')} total</span>
                        </div>
                    </GlassCard>
                )}

                {/* ── Budget Alert Banner ── */}
                {!isLoading && budgets.some(b => b.is_breached || b.is_near_limit) && (
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-semibold text-amber-400">Budget Alerts</span>
                            <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                                {budgets.filter(b => b.is_breached || b.is_near_limit).length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {budgets.filter(b => b.is_breached || b.is_near_limit).map(b => (
                                <div key={b.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/6 px-3.5 py-2.5">
                                    <AlertTriangle className={cn('h-3.5 w-3.5 flex-shrink-0', b.is_breached ? 'text-red-400' : 'text-amber-400')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{b.name}</p>
                                        <p className="text-xs text-white/45">
                                            {b.is_breached
                                                ? `Over by ${formatCurrency(Number(b.spent_amount) - Number(b.amount), 'INR')}`
                                                : `${b.percent_used}% used · ${formatCurrency(b.remaining ?? 0, 'INR')} left`}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className={cn('text-sm font-bold tabular-nums', b.is_breached ? 'text-red-400' : 'text-amber-400')}>
                                            {b.percent_used}%
                                        </p>
                                        <p className="text-[10px] text-white/30">{b.is_breached ? 'OVER' : 'NEAR LIMIT'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <GlassCard key={i} className="p-5">
                                <div className="flex gap-4">
                                    <div className="h-[88px] w-[88px] animate-pulse rounded-full bg-white/8" />
                                    <div className="flex-1 space-y-2 pt-2">
                                        <div className="h-4 w-3/4 animate-pulse rounded bg-white/8" />
                                        <div className="h-3 w-1/2 animate-pulse rounded bg-white/8" />
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                ) : budgets.length === 0 ? (
                    <GlassCard className="py-20 text-center">
                        <Wallet className="mx-auto mb-3 h-12 w-12 text-white/15" />
                        <p className="text-base font-medium text-white/40">No budgets for {format(month, 'MMMM yyyy')}</p>
                        <p className="mt-1 text-sm text-white/25">Set spending limits to stay in control</p>
                        <button onClick={() => router.visit('/budget/new')} className="mt-4 rounded-xl bg-blue-500/15 border border-blue-500/30 px-5 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/25 transition-colors">
                            Create your first budget
                        </button>
                    </GlassCard>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence>
                            {budgets.map((b) => (
                                <BudgetCard key={b.id} budget={b}
                                    onEdit={(budget) => router.visit(`/budget/${budget.id}/edit`)}
                                    onDelete={setToDelete} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                <TrashSection />
            </div>

            <DeleteConfirmModal
                open={toDelete !== null}
                itemName={toDelete?.name}
                isPending={delMutation.isPending}
                onConfirm={() => delMutation.mutate()}
                onCancel={() => setToDelete(null)}
            />
        </AppLayout>
    );
}
