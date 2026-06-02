import { motion } from 'framer-motion';
import { Link } from '@inertiajs/react';
import { Target, ChevronRight, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { formatPercent } from '@/lib/utils';
import type { Goal } from '@/types';

const goalColors: Record<string, string> = {
    emergency_fund: '#10B981',
    home:           '#3B82F6',
    car:            '#F59E0B',
    education:      '#8B5CF6',
    vacation:       '#EC4899',
    retirement:     '#F5C842',
    custom:         '#06B6D4',
};

interface Props { goals: Goal[] }

export function GoalsProgressCard({ goals }: Props) {
    if (goals.length === 0) {
        return (
            <GlassCard className="flex flex-col items-center justify-center text-center py-8">
                <Target className="h-10 w-10 text-white/20 mb-3" />
                <div className="text-sm text-white/40">No active goals yet</div>
                <Link href="/goals" className="mt-3 text-xs text-blue-400 hover:text-blue-300">
                    Create your first goal →
                </Link>
            </GlassCard>
        );
    }

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-white">Goals</div>
                    <div className="text-xs text-white/40">{goals.length} active</div>
                </div>
                <Link href="/goals" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <div className="space-y-4">
                {goals.map((goal, i) => {
                    const color  = goal.color ?? goalColors[goal.type] ?? '#3B82F6';
                    const pct    = goal.progress_percent ?? 0;

                    return (
                        <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <Link
                                href={`/goals/${goal.id}`}
                                className="group block rounded-xl p-2 -mx-2 hover:bg-white/4 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}22` }}>
                                            <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                                        </div>
                                        <span className="truncate text-sm font-medium text-white/80 group-hover:text-white transition-colors">{goal.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                        <span className="font-mono text-xs font-semibold" style={{ color }}>{formatPercent(pct, 0)}</span>
                                        <ArrowRight className="h-3 w-3 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                                <div className="relative h-1.5 overflow-hidden rounded-full bg-white/8">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 rounded-full"
                                        style={{ background: color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                    />
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[10px] text-white/30">
                                    <CurrencyDisplay amount={goal.current_amount} size="xs" className="text-white/40" />
                                    <CurrencyDisplay amount={goal.target_amount}  size="xs" className="text-white/30" />
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </GlassCard>
    );
}
