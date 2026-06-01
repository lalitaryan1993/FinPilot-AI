import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    User, Mail, Phone, Lock, Bell, Palette, Shield,
    Save, Eye, EyeOff, Check, Loader2, Bot,
    IndianRupee, Clock, Smartphone, KeyRound, ArrowRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemePanel } from '@/components/layout/ThemePanel';
import { cn, getInitials } from '@/lib/utils';
import type { PageProps } from '@/types';
import { router } from '@inertiajs/react';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function updateProfile(data: Record<string, unknown>) {
    const r = await fetch('/api/v1/auth/me', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify(data),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.message ?? 'Failed to update');
    return j.data;
}
async function changePassword(data: Record<string, string>) {
    const r = await fetch('/api/v1/auth/password', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify(data),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.message ?? 'Failed');
    return j;
}

// ─── Section wrapper ─────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <GlassCard className="p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-white/6 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/6">
                    <Icon className="h-4 w-4 text-white/50" />
                </div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
            </div>
            {children}
        </GlassCard>
    );
}

// ─── Input helper ────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">{label}</label>
            {children}
            {hint && <p className="mt-1 text-[11px] text-white/30">{hint}</p>}
        </div>
    );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input {...props}
            className={cn('w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-blue-500/50', className)}
        />
    );
}

// ─── Page ────────────────────────────────────────────────────────
export default function SettingsIndex() {
    const { auth } = usePage<PageProps>().props;
    const user      = auth.user;

    const [themeOpen, setThemeOpen] = useState(false);
    const [saved,     setSaved]     = useState<string | null>(null);

    // Profile form
    const [profile, setProfile] = useState({ name: user.name, email: user.email, phone: user.phone ?? '', timezone: user.timezone ?? 'Asia/Kolkata', currency: user.currency ?? 'INR' });
    const pf = (k: keyof typeof profile, v: string) => setProfile((p) => ({ ...p, [k]: v }));

    // Password form
    const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' });
    const pwf = (k: keyof typeof pwForm, v: string) => setPwForm((p) => ({ ...p, [k]: v }));
    const [showPw, setShowPw] = useState(false);
    const [pwErr, setPwErr]   = useState('');

    // Notification prefs
    const [notif, setNotif] = useState<Record<string, boolean>>({
        email_budget: true, email_emi: true, email_weekly: false,
        push_budget:  true, push_emi:   true, push_weekly:  false,
        ...(user.notification_preferences ?? {}),
    });

    const profileMut = useMutation({
        mutationFn: updateProfile,
        onSuccess: () => { setSaved('profile'); setTimeout(() => setSaved(null), 2500); },
    });
    const notifMut = useMutation({
        mutationFn: () => updateProfile({ notification_preferences: notif }),
        onSuccess: () => { setSaved('notif'); setTimeout(() => setSaved(null), 2500); },
    });
    const pwMut = useMutation({
        mutationFn: changePassword,
        onSuccess: () => { setPwForm({ current_password: '', password: '', password_confirmation: '' }); setSaved('password'); setTimeout(() => setSaved(null), 2500); setPwErr(''); },
        onError: (e: Error) => setPwErr(e.message),
    });

    const submitPw = () => {
        if (pwForm.password !== pwForm.password_confirmation) { setPwErr('Passwords do not match'); return; }
        if (pwForm.password.length < 8) { setPwErr('Minimum 8 characters'); return; }
        pwMut.mutate(pwForm);
    };

    const TIMEZONES = ['Asia/Kolkata', 'Asia/Mumbai', 'Asia/Singapore', 'Asia/Dubai', 'UTC', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Australia/Sydney'];
    const CURRENCIES = [
        { code: 'INR', label: '₹ Indian Rupee'      },
        { code: 'USD', label: '$ US Dollar'          },
        { code: 'EUR', label: '€ Euro'               },
        { code: 'GBP', label: '£ British Pound'      },
        { code: 'JPY', label: '¥ Japanese Yen'       },
        { code: 'AUD', label: 'A$ Australian Dollar' },
        { code: 'CAD', label: 'C$ Canadian Dollar'   },
        { code: 'SGD', label: 'S$ Singapore Dollar'  },
        { code: 'AED', label: 'د.إ UAE Dirham'       },
        { code: 'CHF', label: 'Fr. Swiss Franc'      },
    ];

    return (
        <AppLayout title="Settings">
            <Head title="Settings" />
            <div className="mx-auto max-w-2xl p-6 space-y-5">

                {/* Header */}
                <div>
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <p className="mt-0.5 text-sm text-white/40">Manage your account and preferences</p>
                </div>

                {/* Profile card */}
                <GlassCard className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white shadow-lg">
                                {getInitials(user.name)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0A1628]">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{user.name}</p>
                            <p className="text-sm text-white/40">{user.email}</p>
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-blue-300">
                                <Bot className="h-2.5 w-2.5" /> FinPilot Pro
                            </span>
                        </div>
                    </div>
                </GlassCard>

                {/* ── Profile Section ── */}
                <Section title="Profile Information" icon={User}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Full Name">
                                <Input value={profile.name} onChange={(e) => pf('name', e.target.value)} placeholder="Your name" />
                            </Field>
                            <Field label="Phone">
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                    <Input value={profile.phone} onChange={(e) => pf('phone', e.target.value)} placeholder="+91 98765 43210" className="pl-9" />
                                </div>
                            </Field>
                        </div>
                        <Field label="Email" hint="Changing email requires verification">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                <Input value={profile.email} onChange={(e) => pf('email', e.target.value)} type="email" className="pl-9" />
                            </div>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Currency">
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                    <select value={profile.currency} onChange={(e) => pf('currency', e.target.value)}
                                        className="w-full appearance-none rounded-xl border border-white/10 bg-navy-800 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500/50">
                                        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                                    </select>
                                </div>
                            </Field>
                            <Field label="Timezone">
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                    <select value={profile.timezone} onChange={(e) => pf('timezone', e.target.value)}
                                        className="w-full appearance-none rounded-xl border border-white/10 bg-navy-800 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500/50">
                                        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                                    </select>
                                </div>
                            </Field>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            {saved === 'profile' && (
                                <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-sm text-emerald-400">
                                    <Check className="h-4 w-4" /> Saved
                                </motion.span>
                            )}
                            <button
                                onClick={() => profileMut.mutate({ name: profile.name, email: profile.email, phone: profile.phone, timezone: profile.timezone, currency: profile.currency })}
                                disabled={profileMut.isPending}
                                className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60 transition-all">
                                {profileMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Profile</>}
                            </button>
                        </div>
                    </div>
                </Section>

                {/* ── Appearance ── */}
                <Section title="Appearance" icon={Palette}>
                    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-4">
                        <div>
                            <p className="text-sm font-medium text-white">Theme & Colors</p>
                            <p className="text-xs text-white/40">Customise base theme, accent color, and layout density</p>
                        </div>
                        <button onClick={() => setThemeOpen(true)}
                            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/6 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">
                            <Palette className="h-4 w-4 text-white/50" />
                            Customise
                        </button>
                    </div>
                </Section>

                {/* ── Notifications ── */}
                <Section title="Notifications" icon={Bell}>
                    <div className="space-y-3">
                        {[
                            { group: 'Email', icon: Mail, items: [
                                { key: 'email_budget', label: 'Budget alerts', desc: 'When you exceed 80% of a budget' },
                                { key: 'email_emi',    label: 'EMI reminders', desc: '3 days before each EMI due date' },
                                { key: 'email_weekly', label: 'Weekly report', desc: 'Spending summary every Monday' },
                            ]},
                            { group: 'Push / WhatsApp', icon: Smartphone, items: [
                                { key: 'push_budget', label: 'Budget alerts',  desc: 'Instant push when nearing limit' },
                                { key: 'push_emi',    label: 'EMI reminders', desc: 'Day-of reminder for loan EMIs' },
                                { key: 'push_weekly', label: 'Weekly digest',  desc: 'Quick stats on your phone' },
                            ]},
                        ].map((group) => (
                            <div key={group.group}>
                                <div className="mb-2 flex items-center gap-2">
                                    <group.icon className="h-3.5 w-3.5 text-white/30" />
                                    <p className="text-xs font-semibold uppercase tracking-widest text-white/30">{group.group}</p>
                                </div>
                                <div className="space-y-2">
                                    {group.items.map((n) => (
                                        <div key={n.key}
                                            className={cn('flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all', notif[n.key] ? 'border-blue-500/25 bg-blue-500/6' : 'border-white/6 bg-white/2')}
                                            onClick={() => setNotif((p) => ({ ...p, [n.key]: !p[n.key] }))}>
                                            <div>
                                                <p className="text-sm font-medium text-white/80">{n.label}</p>
                                                <p className="text-xs text-white/35">{n.desc}</p>
                                            </div>
                                            <div className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', notif[n.key] ? 'bg-blue-500' : 'bg-white/12')}>
                                                <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', notif[n.key] ? 'right-0.5' : 'left-0.5')} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center justify-end gap-3 pt-1">
                            {saved === 'notif' && (
                                <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-sm text-emerald-400">
                                    <Check className="h-4 w-4" /> Saved
                                </motion.span>
                            )}
                            <button
                                onClick={() => notifMut.mutate()}
                                disabled={notifMut.isPending}
                                className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60 transition-all">
                                {notifMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Notifications</>}
                            </button>
                        </div>
                    </div>
                </Section>

                {/* ── Security ── */}
                <Section title="Security" icon={Shield}>
                    <div className="space-y-4">
                        <Field label="Current Password">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                <Input type={showPw ? 'text' : 'password'} value={pwForm.current_password} onChange={(e) => pwf('current_password', e.target.value)} placeholder="••••••••" className="pl-9 pr-9" />
                                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                                    {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="New Password">
                                <Input type="password" value={pwForm.password} onChange={(e) => pwf('password', e.target.value)} placeholder="Min. 8 characters" />
                            </Field>
                            <Field label="Confirm New Password">
                                <Input type="password" value={pwForm.password_confirmation} onChange={(e) => pwf('password_confirmation', e.target.value)} placeholder="Repeat password" />
                            </Field>
                        </div>
                        {pwErr && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{pwErr}</p>}
                        {saved === 'password' && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-sm text-emerald-400">
                                <Check className="h-4 w-4" /> Password changed successfully
                            </motion.p>
                        )}
                        <div className="flex justify-end">
                            <button onClick={submitPw} disabled={pwMut.isPending}
                                className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60 transition-all">
                                {pwMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-4 w-4" /> Change Password</>}
                            </button>
                        </div>
                    </div>
                </Section>

                {/* ── AI Configuration ── */}
                <Section title="AI Configuration" icon={KeyRound}>
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
                        <div>
                            <p className="text-sm font-medium text-white">API Keys & Provider Settings</p>
                            <p className="text-xs text-white/40">Manage Anthropic, OpenAI, Gemini and 10 other AI providers. Configure agents and defaults.</p>
                        </div>
                        <button onClick={() => router.visit('/settings/ai')}
                            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-colors shrink-0">
                            <KeyRound className="h-4 w-4" />
                            Open <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </Section>

                {/* ── AI Preferences ── */}
                <Section title="AI Assistant" icon={Bot}>
                    <div className="space-y-3">
                        {[
                            { label: 'Proactive insights', desc: 'AI analyses your spending and surfaces alerts automatically' },
                            { label: 'Contextual suggestions', desc: 'Smart replies when adding expenses or goals' },
                            { label: 'Indian finance context', desc: 'EMI, SIP, 80C, UPI — AI understands Indian financial terms' },
                        ].map((p, i) => (
                            <div key={i} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/2 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-white/80">{p.label}</p>
                                    <p className="text-xs text-white/35">{p.desc}</p>
                                </div>
                                <div className="relative h-5 w-9 shrink-0 rounded-full bg-blue-500">
                                    <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>

            <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} />
        </AppLayout>
    );
}
