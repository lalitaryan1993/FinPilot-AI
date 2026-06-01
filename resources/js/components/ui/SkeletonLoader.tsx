import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    lines?: number;
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('skeleton', className)} />;
}

export function CardSkeleton() {
    return (
        <div className="glass-card p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-3 w-24" />
        </div>
    );
}

export function TableRowSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg p-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                </div>
            ))}
        </div>
    );
}
