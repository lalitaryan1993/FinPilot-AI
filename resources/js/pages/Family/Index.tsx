import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, X, Copy, Check, Crown,
    Shield, Eye, User, Wallet, Target, Receipt,
    TrendingDown, Share2, KeyRound, Loader2, ChevronLeft, ChevronRight,
    Edit3, Trash2, IndianRupee, PiggyBank, Home, Car, GraduationCap,
    Plane, Heart, Briefcase, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import type { PageProps } from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const jsonHeaders = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    admin:    { label: 'Admin',    icon: <Crown size={14} />,  color: '#F5C842' },
    co_admin: { label: 'Co-Admin', icon: <Shield size={14} />, color: '#3B82F6' },
    member:   { label: 'Member',   icon: <User size={14} />,   color: '#10B981' },
    viewer:   { label: 'Viewer',   icon: <Eye size={14} />,    color: '#6B7280' },
};

const RELATION_LABELS: Record<string, string> = {
    spouse: 'Spouse', child: 'Child', parent: 'Parent', sibling: 'Sibling', other: 'Other',
};

const GOAL_TYPE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
    emergency_fund: { label: 'Emergency Fund', Icon: PiggyBank,      color: '#10B981' },
    home:           { label: 'Home',            Icon: Home,           color: '#3B82F6' },
    car:            { label: 'Car',             Icon: Car,            color: '#8B5CF6' },
    education:      { label: 'Education',       Icon: GraduationCap,  color: '#F59E0B' },
    vacation:       { label: 'Vacation',        Icon: Plane,          color: '#06B6D4' },
    wedding:        { label: 'Wedding',         Icon: Heart,          color: '#F43F5E' },
    retirement:     { label: 'Retirement',      Icon: IndianRupee,    color: '#F5C842' },
    business:       { label: 'Business',        Icon: Briefcase,      color: '#A78BFA' },
    custom:         { label: 'Custom',          Icon: Target,         color: '#6B7280' },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface FamilyMember {
    id: number;
    user_id: number;
    name: string;
    email: string;
    role: 'admin' | 'co_admin' | 'member' | 'viewer';
    relation?: string;
    display_name?: string;
    spending_limit?: number;
    monthly_spent?: number;
    joined_at: string;
}

interface FamilyData {
    id: number;
    name: string;
    invite_code: string;
    currency: string;
    owner_id: number;
    members: FamilyMember[];
    month_expenses?: number;
    shared_budget?: number;
    month_savings?: number;
}

interface SharedGoal {
    id: number;
    name: string;
    type: string;
    icon?: string;
    color: string;
    target_amount: number;
    current_amount: number;
    monthly_target: number;
    target_date?: string;
    progress: number;
    status: 'active' | 'completed';
}

interface SharedBudget {
    id: number;
    name: string;
    amount: number;
    spent: number;
    spent_pct: number;
    remaining: number;
    is_breached: boolean;
    category?: { id: number; name: string; icon: string; color: string };
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchFamily(): Promise<FamilyData | null> {
    try {
        const r = await fetch('/api/v1/family', { credentials: 'include' });
        if (r.status === 404) return null;
        return (await r.json()).data ?? null;
    } catch { return null; }
}

async function fetchSharedGoals(): Promise<SharedGoal[]> {
    const r = await fetch('/api/v1/family/shared-goals', { credentials: 'include' });
    return (await r.json()).data ?? [];
}

async function fetchSharedBudgets(month: string): Promise<SharedBudget[]> {
    const r = await fetch(`/api/v1/family/shared-budgets?month=${month}`, { credentials: 'include' });
    return (await r.json()).data ?? [];
}

// ─── Join with Code Modal ─────────────────────────────────────────────────────
function JoinWithCodeModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
    const [code, setCode] = useState('');
    const [relation, setRelation] = useState('other');
    const [error, setError] = useState('');

    const mut = useMutation({
        mutationFn: async () => {
            const r = await fetch('/api/v1/family/join', {
                method: 'POST', credentials: 'include',
                headers: jsonHeaders(),
                body: JSON.stringify({ invite_code: code.trim().toUpperCase(), relation }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Invalid code');
        },
        onSuccess: () => { onJoined(); onClose(); },
        onError:   (e: Error) => setError(e.message),
    });

    return (
        <ModalWrap onClose={onClose}>
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
            <select value={relation} onChange={e => setRelation(e.target.value)}
                className="w-full appearance-none rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-4">
                {['spouse','child','parent','sibling','other'].map(r => (
                    <option key={r} value={r} className="bg-[#0F1F3D]">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
            </select>

            {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => mut.mutate()} disabled={code.length < 6 || mut.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50">
                    {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Join Group
                </button>
            </div>
        </ModalWrap>
    );
}

// ─── Create Family Modal ──────────────────────────────────────────────────────
function CreateFamilyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
    const [name, setName] = useState('');
    return (
        <ModalWrap onClose={onClose}>
            <h3 className="font-semibold text-white mb-4">Create Family Group</h3>
            <p className="text-sm text-white/50 mb-4">Create a shared space for your family to track budgets and expenses together.</p>
            <label className="text-xs text-white/50 mb-1 block">Family Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. The Sharma Family"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 mb-4" />
            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => name && onCreate(name)} className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 py-2 text-sm font-medium text-white transition-colors">Create</button>
            </div>
        </ModalWrap>
    );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ code, onClose }: { code: string; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <ModalWrap onClose={onClose}>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
                <Share2 size={24} className="text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2 text-center">Invite Family Member</h3>
            <p className="text-xs text-white/50 mb-5 text-center">Share this code with your family member.</p>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-4">
                <span className="flex-1 text-2xl font-bold tracking-[0.3em] text-white font-mono">{code}</span>
                <button onClick={copy} className={`shrink-0 p-2 rounded-lg transition-all ${copied ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/8 text-white/60 hover:text-white'}`}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
            </div>
            <p className="text-xs text-white/30 text-center">Code expires after 7 days</p>
        </ModalWrap>
    );
}

// ─── Member Edit Modal ────────────────────────────────────────────────────────
function MemberEditModal({ member, familyId, isOwner, onClose, onSaved }: {
    member: FamilyMember; familyId: number; isOwner: boolean; onClose: () => void; onSaved: () => void;
}) {
    const [role, setRole] = useState(member.role);
    const [limit, setLimit] = useState(String(member.spending_limit ?? ''));
    const [displayName, setDisplayName] = useState(member.display_name ?? member.name);
    const [error, setError] = useState('');

    const mut = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/family/members/${member.id}`, {
                method: 'PUT', credentials: 'include', headers: jsonHeaders(),
                body: JSON.stringify({
                    role,
                    display_name: displayName || undefined,
                    spending_limit: limit ? parseFloat(limit) : null,
                }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Update failed');
        },
        onSuccess: () => { onSaved(); onClose(); },
        onError:   (e: Error) => setError(e.message),
    });

    return (
        <ModalWrap onClose={onClose}>
            <h3 className="font-semibold text-white mb-5">Edit Member</h3>

            <label className="text-xs text-white/50 mb-1 block">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 mb-4" />

            {!isOwner && (
                <>
                    <label className="text-xs text-white/50 mb-1 block">Role</label>
                    <select value={role} onChange={e => setRole(e.target.value as FamilyMember['role'])}
                        className="w-full appearance-none rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 mb-4">
                        {Object.entries(ROLE_META).map(([v, m]) => (
                            <option key={v} value={v} className="bg-[#0F1F3D]">{m.label}</option>
                        ))}
                    </select>
                </>
            )}

            <label className="text-xs text-white/50 mb-1 block">Monthly Spending Limit (₹, optional)</label>
            <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="e.g. 20000"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 mb-4" />

            {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => mut.mutate()} disabled={mut.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50">
                    {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save Changes
                </button>
            </div>
        </ModalWrap>
    );
}

// ─── Create Shared Goal Modal ─────────────────────────────────────────────────
function CreateGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({ name: '', type: 'custom', target_amount: '', monthly_target: '', target_date: '' });
    const [error, setError] = useState('');

    const mut = useMutation({
        mutationFn: async () => {
            const r = await fetch('/api/v1/family/shared-goals', {
                method: 'POST', credentials: 'include', headers: jsonHeaders(),
                body: JSON.stringify({
                    ...form,
                    target_amount:  parseFloat(form.target_amount),
                    monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : undefined,
                    target_date:    form.target_date || undefined,
                }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed to create');
        },
        onSuccess: () => { onCreated(); onClose(); },
        onError:   (e: Error) => setError(e.message),
    });

    const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(p => ({ ...p, [k]: e.target.value }));

    return (
        <ModalWrap onClose={onClose} wide>
            <h3 className="font-semibold text-white mb-5">Add Shared Goal</h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                    <label className="text-xs text-white/50 mb-1 block">Goal Name</label>
                    <input value={form.name} onChange={f('name')} placeholder="e.g. Family Emergency Fund"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-xs text-white/50 mb-1 block">Type</label>
                    <select value={form.type} onChange={f('type')}
                        className="w-full appearance-none rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                        {Object.entries(GOAL_TYPE_META).map(([v, m]) => (
                            <option key={v} value={v} className="bg-[#0F1F3D]">{m.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-white/50 mb-1 block">Target Amount (₹)</label>
                    <input type="number" value={form.target_amount} onChange={f('target_amount')} placeholder="500000"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-xs text-white/50 mb-1 block">Monthly Target (₹, optional)</label>
                    <input type="number" value={form.monthly_target} onChange={f('monthly_target')} placeholder="10000"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-xs text-white/50 mb-1 block">Target Date (optional)</label>
                    <input type="date" value={form.target_date} onChange={f('target_date')}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
            </div>

            {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => mut.mutate()} disabled={!form.name || !form.target_amount || mut.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50">
                    {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create Goal
                </button>
            </div>
        </ModalWrap>
    );
}

// ─── Contribute Modal ─────────────────────────────────────────────────────────
function ContributeModal({ goal, onClose, onDone }: { goal: SharedGoal; onClose: () => void; onDone: () => void }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const remaining = goal.target_amount - goal.current_amount;

    const mut = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/family/shared-goals/${goal.id}/contribute`, {
                method: 'POST', credentials: 'include', headers: jsonHeaders(),
                body: JSON.stringify({ amount: parseFloat(amount), note }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Contribution failed');
            return j.message;
        },
        onSuccess: () => { onDone(); onClose(); },
        onError:   (e: Error) => setError(e.message),
    });

    return (
        <ModalWrap onClose={onClose}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4 mx-auto"
                style={{ background: `${goal.color}20` }}>
                <Target size={22} style={{ color: goal.color }} />
            </div>
            <h3 className="font-semibold text-white text-center mb-1">Contribute to Goal</h3>
            <p className="text-xs text-white/50 text-center mb-1">{goal.name}</p>
            <p className="text-xs text-white/30 text-center mb-5">{fmt(goal.current_amount)} saved · {fmt(remaining)} remaining</p>

            <label className="text-xs text-white/50 mb-1 block">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 mb-4" />

            <label className="text-xs text-white/50 mb-1 block">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Bonus this month"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 mb-4" />

            {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => mut.mutate()} disabled={!amount || parseFloat(amount) <= 0 || mut.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50">
                    {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <IndianRupee size={14} />}
                    Contribute
                </button>
            </div>
        </ModalWrap>
    );
}

// ─── Create Shared Budget Modal ───────────────────────────────────────────────
function CreateBudgetModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({ name: '', amount: '' });
    const [error, setError] = useState('');

    const mut = useMutation({
        mutationFn: async () => {
            const r = await fetch('/api/v1/family/shared-budgets', {
                method: 'POST', credentials: 'include', headers: jsonHeaders(),
                body: JSON.stringify({ name: form.name, amount: parseFloat(form.amount) }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => { onCreated(); onClose(); },
        onError:   (e: Error) => setError(e.message),
    });

    return (
        <ModalWrap onClose={onClose}>
            <h3 className="font-semibold text-white mb-5">Add Shared Budget</h3>

            <label className="text-xs text-white/50 mb-1 block">Budget Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Family Groceries"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 mb-4" />

            <label className="text-xs text-white/50 mb-1 block">Monthly Limit (₹)</label>
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="e.g. 30000"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 mb-4" />

            {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => mut.mutate()} disabled={!form.name || !form.amount || mut.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50">
                    {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create Budget
                </button>
            </div>
        </ModalWrap>
    );
}

// ─── Shared Goals Panel ───────────────────────────────────────────────────────
function SharedGoalsPanel({ isAdmin }: { isAdmin: boolean }) {
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [contributing, setContributing] = useState<SharedGoal | null>(null);

    const { data: goals = [], isLoading } = useQuery({
        queryKey: ['family-shared-goals'],
        queryFn: fetchSharedGoals,
    });

    const refresh = () => qc.invalidateQueries({ queryKey: ['family-shared-goals'] });

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target size={16} className="text-emerald-400" />
                    <h2 className="text-sm font-semibold text-white">Shared Goals</h2>
                    {goals.length > 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">{goals.length}</span>
                    )}
                </div>
                {isAdmin && (
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/25 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors">
                        <Plus size={12} /> Add Goal
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : goals.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-white/30">
                    <Target size={28} className="mb-2" />
                    <p className="text-sm font-medium text-white/40">No shared goals yet</p>
                    {isAdmin && <p className="text-xs mt-1">Click "Add Goal" to create a family goal</p>}
                    {!isAdmin && <p className="text-xs mt-1">Ask the family admin to create a shared goal</p>}
                </div>
            ) : (
                <div className="space-y-3">
                    {goals.map(goal => {
                        const meta = GOAL_TYPE_META[goal.type] ?? GOAL_TYPE_META.custom;
                        const isComplete = goal.status === 'completed';
                        return (
                            <div key={goal.id} className="rounded-2xl bg-white/4 border border-white/8 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                        style={{ background: `${goal.color}20` }}>
                                        {isComplete
                                            ? <CheckCircle2 size={18} className="text-emerald-400" />
                                            : <meta.Icon size={18} style={{ color: goal.color }} />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-sm font-semibold text-white truncate">{goal.name}</p>
                                            {isComplete && (
                                                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Completed</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                            <span>{fmt(goal.current_amount)} saved</span>
                                            <span>·</span>
                                            <span>Target: {fmt(goal.target_amount)}</span>
                                            {goal.target_date && (
                                                <><span>·</span><span>By {new Date(goal.target_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span></>
                                            )}
                                        </div>
                                    </div>
                                    {!isComplete && (
                                        <button onClick={() => setContributing(goal)}
                                            className="shrink-0 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors">
                                            + Add
                                        </button>
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs text-white/40 mb-1">
                                        <span>{goal.progress.toFixed(1)}%</span>
                                        <span>{fmt(goal.target_amount - goal.current_amount)} remaining</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/8">
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, goal.progress)}%`, background: isComplete ? '#10B981' : goal.color }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
                {contributing && <ContributeModal goal={contributing} onClose={() => setContributing(null)} onDone={refresh} />}
            </AnimatePresence>
        </div>
    );
}

// ─── Shared Budget Panel ──────────────────────────────────────────────────────
function SharedBudgetPanel({ isAdmin }: { isAdmin: boolean }) {
    const qc = useQueryClient();
    const [month, setMonth] = useState(new Date());
    const [showCreate, setShowCreate] = useState(false);
    const monthStr = month.toISOString().slice(0, 7);

    const { data: budgets = [], isLoading } = useQuery({
        queryKey: ['family-shared-budgets', monthStr],
        queryFn: () => fetchSharedBudgets(monthStr),
    });

    const prevMonth = () => setMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; });
    const nextMonth = () => setMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; });
    const refresh   = () => qc.invalidateQueries({ queryKey: ['family-shared-budgets', monthStr] });

    const totalLimit = budgets.reduce((s: number, b: SharedBudget) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s: number, b: SharedBudget) => s + b.spent, 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-blue-400" />
                    <h2 className="text-sm font-semibold text-white">Shared Budgets</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/4 p-1">
                        <button onClick={prevMonth} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white"><ChevronLeft size={14} /></button>
                        <span className="min-w-[80px] text-center text-xs font-medium text-white">
                            {month.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth} className="rounded-lg p-1.5 text-white/50 hover:bg-white/8 hover:text-white"><ChevronRight size={14} /></button>
                    </div>
                    {isAdmin && (
                        <button onClick={() => setShowCreate(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/25 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors">
                            <Plus size={12} /> Add
                        </button>
                    )}
                </div>
            </div>

            {/* Summary strip */}
            {budgets.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                        { label: 'Total Limit', value: fmt(totalLimit), color: 'text-white' },
                        { label: 'Spent',        value: fmt(totalSpent), color: 'text-red-400' },
                        { label: 'Remaining',    value: fmt(Math.max(0, totalLimit - totalSpent)), color: 'text-emerald-400' },
                    ].map(s => (
                        <div key={s.label} className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
                            <p className="text-xs text-white/40 mb-0.5">{s.label}</p>
                            <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : budgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-white/30">
                    <Wallet size={28} className="mb-2" />
                    <p className="text-sm font-medium text-white/40">No shared budgets this month</p>
                    {isAdmin && <p className="text-xs mt-1">Click "Add" to set a family budget</p>}
                </div>
            ) : (
                <div className="space-y-2">
                    {budgets.map((b: SharedBudget) => (
                        <div key={b.id} className="rounded-xl bg-white/4 border border-white/6 px-4 py-3">
                            <div className="flex items-center gap-3 mb-2">
                                {b.is_breached
                                    ? <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                    : <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-white truncate">{b.name}</p>
                                        <span className="text-xs tabular-nums text-white/60 ml-2 shrink-0">
                                            {fmt(b.spent)} / {fmt(b.amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/8">
                                <div className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, b.spent_pct)}%`,
                                        background: b.is_breached ? '#EF4444' : b.spent_pct >= 80 ? '#F59E0B' : '#3B82F6',
                                    }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-white/30 mt-1">
                                <span>{b.spent_pct.toFixed(0)}% used</span>
                                <span>{fmt(b.remaining)} left</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showCreate && <CreateBudgetModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
            </AnimatePresence>
        </div>
    );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({ member, isOwner, canEdit, onEdit }: {
    member: FamilyMember; isOwner: boolean; canEdit: boolean; onEdit: () => void;
}) {
    const roleMeta = ROLE_META[member.role] ?? ROLE_META.member;
    const spendPct = member.spending_limit && member.monthly_spent
        ? Math.min(100, (member.monthly_spent / member.spending_limit) * 100)
        : null;

    return (
        <div className="rounded-2xl bg-white/4 border border-white/8 p-4 group relative">
            {canEdit && (
                <button onClick={onEdit}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/40 hover:text-white transition-all">
                    <Edit3 size={12} />
                </button>
            )}
            <div className="flex items-center gap-3 mb-3">
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

            {spendPct !== null && member.spending_limit && (
                <div>
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Monthly limit</span>
                        <span>{fmt(member.monthly_spent ?? 0)} / {fmt(member.spending_limit)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8">
                        <div className="h-full rounded-full transition-all"
                            style={{ width: `${spendPct}%`, background: spendPct >= 90 ? '#EF4444' : spendPct >= 70 ? '#F59E0B' : '#10B981' }} />
                    </div>
                </div>
            )}

            <p className="text-xs text-white/25 mt-3">Joined {new Date(member.joined_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
        </div>
    );
}

// ─── Shared Expenses Panel ─────────────────────────────────────────────────────
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
                <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-red-400" />
                    <h2 className="text-sm font-semibold text-white">Shared Expenses</h2>
                </div>
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
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {expenses.map((e: { id: number; description: string; amount: number; expense_date: string; user_name: string; category?: { color: string } }) => (
                            <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/6 px-4 py-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: `${e.category?.color ?? '#6B7280'}18` }}>
                                    <Receipt size={14} style={{ color: e.category?.color ?? '#6B7280' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{e.description}</p>
                                    <p className="text-xs text-white/40">{e.user_name} · {e.expense_date}</p>
                                </div>
                                <span className="text-sm font-semibold tabular-nums text-white shrink-0">{fmt(Number(e.amount))}</span>
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
                <button onClick={onJoin}
                    className="flex items-center gap-2 rounded-xl border border-white/15 hover:border-white/30 px-6 py-3 text-sm font-medium text-white/70 hover:text-white transition-all">
                    <KeyRound size={16} /> Join with Code
                </button>
            </div>
        </div>
    );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function ModalWrap({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative z-10 w-full rounded-2xl bg-[#0F1F3D] border border-white/10 shadow-2xl p-6 ${wide ? 'max-w-lg' : 'max-w-sm'}`}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={18} /></button>
                {children}
            </motion.div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FamilyIndex(_: PageProps) {
    const qc = useQueryClient();
    const [showCreate, setShowCreate]   = useState(false);
    const [showInvite, setShowInvite]   = useState(false);
    const [showJoin,   setShowJoin]     = useState(false);
    const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

    const { data: family, isLoading } = useQuery({
        queryKey: ['family'],
        queryFn: fetchFamily,
        retry: false,
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const r = await fetch('/api/v1/family', {
                method: 'POST', credentials: 'include',
                headers: jsonHeaders(),
                body: JSON.stringify({ name }),
            });
            return r.json();
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); setShowCreate(false); },
    });

    // Derive current user role (owner is always admin)
    const currentUserId = (window as unknown as { _inertia?: { page?: { props?: { auth?: { user?: { id: number } } } } } })
        ._inertia?.page?.props?.auth?.user?.id;

    const myMember  = family?.members.find(m => m.user_id === currentUserId);
    const isAdmin   = family?.owner_id === currentUserId || myMember?.role === 'admin' || myMember?.role === 'co_admin';

    if (isLoading) {
        return (
            <AppLayout>
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
        <AppLayout>
            <Head title="Family" />

            <div className="p-4 lg:p-6 space-y-6">
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

                        {/* Summary strip */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { icon: Users,        iconClass: 'text-blue-400',    label: 'Members',       value: String(family.members.length) },
                                { icon: Receipt,      iconClass: 'text-red-400',     label: 'Month Expenses', value: fmt(family.month_expenses ?? 0) },
                                { icon: Wallet,       iconClass: 'text-emerald-400', label: 'Shared Budget',  value: fmt(family.shared_budget ?? 0) },
                                { icon: TrendingDown, iconClass: 'text-yellow-400',  label: 'Month Savings',  value: fmt(family.month_savings ?? 0) },
                            ].map(({ icon: Icon, iconClass, label, value }) => (
                                <div key={label} className="rounded-xl bg-white/5 border border-white/8 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon size={14} className={iconClass} />
                                        <p className="text-xs text-white/50">{label}</p>
                                    </div>
                                    <p className="text-xl font-bold text-white">{value}</p>
                                </div>
                            ))}
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
                                        <MemberCard
                                            key={m.id}
                                            member={m}
                                            isOwner={m.user_id === family.owner_id}
                                            canEdit={isAdmin === true && m.user_id !== family.owner_id}
                                            onEdit={() => setEditingMember(m)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Two-column layout for Goals + Budget */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="rounded-2xl bg-white/3 border border-white/8 p-5">
                                <SharedGoalsPanel isAdmin={isAdmin === true} />
                            </div>
                            <div className="rounded-2xl bg-white/3 border border-white/8 p-5">
                                <SharedBudgetPanel isAdmin={isAdmin === true} />
                            </div>
                        </div>

                        {/* Shared Expenses */}
                        <div className="rounded-2xl bg-white/3 border border-white/8 p-5">
                            <SharedExpensesPanel familyId={family.id} />
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
                    <JoinWithCodeModal onClose={() => setShowJoin(false)} onJoined={() => qc.invalidateQueries({ queryKey: ['family'] })} />
                )}
                {editingMember && family && (
                    <MemberEditModal
                        member={editingMember}
                        familyId={family.id}
                        isOwner={editingMember.user_id === family.owner_id}
                        onClose={() => setEditingMember(null)}
                        onSaved={() => qc.invalidateQueries({ queryKey: ['family'] })}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
