import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Sparkles, Settings, LogOut, User, ChevronRight,
    AlertTriangle, TrendingUp, CreditCard, Target, CheckCircle2,
    Palette, Zap, Menu, Search,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { ThemePanel } from './ThemePanel';
import type { User as UserType } from '@/types';

interface Props {
    title?: string;
    user: UserType;
    onMenuClick?: () => void;
    onSearchClick?: () => void;
}

interface ApiNotification {
    id: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    icon: string;
    title: string;
    body: string;
    link: string | null;
    read: boolean;
    created_at: string;
}

const ICON_MAP: Record<string, typeof AlertTriangle> = {
    'alert-triangle': AlertTriangle,
    'credit-card':    CreditCard,
    'target':         Target,
    'trending-up':    TrendingUp,
    'zap':            Zap,
};

const TYPE_STYLE: Record<string, { color: string; bg: string }> = {
    warning: { color: 'text-amber-400',   bg: 'bg-amber-400/10' },
    alert:   { color: 'text-red-400',     bg: 'bg-red-400/10' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    info:    { color: 'text-blue-400',    bg: 'bg-blue-400/10' },
};

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const DD = {
    hidden:  { opacity: 0, y: -6, scale: 0.97 },
    visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
    exit:    { opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.1 } },
};

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) handler();
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [ref, handler]);
}

/* ── Icon button base class ── */
const iconBtn = 'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150';

export function TopBar({ title, user, onMenuClick, onSearchClick }: Props) {
    const [notifOpen,     setNotifOpen]    = useState(false);
    const [userOpen,      setUserOpen]     = useState(false);
    const [themeOpen,     setThemeOpen]    = useState(false);
    const [loggingOut,    setLoggingOut]   = useState(false);
    const [notifications, setNotifications] = useState<ApiNotification[]>([]);
    const [unreadCount,   setUnreadCount]  = useState(0);
    const [notifLoading,  setNotifLoading] = useState(false);

    const notifRef = useRef<HTMLDivElement>(null);
    const userRef  = useRef<HTMLDivElement>(null);

    useClickOutside(notifRef, () => setNotifOpen(false));
    useClickOutside(userRef,  () => setUserOpen(false));

    const fetchNotifications = useCallback(async () => {
        try {
            setNotifLoading(true);
            const res  = await fetch('/api/v1/notifications?limit=20', { credentials: 'include', headers: { Accept: 'application/json' } });
            const json = await res.json();
            if (json.success) {
                setNotifications(json.data.notifications);
                setUnreadCount(json.data.unread_count);
            }
        } catch { /* silent */ } finally { setNotifLoading(false); }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const t = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(t);
    }, [fetchNotifications]);

    useEffect(() => { if (notifOpen) fetchNotifications(); }, [notifOpen, fetchNotifications]);

    const markAllRead = async () => {
        await fetch('/api/v1/notifications/read-all', {
            method: 'POST', credentials: 'include',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        });
        setNotifications(p => p.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const markOneRead = async (id: string) => {
        setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
        await fetch(`/api/v1/notifications/${id}/read`, {
            method: 'POST', credentials: 'include',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        });
    };

    const logout = async () => {
        setLoggingOut(true);
        const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        await fetch('/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json' } });
        router.visit('/login');
    };

    const closeAll = () => { setNotifOpen(false); setUserOpen(false); };

    return (
        <>
            <header
                className="relative z-30 flex h-14 flex-shrink-0 items-center gap-2 px-4 lg:px-5 backdrop-blur-xl"
                style={{
                    background: 'linear-gradient(to right, rgba(10,22,40,0.97) 0%, rgba(13,28,56,0.95) 50%, rgba(10,22,40,0.97) 100%)',
                    boxShadow: '0 1px 0 rgba(59,130,246,0.12), 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.025)',
                }}
            >
                {/* ── Left: hamburger + title ── */}
                <button
                    onClick={onMenuClick}
                    className={cn(iconBtn, 'lg:hidden text-white/40 hover:bg-white/6 hover:text-white flex-shrink-0')}
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="flex-1 min-w-0">
                    {title && (
                        <h1 className="text-sm font-semibold text-white/75 truncate tracking-tight">{title}</h1>
                    )}
                </div>

                {/* ── Center: search pill ── */}
                <button
                    onClick={onSearchClick}
                    className="hidden md:flex items-center gap-2.5 h-8 px-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-white/30 hover:text-white/55 transition-all duration-200 min-w-[200px] xl:min-w-[260px] group"
                >
                    <Search className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 text-left text-xs">Search sections…</span>
                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono leading-none text-white/30">Ctrl</kbd>
                        <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono leading-none text-white/30">K</kbd>
                    </div>
                </button>

                {/* ── Right: actions ── */}
                <div className="flex items-center gap-1">

                    {/* Search icon — mobile only */}
                    <button
                        onClick={onSearchClick}
                        className={cn(iconBtn, 'md:hidden text-white/40 hover:bg-white/6 hover:text-white')}
                        title="Search"
                    >
                        <Search className="h-4 w-4" />
                    </button>

                    {/* Ask AI chip — desktop only */}
                    <Link
                        href="/ai"
                        className="hidden lg:flex items-center gap-1.5 h-8 rounded-xl px-3 text-xs font-medium bg-gradient-to-r from-blue-500/15 to-purple-500/10 border border-blue-500/20 text-blue-300/80 hover:text-blue-200 hover:border-blue-500/35 hover:from-blue-500/20 hover:to-purple-500/15 transition-all duration-200"
                    >
                        <Sparkles className="h-3 w-3" />
                        Ask AI
                    </Link>

                    {/* Theme */}
                    <button
                        onClick={() => { setThemeOpen(true); closeAll(); }}
                        className={cn(iconBtn, 'text-white/35 hover:bg-white/6 hover:text-white/80')}
                        title="Appearance"
                    >
                        <Palette className="h-4 w-4" />
                    </button>

                    {/* ── Notifications ── */}
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => { setNotifOpen(v => !v); setUserOpen(false); }}
                            className={cn(
                                iconBtn,
                                unreadCount > 0
                                    ? 'text-blue-300 hover:bg-blue-500/10'
                                    : 'text-white/35 hover:bg-white/6 hover:text-white/80',
                            )}
                        >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <motion.span
                                    key={unreadCount}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white ring-2 ring-[#0A1628]"
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </motion.span>
                            )}
                        </button>

                        <AnimatePresence>
                            {notifOpen && (
                                <motion.div
                                    variants={DD} initial="hidden" animate="visible" exit="exit"
                                    className="absolute right-0 top-10 z-[200] w-80 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl"
                                    style={{ background: 'rgba(10,22,40,0.97)', boxShadow: '0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)' }}
                                >
                                    <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Bell className="h-3.5 w-3.5 text-white/40" />
                                            <span className="text-sm font-semibold text-white">Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} className="text-[11px] text-white/35 hover:text-blue-400 transition-colors">
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-80 overflow-y-auto">
                                        {notifLoading && notifications.length === 0 ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
                                            </div>
                                        ) : notifications.length === 0 ? (
                                            <div className="flex flex-col items-center py-10 text-white/25">
                                                <CheckCircle2 className="mb-2 h-8 w-8" />
                                                <span className="text-sm">All caught up!</span>
                                            </div>
                                        ) : notifications.map(n => {
                                            const Icon  = ICON_MAP[n.icon] ?? Bell;
                                            const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
                                            return (
                                                <div
                                                    key={n.id}
                                                    onClick={() => {
                                                        if (!n.read) markOneRead(n.id);
                                                        if (n.link) { setNotifOpen(false); router.visit(n.link); }
                                                    }}
                                                    className={cn('flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/4 border-b border-white/4 last:border-0', !n.read && 'bg-blue-500/4')}
                                                >
                                                    <div className={cn('mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', style.bg)}>
                                                        <Icon className={cn('h-4 w-4', style.color)} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={cn('text-sm font-medium leading-snug', n.read ? 'text-white/50' : 'text-white')}>{n.title}</p>
                                                            {!n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />}
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-white/35 leading-snug">{n.body}</p>
                                                        <p className="mt-1 text-[10px] text-white/20">{timeAgo(n.created_at)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="border-t border-white/6 px-4 py-2.5">
                                        <button
                                            onClick={() => { setNotifOpen(false); router.visit('/notifications'); }}
                                            className="flex w-full items-center justify-center gap-1.5 text-xs text-white/30 hover:text-blue-400 transition-colors"
                                        >
                                            View all notifications <ChevronRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── User avatar ── */}
                    <div ref={userRef} className="relative ml-0.5">
                        <button
                            onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-all duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                                boxShadow: userOpen
                                    ? '0 0 0 2px rgba(99,102,241,0.6), 0 0 20px rgba(99,102,241,0.25)'
                                    : '0 0 0 1px rgba(255,255,255,0.12)',
                            }}
                        >
                            {getInitials(user.name)}
                        </button>

                        <AnimatePresence>
                            {userOpen && (
                                <motion.div
                                    variants={DD} initial="hidden" animate="visible" exit="exit"
                                    className="absolute right-0 top-10 z-[200] w-56 overflow-hidden rounded-2xl border border-white/8 shadow-2xl backdrop-blur-2xl"
                                    style={{ background: 'rgba(10,22,40,0.97)', boxShadow: '0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}
                                >
                                    {/* User header */}
                                    <div className="border-b border-white/6 px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                                                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' }}
                                            >
                                                {getInitials(user.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                                                <p className="truncate text-xs text-white/35">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="py-1">
                                        <Link href="/settings" onClick={() => setUserOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <User className="h-4 w-4 text-white/30" />
                                            Profile & Settings
                                        </Link>
                                        <button
                                            onClick={() => { setUserOpen(false); setThemeOpen(true); }}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <Palette className="h-4 w-4 text-white/30" />
                                            Appearance
                                        </button>
                                        <Link href="/settings" onClick={() => setUserOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <Settings className="h-4 w-4 text-white/30" />
                                            Preferences
                                        </Link>
                                    </div>

                                    <div className="border-t border-white/6 py-1">
                                        <button
                                            onClick={logout}
                                            disabled={loggingOut}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 hover:bg-red-500/8 hover:text-red-300 transition-colors disabled:opacity-50"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            {loggingOut ? 'Signing out…' : 'Sign out'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} />
        </>
    );
}
