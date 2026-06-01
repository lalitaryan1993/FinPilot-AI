import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, CheckCircle2, Trash2, AlertTriangle, TrendingUp,
    CreditCard, Target, Zap, Check, RefreshCcw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notif {
    id: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    icon: string;
    title: string;
    body: string;
    link: string | null;
    read: boolean;
    created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const ICON_MAP: Record<string, typeof Bell> = {
    'alert-triangle': AlertTriangle,
    'credit-card':    CreditCard,
    'target':         Target,
    'trending-up':    TrendingUp,
    'zap':            Zap,
    'bell':           Bell,
};

const TYPE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
    warning: { color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/20' },
    alert:   { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-500/20' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20' },
    info:    { color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-500/20' },
};

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByDate(notifs: Notif[]): { label: string; items: Notif[] }[] {
    const today     = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    const groups: Record<string, Notif[]> = {};
    for (const n of notifs) {
        const d = new Date(n.created_at); d.setHours(0,0,0,0);
        let label: string;
        if (d.getTime() === today.getTime())     label = 'Today';
        else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
        else label = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    }
    return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchAll(): Promise<{ notifications: Notif[]; unread_count: number }> {
    const r = await fetch('/api/v1/notifications?limit=100', { credentials: 'include', headers: { Accept: 'application/json' } });
    return (await r.json()).data;
}
async function markOneRead(id: string): Promise<void> {
    await fetch(`/api/v1/notifications/${id}/read`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' } });
}
async function markAllRead(): Promise<void> {
    await fetch('/api/v1/notifications/read-all', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' } });
}
async function deleteOne(id: string): Promise<void> {
    await fetch(`/api/v1/notifications/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' } });
}

// ─── Notification Row ─────────────────────────────────────────────────────────
function NotifRow({ n, onRead, onDelete }: { n: Notif; onRead: () => void; onDelete: () => void }) {
    const Icon  = ICON_MAP[n.icon] ?? Bell;
    const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'group flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer',
                n.read
                    ? 'border-white/6 bg-white/2 hover:bg-white/4'
                    : `border bg-blue-500/4 hover:bg-blue-500/6 ${style.border}`,
            )}
            onClick={() => {
                if (!n.read) onRead();
                if (n.link) router.visit(n.link);
            }}
        >
            {/* Icon */}
            <div className={cn('mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', style.bg)}>
                <Icon className={cn('h-4.5 w-4.5', style.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                    <p className={cn('text-sm font-medium', n.read ? 'text-white/55' : 'text-white')}>{n.title}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-blue-400 mt-1" />
                        )}
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(); }}
                            className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-white/20 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {!n.read && (
                            <button
                                onClick={e => { e.stopPropagation(); onRead(); }}
                                className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-white/20 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                                title="Mark as read"
                            >
                                <Check className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                <p className="mt-0.5 text-xs text-white/40">{n.body}</p>
                <p className="mt-1.5 text-[10px] text-white/25">{timeAgo(n.created_at)}</p>
            </div>
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Filter = 'all' | 'unread';

export default function NotificationsIndex() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState<Filter>('all');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['notifications-page'],
        queryFn: fetchAll,
        staleTime: 30_000,
    });

    const notifs      = data?.notifications ?? [];
    const unreadCount = data?.unread_count  ?? 0;

    const displayed = filter === 'unread' ? notifs.filter(n => !n.read) : notifs;
    const grouped   = groupByDate(displayed);

    const markOneMut = useMutation({
        mutationFn: markOneRead,
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ['notifications-page'] });
            qc.setQueryData(['notifications-page'], (old: typeof data) =>
                old ? { ...old, notifications: old.notifications.map(n => n.id === id ? { ...n, read: true } : n), unread_count: Math.max(0, old.unread_count - 1) } : old
            );
        },
    });

    const markAllMut = useMutation({
        mutationFn: markAllRead,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-page'] }),
    });

    const deleteMut = useMutation({
        mutationFn: deleteOne,
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ['notifications-page'] });
            qc.setQueryData(['notifications-page'], (old: typeof data) =>
                old ? { ...old, notifications: old.notifications.filter(n => n.id !== id) } : old
            );
        },
    });

    return (
        <AppLayout title="Notifications">
            <Head title="Notifications" />
            <div className="mx-auto max-w-2xl p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Notifications</h2>
                        <p className="mt-0.5 text-sm text-white/40">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-colors"
                            title="Refresh"
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllMut.mutate()}
                                disabled={markAllMut.isPending}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/8 hover:text-white transition-colors disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark all read
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2">
                    {([
                        { key: 'all',    label: `All (${notifs.length})` },
                        { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
                    ] as { key: Filter; label: string }[]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                                filter === key
                                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
                    </div>
                ) : displayed.length === 0 ? (
                    <GlassCard className="flex flex-col items-center py-16 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                            <CheckCircle2 className="h-7 w-7 text-blue-400" />
                        </div>
                        <h3 className="text-base font-semibold text-white mb-1">
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </h3>
                        <p className="text-sm text-white/40 max-w-xs">
                            {filter === 'unread'
                                ? 'All notifications have been read. Switch to "All" to see past ones.'
                                : 'Budget alerts, goal milestones, and EMI reminders will appear here.'}
                        </p>
                    </GlassCard>
                ) : (
                    <div className="space-y-6">
                        {grouped.map(({ label, items }) => (
                            <div key={label}>
                                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">{label}</p>
                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {items.map(n => (
                                            <NotifRow
                                                key={n.id}
                                                n={n}
                                                onRead={() => markOneMut.mutate(n.id)}
                                                onDelete={() => deleteMut.mutate(n.id)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
