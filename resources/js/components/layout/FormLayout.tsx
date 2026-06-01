import { useState, type ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { AppLayout } from './AppLayout';

interface Props {
    title: string;
    subtitle?: string;
    backHref: string;
    onSave: () => void;
    saving?: boolean;
    saveLabel?: string;
    children: ReactNode;
}

export function FormLayout({ title, subtitle, backHref, onSave, saving, saveLabel = 'Save', children }: Props) {
    return (
        <AppLayout>
            <div className="flex flex-col h-full">
                {/* sticky top bar */}
                <div className="sticky top-0 z-20 flex items-center gap-2 sm:gap-4 border-b border-white/8 bg-[var(--fp-bg,#0A1628)]/90 backdrop-blur-md px-4 sm:px-6 py-4">
                    <button
                        onClick={() => router.visit(backHref)}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/25 transition-all"
                    >
                        <ArrowLeft size={15} />
                        Back
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold text-white leading-tight">{title}</h1>
                        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.visit(backHref)}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2 text-sm font-medium text-white transition-colors"
                        >
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {saving ? 'Saving…' : saveLabel}
                        </button>
                    </div>
                </div>

                {/* scrollable form body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                        {children}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ─── Danger zone / delete with confirmation ──────────────────────────────────
interface DeleteSectionProps {
    label: string;
    onDelete: () => void;
    deleting?: boolean;
    note?: string;
}

export function DeleteSection({ label, onDelete, deleting, note }: DeleteSectionProps) {
    const [confirming, setConfirming] = useState(false);

    return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-red-400" />
                <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
            </div>
            <p className="text-xs text-white/40 mb-4">
                {note ?? `This moves the ${label} to trash. You can restore it from the trash later.`}
            </p>
            {confirming ? (
                <div className="flex gap-3">
                    <button
                        onClick={() => setConfirming(false)}
                        className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-white/60 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onDelete(); setConfirming(false); }}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 py-2 text-sm font-medium text-white transition-colors"
                    >
                        {deleting && <Loader2 size={14} className="animate-spin" />}
                        Yes, Delete {label}
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setConfirming(true)}
                    className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 size={14} />
                    Delete {label}
                </button>
            )}
        </div>
    );
}

// ─── Reusable primitives ─────────────────────────────────────────────────────
export function FormSection({ title, children }: { title?: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl bg-white/4 border border-white/8 p-5 space-y-4">
            {title && <h2 className="text-sm font-semibold text-white/80">{title}</h2>}
            {children}
        </div>
    );
}

export function FormRow({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

interface FieldProps {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: ReactNode;
}
export function Field({ label, required, error, hint, children }: FieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
            {hint && !error && <p className="text-xs text-white/30">{hint}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

// ─── Input class constants ────────────────────────────────────────────────────
export const inputCls = [
    'w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white',
    'bg-[#0A1628] placeholder-white/25',
    'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30',
    'transition-colors',
].join(' ');

// Force dark color-scheme so native <select> dropdown opens with dark background
export const selectCls = [
    inputCls,
    'appearance-none [color-scheme:dark]',
].join(' ');
