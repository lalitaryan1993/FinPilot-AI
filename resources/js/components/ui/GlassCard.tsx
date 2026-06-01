import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type GlowColor = 'gold' | 'blue' | 'green' | 'red' | 'none';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    glow?: GlowColor;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const glowMap: Record<GlowColor, string> = {
    gold: 'glass-card-gold',
    blue: 'glass-card-blue',
    green: 'glass-card-green',
    red:  'glass-card-red',
    none: '',
};

const paddingMap = {
    none: '',
    sm:   'p-4',
    md:   'p-5',
    lg:   'p-6',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, glow = 'none', padding = 'md', children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('glass-card', glowMap[glow], paddingMap[padding], className)}
            {...props}
        >
            {children}
        </div>
    ),
);
GlassCard.displayName = 'GlassCard';
