import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Smartphone, CreditCard, Banknote, Building2, Wallet,
    Check, Loader2, AlertCircle, IndianRupee, CalendarDays, Store,
    StickyNote, Sparkles, ChevronRight,
    Home, ShoppingBasket, Utensils, Car, Activity, Zap, Film, BookOpen,
    Scissors, Shield, Users, Plane, Repeat, Gift, FileText, MoreHorizontal,
    Briefcase, Laptop, PlusCircle, ShoppingBag, TrendingUp, Tag,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn, formatCurrency } from '@/lib/utils';
import type { Category, ApiResponse } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

// ─── Icon map ─────────────────────────────────────────────────────
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

function CatIcon({ icon, color, size = 18 }: { icon?: string; color?: string; size?: number }) {
    const Comp = icon ? (ICON_MAP[icon] ?? null) : null;
    return Comp
        ? <Comp size={size} style={{ color: color ?? '#94A3B8' }} />
        : <Tag size={size} style={{ color: color ?? '#94A3B8' }} />;
}

const PAYMENT_METHODS = [
    { value: 'upi',        label: 'UPI',         Icon: Smartphone, color: '#3B82F6' },
    { value: 'card',       label: 'Card',        Icon: CreditCard, color: '#8B5CF6' },
    { value: 'cash',       label: 'Cash',        Icon: Banknote,   color: '#10B981' },
    { value: 'netbanking', label: 'Net Banking', Icon: Building2,  color: '#F59E0B' },
    { value: 'other',      label: 'Other',       Icon: Wallet,     color: '#6B7280' },
];

const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-blue-500/60 focus:bg-white/8 focus:ring-1 focus:ring-blue-500/20';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2';

// ─── Form ─────────────────────────────────────────────────────────
function ExpenseForm({ initial, onSubmit, saving }: {
    initial?: Record<string, string>;
    onSubmit: (data: Record<string, unknown>) => void;
    saving: boolean;
}) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [form, setForm] = useState({
        description:    initial?.description    ?? '',
        amount:         initial?.amount         ?? '',
        expense_date:   initial?.expense_date   ?? today,
        category_id:    initial?.category_id    ?? '',
        payment_method: initial?.payment_method ?? 'upi',
        merchant:       initial?.merchant       ?? '',
        notes:          initial?.notes          ?? '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories', 'expense'],
        queryFn: async () => {
            const r = await fetch('/api/v1/categories?type=expense', { credentials: 'include' });
            const j: ApiResponse<Category[]> = await r.json();
            return j.data ?? [];
        },
    });

    const selectedCat = useMemo(() => categories.find(c => String(c.id) === form.category_id), [categories, form.category_id]);
    const selectedPm  = PAYMENT_METHODS.find(p => p.value === form.payment_method) ?? PAYMENT_METHODS[0];

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.description.trim()) e.description = 'Description is required';
        if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
        if (!form.expense_date) e.expense_date = 'Date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSubmit({
            description:    form.description,
            amount:         parseFloat(form.amount),
            expense_date:   form.expense_date,
            category_id:    form.category_id ? parseInt(form.category_id) : undefined,
            payment_method: form.payment_method,
            merchant:       form.merchant || undefined,
            notes:          form.notes || undefined,
        });
    };

    const amountNum   = parseFloat(form.amount) || 0;
    const accentColor = selectedCat?.color ?? '#3B82F6';

    return (
        <div className="min-h-screen p-6">
            <div className="mx-auto max-w-lg space-y-5">

                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <button onClick={() => router.visit('/expenses')}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all shrink-0">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">{initial ? 'Edit Expense' : 'Log Expense'}</h1>
                        <p className="text-xs text-white/40">{initial ? 'Update transaction details' : 'Record a new transaction'}</p>
                    </div>
                </div>

                {/* ── Amount hero ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/3 p-6 text-center"
                >
                    {/* Color accent top bar */}
                    <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl transition-colors duration-300"
                        style={{ background: accentColor }} />
                    {/* BG glow */}
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl opacity-15 transition-colors duration-300"
                        style={{ background: accentColor }} />

                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/35">Amount</p>
                    <div className="relative flex items-center justify-center">
                        <span className="mr-1 text-3xl font-light text-white/40">₹</span>
                        <input
                            type="number" min="0" step="0.01"
                            value={form.amount}
                            onChange={e => set('amount', e.target.value)}
                            placeholder="0"
                            className="w-full max-w-50 bg-transparent text-center text-5xl font-black text-white outline-none tabular-nums placeholder-white/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                    {amountNum > 0 && (
                        <p className="mt-1 text-sm text-white/40">{formatCurrency(amountNum, 'INR')}</p>
                    )}
                    <AnimatePresence>
                        {errors.amount && (
                            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="mt-2 flex items-center justify-center gap-1.5 text-xs text-red-400">
                                <AlertCircle size={11} /> {errors.amount}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Description ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">

                    <div>
                        <label className={labelCls}>Description <span className="text-red-400">*</span></label>
                        <input
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="e.g. Lunch at Swiggy, Petrol fill-up…"
                            className={cn(inputCls, errors.description && 'border-red-500/50 focus:border-red-500/70')}
                        />
                        <AnimatePresence>
                            {errors.description && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                                    <AlertCircle size={11} /> {errors.description}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Date */}
                    <div>
                        <label className={labelCls}><CalendarDays size={11} className="inline mr-1 mb-0.5" />Date <span className="text-red-400">*</span></label>
                        <input type="date" value={form.expense_date}
                            onChange={e => set('expense_date', e.target.value)}
                            className={cn(inputCls, 'scheme-dark')} />
                    </div>
                </motion.div>

                {/* ── Category grid ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
                    className="rounded-2xl border border-white/8 bg-white/3 p-5">
                    <label className={labelCls}>Category</label>
                    {categories.length === 0 ? (
                        <div className="text-center py-4 text-white/30 text-sm">Loading categories…</div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {categories.map(cat => {
                                const isSelected = String(cat.id) === form.category_id;
                                const color      = cat.color ?? '#3B82F6';
                                return (
                                    <button key={cat.id} type="button"
                                        onClick={() => set('category_id', isSelected ? '' : String(cat.id))}
                                        className={cn(
                                            'relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all',
                                            isSelected
                                                ? 'border-transparent shadow-sm'
                                                : 'border-white/8 hover:border-white/18 hover:bg-white/4',
                                        )}
                                        style={isSelected ? { background: `${color}18`, borderColor: `${color}50` } : {}}
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                                            style={{ background: `${color}${isSelected ? '30' : '15'}` }}>
                                            <CatIcon icon={cat.icon} color={color} size={15} />
                                        </div>
                                        <span className="text-[10px] font-medium leading-tight line-clamp-2"
                                            style={{ color: isSelected ? color : 'rgba(255,255,255,0.5)' }}>
                                            {cat.name}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full"
                                                style={{ background: color }}>
                                                <Check size={9} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* ── Payment method ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                    className="rounded-2xl border border-white/8 bg-white/3 p-5">
                    <label className={labelCls}>Payment Method</label>
                    <div className="grid grid-cols-5 gap-2">
                        {PAYMENT_METHODS.map(pm => {
                            const isSelected = form.payment_method === pm.value;
                            return (
                                <button key={pm.value} type="button" onClick={() => set('payment_method', pm.value)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                                        isSelected ? 'border-transparent' : 'border-white/8 hover:border-white/18 hover:bg-white/4',
                                    )}
                                    style={isSelected ? { background: `${pm.color}18`, borderColor: `${pm.color}50` } : {}}
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                                        style={{ background: `${pm.color}${isSelected ? '30' : '15'}` }}>
                                        <pm.Icon size={16} style={{ color: pm.color }} />
                                    </div>
                                    <span className="text-[10px] font-semibold"
                                        style={{ color: isSelected ? pm.color : 'rgba(255,255,255,0.45)' }}>
                                        {pm.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* ── Merchant & Notes ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
                    <div>
                        <label className={labelCls}><Store size={11} className="inline mr-1 mb-0.5" />Merchant / Store</label>
                        <input value={form.merchant} onChange={e => set('merchant', e.target.value)}
                            placeholder="e.g. Zomato, Amazon, Big Bazaar"
                            className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}><StickyNote size={11} className="inline mr-1 mb-0.5" />Notes</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                            placeholder="Optional note or reference…" rows={2}
                            className={cn(inputCls, 'resize-none')} />
                    </div>
                </motion.div>

                {/* ── Preview strip ── */}
                <AnimatePresence>
                    {(form.description || amountNum > 0) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-4"
                        >
                            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/35">
                                <Sparkles size={11} /> Preview
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                    style={{ background: `${accentColor}22` }}>
                                    <CatIcon icon={selectedCat?.icon} color={accentColor} size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{form.description || 'Description…'}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {selectedCat && <span className="text-xs" style={{ color: accentColor }}>{selectedCat.name}</span>}
                                        <span className="text-xs" style={{ color: selectedPm.color }}>
                                            <selectedPm.Icon size={10} className="inline mr-0.5" />{selectedPm.label}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-base font-black tabular-nums text-white shrink-0">
                                    {amountNum > 0 ? formatCurrency(amountNum, 'INR') : '₹—'}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Submit ── */}
                <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                    onClick={handleSave} disabled={saving}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-500 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/25 hover:bg-blue-400 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <><Loader2 size={18} className="animate-spin" /> Saving…</>
                    ) : (
                        <><IndianRupee size={18} /> {initial ? 'Save Changes' : 'Save Expense'} <ChevronRight size={16} /></>
                    )}
                </motion.button>

                <p className="pb-4 text-center text-xs text-white/25">
                    Press Save to add this to your expense tracker
                </p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function ExpensesCreate() {
    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch('/api/v1/expenses', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed to save');
            return j.data;
        },
        onSuccess: () => router.visit('/expenses'),
    });

    return (
        <AppLayout title="Log Expense">
            <Head title="Log Expense" />
            <ExpenseForm onSubmit={d => mutation.mutate(d)} saving={mutation.isPending} />
        </AppLayout>
    );
}
