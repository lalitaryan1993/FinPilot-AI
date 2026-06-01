import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    BarChart3, TrendingUp, TrendingDown, PiggyBank,
    Download, ChevronLeft, ChevronRight,
    IndianRupee, Percent, Target, CreditCard,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils';

// ─── API ─────────────────────────────────────────────────────────
async function fetchDashboard() {
    const r = await fetch('/api/v1/dashboard', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data;
}
async function fetchExpenseSummary(month: string) {
    const r = await fetch(`/api/v1/expenses/summary?month=${month}`, { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data;
}
async function fetchBudgetStatus() {
    const r = await fetch('/api/v1/budgets/status', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data;
}

// ─── Chart Tooltip ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/10 bg-navy-800/95 p-3 shadow-xl backdrop-blur-xl">
            <p className="mb-2 text-xs font-semibold text-white/50">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-white/60 capitalize">{p.name}</span>
                    <span className="ml-auto font-semibold tabular-nums text-white">{formatCurrency(p.value, 'INR')}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Category colours ─────────────────────────────────────────────
const CAT_COLORS = ['#3B82F6','#10B981','#F5C842','#8B5CF6','#F43F5E','#06B6D4','#F59E0B','#6366F1'];

// ─── Metric box ──────────────────────────────────────────────────
function Metric({ label, value, icon: Icon, trend, color }: { label: string; value: string; icon: React.ElementType; trend?: number; color: string }) {
    return (
        <GlassCard className="p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-white/40">{label}</p>
                    <p className="mt-1.5 text-lg font-bold tabular-nums text-white">{value}</p>
                    {trend !== undefined && (
                        <p className={cn('mt-1 flex items-center gap-1 text-xs', trend >= 0 ? 'text-red-400' : 'text-emerald-400')}>
                            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(trend).toFixed(1)}% vs last month
                        </p>
                    )}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                </div>
            </div>
        </GlassCard>
    );
}

// ─── Page ────────────────────────────────────────────────────────
export default function ReportsIndex() {
    const [reportMonth, setReportMonth] = useState(new Date());
    const monthStr = format(reportMonth, 'yyyy-MM');

    const { data: dashboard, isLoading: dashLoading } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, staleTime: 60_000 });
    const { data: expSummary, isLoading: expLoading }  = useQuery({ queryKey: ['expense-summary', monthStr], queryFn: () => fetchExpenseSummary(monthStr) });
    const { data: budgetData }                          = useQuery({ queryKey: ['budget-status'], queryFn: fetchBudgetStatus });

    const cashFlow   = dashboard?.cash_flow ?? [];
    const catBreakdown = expSummary?.by_category ?? [];
    const overview   = dashboard?.overview;

    const pieData = catBreakdown.slice(0, 8).map((c: { category: { name: string }; total: number }, i: number) => ({
        name:  c.category?.name ?? 'Other',
        value: c.total,
        color: CAT_COLORS[i % CAT_COLORS.length],
    }));

    const totalExpenses = catBreakdown.reduce((s: number, c: { total: number }) => s + c.total, 0);

    return (
        <AppLayout title="Reports">
            <Head title="Reports" />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Reports</h2>
                        <p className="mt-0.5 text-sm text-white/40">Financial overview and spending analysis</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Month navigator */}
                        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/4 p-1">
                            <button onClick={() => setReportMonth((m) => subMonths(m, 1))} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
                            <span className="min-w-[88px] text-center text-sm font-medium text-white">{format(reportMonth, 'MMM yyyy')}</span>
                            <button onClick={() => setReportMonth((m) => subMonths(m, -1))} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                        <button
                            onClick={() => window.open(`/api/v1/export/report.pdf?month=${monthStr}`, '_blank')}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-colors"
                        >
                            <Download className="h-4 w-4" /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Metric label="Monthly Income"   value={formatCurrency(overview?.monthly_income ?? 0, 'INR')}   icon={IndianRupee}  color="#10B981" />
                    <Metric label="Monthly Expenses" value={formatCurrency(overview?.monthly_expenses ?? 0, 'INR')} icon={TrendingDown}  color="#EF4444" trend={overview?.expense_change_pct} />
                    <Metric label="Net Savings"      value={formatCurrency(overview?.monthly_savings ?? 0, 'INR')}  icon={PiggyBank}    color="#3B82F6" />
                    <Metric label="Savings Rate"     value={`${overview?.savings_rate?.toFixed(1) ?? 0}%`}          icon={Percent}      color="#F5C842" />
                </div>

                {/* 6-month Cash Flow */}
                <GlassCard className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-400" />
                            <h3 className="text-sm font-semibold text-white">6-Month Cash Flow</h3>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                            <div className="flex items-center gap-1.5"><div className="h-2 w-4 rounded-full bg-emerald-400/80" /> Income</div>
                            <div className="flex items-center gap-1.5"><div className="h-2 w-4 rounded-full bg-red-400/80" /> Expenses</div>
                            <div className="flex items-center gap-1.5"><div className="h-2 w-4 rounded-full bg-blue-400/80" /> Savings</div>
                        </div>
                    </div>
                    {dashLoading ? (
                        <div className="h-52 animate-pulse rounded-xl bg-white/5" />
                    ) : (
                        <ResponsiveContainer width="100%" height={210}>
                            <AreaChart data={cashFlow} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                <defs>
                                    {[{ id: 'income', color: '#10B981' }, { id: 'expenses', color: '#EF4444' }, { id: 'savings', color: '#3B82F6' }].map((g) => (
                                        <linearGradient key={g.id} id={`grad-${g.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={g.color} stopOpacity={0.25} />
                                            <stop offset="100%" stopColor={g.color} stopOpacity={0.02} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(v) => formatCurrencyCompact(v, 'INR')} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="income"   stroke="#10B981" strokeWidth={2} fill="url(#grad-income)"   dot={false} />
                                <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#grad-expenses)" dot={false} />
                                <Area type="monotone" dataKey="savings"  stroke="#3B82F6" strokeWidth={2} fill="url(#grad-savings)"  dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </GlassCard>

                {/* Bottom row: Category breakdown + Budget status */}
                <div className="grid gap-5 lg:grid-cols-2">

                    {/* Category pie + bars */}
                    <GlassCard className="p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Target className="h-4 w-4 text-amber-400" />
                            <h3 className="text-sm font-semibold text-white">Spending by Category</h3>
                            <span className="ml-auto text-xs text-white/30">{format(reportMonth, 'MMM yyyy')}</span>
                        </div>
                        {expLoading ? (
                            <div className="h-64 animate-pulse rounded-xl bg-white/5" />
                        ) : pieData.length === 0 ? (
                            <div className="flex h-40 items-center justify-center text-white/30 text-sm">No expenses this month</div>
                        ) : (
                            <div className="flex gap-4">
                                {/* Pie */}
                                <ResponsiveContainer width={140} height={140}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} dataKey="value" strokeWidth={0}>
                                            {pieData.map((d: { color: string }, i: number) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(Number(v), 'INR')} />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Category bars */}
                                <div className="flex-1 space-y-2">
                                    {pieData.slice(0, 5).map((d: { name: string; value: number; color: string }) => (
                                        <div key={d.name}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white/60 truncate">{d.name}</span>
                                                <span className="ml-2 shrink-0 tabular-nums text-white/50">{totalExpenses > 0 ? Math.round((d.value / totalExpenses) * 100) : 0}%</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                                                <div className="h-full rounded-full" style={{ width: `${totalExpenses > 0 ? (d.value / totalExpenses) * 100 : 0}%`, background: d.color }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </GlassCard>

                    {/* Budget status bar chart */}
                    <GlassCard className="p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-purple-400" />
                            <h3 className="text-sm font-semibold text-white">Budget Utilisation</h3>
                        </div>
                        {!budgetData?.budgets?.length ? (
                            <div className="flex h-40 items-center justify-center text-white/30 text-sm">No budgets set</div>
                        ) : (
                            <div className="space-y-3">
                                {budgetData.budgets.slice(0, 6).map((b: { id: number; name: string; amount: number; spent_amount: number; percent_used: number; is_breached: boolean }) => {
                                    const pct   = b.percent_used ?? 0;
                                    const color = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
                                    return (
                                        <div key={b.id}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white/60 truncate">{b.name}</span>
                                                <span className="shrink-0 tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                                            </div>
                                            <div className="mt-0.5 flex justify-between text-[10px] text-white/25">
                                                <span>{formatCurrencyCompact(b.spent_amount, 'INR')} spent</span>
                                                <span>{formatCurrencyCompact(b.amount, 'INR')} budget</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Monthly bar chart */}
                <GlassCard className="p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-white">Monthly Comparison</h3>
                    </div>
                    {dashLoading ? (
                        <div className="h-44 animate-pulse rounded-xl bg-white/5" />
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={cashFlow} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={18} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(v) => formatCurrencyCompact(v, 'INR')} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="income"   fill="#10B981" radius={[4, 4, 0, 0]} opacity={0.85} />
                                <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} opacity={0.85} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </GlassCard>
            </div>
        </AppLayout>
    );
}
