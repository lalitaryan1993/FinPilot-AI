import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { healthScoreColor } from '@/lib/utils';
import type { FinancialHealthScore } from '@/types';

interface Props {
    score: FinancialHealthScore | null;
}

const dimensions = [
    { key: 'savings',   label: 'Save' },
    { key: 'debt',      label: 'Debt' },
    { key: 'emergency', label: 'ER'   },
    { key: 'goals',     label: 'Goals' },
    { key: 'budget',    label: 'Budget'},
] as const;

export function HealthScoreCard({ score }: Props) {
    const total = score?.total_score ?? 0;
    const color = healthScoreColor(total);
    const circumference = 2 * Math.PI * 40;
    const dashOffset = circumference - (total / 100) * circumference;

    return (
        <GlassCard
            glow={total >= 70 ? 'gold' : total >= 50 ? 'blue' : 'red'}
            className="flex flex-col items-center text-center"
        >
            <div className="text-xs font-medium uppercase tracking-widest text-white/40 mb-4">
                Financial Health
            </div>

            {/* Score ring */}
            <div className="relative">
                <svg width="110" height="110" className="health-ring-glow -rotate-90">
                    {/* Track */}
                    <circle
                        cx="55" cy="55" r="40"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="7"
                    />
                    {/* Progress */}
                    <motion.circle
                        cx="55" cy="55" r="40"
                        fill="none"
                        stroke={color}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        className="font-mono text-3xl font-bold"
                        style={{ color }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        {total}
                    </motion.span>
                    <span className="text-xs text-white/40">/100</span>
                </div>
            </div>

            <div className="mt-2 text-sm font-semibold" style={{ color }}>
                {score?.grade ?? '—'}
            </div>

            {/* Dimension mini-bars */}
            {score && (
                <div className="mt-4 grid grid-cols-5 gap-1.5 w-full">
                    {dimensions.map((dim) => {
                        const val = score.scores[dim.key];
                        const c   = healthScoreColor(val);
                        return (
                            <div key={dim.key} className="flex flex-col items-center gap-1">
                                <div className="text-[9px] text-white/30">{dim.label}</div>
                                <div className="relative h-1 w-full rounded-full bg-white/8">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 rounded-full"
                                        style={{ background: c }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${val}%` }}
                                        transition={{ duration: 0.8, delay: 0.5 }}
                                    />
                                </div>
                                <div className="text-[9px] font-mono text-white/50">{val}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </GlassCard>
    );
}
