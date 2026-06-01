import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit2, Trash2, Briefcase, Home, TrendingUp, Landmark,
    ShoppingBag, HelpCircle, RotateCcw,
    ChevronDown, Coffee, IndianRupee, Calendar, Zap, ArrowUpRight,
    PauseCircle, PlayCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn } from '@/lib/utils';
import type { IncomeSource, PageProps } from '@/types';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const TYPE_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    salary:      { label: 'Salary',      color: '#10B981', Icon: Briefcase },
    freelance:   { label: 'Freelance',   color: '#3B82F6', Icon: Coffee },
    rental:      { label: 'Rental',      color: '#F59E0B', Icon: Home },
    dividends:   { label: 'Dividends',   color: '#8B5CF6', Icon: TrendingUp },
    business:    { label: 'Business',    color: '#EC4899', Icon: ShoppingBag },
    pension:     { label: 'Pension',     color: '#14B8A6', Icon: Landmark },
    side_hustle: { label: 'Side Hustle', color: '#F97316', Icon: Coffee },
    other:       { label: 'Other',       color: '#6B7280', Icon: HelpCircle },
};

const FREQ_LABELS: Record<string, string> = {
    one_time: 'One Time', daily: 'Daily', weekly: 'Weekly',
    biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually',
};

interface IncomeWithMonthly extends IncomeSource { monthly_equivalent: number; }
interface Summary {
    monthly_total: number; annual_total: number;
    by_type: Array<{ type: string; monthly_total: number; count: number }>;
    source_count: number;
}

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchSources(): Promise<IncomeWithMonthly[]> {
    return (await (await fetch('/api/v1/income-sources', { credentials: 'include' })).json()).data;
}
async function fetchSummary(): Promise<Summary> {
    return (await (await fetch('/api/v1/income-sources/summary', { credentials: 'include' })).json()).data;
}
async function fetchTrashed(): Promise<IncomeWithMonthly[]> {
    return (await (await fetch('/api/v1/income-sources/trashed', { credentials: 'include' })).json()).data ?? [];
}
async function restoreSource(id: number) {
    await fetch(`/api/v1/income-sources/${id}/restore`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
}

// ─── Source Card ─────────────────────────────────────────────────
function SourceCard({ source, onEdit, onDelete, onToggle }: {
    source: IncomeWithMonthly; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
    const meta = TYPE_META[source.type] ?? TYPE_META.other;
    const monthlyEq = source.monthly_equivalent;
    const isActive  = source.is_active;

    return (
        <motion.div
            layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cn(
                'group relative overflow-hidden rounded-2xl border p-5 transition-all',
                isActive ? 'border-white/10 bg-white/[0.03]' : 'border-white/6 bg-white/[0.015] opacity-60',
            )}
        >
            {/* Left accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: meta.color }} />

            {/* Glow */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl"
                style={{ background: meta.color }} />

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                        style={{ background: `${meta.color}18` }}>
                        <meta.Icon size={20} style={{ color: meta.color }} />
                    </div>
                    <div>
                        <p className="font-bold text-white leading-tight">{source.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium rounded-full px-2 py-0.5"
                                style={{ background: `${meta.color}18`, color: meta.color }}>
                                {meta.label}
                            </span>
                            <span className="text-xs text-white/35">{FREQ_LABELS[source.frequency]}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onToggle} title={isActive ? 'Pause' : 'Activate'}
                        className="rounded-xl p-2 text-white/40 hover:bg-white/8 hover:text-white transition-all">
                        {isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                    </button>
                    <button onClick={onEdit}
                        className="rounded-xl p-2 text-white/40 hover:bg-blue-500/10 hover:text-blue-400 transition-all">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={onDelete}
                        className="rounded-xl p-2 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Amount section */}
            <div className="flex items-end gap-5 flex-wrap">
                <div>
                    <p className="text-xs text-white/40 mb-0.5">Amount</p>
                    <p className="text-2xl font-black text-white tabular-nums">{fmt(source.amount)}</p>
                    <p className="text-xs text-white/35 mt-0.5">{FREQ_LABELS[source.frequency]}</p>
                </div>

                {source.frequency !== 'monthly' && source.frequency !== 'one_time' && monthlyEq > 0 && (
                    <div className="border-l border-white/8 pl-5">
                        <p className="text-xs text-white/40 mb-0.5">Monthly equiv.</p>
                        <p className="text-lg font-bold tabular-nums" style={{ color: meta.color }}>{fmt(monthlyEq)}</p>
                        <p className="text-xs text-white/35 mt-0.5">per month</p>
                    </div>
                )}

                {source.expected_day && (
                    <div className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2">
                        <Calendar size={12} className="text-white/40" />
                        <div>
                            <p className="text-[10px] text-white/40">Credit day</p>
                            <p className="text-sm font-bold text-white">{source.expected_day}th</p>
                        </div>
                    </div>
                )}
            </div>

            {!isActive && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 w-fit">
                    <PauseCircle size={11} className="text-white/30" />
                    <span className="text-xs text-white/40">Paused</span>
                </div>
            )}
        </motion.div>
    );
}

// ─── Trash ───────────────────────────────────────────────────────
function TrashSection({ onRestored }: { onRestored: () => void }) {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();
    const { data: trashed = [], isLoading } = useQuery({ queryKey: ['income-trashed'], queryFn: fetchTrashed, enabled: open });
    const restoreMut = useMutation({
        mutationFn: restoreSource,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['income-trashed'] }); onRestored(); },
    });

    return (
        <GlassCard className="overflow-hidden">
            <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                        <Trash2 size={14} className="text-red-400/60" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white/60">Trash</p>
                        <p className="text-xs text-white/35">Deleted income sources</p>
                    </div>
                    {trashed.length > 0 && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">{trashed.length}</span>
                    )}
                </div>
                <ChevronDown size={16} className={cn('text-white/30 transition-transform duration-200', open && 'rotate-180')} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/6">
                        {isLoading ? <div className="py-8 text-center text-sm text-white/30">Loading…</div>
                        : trashed.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-white/25">
                                <RotateCcw size={20} className="mb-2" /><p className="text-sm">Trash is empty</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/4">
                                {trashed.map(s => {
                                    const meta = TYPE_META[s.type] ?? TYPE_META.other;
                                    return (
                                        <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${meta.color}18` }}>
                                                <meta.Icon size={14} style={{ color: meta.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white/60 truncate">{s.name}</p>
                                                <p className="text-xs text-white/30">{meta.label} · {fmt(s.amount)}/{FREQ_LABELS[s.frequency]?.toLowerCase()}</p>
                                            </div>
                                            <button onClick={() => restoreMut.mutate(s.id)} disabled={restoreMut.isPending}
                                                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15 transition-all disabled:opacity-50">
                                                <RotateCcw size={11} /> Restore
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function IncomeSourcesIndex(_: PageProps) {
    const qc = useQueryClient();
    const [toDelete, setToDelete] = useState<IncomeWithMonthly | null>(null);
    const [filterType, setFilterType] = useState('');

    const { data: sources = [], isLoading } = useQuery({ queryKey: ['income-sources'], queryFn: fetchSources });
    const { data: summary } = useQuery({ queryKey: ['income-summary'], queryFn: fetchSummary });

    const refetch = () => {
        qc.invalidateQueries({ queryKey: ['income-sources'] });
        qc.invalidateQueries({ queryKey: ['income-summary'] });
    };

    const updateMut = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
            const r = await fetch(`/api/v1/income-sources/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            return r.json();
        },
        onSuccess: refetch,
    });

    const deleteMut = useMutation({
        mutationFn: async () => {
            await fetch(`/api/v1/income-sources/${toDelete!.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
        },
        onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['income-trashed'] }); setToDelete(null); },
    });

    const displayed = filterType ? sources.filter(s => s.type === filterType) : sources;
    const active    = displayed.filter(s => s.is_active);
    const inactive  = displayed.filter(s => !s.is_active);
    const types     = [...new Set(sources.map(s => s.type))];

    return (
        <AppLayout>
            <Head title="Income" />
            <div className="p-6 space-y-5">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Income</h1>
                        <p className="mt-0.5 text-sm text-white/40">
                            {sources.length} source{sources.length !== 1 ? 's' : ''} · {sources.filter(s => s.is_active).length} active
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.visit('/money-flow')}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-all">
                            <ArrowUpRight size={15} /> Money Flow
                        </button>
                        <button onClick={() => router.visit('/income/new')}
                            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-95 transition-all">
                            <Plus size={16} /> Add Source
                        </button>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { label: 'Monthly Income', value: fmt(summary?.monthly_total ?? 0), sub: 'Active sources only', color: 'bg-emerald-500', Icon: IndianRupee },
                        { label: 'Annual Income', value: fmt(summary?.annual_total ?? 0), sub: 'Projected for 12 months', color: 'bg-blue-500', Icon: TrendingUp },
                        { label: 'Active Sources', value: String(sources.filter(s => s.is_active).length), sub: `of ${sources.length} total`, color: 'bg-violet-500', Icon: Zap },
                        { label: 'Income Types', value: `${summary?.by_type?.length ?? 0}`, sub: 'Diversification', color: 'bg-amber-500', Icon: ShoppingBag },
                    ].map(({ label, value, sub, color, Icon }) => (
                        <motion.div key={label}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-4">
                            <div className={cn('absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-xl', color)} />
                            <div className="flex items-start gap-3">
                                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color, 'opacity-90')}>
                                    <Icon size={18} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</p>
                                    <p className="mt-0.5 text-lg font-bold text-white truncate">{value}</p>
                                    <p className="mt-0.5 text-xs text-white/35 truncate">{sub}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── Income mix ── */}
                {summary && summary.by_type.length > 0 && (
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-bold text-white">Income Mix</p>
                            <p className="text-xs text-white/40">Monthly breakdown</p>
                        </div>
                        <div className="space-y-3">
                            {[...summary.by_type].sort((a, b) => b.monthly_total - a.monthly_total).map(bt => {
                                const meta = TYPE_META[bt.type] ?? TYPE_META.other;
                                const pct  = summary.monthly_total > 0 ? (bt.monthly_total / summary.monthly_total) * 100 : 0;
                                return (
                                    <div key={bt.type}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: `${meta.color}18` }}>
                                                    <meta.Icon size={12} style={{ color: meta.color }} />
                                                </div>
                                                <span className="text-sm text-white/70">{meta.label}</span>
                                                <span className="text-xs text-white/35">{bt.count}×</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-white/40">{pct.toFixed(0)}%</span>
                                                <span className="text-sm font-bold text-white tabular-nums">{fmt(bt.monthly_total)}/mo</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/6">
                                            <motion.div
                                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.6, delay: 0.1 }}
                                                className="h-1.5 rounded-full" style={{ background: meta.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                )}

                {/* ── Type filter ── */}
                {types.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setFilterType('')}
                            className={cn('rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
                                !filterType ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' : 'border-white/10 text-white/45 hover:border-white/22 hover:text-white')}>
                            All sources
                        </button>
                        {types.map(t => {
                            const meta = TYPE_META[t] ?? TYPE_META.other;
                            return (
                                <button key={t} onClick={() => setFilterType(t)}
                                    className={cn('flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
                                        filterType === t
                                            ? 'border-transparent text-white'
                                            : 'border-white/10 text-white/45 hover:border-white/22 hover:text-white')}
                                    style={filterType === t ? { background: `${meta.color}20`, borderColor: `${meta.color}50`, color: meta.color } : {}}>
                                    <meta.Icon size={11} /> {meta.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Active sources ── */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-40 rounded-2xl bg-white/4 border border-white/8 animate-pulse" />
                        ))}
                    </div>
                ) : active.length === 0 && inactive.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-20 text-white/30">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/4">
                            <IndianRupee size={28} />
                        </div>
                        <p className="text-base font-semibold text-white/50">No income sources yet</p>
                        <p className="mt-1.5 text-sm">Add your salary, freelance, or rental income</p>
                        <button onClick={() => router.visit('/income/new')}
                            className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all">
                            <Plus size={14} /> Add Income Source
                        </button>
                    </div>
                ) : (
                    <>
                        {active.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {active.map(s => (
                                    <SourceCard key={s.id} source={s}
                                        onEdit={() => router.visit(`/income/${s.id}/edit`)}
                                        onDelete={() => setToDelete(s)}
                                        onToggle={() => updateMut.mutate({ id: s.id, data: { is_active: false } })} />
                                ))}
                            </div>
                        )}
                        {inactive.length > 0 && (
                            <div>
                                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/30">Paused Sources</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {inactive.map(s => (
                                        <SourceCard key={s.id} source={s}
                                            onEdit={() => router.visit(`/income/${s.id}/edit`)}
                                            onDelete={() => setToDelete(s)}
                                            onToggle={() => updateMut.mutate({ id: s.id, data: { is_active: true } })} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <TrashSection onRestored={refetch} />
            </div>

            <DeleteConfirmModal
                open={toDelete !== null}
                itemName={toDelete?.name}
                isPending={deleteMut.isPending}
                onConfirm={() => deleteMut.mutate()}
                onCancel={() => setToDelete(null)}
            />
        </AppLayout>
    );
}
