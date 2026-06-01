import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(
    amount: number,
    currency = 'INR',
    locale = 'en-IN',
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency = 'INR'): string {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
    if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(1)}L`;
    if (amount >= 1_000)      return `₹${(amount / 1_000).toFixed(1)}K`;
    return formatCurrency(amount, currency);
}

export function formatPercent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
}

export function trendColor(value: number, invert = false): string {
    const positive = invert ? value < 0 : value > 0;
    if (value === 0) return 'text-slate-400';
    return positive ? 'text-emerald-400' : 'text-red-400';
}

export function trendLabel(value: number): string {
    if (value === 0) return '—';
    return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
}

export function healthScoreColor(score: number): string {
    if (score >= 85) return '#F5C842'; // Gold — Excellent
    if (score >= 70) return '#10B981'; // Green — Good
    if (score >= 55) return '#3B82F6'; // Blue — Fair
    if (score >= 40) return '#F59E0B'; // Amber — Needs Work
    return '#EF4444';                  // Red — Critical
}

export function budgetStatusColor(percent: number): string {
    if (percent >= 100) return '#EF4444';
    if (percent >= 80)  return '#F59E0B';
    return '#10B981';
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function daysUntil(dateStr: string): number {
    const date = new Date(dateStr);
    const now  = new Date();
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
