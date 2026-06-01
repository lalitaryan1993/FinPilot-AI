import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, ArrowRight, ArrowLeft, Check, Loader2,
    IndianRupee, Target, Wallet, TrendingUp,
    CreditCard, PiggyBank, ShieldCheck, Sparkles,
    Home, Car, Plane, GraduationCap, Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const h = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });

// ─── Step config ──────────────────────────────────────────────────
const STEPS = [
    { id: 'welcome',    label: 'Welcome',    icon: Sparkles },
    { id: 'income',     label: 'Income',     icon: IndianRupee },
    { id: 'budget',     label: 'Budget',     icon: Wallet },
    { id: 'goal',       label: 'First Goal', icon: Target },
    { id: 'done',       label: 'All Set',    icon: Check },
];

const BUDGET_CATEGORIES = [
    { name: 'Food & Dining',   slug: 'food_dining',    icon: '🍽️', recommended: 0.25 },
    { name: 'Transport',       slug: 'transport',       icon: '🚗', recommended: 0.15 },
    { name: 'Entertainment',   slug: 'entertainment',   icon: '🎬', recommended: 0.10 },
    { name: 'Shopping',        slug: 'shopping',        icon: '🛍️', recommended: 0.10 },
    { name: 'Healthcare',      slug: 'healthcare',      icon: '🏥', recommended: 0.08 },
    { name: 'Utilities',       slug: 'utilities',       icon: '💡', recommended: 0.07 },
];

const GOAL_TYPES = [
    { id: 'emergency_fund', label: 'Emergency Fund', icon: ShieldCheck, color: '#10B981', defaultTarget: 100000 },
    { id: 'home',           label: 'Buy a Home',     icon: Home,        color: '#3B82F6', defaultTarget: 5000000 },
    { id: 'car',            label: 'Buy a Car',      icon: Car,         color: '#8B5CF6', defaultTarget: 500000 },
    { id: 'vacation',       label: 'Vacation',       icon: Plane,       color: '#F5C842', defaultTarget: 50000 },
    { id: 'education',      label: 'Education',      icon: GraduationCap,color: '#06B6D4', defaultTarget: 200000 },
    { id: 'retirement',     label: 'Retirement',     icon: PiggyBank,   color: '#F59E0B', defaultTarget: 10000000 },
    { id: 'business',       label: 'Business',       icon: Briefcase,   color: '#6366F1', defaultTarget: 300000 },
];

const slide = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
    exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.2 } }),
};

function fmt(n: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function Onboarding() {
    const [step, setStep] = useState(0);
    const [dir,  setDir]  = useState(1);
    const [busy, setBusy] = useState(false);

    // Income step
    const [income, setIncome] = useState('');

    // Budget step — map of category slug → custom amount (undefined = use recommended)
    const [budgetOverrides, setBudgetOverrides] = useState<Record<string, string>>({});
    const [selectedBudgets, setSelectedBudgets] = useState<string[]>(['food_dining', 'transport', 'entertainment']);

    // Goal step
    const [goalType, setGoalType]   = useState('emergency_fund');
    const [goalName, setGoalName]   = useState('');
    const [goalTarget, setGoalTarget] = useState('');
    const [goalMonthly, setGoalMonthly] = useState('');

    const totalBudget = selectedBudgets.reduce((s, slug) => {
        const cat = BUDGET_CATEGORIES.find(c => c.slug === slug)!;
        const custom = budgetOverrides[slug];
        return s + (custom ? Number(custom) : Math.round(Number(income || 0) * cat.recommended));
    }, 0);

    const next = () => { setDir(1); setStep(s => s + 1); };
    const back = () => { setDir(-1); setStep(s => s - 1); };

    const skip = () => router.visit('/');

    const createBudgets = async () => {
        for (const slug of selectedBudgets) {
            const cat = BUDGET_CATEGORIES.find(c => c.slug === slug)!;
            const amount = budgetOverrides[slug] || Math.round(Number(income) * cat.recommended);
            await fetch('/api/v1/budgets', {
                method: 'POST', credentials: 'include', headers: h(),
                body: JSON.stringify({ name: cat.name, amount, period: 'monthly', icon: cat.icon }),
            });
        }
    };

    const createGoal = async () => {
        const cfg = GOAL_TYPES.find(g => g.id === goalType)!;
        await fetch('/api/v1/goals', {
            method: 'POST', credentials: 'include', headers: h(),
            body: JSON.stringify({
                name: goalName || cfg.label,
                type: goalType,
                target_amount: goalTarget || cfg.defaultTarget,
                monthly_target: goalMonthly || undefined,
                color: cfg.color,
            }),
        });
    };

    const finish = async () => {
        setBusy(true);
        try {
            if (selectedBudgets.length > 0) await createBudgets();
            if (goalType) await createGoal();
            next();
        } finally {
            setBusy(false);
        }
    };

    const selectedGoalCfg = GOAL_TYPES.find(g => g.id === goalType)!;

    return (
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4 py-8">
            <Head title="Get Started" />

            {/* Background glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-32 left-1/3 h-80 w-80 rounded-full bg-blue-500/8 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-purple-500/8 blur-3xl" />
                <div className="absolute top-1/2 right-0 h-48 w-48 rounded-full bg-emerald-500/6 blur-3xl" />
            </div>

            <motion.div className="w-full max-w-lg relative z-10"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

                {/* Logo + step bar */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5C842] to-[#EAB308] shadow-[0_0_32px_rgba(245,200,66,0.35)]">
                        <Bot className="h-6 w-6 text-[#0A1628]" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Set up FinPilot</h1>
                    <p className="mt-1 text-sm text-white/40">Takes 2 minutes — skip anything you like</p>
                </div>

                {/* Progress dots */}
                <div className="mb-6 flex items-center justify-center gap-2">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-1.5">
                            <div className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                                i < step  ? 'bg-emerald-500 text-white' :
                                i === step ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' :
                                             'bg-white/5 text-white/25',
                            )}>
                                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={cn('h-px w-6 transition-colors', i < step ? 'bg-emerald-500/50' : 'bg-white/10')} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0F1E3C]/80 backdrop-blur-xl shadow-2xl">
                    <AnimatePresence mode="wait" custom={dir}>
                        <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                            className="p-6">

                            {/* ── Step 0: Welcome ── */}
                            {step === 0 && (
                                <div className="text-center">
                                    <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/15">
                                        <Sparkles className="h-7 w-7 text-blue-400" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white mb-2">Welcome to FinPilot AI</h2>
                                    <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto leading-relaxed">
                                        Let's set up your budgets and first savings goal in 3 quick steps. Your AI co-pilot will then guide you automatically.
                                    </p>
                                    <div className="space-y-2 text-left mb-6">
                                        {[
                                            { icon: IndianRupee, color: '#10B981', label: 'Tell us your income', sub: 'We\'ll suggest smart budgets' },
                                            { icon: Wallet,      color: '#3B82F6', label: 'Set spending budgets', sub: 'Track categories that matter' },
                                            { icon: Target,      color: '#F5C842', label: 'Create your first goal', sub: 'Emergency fund, home, vacation…' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/4 px-4 py-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                                    style={{ background: `${item.color}15`, color: item.color }}>
                                                    <item.icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{item.label}</p>
                                                    <p className="text-xs text-white/40">{item.sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Step 1: Income ── */}
                            {step === 1 && (
                                <div>
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                                            <IndianRupee className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-white">Monthly Income</h2>
                                            <p className="text-xs text-white/40">Used to suggest budget limits</p>
                                        </div>
                                    </div>

                                    <label className="text-xs text-white/50 mb-1.5 block">Net monthly income (after tax) *</label>
                                    <div className="relative mb-3">
                                        <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                        <input type="number" min="0" value={income} onChange={e => setIncome(e.target.value)}
                                            placeholder="e.g. 60000" autoFocus
                                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                                        />
                                    </div>
                                    <div className="flex gap-2 flex-wrap mb-4">
                                        {[30000, 50000, 75000, 100000, 150000].map(v => (
                                            <button key={v} onClick={() => setIncome(String(v))}
                                                className="rounded-lg border border-white/10 bg-white/4 px-2.5 py-1 text-xs text-white/50 hover:border-white/20 hover:text-white transition-colors">
                                                ₹{v >= 100000 ? `${v / 100000}L` : `${v / 1000}k`}
                                            </button>
                                        ))}
                                    </div>
                                    {income && Number(income) > 0 && (
                                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            className="rounded-xl border border-blue-500/15 bg-blue-500/6 px-4 py-3">
                                            <p className="text-xs text-blue-300/70">
                                                With ₹{Number(income).toLocaleString('en-IN')}/month, AI suggests:
                                                <strong className="text-blue-300"> 50% needs</strong> · <strong className="text-blue-300">30% wants</strong> · <strong className="text-blue-300">20% savings</strong>
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            )}

                            {/* ── Step 2: Budget ── */}
                            {step === 2 && (
                                <div>
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                                            <Wallet className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-white">Monthly Budgets</h2>
                                            <p className="text-xs text-white/40">Select categories and adjust amounts</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {BUDGET_CATEGORIES.map(cat => {
                                            const isSelected = selectedBudgets.includes(cat.slug);
                                            const suggested  = Math.round(Number(income || 0) * cat.recommended);
                                            const override   = budgetOverrides[cat.slug];
                                            return (
                                                <div key={cat.slug}
                                                    className={cn('rounded-xl border px-4 py-3 transition-all', isSelected ? 'border-blue-500/30 bg-blue-500/8' : 'border-white/8 bg-white/3')}>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setSelectedBudgets(prev =>
                                                                isSelected ? prev.filter(s => s !== cat.slug) : [...prev, cat.slug]
                                                            )}
                                                            className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all',
                                                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-white/20'
                                                            )}>
                                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                                        </button>
                                                        <span className="text-base">{cat.icon}</span>
                                                        <span className="flex-1 text-sm text-white font-medium">{cat.name}</span>
                                                        {isSelected && (
                                                            <div className="relative">
                                                                <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
                                                                <input
                                                                    type="number" min="0"
                                                                    value={override ?? ''}
                                                                    placeholder={String(suggested)}
                                                                    onChange={e => setBudgetOverrides(p => ({ ...p, [cat.slug]: e.target.value }))}
                                                                    className="w-24 rounded-lg border border-white/10 bg-white/5 py-1 pl-5 pr-2 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500/50"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedBudgets.length > 0 && (
                                        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex items-center justify-between">
                                            <span className="text-xs text-white/50">Total monthly budget</span>
                                            <span className="text-sm font-bold text-white tabular-nums">{fmt(totalBudget)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Step 3: Goal ── */}
                            {step === 3 && (
                                <div>
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                                            style={{ background: `${selectedGoalCfg.color}18` }}>
                                            <Target className="h-5 w-5" style={{ color: selectedGoalCfg.color }} />
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-white">First Savings Goal</h2>
                                            <p className="text-xs text-white/40">Track your progress towards something meaningful</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                                        {GOAL_TYPES.map(g => (
                                            <button key={g.id} onClick={() => { setGoalType(g.id); setGoalTarget(''); }}
                                                className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                                                    goalType === g.id ? 'border-opacity-50 bg-opacity-10' : 'border-white/8 bg-white/3 hover:border-white/15'
                                                )}
                                                style={goalType === g.id ? { borderColor: `${g.color}50`, background: `${g.color}10` } : {}}>
                                                <g.icon className="h-5 w-5" style={{ color: g.color }} />
                                                <span className="text-[10px] font-medium text-white/70 leading-tight">{g.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-white/50 mb-1 block">Goal Name</label>
                                            <input value={goalName} onChange={e => setGoalName(e.target.value)}
                                                placeholder={selectedGoalCfg.label}
                                                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-white/50 mb-1 block">Target Amount (₹)</label>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                                    <input type="number" min="0" value={goalTarget}
                                                        onChange={e => setGoalTarget(e.target.value)}
                                                        placeholder={String(selectedGoalCfg.defaultTarget)}
                                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-8 pr-3 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-white/50 mb-1 block">Monthly SIP (₹)</label>
                                                <div className="relative">
                                                    <TrendingUp className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                                    <input type="number" min="0" value={goalMonthly}
                                                        onChange={e => setGoalMonthly(e.target.value)}
                                                        placeholder={income ? String(Math.round(Number(income) * 0.2)) : '5000'}
                                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-8 pr-3 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {goalTarget && goalMonthly && Number(goalMonthly) > 0 && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="rounded-xl border px-3 py-2.5 text-xs"
                                                style={{ borderColor: `${selectedGoalCfg.color}30`, background: `${selectedGoalCfg.color}08`, color: `${selectedGoalCfg.color}cc` }}>
                                                At ₹{Number(goalMonthly).toLocaleString('en-IN')}/month → Goal in ~{Math.ceil(Number(goalTarget) / Number(goalMonthly))} months
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Step 4: Done ── */}
                            {step === 4 && (
                                <div className="text-center py-4">
                                    <motion.div
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                                        className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
                                        <CheckCircle className="h-10 w-10 text-emerald-400" />
                                    </motion.div>
                                    <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
                                    <p className="text-sm text-white/50 mb-6 leading-relaxed">
                                        FinPilot AI has set up your budgets and savings goal. Your AI co-pilot will now track spending, alert you when limits are near, and suggest ways to save faster.
                                    </p>
                                    <div className="space-y-2 text-left mb-6">
                                        {[
                                            { icon: '💡', text: 'Ask the AI anything — "How much did I spend on food?" or "Am I on track for my goal?"' },
                                            { icon: '📸', text: 'Upload a bank statement or screenshot to auto-import transactions in seconds' },
                                            { icon: '📊', text: 'Check Reports monthly for a full picture of your financial health' },
                                        ].map((t, i) => (
                                            <div key={i} className="flex gap-3 rounded-xl bg-white/4 px-4 py-3 text-sm text-white/60">
                                                <span>{t.icon}</span>
                                                <span>{t.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer buttons */}
                    <div className="border-t border-white/6 px-6 py-4 flex items-center gap-3">
                        {step > 0 && step < 4 && (
                            <button onClick={back} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                        )}

                        {step < 4 && step !== 0 && (
                            <button onClick={skip} className="text-xs text-white/30 hover:text-white/50 transition-colors ml-auto">
                                Skip setup
                            </button>
                        )}

                        <button
                            onClick={step === 3 ? finish : step === 4 ? () => router.visit('/') : next}
                            disabled={busy}
                            className={cn(
                                'flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60',
                                step === 0 ? 'ml-auto w-full' : 'ml-auto',
                                step === 4 ? 'bg-emerald-500 hover:bg-emerald-400 w-full' : 'bg-blue-500 hover:bg-blue-400',
                            )}
                        >
                            {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : step === 0 ? (
                                <><Sparkles className="h-4 w-4" /> Let's get started <ArrowRight className="h-4 w-4" /></>
                            ) : step === 3 ? (
                                <><Check className="h-4 w-4" /> Create & Finish</>
                            ) : step === 4 ? (
                                <>Go to Dashboard <ArrowRight className="h-4 w-4" /></>
                            ) : (
                                <>Next <ArrowRight className="h-4 w-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// missing icon alias
function CheckCircle({ className }: { className?: string }) {
    return <Check className={className} />;
}
