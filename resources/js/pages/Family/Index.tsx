import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, X, Copy, Check, Crown,
    Shield, Eye, User, Wallet, Target, Receipt,
    TrendingDown, Share2, KeyRound, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import type { PageProps } from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    admin:    { label: 'Admin',    icon: <Crown size={14} />,  color: '#F5C842' },
    co_admin: { label: 'Co-Admin', icon: <Shield size={14} />, color: '#3B82F6' },
    member:   { label: 'Member',   icon: <User size={14} />,   color: '#10B981' },
    viewer:   { label: 'Viewer',   icon: <Eye size={14} />,    color: '#6B7280' },
};

const RELATION_LABELS: Record<string, string> = {
    spouse: 'Spouse', child: 'Child', parent: 'Parent', sibling: 'Sibling', other: 'Other',
};

// ─── Mock data for UI (real API would hit /api/v1/family) ─────────────────────
interface FamilyMember {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'co_admin' | 'member' | 'viewer';
    relation?: string;
    display_name?: string;
    spending_limit?: number;
    monthly_spent?: number;
    avatar_path?: string;
    joined_at: string;
}

interface FamilyData {
    id: number;
    name: string;
    invite_code: string;
    currency: string;
    owner_id: number;
    members: FamilyMember[];
    shared_budget?: number;
    month_expenses?: number;
    month_savings?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchFamily(): Promise<FamilyData | null> {
    try {
        const r = await fetch('/api/v1/family', { credentials: 'include' });
        if (r.status === 404) return null;
        const j = await r.json();
        return j.data ?? null;
    } catch {
        return null;
    }
}

// ─── Join with Code Modal ─────────────────────────────────────────────────────
function JoinWithCodeModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
    const [code,     setCode]     = useState('');
    const [relation, setRelation] = useState('other');
    const [error,    setError]    = useState('');

    const mut = useMutation({
        mutationFn: async () => {
            const r = await fetch('/api/v1/family/join', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ invite_code: code.trim().toUpperCase(), relation }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Invalid code');
            return j;
        },
        onSuccess: () => { onJoined(); onClose(); },
        onError:   (e: Error) => setError(e.message),
    });

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0F1F3D] border border-white/10 shadow-2xl p-6"
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={18} /></button>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 mx-auto mb-4">
                    <KeyRound size={22} className="text-blue-400" />
                </div>
                <h3 className="font-semibold text-white text-center mb-1">Join a Family Group</h3>
                <p className="text-xs text-white/50 text-center mb-5">Enter the 8-character invite code shared by your family member.</p>

                <label className="text-xs text-white/50 mb-1 block">Invite Code</label>
                <input
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
                    maxLength={8}
                    placeholder="e.g. ABCD1234"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-blue-500 mb-4"
                />

                <label className="text-xs text-white/50 mb-1 block">Your Relation</label>
                <select
                    value={relation}
                    onChange={e => setRelation(e.target.value)}
                    className="w-full appearance-none rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-4"
                >
                    {['spouse','child','parent','sibling','other'].map(r => (
                        <option key={r} value={r} className="bg-navy-900">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                </select>

                {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                    <button
                        onClick={() => mut.mutate()}
                        disabled={code.length < 6 || mut.isPending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                    >
                        {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Join Group
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Create Family Modal ──────────────────────────────────────────────────────
function CreateFamilyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
    const [name, setName] = useState('');
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0F1F3D] border border-white/10 shadow-2xl p-6"
            >
                <h3 className="font-semibold text-white mb-4">Create Family Group</h3>
                <p className="text-sm text-white/50 mb-4">Create a shared space for your family to track budgets and expenses together.</p>
                <label className="text-xs text-white/50 mb-1 block">Family Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. The Sharma Family" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 mb-4" />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                    <button onClick={() => name && onCreate(name)} className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 py-2 text-sm font-medium text-white transition-colors">Create</button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ code, onClose }: { code: string; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0F1F3D] border border-white/10 shadow-2xl p-6 text-center"
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={18} /></button>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
                    <Share2 size={24} className="text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Invite Family Member</h3>
                <p className="text-xs text-white/50 mb-5">Share this code with your family member. They can enter it in their FinPilot app to join.</p>
                <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-4">
                    <span className="flex-1 text-2xl font-bold tracking-[0.3em] text-white font-mono">{code}</span>
                    <button onClick={copy} className={`shrink-0 p-2 rounded-lg transition-all ${copied ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/8 text-white/60 hover:text-white'}`}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                </div>
                <p className="text-xs text-white/30">Code expires after 7 days</p>
            </motion.div>
        </div>
    );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({ member, isOwner }: { member: FamilyMember; isOwner: boolean }) {
    const roleMeta = ROLE_META[member.role] ?? ROLE_META.member;
    const spendPct = member.spending_limit && member.monthly_spent
        ? Math.min(100, (member.monthly_spent / member.spending_limit) * 100)
        : null;

    return (
        <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
            <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' }}>
                    {getInitials(member.display_name ?? member.name)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{member.display_name ?? member.name}</p>
                    <p className="text-xs text-white/40 truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ color: roleMeta.color, background: `${roleMeta.color}15` }}>
                    {roleMeta.icon}
                    <span className="ml-1">{roleMeta.label}</span>
                </div>
            </div>

            {member.relation && (
                <p className="text-xs text-white/40 mb-3">
                    {RELATION_LABELS[member.relation] ?? member.relation}
                    {isOwner && <span className="ml-1 text-yellow-400">· Owner</span>}
                </p>
            )}

            {/* Spending limit bar */}
            {spendPct !== null && member.spending_limit && (
                <div>
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Monthly limit</span>
                        <span>{fmt(member.monthly_spent ?? 0)} / {fmt(member.spending_limit)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${spendPct}%`,
                                background: spendPct >= 90 ? '#EF4444' : spendPct >= 70 ? '#F59E0B' : '#10B981',
                            }}
                        />
                    </div>
                </div>
            )}

            <p className="text-xs text-white/25 mt-3">Joined {new Date(member.joined_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyFamily({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-6">
                <Users size={36} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Family Group Yet</h2>
            <p className="text-sm text-white/50 mb-8 max-w-sm">
                Create a family group to share budgets, track expenses together, and set spending limits for each member.
            </p>
            <div className="flex gap-3">
                <button onClick={onCreate}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors">
                    <Plus size={16} /> Create Family Group
                </button>
                <button onClick={onJoin} className="flex items-center gap-2 rounded-xl border border-white/15 hover:border-blue-500/40 hover:border-white/30 px-6 py-3 text-sm font-medium text-white/70 hover:text-white transition-all">
                    <KeyRound size={16} /> Join with Code
                </button>
            </div>
        </div>
    );
}

// ─── Shared Expenses section ──────────────────────────────────────────────────
function SharedExpensesPanel({ familyId }: { familyId: number }) {
    const [month, setMonth] = useState(new Date());
    const monthStr = month.toISOString().slice(0, 7);

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['family-shared-expenses', monthStr],
        queryFn: async () => {
            const r = await fetch(`/api/v1/family/shared-expenses?month=${monthStr}`, { credentials: 'include' });
            return (await r.json()).data ?? [];
        },
        enabled: !!familyId,
    });

    const prevMonth = () => setMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; });
    const nextMonth = () => setMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; });

    const total = expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Shared Expenses</h2>
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/4 p-1">
                    <button onClick={prevMonth} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white"><ChevronLeft size={14} /></button>
                    <span className="min-w-[80px] text-center text-xs font-medium text-white">
                        {month.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white"><ChevronRight size={14} /></button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-white/30">
                    <Receipt size={28} className="mb-2" />
                    <p className="text-sm">No shared expenses this month</p>
                    <p className="text-xs mt-1">Expenses shared with the family will appear here</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {expenses.map((e: { id: number; description: string; amount: number; expense_date: string; user_name: string; category?: { name: string; color: string } }) => (
                            <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/6 px-4 py-3">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${e.category?.color ?? '#6B7280'}18` }}>
                                    <Receipt size={14} style={{ color: e.category?.color ?? '#6B7280' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{e.description}</p>
                                    <p className="text-xs text-white/40">{e.user_name} · {e.expense_date}</p>
                                </div>
                                <span className="text-sm font-semibold tabular-nums text-white flex-shrink-0">{fmt(Number(e.amount))}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex justify-between items-center rounded-xl bg-white/5 px-4 py-3">
                        <span className="text-xs text-white/50">Total this month</span>
                        <span className="text-sm font-bold text-white tabular-nums">{fmt(total)}</span>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FamilyIndex(_: PageProps) {
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showJoin,   setShowJoin]   = useState(false);

    const { data: family, isLoading } = useQuery({
        queryKey: ['family'],
        queryFn: fetchFamily,
        retry: false,
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const r = await fetch('/api/v1/family', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ name }),
            });
            return r.json();
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); setShowCreate(false); },
    });

    if (isLoading) {
        return (
            <AppLayout >
                <Head title="Family" />
                <div className="p-6">
                    <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-white/4 animate-pulse" />)}
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout >
            <Head title="Family" />

            <div className="p-6 space-y-6">
                {!family ? (
                    <EmptyFamily onCreate={() => setShowCreate(true)} onJoin={() => setShowJoin(true)} />
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-white">{family.name}</h1>
                                <p className="text-sm text-white/50 mt-0.5">{family.members.length} member{family.members.length !== 1 ? 's' : ''}</p>
                            </div>
                            <button onClick={() => setShowInvite(true)}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors">
                                <Share2 size={16} /> Invite Member
                            </button>
                        </div>

                        {/* Family summary strip */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users size={14} className="text-blue-400" />
                                    <p className="text-xs text-white/50">Members</p>
                                </div>
                                <p className="text-xl font-bold text-white">{family.members.length}</p>
                            </div>
                            <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Receipt size={14} className="text-red-400" />
                                    <p className="text-xs text-white/50">Month Expenses</p>
                                </div>
                                <p className="text-xl font-bold text-white">{fmt(family.month_expenses ?? 0)}</p>
                            </div>
                            <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Wallet size={14} className="text-emerald-400" />
                                    <p className="text-xs text-white/50">Shared Budget</p>
                                </div>
                                <p className="text-xl font-bold text-white">{fmt(family.shared_budget ?? 0)}</p>
                            </div>
                            <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingDown size={14} className="text-yellow-400" />
                                    <p className="text-xs text-white/50">Month Savings</p>
                                </div>
                                <p className="text-xl font-bold text-emerald-400">{fmt(family.month_savings ?? 0)}</p>
                            </div>
                        </div>

                        {/* Invite code banner */}
                        <div className="flex items-center gap-4 rounded-xl border border-blue-500/20 bg-blue-500/6 p-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                <Share2 size={18} className="text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-white">Family Invite Code</p>
                                <p className="text-xs text-white/50">Share <span className="text-blue-300 font-mono font-bold tracking-widest">{family.invite_code}</span> to invite members</p>
                            </div>
                            <button onClick={() => setShowInvite(true)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">View Code</button>
                        </div>

                        {/* Members grid */}
                        <div>
                            <h2 className="text-sm font-semibold text-white mb-4">Members</h2>
                            {family.members.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-10 text-white/30">
                                    <Users size={28} className="mb-2" />
                                    <p className="text-sm">No members yet — share the invite code</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {family.members.map(m => (
                                        <MemberCard key={m.id} member={m} isOwner={m.id === family.owner_id} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Shared Expenses */}
                        <SharedExpensesPanel familyId={family.id} />

                        {/* Roadmap cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-dashed border-white/10 p-5 flex items-center gap-4 text-white/30 hover:border-white/20 transition-colors">
                                <Target size={24} className="flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white/50">Shared Goals</p>
                                    <p className="text-xs">Coming in next release</p>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-dashed border-white/10 p-5 flex items-center gap-4 text-white/30 hover:border-white/20 transition-colors">
                                <Wallet size={24} className="flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white/50">Shared Budget</p>
                                    <p className="text-xs">Coming in next release</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AnimatePresence>
                {showCreate && (
                    <CreateFamilyModal onClose={() => setShowCreate(false)} onCreate={name => createMutation.mutate(name)} />
                )}
                {showInvite && family && (
                    <InviteModal code={family.invite_code} onClose={() => setShowInvite(false)} />
                )}
                {showJoin && (
                    <JoinWithCodeModal
                        onClose={() => setShowJoin(false)}
                        onJoined={() => qc.invalidateQueries({ queryKey: ['family'] })}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
