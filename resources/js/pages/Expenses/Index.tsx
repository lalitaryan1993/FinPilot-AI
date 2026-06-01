import { useState, useCallback, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    format, parseISO, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, startOfYear, endOfYear,
    subMonths, isToday,
} from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
    Plus, Search, Filter, Trash2, Edit2, Receipt, X, LayoutGrid, List,
    ChevronLeft, ChevronRight, Calendar, Eye, RotateCcw, ChevronDown, Download,
    Smartphone, CreditCard, Banknote, Building2, TrendingUp, TrendingDown,
    ShoppingBag, ArrowUpRight, Tag, SortAsc, SortDesc, Wallet, IndianRupee,
    Home, ShoppingBasket, Utensils, Car, Activity, Zap, Film, BookOpen,
    Scissors, Shield, Users, Plane, Repeat, Gift, FileText, MoreHorizontal,
    Briefcase, Laptop, PlusCircle, AlertCircle, Sparkles,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn, formatCurrency } from '@/lib/utils';
import type { Expense, Category, ApiResponse } from '@/types';

// ─── Icon map ────────────────────────────────────────────────────
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

function CategoryIcon({ icon, color, size = 18 }: { icon?: string; color?: string; size?: number }) {
    const IconComp = icon ? (ICON_MAP[icon] ?? null) : null;
    const bg = color ? `${color}22` : 'rgba(255,255,255,0.06)';
    const fg = color ?? 'rgba(255,255,255,0.4)';
    return (
        <div className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 36, height: 36, background: bg }}>
            {IconComp
                ? <IconComp size={size} style={{ color: fg }} />
                : <Tag size={size} style={{ color: fg }} />}
        </div>
    );
}

// ─── Types ───────────────────────────────────────────────────────
type PaginatedExpenses = { data: Expense[]; current_page: number; last_page: number; total: number; per_page: number };
type SummaryData      = { month: string; total: number; count: number; currency: string; by_category: { category: Category | null; total: number; count: number }[] };
type DatePreset       = 'today' | 'week' | 'month' | '3m' | 'year' | 'custom';
type SortKey          = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
type ViewMode         = 'table' | 'cards';

// ─── Helpers ─────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const PM_META: Record<string, { label: string; Icon: React.ElementType; cls: string }> = {
    upi:        { label: 'UPI',         Icon: Smartphone, cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    card:       { label: 'Card',        Icon: CreditCard, cls: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    cash:       { label: 'Cash',        Icon: Banknote,   cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    netbanking: { label: 'Net Banking', Icon: Building2,  cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    other:      { label: 'Other',       Icon: Wallet,     cls: 'text-white/40 bg-white/5 border-white/10' },
};

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
    ai_extracted: { label: 'AI',   cls: 'text-violet-400 bg-violet-400/10' },
    ocr:          { label: 'Scan', cls: 'text-cyan-400 bg-cyan-400/10' },
    bank_import:  { label: 'Bank', cls: 'text-amber-400 bg-amber-400/10' },
    api:          { label: 'API',  cls: 'text-pink-400 bg-pink-400/10' },
};

function getPresetRange(preset: DatePreset): [string, string] {
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    const now = new Date();
    if (preset === 'today') return [fmt(now), fmt(now)];
    if (preset === 'week')  return [fmt(startOfWeek(now, { weekStartsOn: 1 })), fmt(endOfWeek(now, { weekStartsOn: 1 }))];
    if (preset === 'month') return [fmt(startOfMonth(now)), fmt(endOfMonth(now))];
    if (preset === '3m')    return [fmt(startOfMonth(subMonths(now, 2))), fmt(endOfMonth(now))];
    if (preset === 'year')  return [fmt(startOfYear(now)), fmt(endOfYear(now))];
    return [fmt(startOfMonth(now)), fmt(endOfMonth(now))];
}

// ─── API ─────────────────────────────────────────────────────────
async function fetchExpenses(params: Record<string, string>): Promise<PaginatedExpenses> {
    const res = await fetch(`/api/v1/expenses?${new URLSearchParams(params)}`, { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await res.json()).data;
}
async function fetchCategories(): Promise<Category[]> {
    const res = await fetch('/api/v1/categories?type=expense', { credentials: 'include', headers: { Accept: 'application/json' } });
    const json: ApiResponse<Category[]> = await res.json();
    return json.data ?? [];
}
async function fetchSummary(month: string): Promise<SummaryData> {
    const res = await fetch(`/api/v1/expenses/summary?month=${month}`, { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await res.json()).data;
}
async function fetchTrashed(): Promise<Expense[]> {
    const res = await fetch('/api/v1/expenses/trashed', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await res.json()).data ?? [];
}
async function deleteExpense(id: number) {
    await fetch(`/api/v1/expenses/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
}
async function restoreExpense(id: number) {
    await fetch(`/api/v1/expenses/${id}/restore`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
}

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient }: {
    label: string; value: string; sub?: string; icon: React.ElementType; gradient: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-4"
        >
            <div className={cn('absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-xl', gradient)} />
            <div className="flex items-start gap-3">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', gradient, 'opacity-90')}>
                    <Icon className="h-4.5 w-4.5 text-white" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</p>
                    <p className="mt-0.5 text-lg font-bold text-white truncate leading-tight">{value}</p>
                    {sub && <p className="mt-0.5 text-xs text-white/35 truncate">{sub}</p>}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Spending Chart ───────────────────────────────────────────────
function SpendingChart({ expenses }: { expenses: Expense[] }) {
    const chartData = useMemo(() => {
        const byDay: Record<string, number> = {};
        expenses.forEach(e => { const d = e.expense_date.slice(0, 10); byDay[d] = (byDay[d] ?? 0) + e.amount; });
        return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-30)
            .map(([date, total]) => ({ date, label: format(parseISO(date), 'dd MMM'), total: Math.round(total), isToday: isToday(parseISO(date)) }));
    }, [expenses]);
    if (chartData.length < 2) return null;

    return (
        <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-white/70">Spending Trend</p>
                <p className="text-xs text-white/35">Last {chartData.length} days</p>
            </div>
            <ResponsiveContainer width="100%" height={100}>
                <BarChart data={chartData} barCategoryGap="35%">
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis hide />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={{ background: '#0d1a2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}
                        formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Spent']}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {chartData.map((e, i) => <Cell key={i} fill={e.isToday ? '#3B82F6' : 'rgba(59,130,246,0.3)'} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </GlassCard>
    );
}

// ─── Category Breakdown ───────────────────────────────────────────
function CategoryBreakdown({ summary }: { summary: SummaryData | undefined }) {
    const [open, setOpen] = useState(false);
    if (!summary?.by_category.length) return null;
    const max = summary.by_category[0].total;

    return (
        <GlassCard className="overflow-hidden">
            <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
                        <Tag size={14} className="text-violet-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">Category Breakdown</p>
                        <p className="text-xs text-white/40">{summary.by_category.length} categories this period</p>
                    </div>
                </div>
                <ChevronDown size={16} className={cn('text-white/30 transition-transform duration-200', open && 'rotate-180')} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/6">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            {summary.by_category.map((row, i) => {
                                const cat = row.category;
                                const pct = max > 0 ? (row.total / max) * 100 : 0;
                                const color = cat?.color ?? '#3B82F6';
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <CategoryIcon icon={cat?.icon} color={color} size={15} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-medium text-white/70 truncate">{cat?.name ?? 'Uncategorised'}</span>
                                                <span className="text-xs font-bold tabular-nums text-white ml-2">{formatCurrency(row.total, summary.currency)}</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-white/6">
                                                <motion.div
                                                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                                                    className="h-1.5 rounded-full" style={{ background: color }}
                                                />
                                            </div>
                                            <p className="mt-1 text-[10px] text-white/30">{row.count} transaction{row.count > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}

// ─── Expense Row (Table) ──────────────────────────────────────────
function ExpenseRow({ expense, onDelete, selected, onSelect }: {
    expense: Expense; onDelete: (e: Expense) => void; selected: boolean; onSelect: (id: number) => void;
}) {
    const pm  = PM_META[expense.payment_method ?? 'other'] ?? PM_META.other;
    const src = SOURCE_BADGE[expense.source];

    return (
        <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={cn('group border-b border-white/4 last:border-0 transition-colors', selected ? 'bg-blue-500/5' : 'hover:bg-white/[0.015]')}
        >
            <td className="py-3 pl-4 w-8">
                <input type="checkbox" checked={selected} onChange={() => onSelect(expense.id)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-blue-500 cursor-pointer" />
            </td>
            <td className="py-3 pl-2 pr-3 w-20">
                <span className="text-xs font-medium text-white/60 whitespace-nowrap">{format(parseISO(expense.expense_date), 'dd MMM')}</span>
                <p className="text-[10px] text-white/30">{format(parseISO(expense.expense_date), 'EEE')}</p>
            </td>
            <td className="px-3 py-3 w-36">
                {expense.category ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: `${expense.category.color ?? '#3B82F6'}1A`, color: expense.category.color ?? '#3B82F6' }}>
                        <CategoryIcon icon={expense.category.icon} color={expense.category.color} size={11} />
                        <span className="truncate max-w-[80px]">{expense.category.name}</span>
                    </span>
                ) : <span className="text-xs text-white/25">—</span>}
            </td>
            <td className="px-3 py-3">
                <p className="text-sm font-medium text-white truncate max-w-[180px]">{expense.description}</p>
                {expense.merchant && <p className="text-xs text-white/35 truncate">{expense.merchant}</p>}
            </td>
            <td className="hidden px-3 py-3 md:table-cell w-28">
                <span className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium', pm.cls)}>
                    <pm.Icon size={11} /> {pm.label}
                </span>
            </td>
            <td className="hidden px-3 py-3 lg:table-cell w-16">
                {src && <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', src.cls)}>{src.label}</span>}
            </td>
            <td className="px-3 py-3 text-right w-28">
                <span className="text-sm font-bold tabular-nums text-white">{formatCurrency(expense.amount, expense.currency)}</span>
            </td>
            <td className="py-3 pl-3 pr-4 w-24">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => router.visit(`/expenses/${expense.id}`)}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-white/6 hover:text-cyan-400 transition-colors" title="View">
                        <Eye size={13} />
                    </button>
                    <button onClick={() => router.visit(`/expenses/${expense.id}/edit`)}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-white/6 hover:text-white transition-colors" title="Edit">
                        <Edit2 size={13} />
                    </button>
                    <button onClick={() => onDelete(expense)}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={13} />
                    </button>
                </div>
            </td>
        </motion.tr>
    );
}

// ─── Expense Card ─────────────────────────────────────────────────
function ExpenseCard({ expense, onDelete }: { expense: Expense; onDelete: (e: Expense) => void }) {
    const pm  = PM_META[expense.payment_method ?? 'other'] ?? PM_META.other;
    const src = SOURCE_BADGE[expense.source];
    const color = expense.category?.color ?? '#3B82F6';

    return (
        <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
            className="group relative flex items-center gap-3.5 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3.5 hover:border-white/12 hover:bg-white/[0.04] transition-all"
        >
            {/* left accent */}
            <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full" style={{ background: color }} />

            <CategoryIcon icon={expense.category?.icon} color={color} size={16} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white leading-tight truncate">{expense.description}</p>
                    {src && <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0', src.cls)}>{src.label}</span>}
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {expense.category && (
                        <span className="text-xs font-medium" style={{ color }}>{expense.category.name}</span>
                    )}
                    {expense.merchant && (
                        <span className="text-xs text-white/35 truncate">· {expense.merchant}</span>
                    )}
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', pm.cls.split(' ')[0])}>
                        <pm.Icon size={10} /> {pm.label}
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-base font-bold tabular-nums text-white">
                    {formatCurrency(Number(expense.amount), expense.currency)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => router.visit(`/expenses/${expense.id}`)}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-white/8 hover:text-cyan-400 transition-colors" title="View">
                        <Eye size={13} />
                    </button>
                    <button onClick={() => router.visit(`/expenses/${expense.id}/edit`)}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-white/8 hover:text-white transition-colors" title="Edit">
                        <Edit2 size={13} />
                    </button>
                    <button onClick={() => onDelete(expense)}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function CardView({ expenses, onDelete }: { expenses: Expense[]; onDelete: (e: Expense) => void }) {
    const grouped = useMemo(() => {
        const map: Record<string, Expense[]> = {};
        expenses.forEach(e => { const d = e.expense_date.slice(0, 10); (map[d] ??= []).push(e); });
        return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
    }, [expenses]);

    return (
        <div className="space-y-5">
            {grouped.map(([date, items]) => {
                const parsed  = parseISO(date);
                const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
                const label    = isToday(parsed) ? 'Today' : format(parsed, 'EEEE, dd MMM yyyy');
                return (
                    <div key={date}>
                        <div className="flex items-center justify-between mb-2.5 px-1">
                            <div className="flex items-center gap-2">
                                {isToday(parsed) && <Sparkles size={12} className="text-blue-400" />}
                                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">{label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-white/30">{items.length} item{items.length > 1 ? 's' : ''}</span>
                                <span className="text-xs font-bold tabular-nums text-white/70">{formatCurrency(dayTotal, items[0]?.currency ?? 'INR')}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {items.map(e => <ExpenseCard key={e.id} expense={e} onDelete={onDelete} />)}
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Trash Section ────────────────────────────────────────────────
function TrashSection({ queryKey }: { queryKey: readonly unknown[] }) {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();

    const { data: trashed = [], isLoading } = useQuery({ queryKey: ['expenses-trashed'], queryFn: fetchTrashed, enabled: open });
    const restoreMut = useMutation({
        mutationFn: restoreExpense,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses-trashed'] }); qc.invalidateQueries({ queryKey }); },
    });

    return (
        <GlassCard className="overflow-hidden">
            <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                        <Trash2 size={14} className="text-red-400/70" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white/60">Trash</p>
                        <p className="text-xs text-white/35">Deleted expenses</p>
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
                        {isLoading ? (
                            <div className="py-8 text-center text-sm text-white/30">Loading…</div>
                        ) : trashed.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-white/25">
                                <RotateCcw size={20} className="mb-2" />
                                <p className="text-sm">Trash is empty</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/4">
                                {trashed.map(e => (
                                    <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                                        <CategoryIcon icon={e.category?.icon} color={e.category?.color} size={14} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/60 truncate">{e.description}</p>
                                            <p className="text-xs text-white/30">{formatCurrency(e.amount, e.currency)} · {format(parseISO(e.expense_date), 'dd MMM yyyy')}</p>
                                        </div>
                                        <button onClick={() => restoreMut.mutate(e.id)} disabled={restoreMut.isPending}
                                            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/18 transition-all disabled:opacity-50">
                                            <RotateCcw size={11} /> Restore
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

// ─── Main ─────────────────────────────────────────────────────────
export default function ExpensesIndex() {
    const qc = useQueryClient();

    const [preset,      setPreset]      = useState<DatePreset>('month');
    const [dateFrom,    setDateFrom]    = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dateTo,      setDateTo]      = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [search,      setSearch]      = useState('');
    const [amountMin,   setAmountMin]   = useState('');
    const [amountMax,   setAmountMax]   = useState('');
    const [categoryId,  setCategoryId]  = useState('');
    const [payMethod,   setPayMethod]   = useState('');
    const [sort,        setSort]        = useState<SortKey>('date_desc');
    const [page,        setPage]        = useState(1);
    const [view,        setView]        = useState<ViewMode>('cards');
    const [selected,    setSelected]    = useState<Set<number>>(new Set());
    const [toDelete,    setToDelete]    = useState<Expense | null>(null);

    const [sortField, sortDir] = sort.split('_') as [string, string];

    const queryParams: Record<string, string> = {
        page: String(page), per_page: '60',
        date_from: dateFrom, date_to: dateTo,
        sort_by: sortField === 'date' ? 'expense_date' : 'amount',
        sort_dir: sortDir,
        ...(search     && { search }),
        ...(categoryId && { category_id: categoryId }),
        ...(payMethod  && { payment_method: payMethod }),
        ...(amountMin  && { amount_min: amountMin }),
        ...(amountMax  && { amount_max: amountMax }),
    };

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['expenses', queryParams],
        queryFn: () => fetchExpenses(queryParams),
        placeholderData: prev => prev,
    });
    const { data: categories = [] } = useQuery({ queryKey: ['categories', 'expense'], queryFn: fetchCategories, staleTime: Infinity });
    const summaryMonth = dateFrom.slice(0, 7);
    const { data: summary } = useQuery({ queryKey: ['expenses-summary', summaryMonth], queryFn: () => fetchSummary(summaryMonth) });

    const delMut = useMutation({
        mutationFn: () => deleteExpense(toDelete!.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['expenses-trashed'] });
            qc.invalidateQueries({ queryKey: ['expenses-summary'] });
            setToDelete(null);
        },
    });

    const resetPage = useCallback(() => { setPage(1); setSelected(new Set()); }, []);

    function applyPreset(p: DatePreset) {
        setPreset(p);
        if (p !== 'custom') { const [f, t] = getPresetRange(p); setDateFrom(f); setDateTo(t); }
        resetPage();
    }
    function toggleSelect(id: number) {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
    function toggleSelectAll() {
        if (!expenses.length) return;
        setSelected(selected.size === expenses.length ? new Set() : new Set(expenses.map(e => e.id)));
    }
    function clearFilters() { setSearch(''); setCategoryId(''); setPayMethod(''); setAmountMin(''); setAmountMax(''); resetPage(); }

    const expenses   = data?.data ?? [];
    const total      = data?.total ?? 0;
    const totalPages = data?.last_page ?? 1;
    const pageTotal  = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const daysInRange = Math.max(1, Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86_400_000) + 1);
    const avgPerDay  = pageTotal > 0 ? pageTotal / daysInRange : 0;
    const topCat     = summary?.by_category[0];
    const hasFilters = !!(search || categoryId || payMethod || amountMin || amountMax);

    const PRESETS: { key: DatePreset; label: string }[] = [
        { key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' }, { key: '3m', label: '3 Months' },
        { key: 'year', label: 'This Year' }, { key: 'custom', label: 'Custom' },
    ];
    const SORT_OPTIONS: { key: SortKey; label: string }[] = [
        { key: 'date_desc', label: 'Newest first' }, { key: 'date_asc', label: 'Oldest first' },
        { key: 'amount_desc', label: 'Highest amount' }, { key: 'amount_asc', label: 'Lowest amount' },
    ];
    const PM_PILLS = [
        { value: '', label: 'All', Icon: Wallet },
        { value: 'upi', label: 'UPI', Icon: Smartphone },
        { value: 'card', label: 'Card', Icon: CreditCard },
        { value: 'cash', label: 'Cash', Icon: Banknote },
        { value: 'netbanking', label: 'Net Banking', Icon: Building2 },
    ];

    return (
        <AppLayout title="Expenses">
            <Head title="Expenses" />
            <div className="p-6 space-y-4">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Expenses</h1>
                        <p className="mt-0.5 text-sm text-white/40">
                            {isLoading ? 'Loading…' : `${total.toLocaleString()} transactions`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => window.open(`/api/v1/export/expenses.csv?month=${summaryMonth}`, '_blank')}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-all"
                        >
                            <Download size={15} />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        <button onClick={() => router.visit('/expenses/new')}
                            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 active:scale-95 transition-all">
                            <Plus size={16} /> Log Expense
                        </button>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="Total Spent" value={formatCurrency(summary?.total ?? pageTotal, summary?.currency ?? 'INR')}
                        sub={`${summary?.count ?? expenses.length} transactions`} icon={ArrowUpRight} gradient="bg-red-500" />
                    <StatCard label="Avg per Day" value={formatCurrency(avgPerDay, 'INR')}
                        sub={`over ${daysInRange} day${daysInRange > 1 ? 's' : ''}`} icon={TrendingDown} gradient="bg-amber-500" />
                    <StatCard label="Transactions" value={String(total)}
                        sub={`${categories.length} categories`} icon={Receipt} gradient="bg-blue-500" />
                    <StatCard label="Top Category" value={topCat?.category?.name ?? '—'}
                        sub={topCat ? formatCurrency(topCat.total, summary?.currency ?? 'INR') : 'No data'} icon={Tag} gradient="bg-violet-500" />
                </div>

                {/* ── Date presets ── */}
                <GlassCard className="p-4">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex gap-1.5 flex-wrap">
                            {PRESETS.map(({ key, label }) => (
                                <button key={key} onClick={() => applyPreset(key)}
                                    className={cn('rounded-xl px-3.5 py-2 text-xs font-semibold transition-all',
                                        preset === key
                                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                                            : 'border border-white/10 text-white/50 hover:border-white/25 hover:text-white')}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {preset === 'custom' && (
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage(); }}
                                        className="rounded-xl border border-white/10 bg-[#0F1F3D] py-2 pl-8 pr-3 text-xs text-white outline-none [color-scheme:dark] focus:border-blue-500/50" />
                                </div>
                                <span className="text-white/30 text-xs">→</span>
                                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage(); }}
                                    className="rounded-xl border border-white/10 bg-[#0F1F3D] py-2 px-3 text-xs text-white outline-none [color-scheme:dark] focus:border-blue-500/50" />
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* ── Filters ── */}
                <GlassCard className="p-4 space-y-3">
                    {/* Row 1: search + amount + category + sort + view */}
                    <div className="flex flex-wrap gap-2.5 items-center">
                        {/* Search description */}
                        <div className="relative min-w-[160px] flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input type="text" placeholder="Search by description, merchant…" value={search}
                                onChange={e => { setSearch(e.target.value); resetPage(); }}
                                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors" />
                        </div>

                        {/* Amount range */}
                        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1 focus-within:border-blue-500/50 transition-colors">
                            <IndianRupee size={13} className="text-white/30 shrink-0" />
                            <input type="number" placeholder="Min" value={amountMin} min="0"
                                onChange={e => { setAmountMin(e.target.value); resetPage(); }}
                                className="w-16 bg-transparent py-1 text-sm text-white placeholder-white/25 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                            <span className="text-white/25 text-xs">—</span>
                            <input type="number" placeholder="Max" value={amountMax} min="0"
                                onChange={e => { setAmountMax(e.target.value); resetPage(); }}
                                className="w-16 bg-transparent py-1 text-sm text-white placeholder-white/25 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>

                        {/* Category */}
                        <div className="relative">
                            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <select value={categoryId} onChange={e => { setCategoryId(e.target.value); resetPage(); }}
                                className="appearance-none rounded-xl border border-white/10 bg-[#0F1F3D] py-2.5 pl-9 pr-7 text-sm text-white outline-none focus:border-blue-500/50">
                                <option value="">All categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Sort */}
                        <div className="relative">
                            {sort.endsWith('desc')
                                ? <SortDesc size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                : <SortAsc  size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />}
                            <select value={sort} onChange={e => { setSort(e.target.value as SortKey); resetPage(); }}
                                className="appearance-none rounded-xl border border-white/10 bg-[#0F1F3D] py-2.5 pl-9 pr-7 text-sm text-white outline-none focus:border-blue-500/50">
                                {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* View toggle */}
                        <div className="flex rounded-xl border border-white/10 overflow-hidden">
                            {([{ key: 'table', Icon: List, label: 'Table' }, { key: 'cards', Icon: LayoutGrid, label: 'Cards' }] as const).map(({ key, Icon: I, label }) => (
                                <button key={key} onClick={() => setView(key as ViewMode)}
                                    className={cn('flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors',
                                        view === key ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white',
                                        key === 'cards' && 'border-l border-white/10')}>
                                    <I size={13} /> {label}
                                </button>
                            ))}
                        </div>

                        {/* Clear */}
                        {hasFilters && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs font-medium text-white/40 hover:text-white transition-colors border border-white/8 hover:border-white/20">
                                <X size={12} /> Clear filters
                            </button>
                        )}
                    </div>

                    {/* Row 2: Payment method pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-white/30 mr-1">Payment:</span>
                        {PM_PILLS.map(({ value, label, Icon }) => (
                            <button key={value || 'all'} onClick={() => { setPayMethod(value); resetPage(); }}
                                className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all',
                                    payMethod === value
                                        ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                                        : 'border-white/10 text-white/45 hover:border-white/22 hover:text-white')}>
                                <Icon size={11} /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Bulk action bar */}
                    <AnimatePresence>
                        {selected.size > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2.5">
                                <AlertCircle size={14} className="text-red-400/70 shrink-0" />
                                <span className="text-sm text-white/60 flex-1"><strong className="text-white">{selected.size}</strong> expense{selected.size > 1 ? 's' : ''} selected</span>
                                <button onClick={() => setSelected(new Set())} className="text-xs text-white/40 hover:text-white transition-colors">Deselect</button>
                                <button
                                    onClick={() => {
                                        if (!confirm(`Delete ${selected.size} expense(s)? This cannot be undone.`)) return;
                                        Promise.all([...selected].map(deleteExpense)).then(() => {
                                            qc.invalidateQueries({ queryKey: ['expenses'] });
                                            qc.invalidateQueries({ queryKey: ['expenses-summary'] });
                                            setSelected(new Set());
                                        });
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/12 px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/22 transition-colors">
                                    <Trash2 size={12} /> Delete {selected.size}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </GlassCard>

                {/* ── Spending chart ── */}
                {!isLoading && expenses.length > 1 && <SpendingChart expenses={expenses} />}

                {/* ── Content ── */}
                <GlassCard className="overflow-hidden">
                    <div className={cn('transition-opacity duration-150', isFetching && !isLoading && 'opacity-60')}>
                        {isLoading ? (
                            <div className="p-4 space-y-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                                        <div className="h-9 w-9 animate-pulse rounded-xl bg-white/8 shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-1/3 animate-pulse rounded bg-white/8" />
                                            <div className="h-2.5 w-1/5 animate-pulse rounded bg-white/6" />
                                        </div>
                                        <div className="h-4 w-16 animate-pulse rounded bg-white/8" />
                                    </div>
                                ))}
                            </div>
                        ) : !expenses.length ? (
                            <div className="flex flex-col items-center py-20 px-6 text-center">
                                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                                    <Receipt size={28} className="text-white/20" />
                                </div>
                                <p className="text-base font-bold text-white/50">No expenses found</p>
                                <p className="mt-2 text-sm text-white/35 max-w-xs">
                                    {hasFilters ? 'No results match your current filters. Try adjusting them.' : 'No expenses in this period. Start by logging your first transaction.'}
                                </p>
                                <div className="mt-6 flex gap-2">
                                    {hasFilters && (
                                        <button onClick={clearFilters}
                                            className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors">
                                            <X size={14} /> Clear filters
                                        </button>
                                    )}
                                    <button onClick={() => router.visit('/expenses/new')}
                                        className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 transition-all">
                                        <Plus size={14} /> Log Expense
                                    </button>
                                </div>
                            </div>
                        ) : view === 'cards' ? (
                            <div className="p-4">
                                <CardView expenses={expenses} onDelete={setToDelete} />
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/8 bg-white/[0.015]">
                                        <th className="py-3 pl-4 w-8">
                                            <input type="checkbox" checked={selected.size === expenses.length && expenses.length > 0} onChange={toggleSelectAll}
                                                className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-blue-500 cursor-pointer" />
                                        </th>
                                        {['Date', 'Category', 'Description', 'Method', 'Source', 'Amount', ''].map((h, i) => (
                                            <th key={i} className={cn('py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30',
                                                i === 0 ? 'pl-2 pr-3' : i === 5 ? 'px-3 text-right' : i === 6 ? 'py-3 pl-3 pr-4' : 'px-3',
                                                i === 3 && 'hidden md:table-cell',
                                                i === 4 && 'hidden lg:table-cell',
                                            )}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {expenses.map(e => (
                                            <ExpenseRow key={e.id} expense={e} onDelete={setToDelete} selected={selected.has(e.id)} onSelect={toggleSelect} />
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-white/8 bg-white/[0.015]">
                                        <td colSpan={5} className="py-3 pl-14 text-xs text-white/30">
                                            {expenses.length} of {total} transactions
                                        </td>
                                        <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-white" colSpan={3}>
                                            Page total: {formatCurrency(pageTotal, expenses[0]?.currency ?? 'INR')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
                            <span className="text-xs text-white/30">Page {page} of {totalPages}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                                    return (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={cn('h-7 w-7 rounded-lg text-xs font-semibold transition-colors',
                                                p === page ? 'bg-blue-500 text-white' : 'border border-white/10 text-white/50 hover:border-white/20 hover:text-white')}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* ── Category Breakdown ── */}
                <CategoryBreakdown summary={summary} />

                {/* ── Trash ── */}
                <TrashSection queryKey={['expenses', queryParams] as const} />

            </div>

            <DeleteConfirmModal
                open={toDelete !== null}
                itemName={toDelete?.description}
                isPending={delMut.isPending}
                onConfirm={() => delMut.mutate()}
                onCancel={() => setToDelete(null)}
            />
        </AppLayout>
    );
}
