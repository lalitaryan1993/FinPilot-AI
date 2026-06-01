import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrencyCompact } from '@/lib/utils';

interface DataPoint {
    month: string;
    income: number;
    expenses: number;
    savings: number;
}

interface Props {
    data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card p-3 text-xs space-y-1">
            <div className="font-semibold text-white/80 mb-2">{label}</div>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-white/60 capitalize">{entry.name}:</span>
                    <span className="font-mono font-semibold text-white">
                        {formatCurrencyCompact(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

export function CashFlowChart({ data }: Props) {
    return (
        <GlassCard className="h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-white">Cash Flow</div>
                    <div className="text-xs text-white/40">6-month overview</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" /> Income
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-red-400" /> Expenses
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-400" /> Savings
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.20} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradSavings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatCurrencyCompact(v)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="income"   name="Income"   stroke="#10B981" strokeWidth={2} fill="url(#gradIncome)"   dot={false} activeDot={{ r: 4, fill: '#10B981' }} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={2} fill="url(#gradExpenses)" dot={false} activeDot={{ r: 4, fill: '#EF4444' }} />
                    <Area type="monotone" dataKey="savings"  name="Savings"  stroke="#3B82F6" strokeWidth={2} fill="url(#gradSavings)"  dot={false} activeDot={{ r: 4, fill: '#3B82F6' }} />
                </AreaChart>
            </ResponsiveContainer>
        </GlassCard>
    );
}
