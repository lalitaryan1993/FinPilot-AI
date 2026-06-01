import { useState, useMemo, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
    Building2, Plus, ArrowUpRight, ArrowDownRight, CreditCard, Wallet,
    Upload, MessageSquare, X, Check,
    Edit2, Trash2, Loader2, AlertCircle,
    Calendar, BarChart3,
    Landmark, PiggyBank,
    FileText, Send, Eye, Receipt,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────
interface BankAccount {
    id: number; account_name: string; bank_name: string;
    account_type: 'savings' | 'current' | 'credit_card' | 'wallet' | 'fd';
    balance: number; currency: string; account_number?: string;
    color: string; is_active: boolean;
}
interface FlowTxn {
    id: string; raw_id: number; source_type: 'bank' | 'expense';
    type: 'credit' | 'debit'; amount: number; description: string;
    merchant?: string; date: string; category?: string;
    category_color?: string; category_icon?: string;
    payment_method?: string; balance_after?: number; reference_no?: string;
    source?: string;
    account?: { name: string; bank: string; color: string; type: string };
}
interface FlowSummary { total_credit: number; total_debit: number; net_flow: number; count: number; }

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const ACCOUNT_TYPE_META: Record<string, { label: string; Icon: React.ElementType; gradient: string }> = {
    savings:     { label: 'Savings',     Icon: PiggyBank,  gradient: 'from-emerald-500/20 to-emerald-500/5' },
    current:     { label: 'Current',     Icon: Building2,  gradient: 'from-blue-500/20 to-blue-500/5' },
    credit_card: { label: 'Credit Card', Icon: CreditCard, gradient: 'from-red-500/20 to-red-500/5' },
    wallet:      { label: 'Wallet',      Icon: Wallet,     gradient: 'from-violet-500/20 to-violet-500/5' },
    fd:          { label: 'FD/RD',       Icon: Landmark,   gradient: 'from-amber-500/20 to-amber-500/5' },
};

const BANK_COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#F97316','#EC4899'];

const CATEGORY_OPTIONS = [
    { v: '',              label: 'No Category' },
    { v: 'food_dining',   label: 'Food & Dining' },
    { v: 'transport',     label: 'Transport' },
    { v: 'shopping',      label: 'Shopping' },
    { v: 'entertainment', label: 'Entertainment' },
    { v: 'healthcare',    label: 'Healthcare' },
    { v: 'utilities',     label: 'Utilities' },
    { v: 'salary',        label: 'Salary' },
    { v: 'investment',    label: 'Investment' },
    { v: 'other',         label: 'Other' },
];

const SOURCE_LABELS: Record<string, string> = {
    manual:           'Manually entered',
    statement_import: 'Statement import',
    sms_import:       'SMS import',
    ai_import:        'AI extracted',
};

// ─── API ─────────────────────────────────────────────────────────
async function fetchAccounts(): Promise<BankAccount[]> {
    const r = await fetch('/api/v1/bank-accounts', { credentials: 'include' });
    return (await r.json()).data ?? [];
}
async function fetchMoneyFlow(params: Record<string, string>): Promise<{ transactions: FlowTxn[]; summary: FlowSummary }> {
    const r = await fetch(`/api/v1/money-flow?${new URLSearchParams(params)}`, { credentials: 'include' });
    return (await r.json()).data;
}

// ─── Bank Account Card ────────────────────────────────────────────
function AccountCard({ account, onEdit, onDelete, selected, onClick }: {
    account: BankAccount; onEdit: () => void; onDelete: () => void;
    selected: boolean; onClick: () => void;
}) {
    const meta = ACCOUNT_TYPE_META[account.account_type] ?? ACCOUNT_TYPE_META.savings;
    const Icon = meta.Icon;

    return (
        <motion.div
            layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            onClick={onClick}
            className={cn(
                'group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all',
                selected ? 'border-transparent ring-2' : 'border-white/8 hover:border-white/15',
            )}
            style={{
                background: `linear-gradient(135deg, ${account.color}15, ${account.color}05)`,
                ...(selected ? { ringColor: account.color, borderColor: account.color + '50' } : {}),
            }}
        >
            <div className="absolute right-4 top-4 opacity-20">
                <div className="h-6 w-8 rounded-sm border-2 border-current" style={{ color: account.color }} />
            </div>

            <div className="flex items-start gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${account.color}20` }}>
                    <Icon size={20} style={{ color: account.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{account.account_name}</p>
                    <p className="text-xs text-white/45">{account.bank_name} · {meta.label}</p>
                    {account.account_number && (
                        <p className="text-xs text-white/30 mt-0.5">•••• {account.account_number}</p>
                    )}
                </div>
            </div>

            <div>
                <p className="text-xs text-white/40 mb-0.5">Balance</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: account.balance >= 0 ? 'white' : '#EF4444' }}>
                    {formatCurrency(Math.abs(account.balance), account.currency)}
                    {account.balance < 0 && <span className="text-sm font-normal text-red-400 ml-1">CR</span>}
                </p>
            </div>

            <div className="absolute right-3 bottom-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}>
                <button onClick={onEdit}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-all">
                    <Edit2 size={12} />
                </button>
                <button onClick={onDelete}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all">
                    <Trash2 size={12} />
                </button>
            </div>

            {selected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: account.color }} />
            )}
        </motion.div>
    );
}

// ─── Add Account Modal ────────────────────────────────────────────
function AddAccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({
        account_name: '', bank_name: '', account_type: 'savings', balance: '', account_number: '', color: BANK_COLORS[0],
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!form.account_name || !form.bank_name) { setError('Account name and bank name are required.'); return; }
        setSaving(true);
        try {
            const r = await fetch('/api/v1/bank-accounts', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0, account_number: form.account_number || undefined }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message);
            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally { setSaving(false); }
    };

    const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0d1a2d] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Add Bank Account</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"><X size={16} /></button>
                </div>

                {error && <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</div>}

                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Account Name *</label>
                        <input value={form.account_name} onChange={e => set('account_name', e.target.value)}
                            placeholder="e.g. HDFC Savings" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Bank Name *</label>
                        <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)}
                            placeholder="e.g. HDFC Bank" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Account Type</label>
                        <select value={form.account_type} onChange={e => set('account_type', e.target.value)} className={inputCls}>
                            {Object.entries(ACCOUNT_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Current Balance (₹)</label>
                        <input type="number" value={form.balance} onChange={e => set('balance', e.target.value)}
                            placeholder="0" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Last 4 Digits</label>
                        <input value={form.account_number} onChange={e => set('account_number', e.target.value.slice(0, 4))}
                            placeholder="e.g. 5678" maxLength={4} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Card Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {BANK_COLORS.map(c => (
                                <button key={c} onClick={() => set('color', c)}
                                    className={cn('h-8 w-8 rounded-full transition-all', form.color === c ? 'ring-2 ring-white/50 scale-110' : 'opacity-70 hover:opacity-100')}
                                    style={{ background: c }} />
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={save} disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors disabled:opacity-60">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Plus size={14} /> Add Account</>}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Edit Account Modal ───────────────────────────────────────────
function EditAccountModal({ account, onClose, onSaved }: {
    account: BankAccount; onClose: () => void; onSaved: () => void;
}) {
    const [form, setForm] = useState({
        account_name:   account.account_name,
        bank_name:      account.bank_name,
        account_type:   account.account_type,
        balance:        String(account.balance),
        account_number: account.account_number ?? '',
        color:          account.color,
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!form.account_name || !form.bank_name) { setError('Account name and bank name are required.'); return; }
        setSaving(true);
        try {
            const r = await fetch(`/api/v1/bank-accounts/${account.id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0, account_number: form.account_number || undefined }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message);
            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally { setSaving(false); }
    };

    const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0d1a2d] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Edit Account</h2>
                        <p className="text-xs text-white/40 mt-0.5">{account.bank_name}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"><X size={16} /></button>
                </div>

                {error && <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</div>}

                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Account Name *</label>
                        <input value={form.account_name} onChange={e => set('account_name', e.target.value)}
                            placeholder="e.g. HDFC Savings" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Bank Name *</label>
                        <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)}
                            placeholder="e.g. HDFC Bank" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Account Type</label>
                        <select value={form.account_type} onChange={e => set('account_type', e.target.value)} className={inputCls}>
                            {Object.entries(ACCOUNT_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Balance (₹)</label>
                        <input type="number" value={form.balance} onChange={e => set('balance', e.target.value)}
                            placeholder="0" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Last 4 Digits</label>
                        <input value={form.account_number} onChange={e => set('account_number', e.target.value.slice(0, 4))}
                            placeholder="e.g. 5678" maxLength={4} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Card Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {BANK_COLORS.map(c => (
                                <button key={c} onClick={() => set('color', c)}
                                    className={cn('h-8 w-8 rounded-full transition-all', form.color === c ? 'ring-2 ring-white/50 scale-110' : 'opacity-70 hover:opacity-100')}
                                    style={{ background: c }} />
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={save} disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors disabled:opacity-60">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Changes</>}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Add Transaction Modal ────────────────────────────────────────
function AddTransactionModal({ accounts, onClose, onSaved }: {
    accounts: BankAccount[]; onClose: () => void; onSaved: () => void;
}) {
    const today = format(new Date(), 'yyyy-MM-dd');

    if (accounts.length === 0) return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0d1a2d] p-6 shadow-2xl text-center space-y-4">
                <Building2 size={36} className="mx-auto text-white/25" />
                <p className="text-base font-bold text-white">No Bank Accounts Yet</p>
                <p className="text-sm text-white/45">Add a bank account first before logging transactions.</p>
                <button onClick={onClose} className="w-full rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors">Got it</button>
            </motion.div>
        </motion.div>
    );

    const [form, setForm] = useState({
        bank_account_id: accounts[0]?.id ? String(accounts[0].id) : '',
        type: 'debit', amount: '', description: '', merchant: '',
        reference_no: '', transaction_date: today, category: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!form.bank_account_id || !form.amount || !form.description) { setError('Account, amount and description are required.'); return; }
        setSaving(true);
        try {
            const r = await fetch(`/api/v1/bank-accounts/${form.bank_account_id}/transactions`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message);
            onSaved();
        } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setSaving(false); }
    };

    const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0d1a2d] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Add Transaction</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"><X size={16} /></button>
                </div>

                {error && <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</div>}

                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {[{ v: 'credit', label: 'Credit (Money In)', color: 'emerald' }, { v: 'debit', label: 'Debit (Money Out)', color: 'red' }].map(o => (
                        <button key={o.v} onClick={() => set('type', o.v)}
                            className={cn('flex-1 py-2.5 text-sm font-semibold transition-colors',
                                form.type === o.v
                                    ? o.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                    : 'text-white/40 hover:text-white',
                                o.v === 'debit' && 'border-l border-white/10',
                            )}>
                            {form.type === o.v && (o.v === 'credit' ? <ArrowUpRight size={12} className="inline mr-1" /> : <ArrowDownRight size={12} className="inline mr-1" />)}
                            {o.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Account *</label>
                        <select value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)} className={inputCls}>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Amount (₹) *</label>
                        <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                            placeholder="0.00" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Date *</label>
                        <input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)}
                            className={cn(inputCls, 'scheme-dark')} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Description *</label>
                        <input value={form.description} onChange={e => set('description', e.target.value)}
                            placeholder="e.g. Salary, Rent, EMI payment…" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Merchant</label>
                        <input value={form.merchant} onChange={e => set('merchant', e.target.value)}
                            placeholder="e.g. Amazon" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Reference No.</label>
                        <input value={form.reference_no} onChange={e => set('reference_no', e.target.value)}
                            placeholder="UPI/NEFT ref" className={inputCls} />
                    </div>
                </div>

                <button onClick={save} disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors disabled:opacity-60">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : <><Check size={14} /> Add Transaction</>}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Import Modal (Statement / SMS) ──────────────────────────────
function ImportModal({ accounts, onClose, onDone }: {
    accounts: BankAccount[]; onClose: () => void; onDone: () => void;
}) {
    if (accounts.length === 0) return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0d1a2d] p-6 shadow-2xl text-center space-y-4">
                <Upload size={36} className="mx-auto text-white/25" />
                <p className="text-base font-bold text-white">No Bank Accounts Yet</p>
                <p className="text-sm text-white/45">Add a bank account first before importing a statement.</p>
                <button onClick={onClose} className="w-full rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors">Got it</button>
            </motion.div>
        </motion.div>
    );

    const [accountId, setAccountId] = useState(accounts[0]?.id ? String(accounts[0].id) : '');
    const [mode, setMode]           = useState<'file' | 'sms'>('file');
    const [smsText, setSmsText]     = useState('');
    const [file, setFile]           = useState<File | null>(null);
    const [status, setStatus]       = useState<{ loading: boolean; result?: string; error?: string }>({ loading: false });
    const fileRef = useRef<HTMLInputElement>(null);

    const submit = async () => {
        if (!accountId) { setStatus({ loading: false, error: 'Select an account.' }); return; }
        setStatus({ loading: true });
        try {
            const fd = new FormData();
            fd.append('account_id', accountId);
            if (mode === 'sms') fd.append('text', smsText);
            else if (file) fd.append('file', file);
            else throw new Error('Choose a file or paste SMS text.');

            const r = await fetch('/api/v1/bank-accounts/import-statement', {
                method: 'POST', credentials: 'include',
                headers: { 'X-CSRF-TOKEN': csrf() },
                body: fd,
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Import failed');
            setStatus({ loading: false, result: j.message });
            setTimeout(onDone, 1800);
        } catch (e: unknown) {
            setStatus({ loading: false, error: e instanceof Error ? e.message : 'Import failed' });
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#0d1a2d] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Import Statement / SMS</h2>
                        <p className="text-xs text-white/40 mt-0.5">AI will extract transactions automatically</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"><X size={16} /></button>
                </div>

                {status.error && <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400"><AlertCircle size={14} /> {status.error}</div>}
                {status.result && <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-sm text-emerald-400"><Check size={14} /> {status.result}</div>}

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Credit to Account</label>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50">
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</option>)}
                    </select>
                </div>

                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {[{ v: 'file', label: 'Upload Statement', Icon: Upload }, { v: 'sms', label: 'Paste SMS / Text', Icon: MessageSquare }].map(o => (
                        <button key={o.v} onClick={() => setMode(o.v as 'file' | 'sms')}
                            className={cn('flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors',
                                mode === o.v ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white',
                                o.v === 'sms' && 'border-l border-white/10')}>
                            <o.Icon size={14} /> {o.label}
                        </button>
                    ))}
                </div>

                {mode === 'file' ? (
                    <div
                        onClick={() => fileRef.current?.click()}
                        className={cn(
                            'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 cursor-pointer transition-colors',
                            file ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/10 hover:border-white/25 bg-white/2',
                        )}>
                        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                            onChange={e => setFile(e.target.files?.[0] ?? null)} />
                        {file ? (
                            <>
                                <FileText size={24} className="text-blue-400" />
                                <p className="text-sm font-medium text-blue-400">{file.name}</p>
                                <p className="text-xs text-white/40">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                            </>
                        ) : (
                            <>
                                <Upload size={28} className="text-white/25" />
                                <p className="text-sm font-medium text-white/60">Click to upload bank statement</p>
                                <p className="text-xs text-white/35">Supports JPG, PNG, PDF · Screenshots work too</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">SMS / Statement Text</label>
                        <textarea value={smsText} onChange={e => setSmsText(e.target.value)} rows={6}
                            placeholder="Paste your bank SMS messages or copied statement text here…&#10;&#10;Example:&#10;HDFC Bank: Rs.500 debited from AC XXXX1234 on 01-06-2026 for UPI/Swiggy. Avl Bal: Rs.45,000"
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 resize-none font-mono" />
                    </div>
                )}

                <button onClick={submit} disabled={status.loading || (!file && !smsText)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 active:scale-[0.98] transition-all disabled:opacity-60">
                    {status.loading
                        ? <><Loader2 size={14} className="animate-spin" /> AI is extracting transactions…</>
                        : <><Send size={14} /> Import with AI</>}
                </button>
                <p className="text-center text-xs text-white/25">Powered by AI · takes 5–15 seconds</p>
            </motion.div>
        </motion.div>
    );
}

// ─── Edit Transaction Modal ───────────────────────────────────────
function EditTransactionModal({ txn, onClose, onSaved }: {
    txn: FlowTxn; onClose: () => void; onSaved: () => void;
}) {
    const [form, setForm] = useState({
        type:             txn.type,
        amount:           String(txn.amount),
        description:      txn.description,
        merchant:         txn.merchant ?? '',
        reference_no:     txn.reference_no ?? '',
        transaction_date: txn.date,
        category:         txn.category ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!form.amount || !form.description) { setError('Amount and description are required.'); return; }
        setSaving(true);
        try {
            const r = await fetch(`/api/v1/bank-transactions/${txn.raw_id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({
                    ...form,
                    amount:       parseFloat(form.amount),
                    merchant:     form.merchant     || undefined,
                    reference_no: form.reference_no || undefined,
                    category:     form.category     || undefined,
                }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message);
            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to update');
        } finally { setSaving(false); }
    };

    const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0d1a2d] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Edit Transaction</h2>
                        {txn.account && (
                            <p className="text-xs text-white/40 mt-0.5">{txn.account.name} · {txn.account.bank}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"><X size={16} /></button>
                </div>

                {error && <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</div>}

                {/* Type toggle */}
                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {[{ v: 'credit', label: 'Credit (Money In)', color: 'emerald' }, { v: 'debit', label: 'Debit (Money Out)', color: 'red' }].map(o => (
                        <button key={o.v} onClick={() => set('type', o.v)}
                            className={cn('flex-1 py-2.5 text-sm font-semibold transition-colors',
                                form.type === o.v
                                    ? o.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                    : 'text-white/40 hover:text-white',
                                o.v === 'debit' && 'border-l border-white/10',
                            )}>
                            {form.type === o.v && (o.v === 'credit'
                                ? <ArrowUpRight size={12} className="inline mr-1" />
                                : <ArrowDownRight size={12} className="inline mr-1" />)}
                            {o.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Amount (₹) *</label>
                        <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                            placeholder="0.00" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Date *</label>
                        <input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)}
                            className={cn(inputCls, 'scheme-dark')} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Description *</label>
                        <input value={form.description} onChange={e => set('description', e.target.value)}
                            placeholder="e.g. Salary, Rent, EMI…" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Merchant</label>
                        <input value={form.merchant} onChange={e => set('merchant', e.target.value)}
                            placeholder="e.g. Amazon" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Reference No.</label>
                        <input value={form.reference_no} onChange={e => set('reference_no', e.target.value)}
                            placeholder="UPI/NEFT ref" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Category</label>
                        <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                            {CATEGORY_OPTIONS.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
                        </select>
                    </div>
                </div>

                <button onClick={save} disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors disabled:opacity-60">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Changes</>}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Transaction Detail Modal ─────────────────────────────────────
function TxnDetailModal({ txn, onClose, onEdit, onDeleted }: {
    txn: FlowTxn; onClose: () => void; onEdit: () => void; onDeleted: () => void;
}) {
    const isCredit = txn.type === 'credit';
    const isBank   = txn.source_type === 'bank';
    const [deleting,   setDeleting]   = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);

    const doDelete = async () => {
        setDeleting(true);
        try {
            await fetch(`/api/v1/bank-transactions/${txn.raw_id}`, {
                method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() },
            });
            onDeleted();
        } catch { setDeleting(false); }
    };

    const rows = ([
        { label: 'Date',          value: format(parseISO(txn.date), 'EEEE, dd MMM yyyy') },
        txn.account   && { label: 'Account',       value: `${txn.account.name} · ${txn.account.bank}` },
        txn.merchant  && { label: 'Merchant',       value: txn.merchant },
        txn.category  && { label: 'Category',       value: txn.category.replace(/_/g, ' ') },
        txn.reference_no != null && { label: 'Reference',      value: txn.reference_no, mono: true },
        txn.balance_after != null && { label: 'Balance After',  value: formatCurrency(txn.balance_after, 'INR') },
        txn.payment_method && { label: 'Payment',        value: txn.payment_method.toUpperCase() },
        txn.source    && { label: 'Source',         value: SOURCE_LABELS[txn.source] ?? txn.source },
        !isBank       && { label: 'Entry Type',     value: 'Expense record' },
    ] as Array<{ label: string; value: string; mono?: boolean } | false>).filter(Boolean) as Array<{ label: string; value: string; mono?: boolean }>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0d1a2d] overflow-hidden shadow-2xl">

                {/* Hero */}
                <div className={cn('relative p-6 pb-5', isCredit ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                    <div className={cn(
                        'absolute inset-0 opacity-40',
                        isCredit ? 'bg-linear-to-br from-emerald-500/15 to-transparent' : 'bg-linear-to-br from-red-500/15 to-transparent',
                    )} />
                    <button onClick={onClose}
                        className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 hover:text-white transition-colors z-10">
                        <X size={16} />
                    </button>

                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl mb-3',
                        isCredit ? 'bg-emerald-500/20' : 'bg-red-500/20')}>
                        {isCredit
                            ? <ArrowUpRight size={22} className="text-emerald-400" />
                            : <ArrowDownRight size={22} className="text-red-400" />}
                    </div>

                    <p className={cn('text-3xl font-black tabular-nums', isCredit ? 'text-emerald-400' : 'text-red-400')}>
                        {isCredit ? '+' : '-'}{formatCurrency(txn.amount, 'INR')}
                    </p>
                    <p className="mt-1 text-base font-semibold text-white leading-snug">{txn.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {isBank && txn.account && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                                style={{ background: `${txn.account.color}20`, color: txn.account.color }}>
                                <Landmark size={10} /> {txn.account.name}
                            </span>
                        )}
                        {!isBank && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-bold text-white/50">
                                <Receipt size={10} /> Expense
                            </span>
                        )}
                        <span className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold',
                            isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
                        )}>
                            {isCredit ? '↑ Credit' : '↓ Debit'}
                        </span>
                    </div>
                </div>

                {/* Detail rows */}
                <div className="divide-y divide-white/5 px-5">
                    {rows.map(r => (
                        <div key={r.label} className="flex items-center justify-between py-3">
                            <span className="text-xs font-semibold text-white/35 uppercase tracking-wider">{r.label}</span>
                            <span className={cn('text-sm font-semibold text-white capitalize max-w-[60%] text-right',
                                r.mono && 'font-mono text-xs text-white/60 normal-case')}>
                                {r.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-white/8">
                    {isBank ? (
                        confirmDel ? (
                            <div className="flex items-center gap-2">
                                <span className="flex-1 text-sm text-white/50 text-center">Delete this transaction?</span>
                                <button onClick={() => setConfirmDel(false)}
                                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button onClick={doDelete} disabled={deleting}
                                    className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-60 transition-colors">
                                    {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmDel(true)}
                                    className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all">
                                    <Trash2 size={14} /> Delete
                                </button>
                                <button onClick={onEdit}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-bold text-white hover:bg-blue-400 transition-colors">
                                    <Edit2 size={14} /> Edit Transaction
                                </button>
                            </div>
                        )
                    ) : (
                        <p className="text-center text-xs text-white/35 py-1">
                            Expense entries can be edited in the{' '}
                            <a href="/expenses" className="text-blue-400 hover:underline">Expenses</a> section
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Transaction Row ──────────────────────────────────────────────
function TxnRow({ txn, onView, onEdit, onDelete }: {
    txn: FlowTxn;
    onView:   () => void;
    onEdit:   () => void;
    onDelete: () => void;
}) {
    const isCredit = txn.type === 'credit';
    const isBank   = txn.source_type === 'bank';

    return (
        <motion.div layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            onClick={onView}
            className="group flex items-center gap-4 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/[0.03] transition-colors px-5 cursor-pointer">

            {/* Type indicator */}
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                isCredit ? 'bg-emerald-500/15' : 'bg-red-500/12')}>
                {isCredit
                    ? <ArrowUpRight size={17} className="text-emerald-400" />
                    : <ArrowDownRight size={17} className="text-red-400" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{txn.description}</p>
                    {isBank && txn.account && (
                        <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: `${txn.account.color}20`, color: txn.account.color }}>
                            {txn.account.name}
                        </span>
                    )}
                    {!isBank && (
                        <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/8 text-white/40">
                            Expense
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    {txn.merchant && <span className="text-xs text-white/40 truncate">{txn.merchant}</span>}
                    {txn.category && (
                        <span className="text-xs font-medium truncate"
                            style={{ color: txn.category_color ?? 'rgba(255,255,255,0.4)' }}>
                            · {txn.category}
                        </span>
                    )}
                    {txn.payment_method && (
                        <span className="text-[10px] text-white/30">· {txn.payment_method.toUpperCase()}</span>
                    )}
                    {txn.reference_no && (
                        <span className="text-[10px] text-white/25 font-mono truncate">{txn.reference_no}</span>
                    )}
                </div>
            </div>

            {/* Amount + actions */}
            <div className="shrink-0 flex items-center gap-1.5">
                {/* Hover action buttons */}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={onView}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-white/8 hover:text-white/80 transition-all">
                        <Eye size={13} />
                    </button>
                    {isBank && (
                        <button onClick={onEdit}
                            className="rounded-lg p-1.5 text-white/30 hover:bg-blue-500/10 hover:text-blue-400 transition-all">
                            <Edit2 size={13} />
                        </button>
                    )}
                    {isBank && (
                        <button onClick={onDelete}
                            className="rounded-lg p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all">
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>

                {/* Amount */}
                <div className="text-right min-w-[80px]">
                    <p className={cn('text-base font-bold tabular-nums', isCredit ? 'text-emerald-400' : 'text-red-400')}>
                        {isCredit ? '+' : '-'}{formatCurrency(txn.amount, 'INR')}
                    </p>
                    {txn.balance_after != null && (
                        <p className="text-[10px] text-white/30 mt-0.5">Bal: {formatCurrency(txn.balance_after, 'INR')}</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────
type Tab = 'accounts' | 'statement';

export default function MoneyFlowIndex() {
    const qc = useQueryClient();
    const [tab, setTab]                       = useState<Tab>('accounts');
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showAddTxn, setShowAddTxn]         = useState(false);
    const [showImport, setShowImport]         = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [txnTypeFilter, setTxnTypeFilter]   = useState('');
    const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dateTo,   setDateTo]   = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
    const [detailTxn,   setDetailTxn]  = useState<FlowTxn | null>(null);
    const [editTxn,     setEditTxn]    = useState<FlowTxn | null>(null);

    const { data: accounts = [], isLoading: accsLoading } = useQuery({ queryKey: ['bank-accounts'], queryFn: fetchAccounts });

    const flowParams: Record<string, string> = {
        date_from: dateFrom, date_to: dateTo,
        ...(txnTypeFilter && { type: txnTypeFilter }),
    };
    const { data: flow, isLoading: flowLoading } = useQuery({
        queryKey: ['money-flow', flowParams],
        queryFn: () => fetchMoneyFlow(flowParams),
        enabled: tab === 'statement',
    });

    const refetchAll = () => {
        qc.invalidateQueries({ queryKey: ['bank-accounts'] });
        qc.invalidateQueries({ queryKey: ['money-flow'] });
    };

    const handleDeleteTxn = async (txn: FlowTxn) => {
        if (!confirm(`Delete "${txn.description}"?\nThis will reverse the balance effect on the account.`)) return;
        await fetch(`/api/v1/bank-transactions/${txn.raw_id}`, {
            method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() },
        });
        refetchAll();
    };

    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
    const summary = flow?.summary;
    const txns    = flow?.transactions ?? [];

    const grouped = useMemo(() => {
        const map: Record<string, FlowTxn[]> = {};
        txns.forEach(t => { (map[t.date] ??= []).push(t); });
        return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
    }, [txns]);

    return (
        <AppLayout title="Money Flow">
            <Head title="Money Flow" />
            <div className="p-6 space-y-5">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Money Flow</h1>
                        <p className="mt-0.5 text-sm text-white/40">Bank accounts, transactions & statement view</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowImport(true)}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-all">
                            <Upload size={15} /> Import
                        </button>
                        <button onClick={() => setShowAddTxn(true)}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-all">
                            <Plus size={15} /> Transaction
                        </button>
                        <button onClick={() => setShowAddAccount(true)}
                            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 active:scale-95 transition-all">
                            <Building2 size={15} /> Add Account
                        </button>
                    </div>
                </div>

                {/* ── Net worth strip ── */}
                {accounts.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-4">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-xl" />
                            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Net Balance</p>
                            <p className={cn('mt-1 text-2xl font-black tabular-nums', totalBalance >= 0 ? 'text-white' : 'text-red-400')}>
                                {formatCurrency(Math.abs(totalBalance), 'INR')}
                            </p>
                            <p className="mt-0.5 text-xs text-white/35">{accounts.length} account{accounts.length > 1 ? 's' : ''}</p>
                        </div>
                        {summary && (
                            <>
                                <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-4">
                                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
                                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Credits</p>
                                    <p className="mt-1 text-lg font-bold tabular-nums text-emerald-400">+{formatCurrency(summary.total_credit, 'INR')}</p>
                                </div>
                                <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-4">
                                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-red-500/10 blur-xl" />
                                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Debits</p>
                                    <p className="mt-1 text-lg font-bold tabular-nums text-red-400">-{formatCurrency(summary.total_debit, 'INR')}</p>
                                </div>
                                <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-4">
                                    <div className={cn('absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl', summary.net_flow >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10')} />
                                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Net Flow</p>
                                    <p className={cn('mt-1 text-lg font-bold tabular-nums', summary.net_flow >= 0 ? 'text-blue-400' : 'text-orange-400')}>
                                        {summary.net_flow >= 0 ? '+' : ''}{formatCurrency(summary.net_flow, 'INR')}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="flex rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                    {([
                        { key: 'accounts', label: 'Bank Accounts', Icon: Building2 },
                        { key: 'statement', label: 'Statement', Icon: BarChart3 },
                    ] as const).map(({ key, label, Icon }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={cn('flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors',
                                tab === key ? 'bg-blue-500/20 text-blue-400' : 'text-white/45 hover:text-white',
                                key === 'statement' && 'border-l border-white/8')}>
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>

                {/* ── ACCOUNTS TAB ── */}
                {tab === 'accounts' && (
                    <>
                        {accsLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-white/4 border border-white/8 animate-pulse" />)}
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="flex flex-col items-center py-20 text-white/30">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                                    <Building2 size={28} />
                                </div>
                                <p className="text-base font-semibold text-white/50">No bank accounts yet</p>
                                <p className="mt-1.5 text-sm text-center max-w-xs">Add your HDFC, SBI, ICICI, or any bank account to track balances</p>
                                <button onClick={() => setShowAddAccount(true)}
                                    className="mt-5 flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 transition-all">
                                    <Plus size={14} /> Add Bank Account
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {accounts.map(a => (
                                    <AccountCard key={a.id} account={a}
                                        selected={selectedAccount === a.id}
                                        onClick={() => { setSelectedAccount(a.id === selectedAccount ? null : a.id); setTab('statement'); }}
                                        onEdit={() => setEditAccount(a)}
                                        onDelete={async () => {
                                            if (!confirm(`Delete "${a.account_name}"? This will also delete all its transactions.`)) return;
                                            await fetch(`/api/v1/bank-accounts/${a.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
                                            refetchAll();
                                        }}
                                    />
                                ))}
                                <button onClick={() => setShowAddAccount(true)}
                                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 p-8 text-white/30 hover:border-white/25 hover:text-white/60 transition-all min-h-[160px]">
                                    <Plus size={20} />
                                    <span className="text-sm font-medium">Add Account</span>
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ── STATEMENT TAB ── */}
                {tab === 'statement' && (
                    <>
                        {/* Filters */}
                        <GlassCard className="p-4">
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex gap-1.5">
                                    {[
                                        { label: 'This Month', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
                                        { label: 'Last Month', from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') },
                                    ].map(p => (
                                        <button key={p.label}
                                            onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                                            className={cn('rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                                                dateFrom === p.from ? 'border-blue-500/50 bg-blue-500/15 text-blue-400' : 'border-white/10 text-white/45 hover:text-white')}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Calendar size={13} className="text-white/30" />
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                        className="rounded-xl border border-white/10 bg-[#0F1F3D] py-2 px-3 text-xs text-white outline-none scheme-dark focus:border-blue-500/50" />
                                    <span className="text-white/30 text-xs">→</span>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                        className="rounded-xl border border-white/10 bg-[#0F1F3D] py-2 px-3 text-xs text-white outline-none scheme-dark focus:border-blue-500/50" />
                                </div>

                                <div className="flex gap-1.5 ml-auto">
                                    {[{ v: '', label: 'All' }, { v: 'credit', label: '↑ Credits' }, { v: 'debit', label: '↓ Debits' }].map(f => (
                                        <button key={f.v || 'all'} onClick={() => setTxnTypeFilter(f.v)}
                                            className={cn('rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                                                txnTypeFilter === f.v
                                                    ? f.v === 'credit' ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                                                        : f.v === 'debit' ? 'border-red-500/50 bg-red-500/15 text-red-400'
                                                        : 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                                                    : 'border-white/10 text-white/45 hover:text-white')}>
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>

                        {/* Statement */}
                        <GlassCard className="overflow-hidden">
                            {flowLoading ? (
                                <div className="p-4 space-y-2">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 px-2 py-3">
                                            <div className="h-9 w-9 rounded-xl bg-white/8 animate-pulse shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-1/3 bg-white/8 rounded animate-pulse" />
                                                <div className="h-2.5 w-1/5 bg-white/6 rounded animate-pulse" />
                                            </div>
                                            <div className="h-4 w-20 bg-white/8 rounded animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : txns.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-white/30">
                                    <BarChart3 size={28} className="mb-3" />
                                    <p className="text-sm font-medium text-white/40">No transactions in this period</p>
                                    <p className="mt-1 text-xs">Add bank accounts, import a statement, or log transactions</p>
                                    <div className="mt-5 flex gap-2">
                                        <button onClick={() => setShowImport(true)}
                                            className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/60 hover:text-white transition-colors">
                                            <Upload size={12} /> Import Statement
                                        </button>
                                        <button onClick={() => setShowAddTxn(true)}
                                            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-400 transition-colors">
                                            <Plus size={12} /> Add Transaction
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {summary && (
                                        <div className="flex items-center gap-6 px-5 py-3 border-b border-white/8 bg-white/[0.015]">
                                            <span className="text-xs text-white/40">{summary.count} transactions</span>
                                            <span className="text-xs text-emerald-400">+{formatCurrency(summary.total_credit, 'INR')} in</span>
                                            <span className="text-xs text-red-400">-{formatCurrency(summary.total_debit, 'INR')} out</span>
                                            <span className={cn('text-xs font-semibold ml-auto', summary.net_flow >= 0 ? 'text-blue-400' : 'text-orange-400')}>
                                                Net: {summary.net_flow >= 0 ? '+' : ''}{formatCurrency(summary.net_flow, 'INR')}
                                            </span>
                                        </div>
                                    )}

                                    {grouped.map(([date, items]) => {
                                        const parsed   = parseISO(date);
                                        const dayCredit = items.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
                                        const dayDebit  = items.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
                                        return (
                                            <div key={date}>
                                                <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.02] border-b border-white/4">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">
                                                        {format(parsed, 'EEEE, dd MMM yyyy')}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        {dayCredit > 0 && <span className="text-xs text-emerald-400 font-medium">+{formatCurrency(dayCredit, 'INR')}</span>}
                                                        {dayDebit > 0 && <span className="text-xs text-red-400 font-medium">-{formatCurrency(dayDebit, 'INR')}</span>}
                                                    </div>
                                                </div>
                                                <AnimatePresence mode="popLayout">
                                                    {items.map(txn => (
                                                        <TxnRow key={txn.id} txn={txn}
                                                            onView={() => setDetailTxn(txn)}
                                                            onEdit={() => { setDetailTxn(null); setEditTxn(txn); }}
                                                            onDelete={() => handleDeleteTxn(txn)}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </GlassCard>
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showAddAccount && <AddAccountModal onClose={() => setShowAddAccount(false)} onSaved={() => { setShowAddAccount(false); refetchAll(); }} />}
                {editAccount && <EditAccountModal account={editAccount} onClose={() => setEditAccount(null)} onSaved={() => { setEditAccount(null); refetchAll(); }} />}
                {showAddTxn && <AddTransactionModal accounts={accounts} onClose={() => setShowAddTxn(false)} onSaved={() => { setShowAddTxn(false); refetchAll(); }} />}
                {showImport && <ImportModal accounts={accounts} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); refetchAll(); }} />}
                {detailTxn && (
                    <TxnDetailModal
                        txn={detailTxn}
                        onClose={() => setDetailTxn(null)}
                        onEdit={() => { setEditTxn(detailTxn); setDetailTxn(null); }}
                        onDeleted={() => { setDetailTxn(null); refetchAll(); }}
                    />
                )}
                {editTxn && (
                    <EditTransactionModal
                        txn={editTxn}
                        onClose={() => setEditTxn(null)}
                        onSaved={() => { setEditTxn(null); refetchAll(); }}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
