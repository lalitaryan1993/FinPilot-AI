import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Upload, ImageIcon, FileText, X, Loader2,
    CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
    IndianRupee, TrendingUp, TrendingDown, RefreshCcw,
    Check, Trash2, Edit2, ArrowRight, Clock, Zap,
    CreditCard, Smartphone, Banknote, Building2, Receipt as ReceiptIcon,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency } from '@/lib/utils';
import type { PageProps } from '@/types';

// ─── Types ────────────────────────────────────────────────────────
interface ImportItem {
    id: number;
    type: 'expense' | 'income' | 'investment' | 'transfer';
    amount: number;
    description: string;
    merchant: string | null;
    transaction_date: string | null;
    suggested_category: string | null;
    payment_method: string | null;
    confidence: number;
    status: 'pending' | 'confirmed' | 'dismissed';
    notes: string | null;
}

interface SmartImport {
    id: number;
    original_name: string;
    file_type: string;
    file_size_human: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    error_message: string | null;
    source_type: string | null;
    ai_notes: string | null;
    total_items: number;
    confirmed_count: number;
    dismissed_count: number;
    items: ImportItem[];
    created_at: string;
}

// ─── API ──────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchImports(): Promise<SmartImport[]> {
    const r = await fetch('/api/v1/smart-imports', { credentials: 'include' });
    return (await r.json()).data ?? [];
}
async function fetchImport(id: number): Promise<SmartImport> {
    const r = await fetch(`/api/v1/smart-imports/${id}/status`, { credentials: 'include' });
    return (await r.json()).data;
}
async function confirmItem(importId: number, itemId: number, overrides: Record<string, unknown>): Promise<void> {
    await fetch(`/api/v1/smart-imports/${importId}/items/${itemId}/confirm`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify(overrides),
    });
}
async function dismissItem(importId: number, itemId: number): Promise<void> {
    await fetch(`/api/v1/smart-imports/${importId}/items/${itemId}/dismiss`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-CSRF-TOKEN': csrf() },
    });
}
async function confirmAll(importId: number): Promise<{ count: number }> {
    const r = await fetch(`/api/v1/smart-imports/${importId}/confirm-all`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-CSRF-TOKEN': csrf() },
    });
    return r.json();
}
async function deleteImport(id: number): Promise<void> {
    await fetch(`/api/v1/smart-imports/${id}`, {
        method: 'DELETE', credentials: 'include',
        headers: { 'X-CSRF-TOKEN': csrf() },
    });
}

// ─── Constants ────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
    food_dining: 'Food & Dining', transport: 'Transport', shopping: 'Shopping',
    entertainment: 'Entertainment', healthcare: 'Healthcare', utilities: 'Utilities',
    education: 'Education', rent: 'Rent', salary: 'Salary',
    investment: 'Investment', other: 'Other',
};

const PM_META: Record<string, { label: string; icon: React.ReactNode }> = {
    upi:        { label: 'UPI',         icon: <Smartphone size={12} /> },
    card:       { label: 'Card',        icon: <CreditCard size={12} /> },
    cash:       { label: 'Cash',        icon: <Banknote size={12} /> },
    netbanking: { label: 'Net Banking', icon: <Building2 size={12} /> },
    other:      { label: 'Other',       icon: <ReceiptIcon size={12} /> },
};

const SOURCE_LABELS: Record<string, string> = {
    upi_screenshot: 'UPI Screenshot', bank_statement: 'Bank Statement',
    credit_card_statement: 'Credit Card Statement', receipt: 'Receipt',
    salary_slip: 'Salary Slip', other: 'Document',
};

// ─── Upload Zone ──────────────────────────────────────────────────
function UploadZone({ onUpload, uploading }: { onUpload: (f: File) => void; uploading: boolean }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
    }, [onUpload]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onUpload(file);
        e.target.value = '';
    };

    const ACCEPT_TYPES = [
        { icon: '📱', label: 'UPI Screenshots', sub: 'GPay, PhonePe, Paytm, BHIM' },
        { icon: '🏦', label: 'Bank Statements', sub: 'PDF or screenshot' },
        { icon: '🧾', label: 'Receipts & Invoices', sub: 'Any merchant receipt' },
        { icon: '💳', label: 'Credit Card Bills', sub: 'Statement screenshots' },
    ];

    return (
        <div className="space-y-5">
            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && inputRef.current?.click()}
                className={cn(
                    'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all',
                    dragging ? 'border-amber-400/60 bg-amber-400/5 scale-[1.01]' : 'border-white/15 hover:border-white/30 hover:bg-white/2',
                    uploading && 'pointer-events-none opacity-70'
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFile}
                />

                <AnimatePresence mode="wait">
                    {uploading ? (
                        <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="h-14 w-14 rounded-full border-2 border-amber-400/20 flex items-center justify-center">
                                    <Sparkles size={24} className="text-amber-400 animate-pulse" />
                                </div>
                                <div className="absolute inset-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                            </div>
                            <p className="text-sm font-medium text-white">Uploading & analysing…</p>
                            <p className="text-xs text-white/40">AI is reading your document — this may take 10–30 seconds</p>
                        </motion.div>
                    ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3 text-center">
                            <div className={cn(
                                'flex h-14 w-14 items-center justify-center rounded-2xl transition-all',
                                dragging ? 'bg-amber-400/20' : 'bg-white/6'
                            )}>
                                <Upload size={24} className={dragging ? 'text-amber-400' : 'text-white/40'} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Drop a file or click to browse</p>
                                <p className="text-xs text-white/40 mt-1">Images (PNG, JPG, WebP) or PDF · Max 20 MB</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* What you can upload */}
            <div className="grid grid-cols-2 gap-2">
                {ACCEPT_TYPES.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/6 px-3 py-2.5">
                        <span className="text-xl">{t.icon}</span>
                        <div>
                            <p className="text-xs font-medium text-white/70">{t.label}</p>
                            <p className="text-[10px] text-white/35">{t.sub}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Item row ─────────────────────────────────────────────────────
function ItemRow({ item, importId, onUpdate }: { item: ImportItem; importId: number; onUpdate: () => void }) {
    const [editing, setEditing]   = useState(false);
    const [busy, setBusy]         = useState(false);
    const [editAmount, setEditAmt] = useState(String(item.amount));
    const [editDesc, setEditDesc]  = useState(item.description);
    const [editDate, setEditDate]  = useState(item.transaction_date ?? '');
    const [editCat, setEditCat]    = useState(item.suggested_category ?? '');

    if (item.status !== 'pending') {
        return (
            <div className="flex items-center gap-3 px-4 py-3 opacity-50">
                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                    item.status === 'confirmed' ? 'bg-emerald-500/20' : 'bg-white/8')}>
                    {item.status === 'confirmed'
                        ? <CheckCircle2 size={12} className="text-emerald-400" />
                        : <XCircle size={12} className="text-white/40" />}
                </div>
                <p className="flex-1 text-sm text-white/40 truncate line-through">{item.description}</p>
                <p className="text-sm tabular-nums text-white/30">{formatCurrency(item.amount, 'INR')}</p>
            </div>
        );
    }

    const pm = PM_META[item.payment_method ?? 'other'] ?? PM_META.other;
    const isExpense = item.type === 'expense' || item.type === 'transfer';

    const handleConfirm = async () => {
        setBusy(true);
        try {
            await confirmItem(importId, item.id, editing ? {
                amount: Number(editAmount),
                description: editDesc,
                transaction_date: editDate,
                category_slug: editCat,
            } : {});
            onUpdate();
        } finally {
            setBusy(false);
        }
    };

    const handleDismiss = async () => {
        setBusy(true);
        try {
            await dismissItem(importId, item.id);
            onUpdate();
        } finally {
            setBusy(false);
        }
    };

    return (
        <motion.div layout className="border-b border-white/5 last:border-0">
            <div className="flex items-start gap-3 px-4 py-3.5">
                {/* Type badge */}
                <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    isExpense ? 'bg-red-500/12' : 'bg-emerald-500/12')}>
                    {isExpense
                        ? <TrendingDown size={13} className="text-red-400" />
                        : <TrendingUp size={13} className="text-emerald-400" />}
                </div>

                <div className="flex-1 min-w-0">
                    {editing ? (
                        <div className="space-y-2 py-1">
                            <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-blue-500/50" />
                            <div className="grid grid-cols-3 gap-2">
                                <div className="relative col-span-1">
                                    <IndianRupee size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input type="number" value={editAmount} onChange={e => setEditAmt(e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-5 pr-2 text-xs text-white outline-none focus:border-blue-500/50" />
                                </div>
                                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                                    className="col-span-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500/50" />
                                <select value={editCat} onChange={e => setEditCat(e.target.value)}
                                    className="col-span-1 rounded-lg border border-white/10 bg-navy-800 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500/50">
                                    <option value="">Category</option>
                                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-white truncate">{item.description}</p>
                            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                                {item.transaction_date && (
                                    <span className="text-[10px] text-white/35">{item.transaction_date}</span>
                                )}
                                {item.suggested_category && (
                                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50">
                                        {CATEGORY_LABELS[item.suggested_category] ?? item.suggested_category}
                                    </span>
                                )}
                                {item.payment_method && (
                                    <span className="flex items-center gap-1 text-[10px] text-white/35">
                                        {pm.icon} {pm.label}
                                    </span>
                                )}
                                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]',
                                    item.confidence >= 0.85 ? 'bg-emerald-500/10 text-emerald-400' :
                                    item.confidence >= 0.65 ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-red-500/10 text-red-400')}>
                                    {Math.round(item.confidence * 100)}% sure
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Amount + actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <p className={cn('text-sm font-bold tabular-nums', isExpense ? 'text-red-400' : 'text-emerald-400')}>
                        {isExpense ? '-' : '+'}{formatCurrency(item.amount, 'INR')}
                    </p>
                    {!busy ? (
                        <div className="flex gap-1">
                            <button onClick={() => setEditing(v => !v)} title="Edit"
                                className={cn('rounded-lg p-1.5 text-white/30 hover:text-white transition-colors',
                                    editing ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/8')}>
                                <Edit2 size={12} />
                            </button>
                            <button onClick={handleConfirm} title="Confirm"
                                className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                                <Check size={13} />
                            </button>
                            <button onClick={handleDismiss} title="Dismiss"
                                className="rounded-lg bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-colors">
                                <X size={13} />
                            </button>
                        </div>
                    ) : (
                        <Loader2 size={16} className="animate-spin text-white/40" />
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Import Card ──────────────────────────────────────────────────
function ImportCard({ imp, onRefresh, onDelete }: {
    imp: SmartImport;
    onRefresh: (id: number) => void;
    onDelete: (id: number) => void;
}) {
    const [expanded, setExpanded] = useState(imp.status === 'done');
    const [confirmAll_, setConfirmAll] = useState(false);
    const [busy, setBusy] = useState(false);

    const pendingItems = imp.items.filter(i => i.status === 'pending');
    const isDone    = imp.status === 'done';
    const isFailed  = imp.status === 'failed';
    const isWorking = imp.status === 'pending' || imp.status === 'processing';

    const handleConfirmAll = async () => {
        setBusy(true);
        try {
            await confirmAll(imp.id);
            onRefresh(imp.id);
        } finally {
            setBusy(false);
            setConfirmAll(false);
        }
    };

    return (
        <GlassCard className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4">
                {/* File icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/6">
                    {imp.file_type === 'image'
                        ? <ImageIcon size={18} className="text-blue-400" />
                        : <FileText size={18} className="text-orange-400" />}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{imp.original_name}</p>
                    <div className="flex items-center gap-2.5 mt-0.5">
                        <span className="text-[10px] text-white/35">{imp.file_size_human}</span>
                        {imp.source_type && (
                            <span className="text-[10px] text-white/35">{SOURCE_LABELS[imp.source_type] ?? imp.source_type}</span>
                        )}
                    </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                    {isWorking && (
                        <div className="flex items-center gap-1.5 rounded-full bg-blue-500/12 px-2.5 py-1 text-xs font-medium text-blue-400">
                            <Loader2 size={10} className="animate-spin" /> Analysing
                        </div>
                    )}
                    {isDone && pendingItems.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-medium text-amber-400">
                            <Clock size={10} /> {pendingItems.length} to review
                        </div>
                    )}
                    {isDone && pendingItems.length === 0 && imp.total_items > 0 && (
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 size={10} /> Done
                        </div>
                    )}
                    {isDone && imp.total_items === 0 && (
                        <div className="flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-white/40">
                            <AlertCircle size={10} /> No transactions
                        </div>
                    )}
                    {isFailed && (
                        <div className="flex items-center gap-1.5 rounded-full bg-red-500/12 px-2.5 py-1 text-xs font-medium text-red-400">
                            <XCircle size={10} /> Failed
                        </div>
                    )}

                    {isWorking && (
                        <button onClick={() => onRefresh(imp.id)} className="rounded-lg p-1.5 text-white/30 hover:text-white hover:bg-white/8 transition-all">
                            <RefreshCcw size={13} />
                        </button>
                    )}
                    {(isDone || isFailed) && (
                        <button onClick={() => setExpanded(v => !v)}
                            className="rounded-lg p-1.5 text-white/30 hover:text-white hover:bg-white/8 transition-all">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                    <button onClick={() => onDelete(imp.id)}
                        className="rounded-lg p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* AI notes */}
            {imp.ai_notes && isDone && (
                <div className="mx-5 mb-3 rounded-xl border border-blue-500/15 bg-blue-500/6 px-3 py-2">
                    <p className="text-xs text-blue-300/80"><span className="font-semibold text-blue-400">AI: </span>{imp.ai_notes}</p>
                </div>
            )}

            {/* Failed */}
            {isFailed && imp.error_message && (
                <div className="mx-5 mb-3 rounded-xl border border-red-500/20 bg-red-500/6 px-3 py-2">
                    <p className="text-xs text-red-400">{imp.error_message}</p>
                </div>
            )}

            {/* Items */}
            <AnimatePresence>
                {expanded && isDone && imp.items.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-white/6"
                    >
                        {/* Bulk confirm bar */}
                        {pendingItems.length > 1 && (
                            <div className="flex items-center justify-between px-4 py-2.5 bg-white/2 border-b border-white/5">
                                <p className="text-xs text-white/50">{pendingItems.length} transactions pending review</p>
                                {!confirmAll_ ? (
                                    <button onClick={() => setConfirmAll(true)}
                                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                        <Zap size={11} /> Confirm All
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setConfirmAll(false)} className="text-xs text-white/40 hover:text-white transition-colors">Cancel</button>
                                        <button onClick={handleConfirmAll} disabled={busy}
                                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 transition-all">
                                            {busy ? <Loader2 size={10} className="animate-spin" /> : <Check size={11} />}
                                            Confirm {pendingItems.length}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Item rows */}
                        <div>
                            {imp.items.map(item => (
                                <ItemRow
                                    key={item.id}
                                    item={item}
                                    importId={imp.id}
                                    onUpdate={() => onRefresh(imp.id)}
                                />
                            ))}
                        </div>

                        {/* Summary */}
                        {(imp.confirmed_count > 0 || imp.dismissed_count > 0) && (
                            <div className="flex gap-4 px-4 py-3 border-t border-white/5 text-xs text-white/30">
                                {imp.confirmed_count > 0 && <span className="text-emerald-400">{imp.confirmed_count} confirmed</span>}
                                {imp.dismissed_count > 0 && <span>{imp.dismissed_count} dismissed</span>}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}

// ─── Main page ────────────────────────────────────────────────────
export default function AIImport(_: PageProps) {
    const [imports, setImports] = useState<SmartImport[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadImports = async () => {
        try {
            const data = await fetchImports();
            setImports(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImports();
    }, []);

    // Poll processing imports every 3s
    useEffect(() => {
        const processing = imports.filter(i => i.status === 'pending' || i.status === 'processing');
        if (processing.length > 0) {
            pollRef.current = setInterval(async () => {
                for (const imp of processing) {
                    const updated = await fetchImport(imp.id);
                    setImports(prev => prev.map(i => i.id === updated.id ? updated : i));
                }
            }, 3000);
        } else {
            if (pollRef.current) clearInterval(pollRef.current);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [imports.map(i => i.status).join(',')]);

    const handleUpload = async (file: File) => {
        setError(null);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const r = await fetch('/api/v1/smart-imports', {
                method: 'POST', credentials: 'include',
                headers: { 'X-CSRF-TOKEN': csrf() },
                body: formData,
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.message ?? 'Upload failed');
            // Response already contains the completed import with items — prepend directly.
            setImports(prev => [j.data, ...prev]);
            if (j.data?.status === 'failed') {
                setError(j.data.error_message ?? 'AI processing failed. Check your API key in Settings → AI.');
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleRefresh = async (id: number) => {
        const updated = await fetchImport(id);
        setImports(prev => prev.map(i => i.id === id ? updated : i));
    };

    const handleDelete = async (id: number) => {
        await deleteImport(id);
        setImports(prev => prev.filter(i => i.id !== id));
    };

    const stats = {
        total:     imports.length,
        pending:   imports.filter(i => i.status === 'pending' || i.status === 'processing').length,
        confirmed: imports.reduce((s, i) => s + i.confirmed_count, 0),
        toReview:  imports.reduce((s, i) => s + i.items.filter(x => x.status === 'pending').length, 0),
    };

    return (
        <AppLayout>
            <Head title="Smart Import — AI" />
            <div className="p-6 space-y-6 max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15">
                                <Sparkles size={16} className="text-amber-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Smart Import</h1>
                        </div>
                        <p className="text-sm text-white/50">
                            Upload a screenshot, PDF, or bank statement — AI reads it and extracts every transaction automatically.
                        </p>
                    </div>
                    <button onClick={() => router.visit('/ai')}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:text-white hover:border-white/25 transition-all shrink-0">
                        Ask AI <ArrowRight size={13} />
                    </button>
                </div>

                {/* Stats strip */}
                {imports.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Uploads', value: stats.total, color: '#94A3B8' },
                            { label: 'Processing', value: stats.pending, color: '#3B82F6' },
                            { label: 'To Review', value: stats.toReview, color: '#F5C842' },
                            { label: 'Confirmed', value: stats.confirmed, color: '#10B981' },
                        ].map(s => (
                            <div key={s.label} className="rounded-xl bg-white/4 border border-white/6 p-3 text-center">
                                <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                                <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload zone */}
                <GlassCard className="p-5">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Upload size={14} className="text-white/40" /> Upload New
                    </h2>
                    <UploadZone onUpload={handleUpload} uploading={uploading} />

                    {error && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5">
                            <AlertCircle size={14} className="text-red-400 shrink-0" />
                            <p className="text-sm text-red-400">{error}</p>
                        </motion.div>
                    )}
                </GlassCard>

                {/* How it works — shown when no imports */}
                {imports.length === 0 && !loading && (
                    <GlassCard className="p-5">
                        <h2 className="text-sm font-semibold text-white/60 mb-4">How it works</h2>
                        <div className="space-y-3">
                            {[
                                { step: '1', icon: Upload, color: '#3B82F6', label: 'Upload', desc: 'Drop a screenshot or PDF of your bank/UPI transactions' },
                                { step: '2', icon: Sparkles, color: '#F5C842', label: 'AI Analyses', desc: 'Claude AI reads the file and extracts every transaction' },
                                { step: '3', icon: CheckCircle2, color: '#10B981', label: 'Review & Confirm', desc: 'Check extracted items, edit if needed, then confirm — auto-added to the right section' },
                            ].map(s => (
                                <div key={s.step} className="flex items-start gap-4 rounded-xl bg-white/3 px-4 py-3.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${s.color}15` }}>
                                        <s.icon size={16} style={{ color: s.color }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{s.step}. {s.label}</p>
                                        <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}

                {/* Import history */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white/4 animate-pulse" />)}
                    </div>
                ) : imports.length > 0 ? (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-white/50">Recent Imports</h2>
                        <AnimatePresence>
                            {imports.map(imp => (
                                <motion.div key={imp.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                                    <ImportCard
                                        imp={imp}
                                        onRefresh={handleRefresh}
                                        onDelete={handleDelete}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : null}
            </div>
        </AppLayout>
    );
}
