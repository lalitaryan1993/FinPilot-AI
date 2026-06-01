import { cn, trendColor, trendLabel } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CurrencyDisplayProps {
    amount: number;
    currency?: string;
    compact?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    trend?: number;
    className?: string;
    showSign?: boolean;
}

const sizeMap = {
    xs:  'text-xs',
    sm:  'text-sm',
    md:  'text-base',
    lg:  'text-lg',
    xl:  'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
};

export function CurrencyDisplay({
    amount,
    currency: _currency,
    compact = false,
    size = 'md',
    trend,
    className,
    showSign = false,
}: CurrencyDisplayProps) {
    const { fmt, fmtCompact } = useCurrency();
    const formatted = compact
        ? fmtCompact(Math.abs(amount))
        : fmt(Math.abs(amount));

    const display = showSign && amount < 0 ? `−${formatted}` : formatted;

    return (
        <span className={cn('font-mono tabular-nums font-semibold', sizeMap[size], className)}>
            {display}
            {trend !== undefined && (
                <span className={cn('ml-1.5 text-xs font-medium', trendColor(trend, false))}>
                    {trend > 0 ? <TrendingUp className="inline h-3 w-3" /> :
                     trend < 0 ? <TrendingDown className="inline h-3 w-3" /> :
                     <Minus className="inline h-3 w-3" />}
                    {' '}{trendLabel(trend)}
                </span>
            )}
        </span>
    );
}
