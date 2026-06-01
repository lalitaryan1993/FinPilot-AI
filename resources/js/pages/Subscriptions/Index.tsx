import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit2, Trash2, RefreshCcw, AlertTriangle,
    Tv, Zap, Heart, CreditCard, BookOpen, ShoppingBag, Cloud, MoreHorizontal,
    ExternalLink, Bell, RotateCcw, ChevronDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn } from '@/lib/utils';
import type { Subscription, PageProps } from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CAT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    entertainment: { label: 'Entertainment', color: '#EF4444', icon: <Tv size={18} /> },
    productivity:  { label: 'Productivity',  color: '#3B82F6', icon: <Zap size={18} /> },
    health:        { label: 'Health',         color: '#10B981', icon: <Heart size={18} /> },
    finance:       { label: 'Finance',        color: '#F5C842', icon: <CreditCard size={18} /> },
    education:     { label: 'Education',      color: '#8B5CF6', icon: <BookOpen size={18} /> },
    shopping:      { label: 'Shopping',       color: '#F97316', icon: <ShoppingBag size={18} /> },
    cloud:         { label: 'Cloud',          color: '#06B6D4', icon: <Cloud size={18} /> },
    other:         { label: 'Other',          color: '#6B7280', icon: <MoreHorizontal size={18} /> },
};

const CYCLE_LABELS: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annual',
};

interface SubExt extends Subscription {
    annual_cost: number;
    monthly_cost: number;
    days_until_bill: number;
    is_due_soon: boolean;
}

interface SubSummary {
    monthly_total: number;
    annual_total: number;
    active_count: number;
    by_category: Array<{ category: string; monthly_cost: number; count: number }>;
    due_soon: Array<{ id: number; name: string; amount: number; next_billing_date: string; days_until_bill: number }>;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchSubs(): Promise<SubExt[]> {
    const r = await fetch('/api/v1/subscriptions', { credentials: 'include' });
    return (await r.json()).data;
}

async function fetchSummary(): Promise<SubSummary> {
    const r = await fetch('/api/v1/subscriptions/summary', { credentials: 'include' });
    return (await r.json()).data;
}
async function fetchTrashedSubs(): Promise<SubExt[]> {
    const r = await fetch('/api/v1/subscriptions/trashed', { credentials: 'include' });
    return (await r.json()).data ?? [];
}
async function restoreSub(id: number): Promise<void> {
    await fetch(`/api/v1/subscriptions/${id}/restore`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
// ─── Subscription card ────────────────────────────────────────────────────────
function SubCard({
    sub, onEdit, onDelete, onToggle,
}: { sub: SubExt; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
    const meta = CAT_META[sub.category] ?? CAT_META.other;
    const usageColor = (sub.usage_score ?? 5) <= 3 ? '#EF4444' : (sub.usage_score ?? 5) <= 6 ? '#F59E0B' : '#10B981';

    return (
        <div className={`group relative rounded-2xl border transition-all ${sub.is_active ? 'bg-white/4 border-white/8' : 'bg-white/2 border-white/4 opacity-50'}`}>
            {/* Due soon banner */}
            {sub.is_due_soon && (
                <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl bg-red-500" />
            )}

            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${meta.color}20`, color: meta.color }}>
                            {meta.icon}
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">{sub.name}</p>
                            <p className="text-xs text-white/40">{meta.label}{sub.provider ? ` · ${sub.provider}` : ''}</p>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onToggle} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs">
                            {sub.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={onEdit} className="p-1.5 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all"><Edit2 size={13} /></button>
                        <button onClick={onDelete} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 size={13} /></button>
                    </div>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xl font-bold text-white">{fmt(sub.amount)}</p>
                        <p className="text-xs text-white/40">{CYCLE_LABELS[sub.billing_cycle]}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/40">Next billing</p>
                        <p className={`text-sm font-medium ${sub.is_due_soon ? 'text-red-400' : 'text-white/70'}`}>
                            {sub.is_due_soon && <AlertTriangle size={12} className="inline mr-1" />}
                            {sub.days_until_bill <= 0 ? 'Today!' : sub.days_until_bill === 1 ? 'Tomorrow' : `${sub.days_until_bill}d`}
                        </p>
                    </div>
                </div>

                {/* Usage bar */}
                <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-white/8">
                        <div className="h-full rounded-full" style={{ width: `${(sub.usage_score ?? 5) * 10}%`, background: usageColor }} />
                    </div>
                    <span className="text-xs text-white/30">Usage {sub.usage_score ?? '—'}/10</span>
                    {(sub.usage_score ?? 5) <= 3 && (
                        <span className="text-xs text-red-400 font-medium">Consider cancelling</span>
                    )}
                    {sub.cancel_url && (
                        <a href={sub.cancel_url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 transition-colors">
                            <ExternalLink size={12} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Trash Section ────────────────────────────────────────────────────────────
function SubsTrashSection({ onRestored }: { onRestored: () => void }) {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();
    const { data: trashed = [], isLoading } = useQuery({ queryKey: ['subs-trashed'], queryFn: fetchTrashedSubs, enabled: open });
    const restoreMut = useMutation({
        mutationFn: restoreSub,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['subs-trashed'] }); onRestored(); },
    });
    return (
        <div className="rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
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
                                {trashed.map((s) => (
                                    <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/60 truncate">{s.name}</p>
                                            <p className="text-xs text-white/30">{fmt(s.amount)}/{s.billing_cycle}</p>
                                        </div>
                                        <button onClick={() => restoreMut.mutate(s.id)} disabled={restoreMut.isPending}
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
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SubscriptionsIndex(_: PageProps) {
    const qc = useQueryClient();
    const [filterCat, setFilterCat] = useState('');
    const [toDelete, setToDelete] = useState<SubExt | null>(null);

    const { data: subs = [], isLoading } = useQuery({ queryKey: ['subscriptions'], queryFn: fetchSubs });
    const { data: summary } = useQuery({ queryKey: ['sub-summary'], queryFn: fetchSummary });

    const refetch = () => {
        qc.invalidateQueries({ queryKey: ['subscriptions'] });
        qc.invalidateQueries({ queryKey: ['sub-summary'] });
    };

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
            const r = await fetch(`/api/v1/subscriptions/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            return r.json();
        },
        onSuccess: refetch,
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/v1/subscriptions/${toDelete!.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
        },
        onSuccess: () => {
            refetch();
            qc.invalidateQueries({ queryKey: ['subs-trashed'] });
            setToDelete(null);
        },
    });

    const filtered = filterCat ? subs.filter(s => s.category === filterCat) : subs;
    const activeSubs = filtered.filter(s => s.is_active);
    const pausedSubs = filtered.filter(s => !s.is_active);
    const dueSoon = subs.filter(s => s.is_due_soon);

    return (
        <AppLayout >
            <Head title="Subscriptions" />

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
                        <p className="text-sm text-white/50 mt-0.5">Track recurring charges and spot what you can cancel</p>
                    </div>
                    <button onClick={() => router.visit('/subscriptions/new')}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors">
                        <Plus size={16} /> Add Subscription
                    </button>
                </div>

                {/* Due soon alert */}
                {dueSoon.length > 0 && (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-4 flex items-start gap-3">
                        <Bell size={18} className="text-orange-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-orange-300">{dueSoon.length} subscription{dueSoon.length > 1 ? 's' : ''} due within 7 days</p>
                            <p className="text-xs text-orange-300/60 mt-0.5">
                                {dueSoon.map(s => `${s.name} (${fmt(s.amount)})`).join(' · ')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Summary strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Monthly Spend</p>
                        <p className="text-xl font-bold text-white">{fmt(summary?.monthly_total ?? 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Annual Spend</p>
                        <p className="text-xl font-bold text-white">{fmt(summary?.annual_total ?? 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Active</p>
                        <p className="text-xl font-bold text-white">{summary?.active_count ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Low Usage</p>
                        <p className="text-xl font-bold text-red-400">{subs.filter(s => s.is_active && (s.usage_score ?? 5) <= 3).length}</p>
                        <p className="text-xs text-white/30">consider cancelling</p>
                    </div>
                </div>

                {/* Category breakdown */}
                {summary && summary.by_category.length > 0 && (
                    <div className="rounded-2xl bg-white/4 border border-white/8 p-5">
                        <h2 className="text-sm font-semibold text-white mb-4">Spending by Category</h2>
                        <div className="flex gap-3 flex-wrap">
                            {summary.by_category.sort((a, b) => b.monthly_cost - a.monthly_cost).map(bc => {
                                const meta = CAT_META[bc.category] ?? CAT_META.other;
                                return (
                                    <button
                                        key={bc.category}
                                        onClick={() => setFilterCat(f => f === bc.category ? '' : bc.category)}
                                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border transition-all ${filterCat === bc.category ? 'border-current bg-current/10' : 'border-white/10 text-white/60 hover:border-white/25'}`}
                                        style={filterCat === bc.category ? { color: meta.color, borderColor: meta.color } : undefined}
                                    >
                                        <span style={{ color: meta.color }}>{meta.icon}</span>
                                        {meta.label} · {fmt(bc.monthly_cost)}/mo
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Active subscriptions grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-white/4 animate-pulse" />)}
                    </div>
                ) : activeSubs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-16 text-white/30">
                        <RefreshCcw size={36} className="mb-3" />
                        <p className="text-sm">No active subscriptions</p>
                        <button onClick={() => router.visit('/subscriptions/new')} className="mt-3 text-xs text-blue-400 hover:text-blue-300">Track your first subscription</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeSubs.map(s => (
                            <SubCard key={s.id} sub={s}
                                onEdit={() => router.visit(`/subscriptions/${s.id}/edit`)}
                                onDelete={() => setToDelete(s)}
                                onToggle={() => updateMutation.mutate({ id: s.id, data: { is_active: false } })}
                            />
                        ))}
                    </div>
                )}

                {/* Paused */}
                {pausedSubs.length > 0 && (
                    <div>
                        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Paused</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pausedSubs.map(s => (
                                <SubCard key={s.id} sub={s}
                                    onEdit={() => router.visit(`/subscriptions/${s.id}/edit`)}
                                    onDelete={() => setToDelete(s)}
                                    onToggle={() => updateMutation.mutate({ id: s.id, data: { is_active: true } })}
                                />
                            ))}
                        </div>
                    </div>
                )}
                <SubsTrashSection onRestored={refetch} />
            </div>

            <DeleteConfirmModal
                open={toDelete !== null}
                itemName={toDelete?.name}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate()}
                onCancel={() => setToDelete(null)}
            />
        </AppLayout>
    );
}
