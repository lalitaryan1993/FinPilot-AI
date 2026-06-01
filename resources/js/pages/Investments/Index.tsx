import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Plus, ChevronDown,
    RefreshCw, PiggyBank, Building2, Coins, BarChart2,
    ArrowUpRight, ArrowDownRight, Edit2, Trash2, RotateCcw, Calculator,
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn } from '@/lib/utils';
import type { Investment, PageProps } from '@/types';

// ─── XIRR (Extended Internal Rate of Return) ─────────────────────────────────
function xirr(flows: Array<{ a: number; d: Date }>): number | null {
    if (flows.length < 2) return null;
    if (!flows.some(f => f.a > 0) || !flows.some(f => f.a < 0)) return null;

    const t0  = flows[0].d.getTime();
    const yrs = (d: Date) => (d.getTime() - t0) / 31_557_600_000; // ms per solar year
    const npv = (r: number) => flows.reduce((s, f) => s + f.a / Math.pow(1 + r, yrs(f.d)), 0);

    let r = 0.1;
    for (let i = 0; i < 300; i++) {
        const n  = npv(r);
        const dn = (npv(r + 1e-6) - n) / 1e-6;
        if (Math.abs(dn) < 1e-12) break;
        const nr = r - n / dn;
        if (Math.abs(nr - r) < 1e-8) { r = nr; break; }
        r = Math.max(-0.9999, Math.min(999, nr));
    }
    return isFinite(r) && !isNaN(r) ? r : null;
}

function invXIRR(inv: InvestmentExt): number | null {
    const today = new Date();
    const start = inv.started_at
        ? new Date(inv.started_at)
        : (() => { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return d; })();

    if (start.getTime() >= today.getTime()) return null;

    const flows: Array<{ a: number; d: Date }> = [];

    if (inv.is_sip && inv.sip_amount && inv.sip_day) {
        const d = new Date(start.getFullYear(), start.getMonth(), inv.sip_day);
        if (d.getTime() < start.getTime()) d.setMonth(d.getMonth() + 1);
        while (d.getTime() <= today.getTime()) {
            flows.push({ a: -inv.sip_amount, d: new Date(d) });
            d.setMonth(d.getMonth() + 1);
        }
    } else {
        flows.push({ a: -inv.invested_amount, d: start });
    }

    if (flows.length === 0) return null;
    flows.push({ a: inv.current_value, d: today });

    try { return xirr(flows); } catch { return null; }
}

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    mutual_fund:   { label: 'Mutual Fund',    color: '#3B82F6', icon: <BarChart2 size={16} /> },
    stock:         { label: 'Stocks',         color: '#10B981', icon: <TrendingUp size={16} /> },
    fd:            { label: 'Fixed Deposit',  color: '#F59E0B', icon: <Building2 size={16} /> },
    rd:            { label: 'Recurring Dep.', color: '#F97316', icon: <RefreshCw size={16} /> },
    ppf:           { label: 'PPF',            color: '#8B5CF6', icon: <PiggyBank size={16} /> },
    epf:           { label: 'EPF',            color: '#6366F1', icon: <PiggyBank size={16} /> },
    nps:           { label: 'NPS',            color: '#EC4899', icon: <PiggyBank size={16} /> },
    gold:          { label: 'Gold',           color: '#F5C842', icon: <Coins size={16} /> },
    real_estate:   { label: 'Real Estate',    color: '#14B8A6', icon: <Building2 size={16} /> },
    crypto:        { label: 'Crypto',         color: '#EF4444', icon: <Coins size={16} /> },
    bonds:         { label: 'Bonds',          color: '#84CC16', icon: <BarChart2 size={16} /> },
    other:         { label: 'Other',          color: '#6B7280', icon: <BarChart2 size={16} /> },
};

interface Portfolio {
    total_invested: number;
    total_current_value: number;
    total_gain_loss: number;
    total_gain_loss_pct: number;
    monthly_sip: number;
    active_count: number;
    by_type: Array<{ type: string; invested_amount: number; current_value: number; count: number }>;
}

interface InvestmentExt extends Investment {
    gain_loss: number;
    gain_loss_percent: number;
    current_value: number;
}

// ─── API calls ───────────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchPortfolio(): Promise<Portfolio> {
    const r = await fetch('/api/v1/investments/portfolio', { credentials: 'include' });
    const j = await r.json();
    return j.data;
}

async function fetchInvestments(): Promise<InvestmentExt[]> {
    const r = await fetch('/api/v1/investments', { credentials: 'include' });
    const j = await r.json();
    return j.data;
}
async function fetchTrashedInvestments(): Promise<InvestmentExt[]> {
    const r = await fetch('/api/v1/investments/trashed', { credentials: 'include' });
    return (await r.json()).data ?? [];
}
async function restoreInvestment(id: number): Promise<void> {
    await fetch(`/api/v1/investments/${id}/restore`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
}

// ─── sub-components ──────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
    return (
        <div className="rounded-xl bg-white/5 border border-white/8 p-4">
            <p className="text-xs text-white/50 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
            {sub && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${positive === undefined ? 'text-white/40' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {positive !== undefined && (positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                    {sub}
                </p>
            )}
        </div>
    );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { type: string } }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const meta = TYPE_META[d.payload.type] ?? TYPE_META.other;
    return (
        <div className="rounded-xl bg-[#0F1F3D]/95 border border-white/10 p-3 text-sm shadow-xl">
            <p className="font-semibold text-white mb-1">{meta.label}</p>
            <p className="text-white/70">{fmt(d.value)}</p>
        </div>
    );
}

// ─── Holdings row ─────────────────────────────────────────────────────────────
function HoldingRow({ inv, onEdit, onDelete }: { inv: InvestmentExt; onEdit: () => void; onDelete: () => void }) {
    const meta       = TYPE_META[inv.type] ?? TYPE_META.other;
    const isPositive = inv.gain_loss >= 0;
    const xr         = invXIRR(inv);

    return (
        <div className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/4 transition-colors">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}20`, color: meta.color }}>
                {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{inv.name}</p>
                <p className="text-xs text-white/40">{meta.label}{inv.symbol ? ` · ${inv.symbol}` : ''}{inv.is_sip ? ' · SIP' : ''}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-white">{fmt(inv.current_value)}</p>
                <p className="text-xs text-white/40">invested {fmt(inv.invested_amount)}</p>
            </div>
            <div className={`text-right shrink-0 w-20 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                <p className="text-sm font-medium flex items-center justify-end gap-0.5">
                    {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {pct(inv.gain_loss_percent)}
                </p>
                <p className="text-xs">{fmt(Math.abs(inv.gain_loss))}</p>
            </div>
            {xr !== null && (
                <div className="text-right shrink-0 w-[72px] hidden lg:block">
                    <p className="text-[10px] text-white/35 flex items-center justify-end gap-0.5 mb-0.5">
                        <Calculator size={9} /> XIRR
                    </p>
                    <p className={`text-sm font-bold ${xr >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        {(xr * 100).toFixed(1)}%
                    </p>
                </div>
            )}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="p-1.5 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all"><Edit2 size={14} /></button>
                <button onClick={onDelete} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 size={14} /></button>
            </div>
        </div>
    );
}

// ─── Trash Section ────────────────────────────────────────────────────────────
function InvestmentsTrashSection() {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();
    const { data: trashed = [], isLoading } = useQuery({ queryKey: ['investments-trashed'], queryFn: fetchTrashedInvestments, enabled: open });
    const restoreMut = useMutation({
        mutationFn: restoreInvestment,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments-trashed'] }); qc.invalidateQueries({ queryKey: ['investments'] }); qc.invalidateQueries({ queryKey: ['portfolio'] }); },
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
                                {trashed.map((inv) => (
                                    <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/60 truncate">{inv.name}</p>
                                            <p className="text-xs text-white/30">{TYPE_META[inv.type]?.label ?? inv.type} · {fmt(Number(inv.invested_amount ?? 0))}</p>
                                        </div>
                                        <button onClick={() => restoreMut.mutate(inv.id)} disabled={restoreMut.isPending}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InvestmentsIndex(_: PageProps) {
    const qc = useQueryClient();
    const [filterType, setFilterType] = useState('');
    const [toDelete, setToDelete] = useState<InvestmentExt | null>(null);

    const { data: portfolio } = useQuery({ queryKey: ['portfolio'], queryFn: fetchPortfolio });
    const { data: investments = [], isLoading } = useQuery({ queryKey: ['investments', filterType], queryFn: fetchInvestments });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/v1/investments/${toDelete!.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['investments'] });
            qc.invalidateQueries({ queryKey: ['portfolio'] });
            qc.invalidateQueries({ queryKey: ['investments-trashed'] });
            setToDelete(null);
        },
    });

    // Donut chart data
    const chartData = (portfolio?.by_type ?? []).map(b => ({
        type: b.type,
        name: TYPE_META[b.type]?.label ?? b.type,
        value: b.current_value,
        color: TYPE_META[b.type]?.color ?? '#6B7280',
    }));

    const filtered = filterType ? investments.filter(i => i.type === filterType) : investments;

    return (
        <AppLayout >
            <Head title="Investments" />

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Investments</h1>
                        <p className="text-sm text-white/50 mt-0.5">Track your portfolio across all asset classes</p>
                    </div>
                    <button onClick={() => router.visit('/investments/new')}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors">
                        <Plus size={16} /> Add Investment
                    </button>
                </div>

                {/* Portfolio metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Total Invested" value={fmt(portfolio?.total_invested ?? 0)} />
                    <MetricCard
                        label="Current Value"
                        value={fmt(portfolio?.total_current_value ?? 0)}
                        sub={portfolio ? pct(portfolio.total_gain_loss_pct) : undefined}
                        positive={(portfolio?.total_gain_loss ?? 0) >= 0}
                    />
                    <MetricCard
                        label="Total Gain / Loss"
                        value={fmt(Math.abs(portfolio?.total_gain_loss ?? 0))}
                        sub={(portfolio?.total_gain_loss ?? 0) >= 0 ? 'Profit' : 'Loss'}
                        positive={(portfolio?.total_gain_loss ?? 0) >= 0}
                    />
                    <MetricCard label="Monthly SIP" value={fmt(portfolio?.monthly_sip ?? 0)} sub="Active SIPs" />
                </div>

                {/* Portfolio layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Donut chart */}
                    <div className="rounded-2xl bg-white/4 border border-white/8 p-5">
                        <h2 className="text-sm font-semibold text-white mb-4">Asset Allocation</h2>
                        {chartData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                            paddingAngle={2} dataKey="value">
                                            {chartData.map((d, i) => (
                                                <Cell key={i} fill={d.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2 mt-2">
                                    {chartData.map(d => (
                                        <div key={d.type} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                                                <span className="text-white/60">{d.name}</span>
                                            </div>
                                            <span className="font-medium text-white">{fmt(d.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-white/30">
                                <BarChart2 size={32} className="mb-2" />
                                <p className="text-sm">No investments yet</p>
                            </div>
                        )}
                    </div>

                    {/* Holdings list */}
                    <div className="lg:col-span-2 rounded-2xl bg-white/4 border border-white/8 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white">Holdings ({filtered.length})</h2>
                            <div className="relative">
                                <select
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                    className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">All Types</option>
                                    {Object.entries(TYPE_META).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-2.5 text-white/40 pointer-events-none" />
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-14 rounded-xl bg-white/4 animate-pulse" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-white/30">
                                <TrendingUp size={32} className="mb-2" />
                                <p className="text-sm">No holdings found</p>
                                <button onClick={() => router.visit('/investments/new')} className="mt-3 text-xs text-blue-400 hover:text-blue-300">Add your first investment</button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filtered.map(inv => (
                                    <HoldingRow
                                        key={inv.id}
                                        inv={inv}
                                        onEdit={() => router.visit(`/investments/${inv.id}/edit`)}
                                        onDelete={() => setToDelete(inv)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* SIP summary */}
                {investments.filter(i => i.is_sip && i.status === 'active').length > 0 && (
                    <div className="rounded-2xl bg-white/4 border border-white/8 p-5">
                        <h2 className="text-sm font-semibold text-white mb-4">Active SIPs</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {investments.filter(i => i.is_sip && i.status === 'active').map(inv => {
                                const meta = TYPE_META[inv.type] ?? TYPE_META.other;
                                return (
                                    <div key={inv.id} className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 p-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: `${meta.color}20`, color: meta.color }}>
                                            {meta.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{inv.name}</p>
                                            <p className="text-xs text-white/40">
                                                {fmt(inv.sip_amount ?? 0)}/mo · day {inv.sip_day ?? '—'}
                                            </p>
                                        </div>
                                        <RefreshCw size={14} className="text-blue-400 shrink-0" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <InvestmentsTrashSection />
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
