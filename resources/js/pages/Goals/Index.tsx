import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays, parseISO } from "date-fns";
import {
    Plus,
    Target,
    X,
    Loader2,
    Check,
    Trash2,
    Edit2,
    Eye,
    Calendar,
    IndianRupee,
    TrendingUp,
    Trophy,
    Pause,
    Play,
    Flag,
    PiggyBank,
    Home,
    Car,
    Plane,
    GraduationCap,
    HeartHandshake,
    Briefcase,
    ShieldCheck,
    RotateCcw,
    ChevronDown,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { cn, formatCurrency } from "@/lib/utils";
import type { Goal } from "@/types";

// ─── API ────────────────────────────────────────────────────────
const csrf = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
        ?.content ?? "";
const headers = (extra = {}) => ({
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-CSRF-TOKEN": csrf(),
    ...extra,
});

async function fetchGoals(): Promise<Goal[]> {
    const res = await fetch("/api/v1/goals", {
        credentials: "include",
        headers: { Accept: "application/json" },
    });
    return (await res.json()).data ?? [];
}
async function contributeGoal(
    id: number,
    b: Record<string, unknown>,
): Promise<Goal> {
    const res = await fetch(`/api/v1/goals/${id}/contribute`, {
        method: "POST",
        credentials: "include",
        headers: headers(),
        body: JSON.stringify(b),
    });
    const j = await res.json();
    if (!j.success) throw new Error(j.message);
    return j.data;
}
async function updateGoal(
    id: number,
    b: Record<string, unknown>,
): Promise<Goal> {
    const res = await fetch(`/api/v1/goals/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: headers(),
        body: JSON.stringify(b),
    });
    const j = await res.json();
    if (!j.success) throw new Error(j.message);
    return j.data;
}
async function deleteGoal(id: number): Promise<void> {
    await fetch(`/api/v1/goals/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": csrf() },
    });
}
async function fetchTrashedGoals(): Promise<Goal[]> {
    const res = await fetch("/api/v1/goals/trashed", {
        credentials: "include",
        headers: { Accept: "application/json" },
    });
    return (await res.json()).data ?? [];
}
async function restoreGoal(id: number): Promise<void> {
    await fetch(`/api/v1/goals/${id}/restore`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": csrf() },
    });
}

// ─── Goal type config ───────────────────────────────────────────
const GOAL_TYPES = [
    {
        id: "emergency_fund",
        label: "Emergency Fund",
        icon: ShieldCheck,
        color: "#10B981",
    },
    { id: "home", label: "Home", icon: Home, color: "#3B82F6" },
    { id: "car", label: "Car", icon: Car, color: "#8B5CF6" },
    { id: "vacation", label: "Vacation", icon: Plane, color: "#F5C842" },
    {
        id: "education",
        label: "Education",
        icon: GraduationCap,
        color: "#06B6D4",
    },
    { id: "wedding", label: "Wedding", icon: HeartHandshake, color: "#F43F5E" },
    {
        id: "retirement",
        label: "Retirement",
        icon: PiggyBank,
        color: "#F59E0B",
    },
    { id: "business", label: "Business", icon: Briefcase, color: "#6366F1" },
    { id: "other", label: "Other", icon: Flag, color: "#94A3B8" },
] as const;

function goalTypeConfig(type: string) {
    return (
        GOAL_TYPES.find((t) => t.id === type) ??
        GOAL_TYPES[GOAL_TYPES.length - 1]
    );
}

// ─── SIP Calculator ─────────────────────────────────────────────
function sipMonths(remaining: number, monthly: number): number | null {
    if (monthly <= 0 || remaining <= 0) return null;
    return Math.ceil(remaining / monthly);
}

// ─── Goal Card ──────────────────────────────────────────────────
function GoalCard({
    goal,
    onContribute,
    onEdit,
    onDelete,
    onTogglePause,
}: {
    goal: Goal;
    onContribute: (g: Goal) => void;
    onEdit: (g: Goal) => void;
    onDelete: (g: Goal) => void;
    onTogglePause: (g: Goal) => void;
}) {
    const cfg = goalTypeConfig(goal.type);
    const Icon = cfg.icon;
    const color = goal.color ?? cfg.color;
    const pct = goal.progress_percent ?? 0;
    const daysLeft = goal.target_date
        ? differenceInDays(
              parseISO(goal.target_date as unknown as string),
              new Date(),
          )
        : null;
    const months = sipMonths(
        goal.remaining_amount ?? 0,
        goal.monthly_target ?? 0,
    );
    const isPaused = goal.status === "paused";
    const isDone = goal.status === "completed";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
        >
            <GlassCard
                className={cn(
                    "p-5 group relative overflow-hidden",
                    isDone && "opacity-80",
                )}
            >
                {/* Top accent */}
                <div
                    className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
                    style={{ background: color, opacity: isDone ? 0.4 : 0.8 }}
                />

                <div className="flex items-start justify-between gap-3">
                    {/* Icon */}
                    <div
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: `${color}18` }}
                    >
                        <Icon className="h-5 w-5" style={{ color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold text-white">
                                {goal.name}
                            </h3>
                            {isDone && (
                                <Trophy className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                            )}
                            {isPaused && (
                                <Pause className="h-3 w-3 flex-shrink-0 text-white/30" />
                            )}
                        </div>
                        <p className="text-xs text-white/40 capitalize">
                            {cfg.label}
                        </p>
                    </div>

                    {/* Menu */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => router.visit(`/goals/${goal.id}`)}
                            title="View Details"
                            className="rounded-md p-1.5 text-white/30 hover:bg-cyan-500/10 hover:text-cyan-400"
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </button>
                        {!isDone && (
                            <button
                                onClick={() => onTogglePause(goal)}
                                title={isPaused ? "Resume" : "Pause"}
                                className="rounded-md p-1.5 text-white/30 hover:bg-white/8 hover:text-white"
                            >
                                {isPaused ? (
                                    <Play className="h-3.5 w-3.5" />
                                ) : (
                                    <Pause className="h-3.5 w-3.5" />
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => onEdit(goal)}
                            className="rounded-md p-1.5 text-white/30 hover:bg-white/8 hover:text-white"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(goal)}
                            className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs">
                        <span className="tabular-nums font-semibold text-white">
                            {formatCurrency(Number(goal.current_amount), "INR")}
                        </span>
                        <span className="text-white/40">
                            {formatCurrency(Number(goal.target_amount), "INR")}
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                        <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            style={{
                                background: isDone
                                    ? "#10B981"
                                    : `linear-gradient(90deg, ${color}cc, ${color})`,
                            }}
                        />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-white/30">
                        <span style={{ color }}>{Math.round(pct)}% saved</span>
                        {goal.remaining_amount! > 0 && (
                            <span>
                                {formatCurrency(goal.remaining_amount!, "INR")}{" "}
                                to go
                            </span>
                        )}
                    </div>
                </div>

                {/* Metadata row */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/6 pt-3">
                    {daysLeft !== null && (
                        <div className="flex items-center gap-1 text-[10px]">
                            <Calendar className="h-3 w-3 text-white/25" />
                            <span
                                className={cn(
                                    daysLeft < 30
                                        ? "text-amber-400"
                                        : "text-white/40",
                                )}
                            >
                                {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                            </span>
                        </div>
                    )}
                    {months !== null && (
                        <div className="flex items-center gap-1 text-[10px]">
                            <TrendingUp className="h-3 w-3 text-white/25" />
                            <span className="text-white/40">
                                ~{months} months at ₹
                                {((goal.monthly_target ?? 0) / 1000).toFixed(0)}
                                k/mo
                            </span>
                        </div>
                    )}
                </div>

                {/* Contribute button */}
                {!isDone && (
                    <button
                        onClick={() => onContribute(goal)}
                        className="mt-3.5 w-full rounded-xl border py-2 text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                        style={{
                            borderColor: `${color}40`,
                            background: `${color}12`,
                            color,
                        }}
                    >
                        + Add Contribution
                    </button>
                )}
                {isDone && (
                    <div className="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400">
                        <Trophy className="h-3.5 w-3.5" /> Goal Completed!
                    </div>
                )}
            </GlassCard>
        </motion.div>
    );
}

// ─── Contribute Modal ───────────────────────────────────────────
function ContributeModal({
    goal,
    onClose,
}: {
    goal: Goal;
    onClose: () => void;
}) {
    const qc = useQueryClient();
    const cfg = goalTypeConfig(goal.type);
    const color = goal.color ?? cfg.color;
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [err, setErr] = useState("");

    const mut = useMutation({
        mutationFn: (b: Record<string, unknown>) => contributeGoal(goal.id, b),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["goals"] });
            onClose();
        },
        onError: (e: Error) => setErr(e.message),
    });

    return (
        <>
            <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="w-full max-w-sm"
                    initial={{ scale: 0.96, y: 12 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GlassCard className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    Add Contribution
                                </p>
                                <p className="text-xs text-white/40">
                                    {goal.name}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Goal progress mini */}
                        <div
                            className="mb-4 rounded-xl p-3"
                            style={{
                                background: `${color}10`,
                                border: `1px solid ${color}25`,
                            }}
                        >
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-white/50">Progress</span>
                                <span style={{ color }}>
                                    {Math.round(goal.progress_percent ?? 0)}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/8">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${goal.progress_percent ?? 0}%`,
                                        background: color,
                                    }}
                                />
                            </div>
                            <p className="mt-1.5 text-[10px] text-white/35">
                                {formatCurrency(
                                    goal.remaining_amount ?? 0,
                                    "INR",
                                )}{" "}
                                remaining
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-white/50">
                                    Amount (₹) *
                                </label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="number"
                                        min="1"
                                        value={amount}
                                        onChange={(e) =>
                                            setAmount(e.target.value)
                                        }
                                        placeholder="0"
                                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/60"
                                    />
                                </div>
                                {/* Quick presets */}
                                <div className="mt-2 flex gap-2">
                                    {[500, 1000, 5000, goal.monthly_target]
                                        .filter(Boolean)
                                        .map((v) => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() =>
                                                    setAmount(String(v))
                                                }
                                                className="rounded-lg border border-white/10 bg-white/4 px-2.5 py-1 text-xs text-white/50 hover:border-white/20 hover:text-white transition-colors"
                                            >
                                                ₹
                                                {Number(v) >= 1000
                                                    ? `${(Number(v) / 1000).toFixed(v === 1000 ? 0 : 1)}k`
                                                    : v}
                                            </button>
                                        ))}
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-white/50">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    max={format(new Date(), "yyyy-MM-dd")}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-[#0F1F3D] py-2 px-3 text-sm text-white outline-none focus:border-blue-500/60 [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-white/50">
                                    Note{" "}
                                    <span className="text-white/25">
                                        (optional)
                                    </span>
                                </label>
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="e.g. Monthly SIP transfer"
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/60"
                                />
                            </div>
                            {err && (
                                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                                    {err}
                                </p>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={onClose}
                                    className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (!amount || +amount <= 0) {
                                            setErr("Enter a valid amount");
                                            return;
                                        }
                                        mut.mutate({
                                            amount: +amount,
                                            note,
                                            contributed_at: date,
                                        });
                                    }}
                                    disabled={mut.isPending}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
                                    style={{ background: color }}
                                >
                                    {mut.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />{" "}
                                            Contribute
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </motion.div>
        </>
    );
}

// ─── Trash Section ──────────────────────────────────────────────
function GoalsTrashSection() {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();
    const { data: trashed = [], isLoading } = useQuery({
        queryKey: ["goals-trashed"],
        queryFn: fetchTrashedGoals,
        enabled: open,
    });
    const restoreMut = useMutation({
        mutationFn: restoreGoal,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["goals-trashed"] });
            qc.invalidateQueries({ queryKey: ["goals"] });
        },
    });
    return (
        <GlassCard className="overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
                <div className="flex items-center gap-2.5">
                    <Trash2 size={15} className="text-white/30" />
                    <span className="text-sm font-medium text-white/50">
                        Trash
                    </span>
                    {trashed.length > 0 && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                            {trashed.length}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={15}
                    className={cn(
                        "text-white/30 transition-transform",
                        open && "rotate-180",
                    )}
                />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/6"
                    >
                        {isLoading ? (
                            <div className="px-5 py-6 text-center text-sm text-white/30">
                                Loading…
                            </div>
                        ) : trashed.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-white/25">
                                <RotateCcw size={22} className="mb-2" />
                                <p className="text-sm">Trash is empty</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/4">
                                {trashed.map((g) => (
                                    <div
                                        key={g.id}
                                        className="flex items-center gap-3 px-5 py-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/60 truncate">
                                                {g.name}
                                            </p>
                                            <p className="text-xs text-white/30 capitalize">
                                                {g.type?.replace("_", " ")}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                restoreMut.mutate(g.id)
                                            }
                                            disabled={restoreMut.isPending}
                                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 transition-all disabled:opacity-50"
                                        >
                                            <RotateCcw size={12} /> Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}

// ─── Page ───────────────────────────────────────────────────────
export default function GoalsIndex() {
    const qc = useQueryClient();
    const [contributeFor, setContributeFor] = useState<Goal | null>(null);
    const [toDelete, setToDelete] = useState<Goal | null>(null);

    const { data: goals = [], isLoading } = useQuery({
        queryKey: ["goals"],
        queryFn: fetchGoals,
    });

    const delMut = useMutation({
        mutationFn: () => deleteGoal(toDelete!.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["goals"] });
            qc.invalidateQueries({ queryKey: ["goals-trashed"] });
            setToDelete(null);
        },
    });
    const pauseMut = useMutation({
        mutationFn: (g: Goal) =>
            updateGoal(g.id, {
                status: g.status === "paused" ? "active" : "paused",
            }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    });

    const active = goals.filter((g) => g.status === "active");
    const paused = goals.filter((g) => g.status === "paused");
    const completed = goals.filter((g) => g.status === "completed");
    const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
    const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);

    return (
        <AppLayout title="Goals">
            <Head title="Goals" />
            <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            Financial Goals
                        </h2>
                        <p className="mt-0.5 text-sm text-white/40">
                            {active.length} active · {completed.length}{" "}
                            completed
                        </p>
                    </div>
                    <button
                        onClick={() => router.visit("/goals/new")}
                        className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> New Goal
                    </button>
                </div>

                {/* Summary */}
                {goals.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            {
                                label: "Total Target",
                                val: formatCurrency(totalTarget, "INR"),
                                icon: Target,
                                color: "text-blue-400",
                                bg: "bg-blue-400/10",
                            },
                            {
                                label: "Total Saved",
                                val: formatCurrency(totalSaved, "INR"),
                                icon: PiggyBank,
                                color: "text-emerald-400",
                                bg: "bg-emerald-400/10",
                            },
                            {
                                label: "Active Goals",
                                val: `${active.length}`,
                                icon: Flag,
                                color: "text-amber-400",
                                bg: "bg-amber-400/10",
                            },
                            {
                                label: "Completed",
                                val: `${completed.length}`,
                                icon: Trophy,
                                color: "text-gold-400",
                                bg: "bg-amber-400/10",
                            },
                        ].map((s) => (
                            <GlassCard
                                key={s.label}
                                className="flex items-center gap-3 p-4"
                            >
                                <div
                                    className={cn(
                                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                                        s.bg,
                                    )}
                                >
                                    <s.icon
                                        className={cn("h-4 w-4", s.color)}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-white/40">
                                        {s.label}
                                    </p>
                                    <p className="text-sm font-bold tabular-nums text-white">
                                        {s.val}
                                    </p>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}

                {/* Active goals */}
                {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <GlassCard key={i} className="p-5 space-y-3">
                                <div className="flex gap-3">
                                    <div className="h-11 w-11 animate-pulse rounded-2xl bg-white/8" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 animate-pulse rounded bg-white/8" />
                                        <div className="h-3 w-1/2 animate-pulse rounded bg-white/8" />
                                    </div>
                                </div>
                                <div className="h-2 w-full animate-pulse rounded-full bg-white/8" />
                            </GlassCard>
                        ))}
                    </div>
                ) : goals.length === 0 ? (
                    <GlassCard className="py-20 text-center">
                        <Target className="mx-auto mb-3 h-12 w-12 text-white/15" />
                        <p className="text-base font-medium text-white/40">
                            No goals yet
                        </p>
                        <p className="mt-1 text-sm text-white/25">
                            Set a savings goal and track your progress
                        </p>
                        <button
                            onClick={() => router.visit("/goals/new")}
                            className="mt-4 rounded-xl bg-blue-500/15 border border-blue-500/30 px-5 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/25 transition-colors"
                        >
                            Create your first goal
                        </button>
                    </GlassCard>
                ) : (
                    <>
                        {active.length > 0 && (
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                                    Active ({active.length})
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <AnimatePresence>
                                        {active.map((g) => (
                                            <GoalCard
                                                key={g.id}
                                                goal={g}
                                                onContribute={setContributeFor}
                                                onEdit={(g) =>
                                                    router.visit(
                                                        `/goals/${g.id}/edit`,
                                                    )
                                                }
                                                onDelete={setToDelete}
                                                onTogglePause={(g) =>
                                                    pauseMut.mutate(g)
                                                }
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {paused.length > 0 && (
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                                    Paused ({paused.length})
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {paused.map((g) => (
                                        <GoalCard
                                            key={g.id}
                                            goal={g}
                                            onContribute={setContributeFor}
                                            onEdit={(g) =>
                                                router.visit(
                                                    `/goals/${g.id}/edit`,
                                                )
                                            }
                                            onDelete={setToDelete}
                                            onTogglePause={(g) =>
                                                pauseMut.mutate(g)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {completed.length > 0 && (
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                                    Completed ({completed.length})
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {completed.map((g) => (
                                        <GoalCard
                                            key={g.id}
                                            goal={g}
                                            onContribute={setContributeFor}
                                            onEdit={(g) =>
                                                router.visit(
                                                    `/goals/${g.id}/edit`,
                                                )
                                            }
                                            onDelete={setToDelete}
                                            onTogglePause={(g) =>
                                                pauseMut.mutate(g)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
                <GoalsTrashSection />
            </div>

            <AnimatePresence>
                {contributeFor && (
                    <ContributeModal
                        goal={contributeFor}
                        onClose={() => setContributeFor(null)}
                    />
                )}
            </AnimatePresence>

            <DeleteConfirmModal
                open={toDelete !== null}
                itemName={toDelete?.name}
                isPending={delMut.isPending}
                onConfirm={() => delMut.mutate()}
                onCancel={() => setToDelete(null)}
            />
        </AppLayout>
    );
}
