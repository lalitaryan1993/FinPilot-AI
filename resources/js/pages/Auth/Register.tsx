import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, User, Mail, Lock, Eye, EyeOff, Phone,
    ArrowRight, ArrowLeft, Check, Loader2,
    IndianRupee, Briefcase, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────
interface FormData {
    // Step 1 — Account
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    // Step 2 — Income
    income_amount: string;
    income_type: string;
    income_frequency: string;
    // Step 3 — Goal
    primary_goal: string;
    monthly_savings_target: string;
    // Step 4 — Preferences
    currency: string;
    notify_budget: boolean;
    notify_emi: boolean;
    notify_weekly: boolean;
}

const INCOME_TYPES = [
    { id: 'salary',    label: 'Salaried',    icon: Briefcase },
    { id: 'freelance', label: 'Freelance',   icon: Sparkles },
    { id: 'business',  label: 'Business',    icon: Briefcase },
    { id: 'other',     label: 'Other',       icon: IndianRupee },
];

const GOAL_OPTIONS = [
    { id: 'savings',       label: 'Build savings',       desc: 'Build an emergency fund and save more' },
    { id: 'debt',          label: 'Pay off debt',        desc: 'Clear loans and credit cards faster' },
    { id: 'invest',        label: 'Start investing',     desc: 'SIPs, mutual funds, and more' },
    { id: 'budget',        label: 'Control spending',    desc: 'Track and reduce unnecessary expenses' },
    { id: 'home',          label: 'Buy a home',          desc: 'Plan and save for a house' },
    { id: 'retirement',    label: 'Retire early',        desc: 'Build long-term wealth' },
];

const STEPS = ['Account', 'Income', 'Goals', 'Preferences'];

const slide = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
    exit:   (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.2 } }),
};

export default function Register() {
    const [step,     setStep]     = useState(0);
    const [dir,      setDir]      = useState(1);
    const [loading,  setLoading]  = useState(false);
    const [errors,   setErrors]   = useState<Record<string, string>>({});
    const [showPw,   setShowPw]   = useState(false);

    const [form, setForm] = useState<FormData>({
        name: '', email: '', password: '', password_confirmation: '', phone: '',
        income_amount: '', income_type: 'salary', income_frequency: 'monthly',
        primary_goal: '', monthly_savings_target: '',
        currency: 'INR', notify_budget: true, notify_emi: true, notify_weekly: false,
    });

    const f = (k: keyof FormData, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

    const validateStep = (): boolean => {
        const errs: Record<string, string> = {};
        if (step === 0) {
            if (!form.name.trim())      errs.name     = 'Name is required';
            if (!form.email.trim())     errs.email    = 'Email is required';
            if (form.password.length < 8) errs.password = 'Minimum 8 characters';
            if (form.password !== form.password_confirmation) errs.password_confirmation = 'Passwords do not match';
        }
        if (step === 1 && (!form.income_amount || +form.income_amount <= 0)) {
            errs.income_amount = 'Enter your monthly income';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const next = () => {
        if (!validateStep()) return;
        setDir(1);
        setStep((s) => s + 1);
    };
    const back = () => { setDir(-1); setStep((s) => s - 1); setErrors({}); };

    const submit = async () => {
        setLoading(true);
        setErrors({});
        try {
            const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            const res  = await fetch('/api/v1/auth/register', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
                body: JSON.stringify({
                    name:                  form.name,
                    email:                 form.email,
                    password:              form.password,
                    password_confirmation: form.password_confirmation,
                    phone:                 form.phone || undefined,
                    currency:              form.currency,
                }),
            });
            const json = await res.json();
            if (json.success) {
                router.visit('/');
            } else {
                const apiErrors: Record<string, string> = {};
                if (json.errors) {
                    Object.entries(json.errors as Record<string, string[]>).forEach(([k, v]) => { apiErrors[k] = v[0]; });
                } else {
                    apiErrors._global = json.message ?? 'Registration failed';
                }
                setErrors(apiErrors);
                setDir(-1);
                setStep(0);
            }
        } finally {
            setLoading(false);
        }
    };

    const isLastStep = step === STEPS.length - 1;

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0A1628] px-4 py-8">
            <Head title="Create Account" />

            {/* Background glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-blue-500/8 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-purple-500/8 blur-3xl" />
            </div>

            <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5C842] to-[#EAB308] shadow-[0_0_32px_rgba(245,200,66,0.35)]">
                        <Bot className="h-6 w-6 text-[#0A1628]" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Create your account</h1>
                    <p className="mt-1 text-sm text-white/40">Your AI financial co-pilot awaits</p>
                </div>

                {/* Step indicators */}
                <div className="mb-6 flex items-center justify-center gap-2">
                    {STEPS.map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                                i < step  ? 'bg-blue-500 text-white' :
                                i === step ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' :
                                             'bg-white/5 text-white/25',
                            )}>
                                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            <span className={cn('hidden text-xs sm:block transition-colors', i === step ? 'text-white/70' : 'text-white/25')}>{label}</span>
                            {i < STEPS.length - 1 && <div className={cn('h-px w-6 transition-colors', i < step ? 'bg-blue-500' : 'bg-white/10')} />}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="glass-card p-6 overflow-hidden">
                    <AnimatePresence mode="wait" custom={dir}>
                        <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">

                            {/* ── Step 0: Account ── */}
                            {step === 0 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-white/50">Full Name *</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                            <input value={form.name} onChange={(e) => f('name', e.target.value)}
                                                placeholder="Arjun Sharma" autoFocus
                                                className={cn('w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-blue-500/60', errors.name ? 'border-red-500/50' : 'border-white/10')} />
                                        </div>
                                        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-white/50">Email *</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                            <input type="email" value={form.email} onChange={(e) => f('email', e.target.value)}
                                                placeholder="you@example.com"
                                                className={cn('w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-blue-500/60', errors.email ? 'border-red-500/50' : 'border-white/10')} />
                                        </div>
                                        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-white/50">Password *</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => f('password', e.target.value)}
                                                placeholder="Minimum 8 characters"
                                                className={cn('w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-blue-500/60', errors.password ? 'border-red-500/50' : 'border-white/10')} />
                                            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-white/50">Confirm Password *</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                            <input type="password" value={form.password_confirmation} onChange={(e) => f('password_confirmation', e.target.value)}
                                                placeholder="Repeat password"
                                                className={cn('w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-blue-500/60', errors.password_confirmation ? 'border-red-500/50' : 'border-white/10')} />
                                        </div>
                                        {errors.password_confirmation && <p className="mt-1 text-xs text-red-400">{errors.password_confirmation}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-white/50">Phone <span className="text-white/25">(optional)</span></label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                            <input type="tel" value={form.phone} onChange={(e) => f('phone', e.target.value)}
                                                placeholder="+91 98765 43210"
                                                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-blue-500/60" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 1: Income ── */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-xs font-medium text-white/50">Income Type</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {INCOME_TYPES.map((t) => (
                                                <button key={t.id} onClick={() => f('income_type', t.id)}
                                                    className={cn('flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all',
                                                        form.income_type === t.id ? 'border-blue-500/50 bg-blue-500/15 text-blue-300' : 'border-white/8 bg-white/3 text-white/50 hover:border-white/15 hover:text-white/70')}>
                                                    <t.icon className="h-4 w-4 flex-shrink-0" />
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-white/50">Monthly Income (₹) *</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                            <input type="number" min="0" value={form.income_amount} onChange={(e) => f('income_amount', e.target.value)}
                                                placeholder="50000" autoFocus
                                                className={cn('w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/60', errors.income_amount ? 'border-red-500/50' : 'border-white/10')} />
                                        </div>
                                        {errors.income_amount && <p className="mt-1 text-xs text-red-400">{errors.income_amount}</p>}
                                        {/* Presets */}
                                        <div className="mt-2 flex gap-2 flex-wrap">
                                            {[30000, 50000, 75000, 100000, 150000].map((v) => (
                                                <button key={v} onClick={() => f('income_amount', String(v))}
                                                    className="rounded-lg border border-white/10 bg-white/4 px-2.5 py-1 text-xs text-white/50 hover:border-white/20 hover:text-white transition-colors">
                                                    ₹{v >= 100000 ? `${v/100000}L` : `${v/1000}k`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-blue-500/15 bg-blue-500/6 px-4 py-3">
                                        <p className="text-xs text-blue-200/60">Your income is used only to calculate savings rate and budget suggestions. It's stored privately and never shared.</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: Goals ── */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-xs font-medium text-white/50">Primary Financial Goal</p>
                                        <div className="space-y-2">
                                            {GOAL_OPTIONS.map((g) => (
                                                <button key={g.id} onClick={() => f('primary_goal', g.id)}
                                                    className={cn('w-full rounded-xl border px-4 py-3 text-left transition-all',
                                                        form.primary_goal === g.id ? 'border-blue-500/50 bg-blue-500/15' : 'border-white/8 bg-white/3 hover:border-white/15')}>
                                                    <div className="flex items-center justify-between">
                                                        <p className={cn('text-sm font-medium', form.primary_goal === g.id ? 'text-blue-300' : 'text-white/70')}>{g.label}</p>
                                                        {form.primary_goal === g.id && <Check className="h-4 w-4 text-blue-400" />}
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-white/35">{g.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {form.income_amount && (
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-white/50">Monthly Savings Target (₹)</label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                                <input type="number" min="0" value={form.monthly_savings_target} onChange={(e) => f('monthly_savings_target', e.target.value)}
                                                    placeholder={String(Math.round(+form.income_amount * 0.2))}
                                                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/60" />
                                            </div>
                                            <p className="mt-1 text-xs text-white/30">Suggested: 20% of income = ₹{Math.round(+form.income_amount * 0.2).toLocaleString('en-IN')}/mo</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Step 3: Preferences ── */}
                            {step === 3 && (
                                <div className="space-y-5">
                                    <div>
                                        <p className="mb-2 text-xs font-medium text-white/50">Currency</p>
                                        <div className="flex gap-2">
                                            {['INR', 'USD', 'EUR', 'GBP'].map((c) => (
                                                <button key={c} onClick={() => f('currency', c)}
                                                    className={cn('flex-1 rounded-xl border py-2 text-sm font-semibold transition-all',
                                                        form.currency === c ? 'border-blue-500/50 bg-blue-500/15 text-blue-300' : 'border-white/8 bg-white/3 text-white/40 hover:border-white/15')}>
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-3 text-xs font-medium text-white/50">Notifications</p>
                                        <div className="space-y-2">
                                            {[
                                                { key: 'notify_budget' as const, label: 'Budget alerts', desc: 'When you approach your spending limit' },
                                                { key: 'notify_emi'    as const, label: 'EMI reminders', desc: '3 days before loan EMI is due' },
                                                { key: 'notify_weekly' as const, label: 'Weekly summary', desc: 'Your spending recap every Monday' },
                                            ].map((n) => (
                                                <div key={n.key} className={cn('flex items-center justify-between rounded-xl border px-4 py-3 transition-all cursor-pointer',
                                                    form[n.key] ? 'border-blue-500/25 bg-blue-500/8' : 'border-white/8 bg-white/3')}
                                                    onClick={() => f(n.key, !form[n.key])}>
                                                    <div>
                                                        <p className="text-sm font-medium text-white/80">{n.label}</p>
                                                        <p className="text-xs text-white/35">{n.desc}</p>
                                                    </div>
                                                    <div className={cn('h-5 w-9 rounded-full transition-all relative', form[n.key] ? 'bg-blue-500' : 'bg-white/10')}>
                                                        <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', form[n.key] ? 'right-0.5' : 'left-0.5')} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/6 px-4 py-4">
                                        <div className="mb-2 flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-emerald-400" />
                                            <p className="text-sm font-semibold text-white">You're all set!</p>
                                        </div>
                                        <p className="text-xs text-white/40 leading-relaxed">
                                            FinPilot AI will analyse your finances, suggest budgets, and give you personalised advice — all powered by AI, all private.
                                        </p>
                                    </div>

                                    {errors._global && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{errors._global}</p>}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div className="mt-6 flex gap-3">
                        {step > 0 && (
                            <button onClick={back} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                        )}
                        <button
                            onClick={isLastStep ? submit : next}
                            disabled={loading}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60 transition-all"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isLastStep ? (
                                <><Sparkles className="h-4 w-4" /> Launch FinPilot</>
                            ) : (
                                <>{STEPS[step + 1]} <ArrowRight className="h-4 w-4" /></>
                            )}
                        </button>
                    </div>
                </div>

                <p className="mt-4 text-center text-sm text-white/40">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
}
