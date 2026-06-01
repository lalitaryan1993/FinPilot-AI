import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileText, Trash2, CheckCircle, Clock, XCircle,
    Loader2, FolderOpen, RotateCcw, ChevronDown,
    CreditCard, Briefcase, Receipt, FileBarChart, FileCheck,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { cn } from '@/lib/utils';
import type { Document, PageProps } from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    bank_statement:          { label: 'Bank Statement',       icon: <CreditCard size={16} />,   color: '#3B82F6' },
    credit_card_statement:   { label: 'Credit Card',          icon: <CreditCard size={16} />,   color: '#EF4444' },
    salary_slip:             { label: 'Salary Slip',          icon: <Briefcase size={16} />,    color: '#10B981' },
    receipt:                 { label: 'Receipt',              icon: <Receipt size={16} />,      color: '#F59E0B' },
    invoice:                 { label: 'Invoice',              icon: <FileText size={16} />,     color: '#8B5CF6' },
    investment_statement:    { label: 'Investment Statement', icon: <FileBarChart size={16} />, color: '#06B6D4' },
    tax_document:            { label: 'Tax Document',         icon: <FileCheck size={16} />,    color: '#F97316' },
    other:                   { label: 'Other',                icon: <FileText size={16} />,     color: '#6B7280' },
};

const STATUS_META = {
    pending:    { label: 'Pending',    icon: <Clock size={12} />,      color: 'text-white/40',    bg: 'bg-white/8' },
    processing: { label: 'Processing', icon: <Loader2 size={12} className="animate-spin" />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    completed:  { label: 'Processed',  icon: <CheckCircle size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    failed:     { label: 'Failed',     icon: <XCircle size={12} />,    color: 'text-red-400',     bg: 'bg-red-400/10' },
};

interface DocExt extends Document {
    file_size_human: string;
    is_processed: boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

async function fetchDocs(): Promise<DocExt[]> {
    const r = await fetch('/api/v1/documents', { credentials: 'include' });
    return (await r.json()).data;
}
async function fetchTrashedDocs(): Promise<DocExt[]> {
    const r = await fetch('/api/v1/documents/trashed', { credentials: 'include' });
    return (await r.json()).data ?? [];
}
async function restoreDoc(id: number): Promise<void> {
    await fetch(`/api/v1/documents/${id}/restore`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
}

// ─── Document card ────────────────────────────────────────────────────────────
function DocCard({ doc, onDelete }: { doc: DocExt; onDelete: (d: DocExt) => void }) {
    const meta = TYPE_META[doc.type] ?? TYPE_META.other;
    const ocrStatus = STATUS_META[doc.ocr_status as keyof typeof STATUS_META] ?? STATUS_META.pending;
    return (
        <div className="group rounded-2xl bg-white/4 border border-white/8 p-4 transition-all hover:border-white/15">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}20`, color: meta.color }}>
                        {meta.icon}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white truncate max-w-40">{doc.name}</p>
                        <p className="text-xs text-white/40">{meta.label}</p>
                    </div>
                </div>
                <button onClick={() => onDelete(doc)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 size={14} />
                </button>
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ocrStatus.bg} ${ocrStatus.color}`}>
                {ocrStatus.icon}
                OCR: {ocrStatus.label}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-white/40">
                <span>{doc.file_size_human}</span>
                {doc.transactions_imported > 0 && <span className="text-emerald-400">↑ {doc.transactions_imported} txns imported</span>}
                {doc.period_from && doc.period_to && <span>{doc.period_from} → {doc.period_to}</span>}
            </div>
            <p className="text-xs text-white/25 mt-2">{new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
    );
}

// ─── Trash Section ────────────────────────────────────────────────────────────
function DocsTrashSection() {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();
    const { data: trashed = [], isLoading } = useQuery({ queryKey: ['docs-trashed'], queryFn: fetchTrashedDocs, enabled: open });
    const restoreMut = useMutation({
        mutationFn: restoreDoc,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs-trashed'] }); qc.invalidateQueries({ queryKey: ['documents'] }); },
    });
    return (
        <div className="rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
            <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
                <div className="flex items-center gap-2.5">
                    <Trash2 size={15} className="text-white/30" />
                    <span className="text-sm font-medium text-white/50">Trash</span>
                    {trashed.length > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">{trashed.length}</span>}
                </div>
                <ChevronDown size={15} className={cn('text-white/30 transition-transform', open && 'rotate-180')} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-white/6">
                        {isLoading ? <div className="px-5 py-6 text-center text-sm text-white/30">Loading…</div>
                        : trashed.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-white/25"><RotateCcw size={22} className="mb-2" /><p className="text-sm">Trash is empty</p></div>
                        ) : (
                            <div className="divide-y divide-white/4">
                                {trashed.map((d) => (
                                    <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/60 truncate">{d.name}</p>
                                            <p className="text-xs text-white/30">{TYPE_META[d.type]?.label ?? d.type} · {d.file_size_human}</p>
                                        </div>
                                        <button onClick={() => restoreMut.mutate(d.id)} disabled={restoreMut.isPending}
                                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 transition-all disabled:opacity-50">
                                            <RotateCcw size={12} /> Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DocumentsIndex(_: PageProps) {
    const qc = useQueryClient();
    const [filterType, setFilterType] = useState('');
    const [toDelete, setToDelete] = useState<DocExt | null>(null);

    const { data: docs = [], isLoading } = useQuery({ queryKey: ['documents', filterType], queryFn: fetchDocs });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/v1/documents/${toDelete!.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['documents'] });
            qc.invalidateQueries({ queryKey: ['docs-trashed'] });
            setToDelete(null);
        },
    });

    const filtered = filterType ? docs.filter(d => d.type === filterType) : docs;
    const processed = filtered.filter(d => d.is_processed);
    const pending = filtered.filter(d => !d.is_processed);
    const totalImported = docs.reduce((s, d) => s + d.transactions_imported, 0);

    return (
        <AppLayout>
            <Head title="Documents" />

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Documents</h1>
                        <p className="text-sm text-white/50 mt-0.5">Upload bank statements, receipts — AI extracts transactions automatically</p>
                    </div>
                    <button onClick={() => router.visit('/documents/upload')}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors">
                        <Upload size={16} /> Upload Document
                    </button>
                </div>

                {/* Summary strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Total Documents</p>
                        <p className="text-xl font-bold text-white">{docs.length}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Processed</p>
                        <p className="text-xl font-bold text-emerald-400">{docs.filter(d => d.is_processed).length}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Pending OCR</p>
                        <p className="text-xl font-bold text-yellow-400">{docs.filter(d => d.ocr_status === 'pending').length}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <p className="text-xs text-white/50 mb-1">Transactions Imported</p>
                        <p className="text-xl font-bold text-blue-400">{totalImported}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar: type filter */}
                    <div className="lg:col-span-1">
                        <div className="mt-4 rounded-2xl bg-white/4 border border-white/8 p-4">
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Filter by Type</h3>
                            <div className="space-y-1">
                                <button onClick={() => setFilterType('')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!filterType ? 'bg-white/8 text-white' : 'text-white/50 hover:text-white'}`}>
                                    All Documents ({docs.length})
                                </button>
                                {Object.entries(TYPE_META).map(([k, v]) => {
                                    const count = docs.filter(d => d.type === k).length;
                                    if (!count) return null;
                                    return (
                                        <button key={k} onClick={() => setFilterType(f => f === k ? '' : k)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${filterType === k ? 'bg-white/8 text-white' : 'text-white/50 hover:text-white'}`}>
                                            <span className="flex items-center gap-2" style={{ color: v.color }}>{v.icon} {v.label}</span>
                                            <span className="text-white/30 text-xs">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Documents grid */}
                    <div className="lg:col-span-2 space-y-5">
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/4 animate-pulse" />)}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-16 text-white/30">
                                <FolderOpen size={36} className="mb-3" />
                                <p className="text-sm">No documents yet</p>
                                <p className="text-xs mt-1">Upload a bank statement to get started</p>
                            </div>
                        ) : (
                            <>
                                {pending.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Pending / Processing ({pending.length})</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {pending.map(d => <DocCard key={d.id} doc={d} onDelete={setToDelete} />)}
                                        </div>
                                    </div>
                                )}
                                {processed.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Processed ({processed.length})</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {processed.map(d => <DocCard key={d.id} doc={d} onDelete={setToDelete} />)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <DocsTrashSection />
            </div>

            <DeleteConfirmModal
                open={toDelete !== null}
                itemName={toDelete?.name}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate()}
                onCancel={() => setToDelete(null)}
            />
        </AppLayout>
    );
}
