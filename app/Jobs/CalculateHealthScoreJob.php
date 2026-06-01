<?php

namespace App\Jobs;

use App\Models\Budget;
use App\Models\Debt;
use App\Models\Expense;
use App\Models\FinancialHealthScore;
use App\Models\Goal;
use App\Models\IncomeSource;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CalculateHealthScoreJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public ?Carbon $month = null,
    ) {
        $this->month = $month ?? now()->startOfMonth();
    }

    public function handle(): void
    {
        $month    = $this->month;
        $user     = $this->user;
        $monthStr = $month->format('Y-m');

        // ── Raw data ──────────────────────────────────────────────
        $monthlyIncome = (float) IncomeSource::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('frequency', 'monthly')
            ->sum('amount');

        $monthlyExpenses = (float) Expense::where('user_id', $user->id)
            ->whereYear('expense_date', $month->year)
            ->whereMonth('expense_date', $month->month)
            ->sum('amount');

        $totalDebt = (float) Debt::where('user_id', $user->id)
            ->where('status', 'active')
            ->sum('outstanding_balance');

        $monthlyEmi = (float) Debt::where('user_id', $user->id)
            ->where('status', 'active')
            ->sum('emi_amount');

        $budgets = Budget::where('user_id', $user->id)
            ->where('period', 'monthly')
            ->where('is_active', true)
            ->get();

        $goals = Goal::where('user_id', $user->id)
            ->where('status', 'active')
            ->get();

        $emergencyFund = $goals->where('type', 'emergency_fund')->first();

        // ── 1. Savings Score (30 pts) ─────────────────────────────
        $monthlySavings = $monthlyIncome - $monthlyExpenses;
        $savingsRate    = $monthlyIncome > 0 ? $monthlySavings / $monthlyIncome : 0;

        $savingsScore = match(true) {
            $savingsRate >= 0.30 => 30,
            $savingsRate >= 0.20 => 24,
            $savingsRate >= 0.10 => 16,
            $savingsRate >= 0.05 => 10,
            $savingsRate > 0     => 5,
            default              => 0,
        };

        // ── 2. Debt Score (25 pts) ────────────────────────────────
        $debtToIncome = $monthlyIncome > 0 ? $monthlyEmi / $monthlyIncome : 0;

        $debtScore = match(true) {
            $totalDebt === 0.0   => 25,
            $debtToIncome <= 0.15 => 22,
            $debtToIncome <= 0.25 => 18,
            $debtToIncome <= 0.35 => 12,
            $debtToIncome <= 0.50 => 6,
            default               => 0,
        };

        // ── 3. Emergency Fund Score (20 pts) ──────────────────────
        $emergencyMonths = 0;
        if ($emergencyFund && $monthlyExpenses > 0) {
            $emergencyMonths = (float) $emergencyFund->current_amount / $monthlyExpenses;
        }

        $emergencyScore = match(true) {
            $emergencyMonths >= 6  => 20,
            $emergencyMonths >= 4  => 16,
            $emergencyMonths >= 3  => 12,
            $emergencyMonths >= 1  => 7,
            $emergencyMonths > 0   => 3,
            default                => 0,
        };

        // ── 4. Goal Progress Score (15 pts) ───────────────────────
        $goalScore = 0;
        if ($goals->count() > 0) {
            $avgProgress = $goals->avg(fn($g) => $g->progressPercent());
            $goalScore = (int) round(($avgProgress / 100) * 15);
        }

        // ── 5. Budget Adherence Score (10 pts) ────────────────────
        $budgetScore = 0;
        if ($budgets->count() > 0) {
            $notBreached = $budgets->filter(fn($b) => !$b->is_breached)->count();
            $budgetScore = (int) round(($notBreached / $budgets->count()) * 10);
        } else {
            $budgetScore = 5; // neutral if no budgets set
        }

        $totalScore = $savingsScore + $debtScore + $emergencyScore + $goalScore + $budgetScore;

        // ── Build insights ────────────────────────────────────────
        $insights = $this->buildInsights(
            $savingsRate, $debtToIncome, $emergencyMonths,
            $totalScore, $goals->count(), $budgets->count()
        );

        // ── Upsert record ─────────────────────────────────────────
        FinancialHealthScore::updateOrCreate(
            ['user_id' => $user->id, 'score_month' => $month->toDateString()],
            [
                'total_score'      => $totalScore,
                'savings_score'    => $savingsScore,
                'debt_score'       => $debtScore,
                'emergency_score'  => $emergencyScore,
                'goal_score'       => $goalScore,
                'budget_score'     => $budgetScore,
                'savings_rate'     => round($savingsRate, 4),
                'debt_ratio'       => round($debtToIncome, 4),
                'emergency_months' => round($emergencyMonths, 2),
                'insights'         => $insights,
                'calculated_at'    => now(),
            ]
        );
    }

    private function buildInsights(
        float $savingsRate, float $debtRatio, float $emergencyMonths,
        int $totalScore, int $goalCount, int $budgetCount
    ): array {
        $insights = [];

        if ($savingsRate < 0.10) {
            $insights[] = ['type' => 'warning', 'message' => 'Your savings rate is below 10%. Try to save at least ₹1 of every ₹10 earned.'];
        } elseif ($savingsRate >= 0.20) {
            $insights[] = ['type' => 'success', 'message' => "Great savings rate of " . round($savingsRate * 100) . "%! You're building wealth faster than most."];
        }

        if ($debtRatio > 0.35) {
            $insights[] = ['type' => 'danger', 'message' => 'Your EMI burden is above 35% of income — this limits your financial flexibility.'];
        } elseif ($debtRatio === 0.0) {
            $insights[] = ['type' => 'success', 'message' => 'You are debt-free! Channel that EMI money into investments.'];
        }

        if ($emergencyMonths < 3) {
            $insights[] = ['type' => 'warning', 'message' => 'Build an emergency fund of at least 3 months of expenses before investing.'];
        } elseif ($emergencyMonths >= 6) {
            $insights[] = ['type' => 'success', 'message' => 'Your emergency fund covers 6+ months. Excellent financial cushion!'];
        }

        if ($goalCount === 0) {
            $insights[] = ['type' => 'info', 'message' => 'Set financial goals to give your savings a purpose and track progress.'];
        }

        if ($budgetCount === 0) {
            $insights[] = ['type' => 'info', 'message' => 'Create monthly budgets to get 10 bonus points and better spending control.'];
        }

        if ($totalScore >= 85) {
            $insights[] = ['type' => 'success', 'message' => 'Outstanding financial health! You are in the top tier.'];
        } elseif ($totalScore < 40) {
            $insights[] = ['type' => 'danger', 'message' => 'Your financial health needs immediate attention. Focus on reducing debt and building savings.'];
        }

        return $insights;
    }
}
