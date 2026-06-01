import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react';

interface Props {
    open: boolean;
    title?: string;
    description?: string;
    itemName?: string;
    isPending?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmModal({
    open,
    title = 'Move to Trash?',
    description = 'This will be moved to Trash. You can restore it anytime.',
    itemName,
    isPending = false,
    onConfirm,
    onCancel,
}: Props) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                    />

                    {/* Dialog */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                        initial={{ opacity: 0, scale: 0.93, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93, y: 16 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    >
                        <div
                            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B1629]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/12 text-red-400">
                                        <Trash2 size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">{title}</h3>
                                        {itemName && (
                                            <p className="mt-0.5 text-xs text-white/40 truncate max-w-[200px]">
                                                {itemName}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="rounded-lg p-1 text-white/30 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-5 pb-5">
                                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/8 p-3.5">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                                    <p className="text-xs leading-relaxed text-amber-200/70">{description}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onCancel}
                                        disabled={isPending}
                                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:border-white/20 hover:text-white transition-all disabled:opacity-40"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        disabled={isPending}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 hover:bg-red-500 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isPending ? (
                                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                        Move to Trash
                                    </button>
                                </div>

                                <p className="mt-3 flex items-center gap-1.5 text-center text-xs text-white/25">
                                    <RotateCcw size={11} />
                                    Restore from the Trash section below at any time
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
