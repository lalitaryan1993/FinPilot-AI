import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
    ArrowLeft, Edit2, Trash2, Loader2, Trophy,
    Calendar, IndianRupee, TrendingUp, Pause, Play,
    PiggyBank, Home, Car, Plane, GraduationCap,
    HeartHandshake, Briefcase, ShieldCheck, Flag,
    Plus, Clock, CheckCircle2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn, formatCurrency } from '@/lib/utils';
import type { Goal, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const hdrs = (x = {}) => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf(), ...x });

const GOAL_TYPES = [
    { id: 'emergency_fund', label: 'Emergency Fund', icon: ShieldCheck,   color: '#10B981' },
    { id: 'home',           label: 'Home',           icon: Home,           color: '#3B82F6' },
    { id: 'car',            label: 'Car',            icon: Car,            color: '#8B5CF6' },
    { id: 'vacation',       label: 'Vacation',       icon: Plane,          color: '#F5C842' },
    { id: 'education',      label: 'Education',      icon: GraduationCap,  color: '#06B6D4' },
    { id: 'wedding',        label: 'Wedding',        icon: HeartHandshake, color: '#F43F5E' },
    { id: 'retirement',     label: 'Retirement',     icon: PiggyBank,      color: '#F59E0B' },
    { id: 'business',       label: 'Business',       icon: Briefcase,      color: '#6366F1' },
    { id: 'other',          label: 'Other',          icon: Flag,           color: '#94A3B8' },
] as const;

function goalCfg(type: string) {
    return GOAL_TYPES.find(t => t.id === type) ?? GOAL_TYPES[GOAL_TYPES.length - 1];
}

interface GoalContribution {
    id: number;
    amount: number;
    note?: string;
    contributed_at: string;
}

interface GoalExt extends Goal {
    contributions?: GoalContribution[];
}

interface Props extends PageProps { id: number; }

// ─── API ──────────────────────────────────────────────────────────
async function fetchGoal(id: number): Promise<GoalExt> {
    const r = await fetch(`/api/v1/goals/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } });
    const j = await r.json();
    if (!j.success) throw new Error(j.message ?? 'Not found');
    return j.data;
}
async function postContribute(id: number, amount: number, note: string): Promise<GoalExt> {
    const r = await fetch(`/api/v1/goals/${id}/contribute`, {
        method: 'POST', credentials: 'include', headers: hdrs(),
        body: JSON.stringify({ amount: Number(amount), note }),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.message ?? 'Failed');
    return j.data;
}
async function deleteGoal(id: number): Promise<void> {
    await fetch(`/api/v1/goals/${id}`, { method: 'DELETE', credentials: 'include', headers: hdrs() });
}
async function togglePause(id: number, isPaused: boolean): Promise<GoalExt> {
    const r = await fetch(`/api/v1/goals/${id}`, {
        method: 'PUT', credentials: 'include', headers: hdrs(),
        body: JSON.stringify({ status: isPaused ? 'active' : 'paused' }),
    });
    const j = await r.json();
    return j.data;
}

// ─── Contribute Modal ─────────────────────────────────────────────
function ContributeModal({ goal, onClose, onSuccess }: { goal: GoalExt; onClose: () => void; onSuccess: (g: GoalExt) => void }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const color = goal.color ?? goalCfg(goal.type).color;

    const mut = useMutation({
        mutationFn: () => postContribute(goal.id, Number(amount), note),
        onSuccess: (data) => { onSuccess(data); onClose(); },
    });

    const presets = [500, 1000, 2000, 5000, 10000];

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0B1629]/95 border border-white/10 shadow-2xl backdrop-blur-xl p-6"
            >
                <h3 className="text-base font-semibold text-white mb-1">Add Contribution</h3>
                <p className="text-xs text-white/40 mb-5">to <span style={{ color }}>{goal.name}</span></p>

                {/* Amount */}
                <label className="text-xs text-white/50 mb-1.5 block">Amount (₹) *</label>
                <div className="relative mb-2">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} autoFocus
                        placeholder="Enter amount"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                    />
                </div>
                <div className="flex gap-2 mb-4 flex-wrap">
                    {presets.map(v => (
                        <button key={v} onClick={() => setAmount(String(v))}
                            className="rounded-lg border border-white/10 bg-white/4 px-2.5 py-1 text-xs text-white/50 hover:border-white/20 hover:text-white transition-colors">
                            ₹{v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                    ))}
                </div>

                {/* Note */}
                <label className="text-xs text-white/50 mb-1.5 block">Note <span className="text-white/25">(optional)</span></label>
                <input
                    value={note} onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Monthly SIP"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 mb-5"
                />

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                    <button
                        onClick={() => mut.mutate()}
                        disabled={!amount || Number(amount) <= 0 || mut.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all"
                        style={{ background: color }}
                    >
                        {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Add</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Stat box ─────────────────────────────────────────────────────
function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="rounded-xl bg-white/4 border border-white/6 p-4">
            <p className="text-xs text-white/40 mb-1">{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: color ?? 'white' }}>{value}</p>
            {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function GoalDetail({ id }: Props) {
    const qc = useQueryClient();
    const [toDelete, setToDelete] = useState(false);
    const [showContribute, setShowContribute] = useState(false);

    const { data: goal, isLoading, isError } = useQuery<GoalExt>({
        queryKey: ['goal', id],
        queryFn: () => fetchGoal(id),
    });

    const delMut = useMutation({
        mutationFn: () => deleteGoal(id),
        onSuccess: () => router.visit('/goals'),
    });

    const pauseMut = useMutation({
        mutationFn: () => togglePause(id, goal?.status === 'paused'),
        onSuccess: (data) => qc.setQueryData(['goal', id], data),
    });

    if (isLoading) {
        return (
            <AppLayout>
                <Head title="Goal Details" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={24} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    if (isError || !goal) {
        return (
            <AppLayout>
                <Head title="Goal Not Found" />
                <div className="flex flex-col items-center justify-center h-64 text-white/40">
                    <Flag size={36} className="mb-3" />
                    <p className="text-sm">Goal not found</p>
                    <button onClick={() => router.visit('/goals')} className="mt-4 text-xs text-blue-400 hover:text-blue-300">← Back to Goals</button>
                </div>
            </AppLayout>
        );
    }

    const cfg     = goalCfg(goal.type);
    const Icon    = cfg.icon;
    const color   = goal.color ?? cfg.color;
    const pct     = Math.min(100, goal.progress_percent ?? 0);
    const isDone  = goal.status === 'completed';
    const isPaused= goal.status === 'paused';

    const daysLeft = goal.target_date
        ? differenceInDays(parseISO(goal.target_date as unknown as string), new Date())
        : null;

    const monthsNeeded = goal.monthly_target && (goal.remaining_amount ?? 0) > 0
        ? Math.ceil((goal.remaining_amount ?? 0) / goal.monthly_target)
        : null;

    const completionDate = monthsNeeded
        ? (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + monthsNeeded);
            return format(d, 'MMM yyyy');
        })()
        : null;

    return (
        <AppLayout>
            <Head title={`Goal — ${goal.name}`} />

            <div className="p-6 max-w-2xl mx-auto space-y-5">
                {/* Nav bar */}
                <div className="flex items-center justify-between">
                    <button onClick={() => router.visit('/goals')} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                        <ArrowLeft size={16} /> Back to Goals
                    </button>
                    <div className="flex gap-2">
                        {!isDone && (
                            <button onClick={() => pauseMut.mutate()}
                                disabled={pauseMut.isPending}
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:text-white hover:border-white/25 transition-all">
                                {isPaused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}
                            </button>
                        )}
                        <button onClick={() => router.visit(`/goals/${id}/edit`)}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/25 transition-all">
                            <Edit2 size={13} /> Edit
                        </button>
                        <button onClick={() => setToDelete(true)}
                            className="flex items-center gap-1.5 rounded-xl border border-red-500/25 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 size={13} /> Delete
                        </button>
                    </div>
                </div>

                {/* Hero card */}
                <GlassCard className="p-6 relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{ background: color }} />

                    {/* Faint bg glow */}
                    <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl opacity-10" style={{ background: color }} />

                    <div className="flex items-start gap-4 mb-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0" style={{ background: `${color}20` }}>
                            <Icon className="h-7 w-7" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white truncate">{goal.name}</h1>
                                {isDone && <Trophy size={18} className="text-amber-400 shrink-0" />}
                                {isPaused && <Pause size={14} className="text-white/30 shrink-0" />}
                            </div>
                            <p className="text-sm text-white/40 capitalize">{cfg.label}</p>
                            {isDone && (
                                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                                    <CheckCircle2 size={11} /> Goal Achieved!
                                </span>
                            )}
                            {isPaused && (
                                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-0.5 text-xs font-medium text-white/40">
                                    <Pause size={10} /> Paused
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-2 flex justify-between text-sm">
                        <span className="font-bold tabular-nums text-white">{formatCurrency(Number(goal.current_amount), 'INR')}</span>
                        <span className="text-white/40">{formatCurrency(Number(goal.target_amount), 'INR')}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/8">
                        <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{ background: isDone ? '#10B981' : `linear-gradient(90deg, ${color}aa, ${color})` }}
                        />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs">
                        <span className="font-semibold" style={{ color }}>{Math.round(pct)}% saved</span>
                        {!isDone && goal.remaining_amount! > 0 && (
                            <span className="text-white/40">{formatCurrency(goal.remaining_amount!, 'INR')} remaining</span>
                        )}
                    </div>

                    {!isDone && (
                        <button
                            onClick={() => setShowContribute(true)}
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                            style={{ background: color }}
                        >
                            <Plus size={15} /> Add Contribution
                        </button>
                    )}
                </GlassCard>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat
                        label="Target Amount"
                        value={formatCurrency(Number(goal.target_amount), 'INR')}
                        color={color}
                    />
                    <Stat
                        label="Saved So Far"
                        value={formatCurrency(Number(goal.current_amount), 'INR')}
                        color="#10B981"
                    />
                    {goal.monthly_target ? (
                        <Stat
                            label="Monthly Target"
                            value={formatCurrency(goal.monthly_target, 'INR')}
                            sub="per month"
                        />
                    ) : (
                        <Stat label="Progress" value={`${Math.round(pct)}%`} color={color} />
                    )}
                    {daysLeft !== null ? (
                        <Stat
                            label="Days Remaining"
                            value={daysLeft > 0 ? `${daysLeft}d` : 'Overdue'}
                            color={daysLeft < 30 ? '#F59E0B' : undefined}
                            sub={goal.target_date ? format(parseISO(goal.target_date as unknown as string), 'd MMM yyyy') : undefined}
                        />
                    ) : completionDate ? (
                        <Stat label="Est. Completion" value={completionDate} sub={`~${monthsNeeded} months`} />
                    ) : (
                        <Stat label="Status" value={isDone ? 'Achieved' : isPaused ? 'Paused' : 'Active'} color={isDone ? '#10B981' : color} />
                    )}
                </div>

                {/* Timeline / Details */}
                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold text-white/60 mb-4">Goal Details</h3>
                    <div className="space-y-0">
                        {[
                            { icon: <Flag size={15} />, label: 'Goal Type', value: cfg.label, accent: color },
                            goal.target_date && { icon: <Calendar size={15} />, label: 'Target Date', value: format(parseISO(goal.target_date as unknown as string), 'dd MMM yyyy'), accent: '#06B6D4' },
                            goal.monthly_target && { icon: <TrendingUp size={15} />, label: 'Monthly SIP / Contribution', value: `${formatCurrency(goal.monthly_target, 'INR')}/month`, accent: '#3B82F6' },
                            monthsNeeded && { icon: <Clock size={15} />, label: 'Estimated Completion', value: `${completionDate} (~${monthsNeeded} months at current pace)`, accent: '#F59E0B' },
                            goal.notes && { icon: <Flag size={15} />, label: 'Notes', value: goal.notes, accent: '#94A3B8' },
                        ].filter(Boolean).map((row: any, i) => (
                            <div key={i} className="flex items-start gap-4 py-3.5 border-b border-white/6 last:border-0">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/5" style={{ color: row.accent }}>
                                    {row.icon}
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 mb-0.5">{row.label}</p>
                                    <p className="text-sm text-white font-medium">{row.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Contribution history */}
                {goal.contributions && goal.contributions.length > 0 && (
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-white/60 mb-4">Contribution History</h3>
                        <div className="space-y-0 divide-y divide-white/5">
                            {goal.contributions.map(c => (
                                <div key={c.id} className="flex items-center gap-3 py-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10">
                                        <IndianRupee size={13} className="text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium tabular-nums">{formatCurrency(c.amount, 'INR')}</p>
                                        {c.note && <p className="text-xs text-white/40 truncate">{c.note}</p>}
                                    </div>
                                    <p className="text-xs text-white/30 shrink-0">
                                        {format(parseISO(c.contributed_at), 'd MMM yyyy')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => router.visit('/goals/new')}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 p-4 text-sm text-white/50 hover:text-white hover:border-white/25 transition-all">
                        <Flag size={15} /> New Goal
                    </button>
                    <button onClick={() => router.visit(`/goals/${id}/edit`)}
                        className="flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-all"
                        style={{ borderColor: `${color}40`, background: `${color}10`, color }}>
                        <Edit2 size={15} /> Edit Goal
                    </button>
                </div>
            </div>

            {showContribute && (
                <ContributeModal
                    goal={goal}
                    onClose={() => setShowContribute(false)}
                    onSuccess={(data) => qc.setQueryData(['goal', id], data)}
                />
            )}

            <DeleteConfirmModal
                open={toDelete}
                itemName={goal.name}
                isPending={delMut.isPending}
                onConfirm={() => delMut.mutate()}
                onCancel={() => setToDelete(false)}
            />
        </AppLayout>
    );
}
