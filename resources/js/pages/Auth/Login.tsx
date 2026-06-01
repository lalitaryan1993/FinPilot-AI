import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Bot, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
    const [form, setForm]     = useState({ email: '', password: '', remember: false });
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const res = await fetch('/api/v1/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (json.success) {
                router.visit('/');
            } else {
                setErrors(json.errors ?? { email: json.message ?? 'Login failed' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0A1628] px-4">
            <Head title="Sign In" />

            {/* Background glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-yellow-500/8 blur-3xl" />
            </div>

            <motion.div
                className="w-full max-w-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5C842] to-[#EAB308] shadow-[0_0_32px_rgba(245,200,66,0.35)]">
                        <Bot className="h-6 w-6 text-[#0A1628]" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Welcome back</h1>
                    <p className="mt-1 text-sm text-white/40">Sign in to FinPilot AI</p>
                </div>

                <div className="glass-card p-6">
                    <form onSubmit={submit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-white/60">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className={cn(
                                        'w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors',
                                        'focus:border-blue-500/60 focus:bg-white/8',
                                        errors.email ? 'border-red-500/50' : 'border-white/10',
                                    )}
                                    placeholder="you@example.com"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-white/60">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-blue-500/60 focus:bg-white/8"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-400 disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-4 text-center text-sm text-white/40">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                        Create one free
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
