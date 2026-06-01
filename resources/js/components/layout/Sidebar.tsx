import { useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, TrendingUp, Target, TrendingDown,
    BarChart3, FileText, Users,
    Bot, ChevronRight, Wallet, Receipt, LogOut, User, ChevronUp,
    DollarSign, RefreshCcw, MessageSquare, Sparkles, KeyRound, Zap, Repeat2, Bell, X,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { User as UserType } from '@/types';

const navItems = [
    { href: '/',               label: 'Dashboard',    icon: LayoutDashboard },
    { href: '/expenses',       label: 'Expenses',     icon: Receipt },
    { href: '/budget',         label: 'Budget',       icon: Wallet },
    { href: '/goals',          label: 'Goals',        icon: Target },
    { href: '/debts',          label: 'Debts & EMIs', icon: TrendingDown },
    { href: '/investments',    label: 'Investments',  icon: TrendingUp },
    { href: '/income',         label: 'Income',       icon: DollarSign },
    { href: '/money-flow',     label: 'Money Flow',   icon: Wallet },
    { href: '/subscriptions',      label: 'Subscriptions',    icon: RefreshCcw },
    { href: '/recurring-expenses', label: 'Recurring',         icon: Repeat2 },
    { href: '/documents',          label: 'Documents',         icon: FileText },
    { href: '/family',         label: 'Family',        icon: Users },
    { href: '/reports',        label: 'Reports',       icon: BarChart3 },
    { href: '/notifications',  label: 'Notifications', icon: Bell },
];

interface Props {
    user: UserType;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

const popupVariants = {
    hidden:  { opacity: 0, y: 8, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit:    { opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12 } },
};

export function Sidebar({ user, mobileOpen = false, onMobileClose }: Props) {
    const { url } = usePage();
    const [menuOpen,   setMenuOpen]   = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);

    const isActive = (href: string) =>
        href === '/' ? url === '/' : url.startsWith(href);

    const logout = async () => {
        setLoggingOut(true);
        const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        await fetch('/logout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
        });
        router.visit('/login');
    };

    return (
        <>
            {/* Mobile backdrop */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        key="sidebar-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                        onClick={onMobileClose}
                    />
                )}
            </AnimatePresence>

            <aside className={cn(
                'sidebar flex flex-col flex-shrink-0',
                'fixed inset-y-0 left-0 z-50 w-64',
                'transition-transform duration-300 ease-in-out',
                mobileOpen ? 'translate-x-0' : '-translate-x-full',
                'lg:relative lg:translate-x-0 lg:flex',
            )}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/8">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F5C842] to-[#EAB308] shadow-[0_0_16px_rgba(245,200,66,0.4)]">
                    <Bot className="h-5 w-5 text-[#0A1628]" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold tracking-tight text-white">FinPilot AI</div>
                    <div className="text-[10px] text-white/40 leading-none">Financial OS</div>
                </div>
                <button
                    onClick={onMobileClose}
                    className="lg:hidden flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-0.5">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onMobileClose}
                                className={cn(
                                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                                    active
                                        ? 'bg-blue-500/12 text-blue-400 border-r-2 border-blue-400'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white',
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'h-4 w-4 flex-shrink-0 transition-colors',
                                        active ? 'text-blue-400' : 'text-white/40 group-hover:text-white/70',
                                    )}
                                />
                                <span>{item.label}</span>
                                {active && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* AI Assistant section */}
                <div className="mt-6">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-2">
                        AI Assistant
                    </div>
                    <div className="space-y-1">
                        <Link
                            href="/ai"
                            className={cn(
                                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                'bg-gradient-to-r from-blue-500/15 to-purple-500/10',
                                'border border-blue-500/20 hover:border-blue-500/40',
                                isActive('/ai') && !isActive('/ai/import') ? 'border-blue-400/50 text-blue-300' : 'text-white/70 hover:text-white',
                            )}
                        >
                            <MessageSquare className="h-4 w-4 text-blue-400" />
                            <span>Ask FinPilot</span>
                            <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
                        </Link>
                        <Link
                            href="/ai/import"
                            className={cn(
                                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                'bg-gradient-to-r from-amber-500/12 to-orange-500/8',
                                'border border-amber-500/20 hover:border-amber-500/40',
                                isActive('/ai/import') ? 'border-amber-400/50 text-amber-300' : 'text-white/70 hover:text-white',
                            )}
                        >
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            <span>Smart Import</span>
                            <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
                        </Link>
                        <Link
                            href="/automations"
                            className={cn(
                                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                'border hover:border-white/15',
                                isActive('/automations') ? 'border-amber-400/30 bg-amber-500/8 text-amber-300' : 'border-transparent text-white/60 hover:text-white',
                            )}
                        >
                            <Zap className="h-4 w-4 text-amber-400/70" />
                            <span>Automations</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* User Footer with popup menu */}
            <div ref={footerRef} className="relative border-t border-white/8 px-4 py-4">
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            variants={popupVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={cn(
                                'absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-xl',
                                'border border-white/10 bg-navy-800/98 shadow-2xl backdrop-blur-2xl',
                            )}
                        >
                            <div className="py-1">
                                <Link
                                    href="/settings"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                                >
                                    <User className="h-4 w-4 text-white/40" />
                                    Profile & Settings
                                </Link>
                                <Link
                                    href="/settings/ai"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                                >
                                    <KeyRound className="h-4 w-4 text-white/40" />
                                    AI Configuration
                                </Link>
                            </div>
                            <div className="border-t border-white/8 py-1">
                                <button
                                    onClick={logout}
                                    disabled={loggingOut}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/8 hover:text-red-300 disabled:opacity-50"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {loggingOut ? 'Signing out…' : 'Sign out'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
                        {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <div className="truncate text-sm font-medium text-white">{user.name}</div>
                        <div className="truncate text-xs text-white/40">{user.email}</div>
                    </div>
                    <motion.div animate={{ rotate: menuOpen ? 0 : 180 }} transition={{ duration: 0.2 }}>
                        <ChevronUp className="h-3.5 w-3.5 text-white/30" />
                    </motion.div>
                </button>
            </div>
            </aside>
        </>
    );
}
