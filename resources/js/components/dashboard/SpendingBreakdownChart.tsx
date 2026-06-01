import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrencyCompact, formatPercent } from '@/lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface Item {
    category: { name: string; icon?: string; color?: string };
    amount: number;
    count: number;
}

interface Props { data: Item[] }

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card p-2.5 text-xs">
            <div className="font-semibold text-white">{payload[0].name}</div>
            <div className="text-white/60 mt-0.5">{formatCurrencyCompact(payload[0].value)}</div>
        </div>
    );
};

export function SpendingBreakdownChart({ data }: Props) {
    const total = data.reduce((s, d) => s + d.amount, 0);

    return (
        <GlassCard>
            <div className="text-sm font-semibold text-white mb-1">Spending Breakdown</div>
            <div className="text-xs text-white/40 mb-4">This month by category</div>

            <div className="flex gap-4">
                <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                        <Pie
                            data={data.map((d, i) => ({ name: d.category.name, value: d.amount, color: COLORS[i % COLORS.length] }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 space-y-2 overflow-hidden">
                    {data.slice(0, 6).map((item, i) => {
                        const pct = total > 0 ? (item.amount / total) * 100 : 0;
                        const color = COLORS[i % COLORS.length];
                        return (
                            <div key={i} className="group">
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: color }} />
                                        <span className="truncate text-xs text-white/70">{item.category.name}</span>
                                    </div>
                                    <span className="ml-2 flex-shrink-0 font-mono text-xs text-white/60">
                                        {formatPercent(pct, 0)}
                                    </span>
                                </div>
                                <div className="relative h-1 rounded-full bg-white/8">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full transition-all"
                                        style={{ width: `${pct}%`, background: color }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </GlassCard>
    );
}
