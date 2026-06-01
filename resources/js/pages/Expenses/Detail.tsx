import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Edit2, Trash2, Receipt, Loader2,
    CreditCard, Banknote, Smartphone, Building2, Wallet,
    Tag, Store, StickyNote, Calendar, IndianRupee,
    CheckCircle, Sparkles, AlertCircle, Clock,
    Home, ShoppingBasket, Utensils, Car, Activity, Zap, Film, BookOpen,
    Scissors, Shield, Users, Plane, Repeat, Gift, FileText, MoreHorizontal,
    Briefcase, Laptop, PlusCircle, ShoppingBag, TrendingUp,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import type { Expense, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

// Shared icon map
const ICON_MAP: Record<string, React.ElementType> = {
    'home': Home, 'shopping-basket': ShoppingBasket, 'utensils': Utensils,
    'car': Car, 'activity': Activity, 'zap': Zap, 'shopping-bag': ShoppingBag,
    'film': Film, 'book-open': BookOpen, 'scissors': Scissors,
    'credit-card': CreditCard, 'shield': Shield, 'trending-up': TrendingUp,
    'users': Users, 'plane': Plane, 'repeat': Repeat, 'gift': Gift,
    'file-text': FileText, 'more-horizontal': MoreHorizontal,
    'briefcase': Briefcase, 'laptop': Laptop, 'building-2': Building2,
    'plus-circle': PlusCircle,
};

function CategoryIcon({ icon, color, size = 20 }: { icon?: string; color?: string; size?: number }) {
    const Comp = icon ? (ICON_MAP[icon] ?? null) : null;
    return Comp ? <Comp size={size} style={{ color: color ?? '#94A3B8' }} /> : <Tag size={size} style={{ color: color ?? '#94A3B8' }} />;
}

const PM_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
    upi:        { label: 'UPI',         Icon: Smartphone, color: '#3B82F6' },
    card:       { label: 'Card',        Icon: CreditCard, color: '#8B5CF6' },
    cash:       { label: 'Cash',        Icon: Banknote,   color: '#10B981' },
    netbanking: { label: 'Net Banking', Icon: Building2,  color: '#F59E0B' },
    other:      { label: 'Other',       Icon: Wallet,     color: '#6B7280' },
};

const SOURCE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    manual:       { label: 'Manually entered',    icon: CheckCircle,  color: '#10B981' },
    ai_extracted: { label: 'Extracted by AI',     icon: Sparkles,     color: '#8B5CF6' },
    ocr:          { label: 'Scanned document',    icon: Receipt,      color: '#06B6D4' },
    bank_import:  { label: 'Bank import',         icon: Building2,    color: '#F59E0B' },
    api:          { label: 'Via API',             icon: Zap,          color: '#EC4899' },
};

interface Props extends PageProps { id: number; }

export default function ExpensesDetail({ id }: Props) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const { data: expense, isLoading, isError } = useQuery<Expense>({
        queryKey: ['expense', id],
        queryFn: async () => {
            const r = await fetch(`/api/v1/expenses/${id}`, { credentials: 'include' });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Not found');
            return j.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/v1/expenses/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
        },
        onSuccess: () => router.visit('/expenses'),
    });

    if (isLoading) {
        return (
            <AppLayout>
                <Head title="Expense Details" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={22} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    if (isError || !expense) {
        return (
            <AppLayout>
                <Head title="Not Found" />
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-white/40">
                    <AlertCircle size={36} />
                    <p className="text-sm">Expense not found or access denied</p>
                    <button onClick={() => router.visit('/expenses')}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors">← Back to expenses</button>
                </div>
            </AppLayout>
        );
    }

    const pm      = PM_META[expense.payment_method ?? 'other'] ?? PM_META.other;
    const srcMeta = SOURCE_LABELS[expense.source ?? 'manual'] ?? SOURCE_LABELS.manual;
    const catColor = expense.category?.color ?? '#3B82F6';
    const dateStr  = expense.expense_date
        ? format(parseISO((expense.expense_date as string).slice(0, 10)), 'EEEE, d MMMM yyyy')
        : '—';

    return (
        <AppLayout>
            <Head title={`${expense.description}`} />

            <div className="p-6 max-w-xl mx-auto space-y-4">

                {/* ── Nav bar ── */}
                <div className="flex items-center justify-between">
                    <button onClick={() => router.visit('/expenses')}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:text-white hover:border-white/25 transition-all">
                        <ArrowLeft size={14} /> Expenses
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.visit(`/expenses/${id}/edit`)}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all">
                            <Edit2 size={13} /> Edit
                        </button>
                        {!confirmDelete ? (
                            <button onClick={() => setConfirmDelete(true)}
                                className="flex items-center gap-2 rounded-xl border border-red-500/25 px-3 py-2 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all">
                                <Trash2 size={13} /> Delete
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setConfirmDelete(false)}
                                    className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
                                <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
                                    className="flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-400 transition-colors disabled:opacity-60">
                                    {deleteMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                                    Confirm Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Hero card ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/6 to-white/2 p-6"
                >
                    {/* Top color bar */}
                    <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: catColor }} />

                    {/* Category bg glow */}
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10 blur-3xl"
                        style={{ background: catColor }} />

                    {/* Amount */}
                    <div className="flex flex-col items-center text-center pt-2">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: `${catColor}22` }}>
                            <CategoryIcon icon={expense.category?.icon} color={catColor} size={24} />
                        </div>

                        <p className="text-4xl font-black text-white tabular-nums tracking-tight">
                            {formatCurrency(Number(expense.amount), expense.currency ?? 'INR')}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white/80">{expense.description}</p>
                        <p className="mt-1 text-sm text-white/40">{dateStr}</p>

                        {expense.category && (
                            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ background: `${catColor}1A`, color: catColor }}>
                                <CategoryIcon icon={expense.category.icon} color={catColor} size={11} />
                                {expense.category.name}
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* ── Details card ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                    className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden"
                >
                    <div className="px-5 py-3.5 border-b border-white/6">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/35">Transaction Details</p>
                    </div>

                    {[
                        {
                            icon: <Calendar size={15} />, label: 'Date', accent: '#06B6D4',
                            value: dateStr,
                        },
                        {
                            icon: <pm.Icon size={15} />, label: 'Payment Method', accent: pm.color,
                            value: (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                                    style={{ background: `${pm.color}1A`, color: pm.color }}>
                                    <pm.Icon size={11} /> {pm.label}
                                </span>
                            ),
                        },
                        expense.merchant ? {
                            icon: <Store size={15} />, label: 'Merchant', accent: '#F59E0B',
                            value: expense.merchant,
                        } : null,
                        expense.notes ? {
                            icon: <StickyNote size={15} />, label: 'Notes', accent: '#94A3B8',
                            value: <span className="italic text-white/60">{expense.notes}</span>,
                        } : null,
                        expense.tags?.length ? {
                            icon: <Tag size={15} />, label: 'Tags', accent: '#8B5CF6',
                            value: (
                                <div className="flex flex-wrap gap-1.5">
                                    {expense.tags!.map((t, i) => (
                                        <span key={i} className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/60">{t}</span>
                                    ))}
                                </div>
                            ),
                        } : null,
                        {
                            icon: <srcMeta.icon size={15} />, label: 'Source', accent: srcMeta.color,
                            value: (
                                <span className="inline-flex items-center gap-1.5 text-sm"
                                    style={{ color: srcMeta.color }}>
                                    <srcMeta.icon size={12} /> {srcMeta.label}
                                </span>
                            ),
                        },
                        {
                            icon: <Clock size={15} />, label: 'Logged on', accent: '#10B981',
                            value: expense.created_at
                                ? format(parseISO(expense.created_at), 'd MMM yyyy, h:mm a')
                                : '—',
                        },
                    ].filter(Boolean).map((row, i) => row && (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/4 last:border-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                                style={{ background: `${row.accent ?? '#94A3B8'}15`, color: row.accent ?? '#94A3B8' }}>
                                {row.icon}
                            </div>
                            <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
                                <p className="text-xs text-white/40 shrink-0">{row.label}</p>
                                <div className="text-sm font-medium text-white text-right">{row.value}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* ── Quick actions ── */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                    className="grid grid-cols-2 gap-3"
                >
                    <button onClick={() => router.visit('/expenses/new')}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 p-4 text-sm font-medium text-white/50 hover:text-white hover:border-white/25 hover:bg-white/3 transition-all">
                        <IndianRupee size={15} className="shrink-0" />
                        Log another
                    </button>
                    <button onClick={() => router.visit(`/expenses/${id}/edit`)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/8 p-4 text-sm font-semibold text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/40 transition-all">
                        <Edit2 size={15} className="shrink-0" />
                        Edit this expense
                    </button>
                </motion.div>

            </div>
        </AppLayout>
    );
}
