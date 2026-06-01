import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, X, LayoutDashboard, Receipt, Wallet, Target, TrendingDown,
    TrendingUp, DollarSign, RefreshCcw, Repeat2, FileText, Users,
    BarChart3, Bell, MessageSquare, Sparkles, Zap, Settings, KeyRound,
    Plus, ArrowRight, Clock, Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchItem {
    label: string;
    href: string;
    icon: React.ElementType;
    category: string;
    keywords?: string[];
}

const ALL_ITEMS: SearchItem[] = [
    // Actions — shown first
    { label: 'Add Expense',       href: '/expenses/new',       icon: Plus,           category: 'Actions', keywords: ['new', 'log', 'create', 'spend'] },
    { label: 'Add Goal',          href: '/goals/new',           icon: Plus,           category: 'Actions', keywords: ['new', 'target', 'saving'] },
    { label: 'Add Investment',    href: '/investments/new',     icon: Plus,           category: 'Actions', keywords: ['new', 'portfolio', 'stock', 'fund'] },
    { label: 'Upload Document',   href: '/documents/upload',    icon: Plus,           category: 'Actions', keywords: ['upload', 'file', 'pdf', 'scan'] },
    // Pages
    { label: 'Dashboard',         href: '/',                    icon: LayoutDashboard, category: 'Pages',  keywords: ['home', 'overview', 'summary', 'health'] },
    { label: 'Expenses',          href: '/expenses',            icon: Receipt,         category: 'Pages',  keywords: ['spending', 'transactions', 'purchases', 'bills'] },
    { label: 'Budget',            href: '/budget',              icon: Wallet,          category: 'Pages',  keywords: ['limits', 'allocation', 'plan'] },
    { label: 'Goals',             href: '/goals',               icon: Target,          category: 'Pages',  keywords: ['savings', 'targets', 'milestones', 'wishlist'] },
    { label: 'Debts & EMIs',      href: '/debts',               icon: TrendingDown,    category: 'Pages',  keywords: ['loans', 'emi', 'credit', 'liabilities'] },
    { label: 'Investments',       href: '/investments',         icon: TrendingUp,      category: 'Pages',  keywords: ['portfolio', 'stocks', 'mutual funds', 'xirr', 'sip'] },
    { label: 'Income',            href: '/income',              icon: DollarSign,      category: 'Pages',  keywords: ['salary', 'earnings', 'sources', 'revenue'] },
    { label: 'Money Flow',        href: '/money-flow',          icon: Wallet,          category: 'Pages',  keywords: ['bank', 'accounts', 'statement', 'transactions', 'balance'] },
    { label: 'Subscriptions',     href: '/subscriptions',       icon: RefreshCcw,      category: 'Pages',  keywords: ['recurring', 'billing', 'plans', 'netflix'] },
    { label: 'Recurring',         href: '/recurring-expenses',  icon: Repeat2,         category: 'Pages',  keywords: ['auto', 'regular', 'repeat'] },
    { label: 'Documents',         href: '/documents',           icon: FileText,        category: 'Pages',  keywords: ['files', 'upload', 'pdfs', 'receipts'] },
    { label: 'Family',            href: '/family',              icon: Users,           category: 'Pages',  keywords: ['shared', 'household', 'members', 'group'] },
    { label: 'Reports',           href: '/reports',             icon: BarChart3,       category: 'Pages',  keywords: ['analytics', 'export', 'csv', 'tax', 'itr', 'charts'] },
    { label: 'Notifications',     href: '/notifications',       icon: Bell,            category: 'Pages',  keywords: ['alerts', 'messages', 'updates'] },
    // AI
    { label: 'Ask FinPilot AI',   href: '/ai',                  icon: MessageSquare,   category: 'AI',     keywords: ['chat', 'ask', 'question', 'help', 'advice'] },
    { label: 'Smart Import',      href: '/ai/import',           icon: Sparkles,        category: 'AI',     keywords: ['import', 'scan', 'receipt', 'statement', 'ocr'] },
    { label: 'Automations',       href: '/automations',         icon: Zap,             category: 'AI',     keywords: ['rules', 'auto', 'categorize', 'workflow'] },
    // Settings
    { label: 'Settings',          href: '/settings',            icon: Settings,        category: 'Settings', keywords: ['profile', 'preferences', 'account', 'currency'] },
    { label: 'AI Configuration',  href: '/settings/ai',         icon: KeyRound,        category: 'Settings', keywords: ['api key', 'claude', 'openai', 'gemini', 'provider'] },
];

const CATEGORY_ORDER = ['Actions', 'Pages', 'AI', 'Settings'];
const CATEGORY_COLORS: Record<string, string> = {
    Actions:  'text-amber-400',
    Pages:    'text-blue-400',
    AI:       'text-purple-400',
    Settings: 'text-white/40',
};

const RECENT_KEY = 'fp_recent_pages';

function getRecent(): string[] {
    try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? '[]'); }
    catch { return []; }
}

export function addToRecent(href: string) {
    const list = [href, ...getRecent().filter(h => h !== href)].slice(0, 6);
    try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
}

interface Props {
    open: boolean;
    onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
    const [query, setQuery]       = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef  = useRef<HTMLInputElement>(null);

    // Reset on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Filtered results
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return ALL_ITEMS.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.keywords?.some(k => k.toLowerCase().includes(q)) ||
            item.category.toLowerCase().includes(q),
        );
    }, [query]);

    // Recent items when query is empty
    const recentItems = useMemo(() => {
        if (!open) return [];
        const hrefs = getRecent();
        return hrefs.map(h => ALL_ITEMS.find(i => i.href === h)).filter(Boolean) as SearchItem[];
    }, [open]);

    // What to display
    const displayItems = query.trim() ? filtered : recentItems.length ? recentItems : ALL_ITEMS.slice(0, 6);
    const showRecent   = !query.trim() && recentItems.length > 0;

    // Group by category (only when not showing recent flat list)
    const groups = useMemo(() => {
        if (showRecent) return { Recent: displayItems };
        if (!query.trim()) return { Suggested: displayItems };
        const g: Record<string, SearchItem[]> = {};
        for (const item of displayItems) {
            (g[item.category] ??= []).push(item);
        }
        return g;
    }, [displayItems, showRecent, query]);

    // Flat ordered list for keyboard nav
    const flat = useMemo(() => {
        if (showRecent || !query.trim()) return displayItems;
        return CATEGORY_ORDER.flatMap(cat => groups[cat] ?? []);
    }, [groups, displayItems, showRecent, query]);

    const navigate = useCallback((item: SearchItem) => {
        addToRecent(item.href);
        onClose();
        router.visit(item.href);
    }, [onClose]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && flat[activeIdx]) { navigate(flat[activeIdx]); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, flat, activeIdx, navigate, onClose]);

    // Reset active index when results change
    useEffect(() => setActiveIdx(0), [query]);

    let flatIdx = 0;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="cp-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        key="cp-panel"
                        initial={{ opacity: 0, scale: 0.96, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -8 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed left-1/2 top-[12vh] z-[310] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(59,130,246,0.08)' }}
                    >
                        {/* Search input */}
                        <div className="flex items-center gap-3 border-b border-white/8 bg-[#0D1F40]/98 px-4 py-3.5">
                            <Search className="h-4 w-4 flex-shrink-0 text-white/30" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search sections, pages, actions…"
                                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                            />
                            {query && (
                                <button onClick={() => setQuery('')} className="text-white/25 hover:text-white/60 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] font-mono text-white/25">
                                Esc
                            </kbd>
                        </div>

                        {/* Results */}
                        <div className="max-h-[400px] overflow-y-auto bg-[#0A1628]/98 p-2">
                            {flat.length === 0 && query.trim() ? (
                                <div className="flex flex-col items-center gap-2 py-10 text-white/25">
                                    <Search className="h-8 w-8" />
                                    <p className="text-sm">No results for "{query}"</p>
                                </div>
                            ) : (
                                Object.entries(groups).map(([category, items]) => {
                                    const catColor = CATEGORY_COLORS[category] ?? 'text-white/30';
                                    return (
                                        <div key={category} className="mb-1">
                                            <div className={cn('px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest', catColor)}>
                                                {category === 'Suggested' ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Command className="h-3 w-3" /> Suggested
                                                    </span>
                                                ) : category === 'Recent' ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-3 w-3" /> Recent
                                                    </span>
                                                ) : category}
                                            </div>
                                            {items.map((item) => {
                                                const idx = flatIdx++;
                                                const active = idx === activeIdx;
                                                return (
                                                    <button
                                                        key={item.href}
                                                        onMouseEnter={() => setActiveIdx(idx)}
                                                        onClick={() => navigate(item)}
                                                        className={cn(
                                                            'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-100',
                                                            active
                                                                ? 'bg-blue-500/12 text-white'
                                                                : 'text-white/60 hover:text-white',
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                                                            active ? 'bg-blue-500/20' : 'bg-white/5 group-hover:bg-white/8',
                                                        )}>
                                                            <item.icon className={cn('h-3.5 w-3.5', active ? 'text-blue-300' : 'text-white/40 group-hover:text-white/70')} />
                                                        </div>
                                                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                                                        <ArrowRight className={cn('h-3.5 w-3.5 flex-shrink-0 transition-all', active ? 'text-blue-400 translate-x-0.5' : 'text-white/15')} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-white/6 bg-[#0A1628]/95 px-4 py-2">
                            <div className="flex items-center gap-3 text-[10px] text-white/20">
                                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/4 px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
                                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/4 px-1 py-0.5 font-mono">↩</kbd> open</span>
                                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/4 px-1 py-0.5 font-mono">Esc</kbd> close</span>
                            </div>
                            <span className="text-[10px] text-white/15">{flat.length} result{flat.length !== 1 ? 's' : ''}</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
