import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Plus, Trash2, ToggleLeft, ToggleRight,
    AlertTriangle, CreditCard, Target, TrendingDown, X,
    ChevronDown, Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────
interface Rule {
    id: number;
    name: string;
    description: string | null;
    trigger_type: TriggerType;
    trigger_config: Record<string, unknown>;
    action_type: ActionType;
    action_config: Record<string, unknown>;
    is_active: boolean;
    fire_count: number;
    last_fired_at: string | null;
    created_at: string;
}

type TriggerType = 'expense_amount' | 'expense_category' | 'budget_breach' | 'goal_milestone';
type ActionType  = 'notify' | 'tag' | 'email';

// ─── API ────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const headers = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });

async function fetchRules(): Promise<Rule[]> {
    const r = await fetch('/api/v1/automation-rules', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data ?? [];
}
async function createRule(data: Partial<Rule>): Promise<Rule> {
    const r = await fetch('/api/v1/automation-rules', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(data) });
    const j = await r.json();
    if (!j.success) throw new Error(j.message);
    return j.data;
}
async function toggleRule(id: number): Promise<Rule> {
    const r = await fetch(`/api/v1/automation-rules/${id}/toggle`, { method: 'POST', credentials: 'include', headers: headers() });
    return (await r.json()).data;
}
async function deleteRule(id: number): Promise<void> {
    await fetch(`/api/v1/automation-rules/${id}`, { method: 'DELETE', credentials: 'include', headers: headers() });
}

// ─── Trigger metadata ───────────────────────────────────────────
const TRIGGERS: { value: TriggerType; label: string; icon: typeof Zap; color: string; desc: string }[] = [
    { value: 'expense_amount',   label: 'Expense Amount',    icon: CreditCard,   color: '#3B82F6', desc: 'When a single expense exceeds a threshold' },
    { value: 'expense_category', label: 'Expense Category',  icon: TrendingDown, color: '#EF4444', desc: 'When an expense is logged in a specific category' },
    { value: 'budget_breach',    label: 'Budget Exceeded',   icon: AlertTriangle,color: '#F59E0B', desc: 'When a monthly budget limit is crossed' },
    { value: 'goal_milestone',   label: 'Goal Milestone',    icon: Target,       color: '#10B981', desc: 'When a goal reaches a percentage milestone' },
];

// ─── Create Modal ───────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [step,    setStep]    = useState<1 | 2>(1);
    const [trigger, setTrigger] = useState<TriggerType | null>(null);
    const [form,    setForm]    = useState({
        name:            '',
        description:     '',
        amount_threshold: '5000',
        operator:        '>=',
        action_message:  '',
    });

    const mut = useMutation({
        mutationFn: (data: Partial<Rule>) => createRule(data),
        onSuccess: () => { onCreated(); onClose(); },
    });

    const handleSubmit = () => {
        if (!trigger || !form.name) return;

        const triggerConfig: Record<string, unknown> =
            trigger === 'expense_amount'
                ? { operator: form.operator, amount: parseFloat(form.amount_threshold) }
                : {};

        mut.mutate({
            name:           form.name,
            description:    form.description || undefined,
            trigger_type:   trigger,
            trigger_config: triggerConfig,
            action_type:    'notify',
            action_config:  { message: form.action_message || undefined },
            is_active:      true,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1F3D] shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                            <Zap className="h-4 w-4 text-amber-400" />
                        </div>
                        <h2 className="text-base font-semibold text-white">New Automation Rule</h2>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    {step === 1 ? (
                        <>
                            <p className="text-sm text-white/50">Choose what triggers this rule:</p>
                            <div className="grid grid-cols-1 gap-2">
                                {TRIGGERS.map((t) => {
                                    const Icon = t.icon;
                                    return (
                                        <button
                                            key={t.value}
                                            onClick={() => setTrigger(t.value)}
                                            className={cn(
                                                'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
                                                trigger === t.value
                                                    ? 'border-amber-500/40 bg-amber-500/8'
                                                    : 'border-white/8 bg-white/3 hover:border-white/15',
                                            )}
                                        >
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${t.color}18` }}>
                                                <Icon className="h-4 w-4" style={{ color: t.color }} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{t.label}</p>
                                                <p className="text-xs text-white/40">{t.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => trigger && setStep(2)}
                                disabled={!trigger}
                                className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-40"
                            >
                                Continue
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-white/50">Rule Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. Alert on big purchases"
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-amber-500/50"
                                    />
                                </div>

                                {trigger === 'expense_amount' && (
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="mb-1.5 block text-xs font-medium text-white/50">Condition</label>
                                            <select
                                                value={form.operator}
                                                onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))}
                                                className="w-full appearance-none rounded-lg border border-white/10 bg-[#0F1F3D] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                            >
                                                <option value=">=">Greater than or equal</option>
                                                <option value=">">Greater than</option>
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <label className="mb-1.5 block text-xs font-medium text-white/50">Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={form.amount_threshold}
                                                onChange={(e) => setForm((p) => ({ ...p, amount_threshold: e.target.value }))}
                                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-white/50">Notification Message (optional)</label>
                                    <input
                                        type="text"
                                        value={form.action_message}
                                        onChange={(e) => setForm((p) => ({ ...p, action_message: e.target.value }))}
                                        placeholder="Leave blank for default message"
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-amber-500/50"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!form.name || mut.isPending}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-40"
                                >
                                    {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                    Create Rule
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Rule Card ──────────────────────────────────────────────────
function RuleCard({ rule, onToggle, onDelete }: { rule: Rule; onToggle: () => void; onDelete: () => void }) {
    const triggerMeta = TRIGGERS.find((t) => t.value === rule.trigger_type);
    const Icon = triggerMeta?.icon ?? Zap;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn('rounded-2xl border p-5 transition-all', rule.is_active ? 'border-white/10 bg-white/3' : 'border-white/5 bg-white/1 opacity-60')}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `${triggerMeta?.color ?? '#6B7280'}18` }}>
                        <Icon className="h-4.5 w-4.5" style={{ color: triggerMeta?.color ?? '#6B7280' }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white">{rule.name}</p>
                            {!rule.is_active && <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">Disabled</span>}
                        </div>
                        {rule.description && <p className="mt-0.5 text-xs text-white/40">{rule.description}</p>}
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-white/30">
                            <span className="rounded-full bg-white/5 px-2 py-0.5">{triggerMeta?.label}</span>
                            <span>→ Notify</span>
                            {rule.fire_count > 0 && <span>Fired {rule.fire_count}×</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={onToggle} className="rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-white transition-colors" title={rule.is_active ? 'Disable' : 'Enable'}>
                        {rule.is_active
                            ? <ToggleRight className="h-5 w-5 text-amber-400" />
                            : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button onClick={onDelete} className="rounded-lg p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Page ────────────────────────────────────────────────────────
export default function AutomationRulesIndex() {
    const qc = useQueryClient();
    const [creating, setCreating] = useState(false);

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['automation-rules'],
        queryFn: fetchRules,
    });

    const toggleMut = useMutation({
        mutationFn: toggleRule,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
    });

    const deleteMut = useMutation({
        mutationFn: deleteRule,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
    });

    const activeCount = rules.filter((r) => r.is_active).length;

    return (
        <AppLayout title="Automation Rules">
            <Head title="Automation Rules" />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Automation Rules</h2>
                        <p className="mt-0.5 text-sm text-white/40">
                            {isLoading ? 'Loading…' : `${activeCount} active rule${activeCount !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> New Rule
                    </button>
                </div>

                {/* How it works */}
                <GlassCard className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 mt-0.5">
                            <Zap className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">How automation rules work</p>
                            <p className="mt-1 text-xs text-white/45 leading-relaxed">
                                Rules are evaluated automatically every time you log an expense. When a trigger matches — like an amount over ₹5,000 or a budget breach — the chosen action fires instantly. You'll see notifications in the bell icon above.
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Rules list */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
                        ))}
                    </div>
                ) : rules.length === 0 ? (
                    <GlassCard className="flex flex-col items-center py-16 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <Zap className="h-7 w-7 text-amber-400" />
                        </div>
                        <h3 className="text-base font-semibold text-white mb-1">No rules yet</h3>
                        <p className="text-sm text-white/40 mb-6 max-w-xs">
                            Create your first automation rule to get notified about large transactions, budget breaches, and more.
                        </p>
                        <button
                            onClick={() => setCreating(true)}
                            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-all"
                        >
                            <Plus className="h-4 w-4" /> Create First Rule
                        </button>
                    </GlassCard>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {rules.map((rule) => (
                                <RuleCard
                                    key={rule.id}
                                    rule={rule}
                                    onToggle={() => toggleMut.mutate(rule.id)}
                                    onDelete={() => deleteMut.mutate(rule.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Create modal */}
            <AnimatePresence>
                {creating && (
                    <CreateModal
                        onClose={() => setCreating(false)}
                        onCreated={() => qc.invalidateQueries({ queryKey: ['automation-rules'] })}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
