import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { cn } from '@/lib/utils';

interface Props {
    label: string;
    amount: number;
    currency?: string;
    trend?: number;
    icon: LucideIcon;
    variant: 'income' | 'expense' | 'savings' | 'net';
    index?: number;
}

const variantClasses = {
    income:  'metric-income',
    expense: 'metric-expense',
    savings: 'metric-savings',
    net:     'metric-net',
};

const variantIconColors = {
    income:  'text-emerald-400',
    expense: 'text-red-400',
    savings: 'text-blue-400',
    net:     'text-yellow-400',
};

export function MetricCard({ label, amount, currency = 'INR', trend, icon: Icon, variant, index = 0 }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
            <GlassCard padding="md" className={cn('border', variantClasses[variant])}>
                <div className="flex items-start justify-between mb-3">
                    <div className="text-xs font-medium text-white/50 uppercase tracking-wide">{label}</div>
                    <div className={cn('rounded-lg p-1.5 bg-white/5', variantIconColors[variant])}>
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                </div>
                <CurrencyDisplay
                    amount={amount}
                    currency={currency}
                    size="2xl"
                    trend={trend}
                    compact
                    className="text-white"
                />
            </GlassCard>
        </motion.div>
    );
}
