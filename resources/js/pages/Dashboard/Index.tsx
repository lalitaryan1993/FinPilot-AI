import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, PiggyBank, Activity } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { SpendingBreakdownChart } from '@/components/dashboard/SpendingBreakdownChart';
import { GoalsProgressCard } from '@/components/dashboard/GoalsProgressCard';
import { AIInsightsCarousel } from '@/components/dashboard/AIInsightsCarousel';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import type { DashboardData } from '@/types';

async function fetchDashboard(): Promise<DashboardData> {
    const res = await fetch('/api/v1/dashboard', {
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    const json = await res.json();
    return json.data;
}

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export default function Dashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn:  fetchDashboard,
        refetchInterval: 60_000,
    });

    return (
        <AppLayout title="Dashboard">
            <Head title="Dashboard" />

            <motion.div
                className="p-6 space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Row 1 — Metric Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                    ) : data ? (
                        <>
                            <MetricCard
                                label="Monthly Income"
                                amount={data.overview.monthly_income}
                                currency={data.overview.currency}
                                icon={TrendingUp}
                                variant="income"
                                index={0}
                            />
                            <MetricCard
                                label="Monthly Expenses"
                                amount={data.overview.monthly_expenses}
                                currency={data.overview.currency}
                                trend={data.overview.expense_change_pct}
                                icon={TrendingDown}
                                variant="expense"
                                index={1}
                            />
                            <MetricCard
                                label="Net Savings"
                                amount={data.overview.monthly_savings}
                                currency={data.overview.currency}
                                icon={PiggyBank}
                                variant="savings"
                                index={2}
                            />
                            <MetricCard
                                label="Savings Rate"
                                amount={data.overview.savings_rate}
                                currency={data.overview.currency}
                                icon={Activity}
                                variant="net"
                                index={3}
                            />
                        </>
                    ) : null}
                </motion.div>

                {/* Row 2 — Health Score + Cash Flow */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1">
                        {isLoading ? <CardSkeleton /> : (
                            <HealthScoreCard score={data?.health_score ?? null} />
                        )}
                    </div>
                    <div className="lg:col-span-3">
                        {isLoading ? <CardSkeleton /> : (
                            <CashFlowChart data={data?.cash_flow ?? []} />
                        )}
                    </div>
                </motion.div>

                {/* Row 3 — Spending + Goals */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2">
                        {isLoading ? <CardSkeleton /> : (
                            <SpendingBreakdownChart data={data?.category_breakdown ?? []} />
                        )}
                    </div>
                    <div className="lg:col-span-3">
                        {isLoading ? <CardSkeleton /> : (
                            <GoalsProgressCard goals={data?.goals ?? []} />
                        )}
                    </div>
                </motion.div>

                {/* Row 4 — AI Insights + Upcoming EMIs */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <AIInsightsCarousel insights={data?.ai_insights ?? []} />

                    {/* Upcoming EMIs */}
                    {data?.upcoming_emis && data.upcoming_emis.length > 0 && (
                        <div className="glass-card p-5">
                            <div className="text-sm font-semibold text-white mb-1">Upcoming EMIs</div>
                            <div className="text-xs text-white/40 mb-4">Due within 7 days</div>
                            <div className="space-y-3">
                                {data.upcoming_emis.map((emi) => (
                                    <div key={emi.id} className="flex items-center justify-between rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2.5">
                                        <div>
                                            <div className="text-sm font-medium text-white">{emi.name}</div>
                                            <div className="text-xs text-white/40">{emi.lender} · Due day {emi.emi_due_day}</div>
                                        </div>
                                        <div className="text-sm font-mono font-semibold text-red-400">
                                            ₹{emi.emi_amount.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AppLayout>
    );
}
