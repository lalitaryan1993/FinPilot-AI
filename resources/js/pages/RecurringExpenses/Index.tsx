import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCcw, TrendingUp, IndianRupee, Calendar, AlertTriangle,
    CheckCircle2, Plus, ChevronDown, ChevronUp, Zap, Clock,
    BarChart2, ShieldCheck, Info,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RecurringItem {
    name:                string;
    category:            { id: number; name: string; icon: string; color: string } | null;
    frequency:           string;
    occurrences:         number;
    distinct_months:     number;
    avg_amount:          number;
    amount_variance_pct: number;
    annual_cost:         number;
    last_seen:           string;
    next_due_estimate:   string | null;
    confidence:          number;
    is_fixed:            boolean;
    sample_expenses:     { id: number; amount: number; date: string }[];
}

interface RecurringMeta {
    total:           number;
    total_annual:    number;
    total_monthly:   number;
    analysed_months: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const FREQ_LABELS: Record<string, { label: string; color: string }> = {
    weekly:      { label: 'Weekly',      color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    biweekly:    { label: 'Biweekly',    color: 'bg-blue-500/15   text-blue-300   border-blue-500/30' },
    monthly:     { label: 'Monthly',     color: 'bg-green-500/15  text-green-300  border-green-500/30' },
    quarterly:   { label: 'Quarterly',   color: 'bg-amber-500/15  text-amber-300  border-amber-500/30' },
    half_yearly: { label: 'Half-Yearly', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
    annually:    { label: 'Annually',    color: 'bg-red-500/15    text-red-300    border-red-500/30' },
};

function confidenceLabel(c: number): { text: string; color: string } {
    if (c >= 80) return { text: 'High',   color: 'text-green-400' };
    if (c >= 60) return { text: 'Medium', color: 'text-amber-400' };
    return             { text: 'Low',    color: 'text-white/40' };
}

function daysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
}

// ─── API ──────────────────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchRecurring(): Promise<{ data: RecurringItem[]; meta: RecurringMeta }> {
    const r = await fetch('/api/v1/expenses/recurring', { credentials: 'include' });
    const j = await r.json();
    return { data: j.data ?? [], meta: j.meta ?? {} };
}

async function addToSubscriptions(item: RecurringItem): Promise<void> {
    await fetch('/api/v1/subscriptions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
        body: JSON.stringify({
            name:              item.name,
            amount:            item.avg_amount,
            billing_cycle:     item.frequency === 'monthly' ? 'monthly' : item.frequency === 'annually' ? 'annually' : item.frequency === 'quarterly' ? 'quarterly' : 'monthly',
            next_billing_date: item.next_due_estimate ?? new Date().toISOString().slice(0, 10),
            category:          'other',
        }),
    });
}

// ─── Row component ────────────────────────────────────────────────────────────
function RecurringRow({ item, index }: { item: RecurringItem; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const [added,    setAdded]    = useState(false);
    const qc = useQueryClient();

    const addMutation = useMutation({
        mutationFn: () => addToSubscriptions(item),
        onSuccess:  () => { setAdded(true); qc.invalidateQueries({ queryKey: ['subscriptions'] }); },
    });

    const freqMeta    = FREQ_LABELS[item.frequency] ?? { label: item.frequency, color: 'bg-white/5 text-white/50 border-white/10' };
    const conf        = confidenceLabel(item.confidence);
    const daysLeft    = item.next_due_estimate ? daysUntil(item.next_due_estimate) : null;
    const dueSoon     = daysLeft !== null && daysLeft <= 7;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
        >
            <GlassCard className={cn('overflow-hidden transition-all', dueSoon && 'border-amber-500/30')}>
                {/* Main row */}
                <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    {/* Icon */}
                    <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                        style={{ background: item.category ? item.category.color + '22' : '#ffffff10' }}
                    >
                        <span style={{ color: item.category?.color ?? '#9CA3AF' }}>
                            ↻
                        </span>
                    </div>

                    {/* Name + badges */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white truncate">{item.name}</span>
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', freqMeta.color)}>
                                {freqMeta.label}
                            </span>
                            {item.is_fixed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] text-green-400">
                                    <ShieldCheck size={10} /> Fixed
                                </span>
                            )}
                            {dueSoon && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300">
                                    <Clock size={10} /> Due in {daysLeft}d
                                </span>
                            )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                            <span>{item.category?.name ?? 'Uncategorised'}</span>
                            <span>·</span>
                            <span>{item.distinct_months} of 6 months</span>
                            <span>·</span>
                            <span className={conf.color}>
                                {conf.text} confidence ({item.confidence}%)
                            </span>
                        </div>
                    </div>

                    {/* Amounts */}
                    <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="font-bold tabular-nums text-white">{fmt(item.avg_amount)}</span>
                        <span className="text-xs text-white/40">{fmt(item.annual_cost)}/yr</span>
                    </div>

                    {/* Expand toggle */}
                    <div className="text-white/30">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-white/8"
                        >
                            <div className="p-4 space-y-4">
                                {/* Stats grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Avg Amount',    value: fmt(item.avg_amount) },
                                        { label: 'Annual Cost',   value: fmt(item.annual_cost) },
                                        { label: 'Occurrences',   value: `${item.occurrences}×` },
                                        { label: 'Amount Variance', value: `±${item.amount_variance_pct.toFixed(1)}%` },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="rounded-lg bg-white/5 p-3">
                                            <p className="text-[10px] text-white/40 uppercase tracking-wide">{label}</p>
                                            <p className="mt-1 text-sm font-semibold text-white tabular-nums">{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Recent occurrences */}
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/30">Recent occurrences</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {item.sample_expenses.map((e) => (
                                            <div key={e.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                                                <span className="text-white/50">{e.date}</span>
                                                <span className="ml-2 font-semibold text-white tabular-nums">{fmt(e.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Next due + CTA */}
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    {item.next_due_estimate && (
                                        <div className="flex items-center gap-2 text-xs text-white/50">
                                            <Calendar size={14} />
                                            Estimated next due: <span className="font-medium text-white">{item.next_due_estimate}</span>
                                            {daysLeft !== null && <span className={cn('ml-1', daysLeft <= 7 ? 'text-amber-400' : 'text-white/40')}>({daysLeft > 0 ? `in ${daysLeft} days` : 'overdue'})</span>}
                                        </div>
                                    )}

                                    {added ? (
                                        <div className="flex items-center gap-1.5 text-xs text-green-400">
                                            <CheckCircle2 size={14} /> Added to Subscriptions
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); addMutation.mutate(); }}
                                            disabled={addMutation.isPending}
                                            className="flex items-center gap-2 rounded-lg bg-blue-500/15 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                                        >
                                            <Plus size={12} />
                                            {addMutation.isPending ? 'Adding…' : 'Track as Subscription'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </GlassCard>
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type FilterType = 'all' | 'monthly' | 'fixed' | 'due_soon';

export default function RecurringExpensesIndex() {
    const [filter, setFilter] = useState<FilterType>('all');

    const { data: result, isLoading, isError, refetch } = useQuery({
        queryKey: ['recurring-expenses'],
        queryFn:  fetchRecurring,
        staleTime: 5 * 60_000,
    });

    const items = result?.data ?? [];
    const meta  = result?.meta;

    const filtered = items.filter((item) => {
        if (filter === 'monthly')   return item.frequency === 'monthly';
        if (filter === 'fixed')     return item.is_fixed;
        if (filter === 'due_soon')  return item.next_due_estimate && daysUntil(item.next_due_estimate) <= 7;
        return true;
    });

    const dueSoonCount = items.filter((i) => i.next_due_estimate && daysUntil(i.next_due_estimate) <= 7).length;

    return (
        <AppLayout title="Recurring Expenses">
            <Head title="Recurring Expenses" />

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Recurring Expenses</h1>
                        <p className="mt-1 text-sm text-white/50">
                            AI-detected spending patterns from the last 6 months
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/8 transition-colors"
                    >
                        <RefreshCcw size={14} /> Re-analyse
                    </button>
                </div>

                {/* Summary cards */}
                {meta && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Patterns Found',    value: meta.total.toString(),     icon: Zap,          color: 'text-blue-400' },
                            { label: 'Monthly Committed', value: fmt(meta.total_monthly),   icon: IndianRupee,  color: 'text-green-400' },
                            { label: 'Annual Cost',       value: fmt(meta.total_annual),    icon: TrendingUp,   color: 'text-amber-400' },
                            { label: 'Due This Week',     value: dueSoonCount.toString(),   icon: AlertTriangle, color: dueSoonCount > 0 ? 'text-amber-400' : 'text-white/40' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <GlassCard key={label} className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8">
                                        <Icon size={16} className={color} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/40">{label}</p>
                                        <p className="text-lg font-bold tabular-nums text-white">{value}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}

                {/* Info banner */}
                <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 p-4">
                    <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
                    <p className="text-sm text-blue-300/80">
                        Patterns are detected by analysing your last 6 months of expense history. An expense is flagged as recurring when it appears in 3+ distinct months with a consistent amount and interval. Click any row to expand details or add it to your Subscriptions tracker.
                    </p>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 flex-wrap">
                    {([
                        { key: 'all',      label: `All (${items.length})` },
                        { key: 'monthly',  label: 'Monthly' },
                        { key: 'fixed',    label: 'Fixed amount' },
                        { key: 'due_soon', label: `Due soon${dueSoonCount > 0 ? ` (${dueSoonCount})` : ''}` },
                    ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                                filter === key
                                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {isLoading && (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                )}

                {isError && (
                    <GlassCard className="p-8 text-center">
                        <AlertTriangle size={28} className="mx-auto mb-3 text-red-400" />
                        <p className="text-white/60">Failed to analyse expenses. Make sure you have some expense history.</p>
                    </GlassCard>
                )}

                {!isLoading && !isError && filtered.length === 0 && (
                    <GlassCard className="p-10 text-center">
                        <BarChart2 size={36} className="mx-auto mb-4 text-white/20" />
                        <h3 className="font-semibold text-white/60">
                            {filter === 'all' ? 'No recurring patterns detected' : 'No items match this filter'}
                        </h3>
                        <p className="mt-2 text-sm text-white/35">
                            {filter === 'all'
                                ? 'Log expenses consistently for a few months and we\'ll detect your recurring patterns automatically.'
                                : 'Try switching to "All" to see every pattern.'}
                        </p>
                    </GlassCard>
                )}

                {!isLoading && !isError && filtered.length > 0 && (
                    <div className="space-y-3">
                        {filtered.map((item, i) => (
                            <RecurringRow key={item.name} item={item} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
