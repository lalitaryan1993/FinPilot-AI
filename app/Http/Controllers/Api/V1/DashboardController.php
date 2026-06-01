<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $month = now()->format('Y-m');
        [$year, $mon] = explode('-', $month);

        $monthExpenses = $user->expenses()
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $mon)
            ->sum('base_amount');

        $monthIncome = $user->incomeSources()
            ->active()
            ->where('frequency', 'monthly')
            ->sum('amount');

        $prevMonthExpenses = $user->expenses()
            ->whereYear('expense_date', now()->subMonth()->year)
            ->whereMonth('expense_date', now()->subMonth()->month)
            ->sum('base_amount');

        $cashFlowData = collect(range(5, 0))->map(function ($i) use ($user) {
            $date = now()->subMonths($i);
            $income   = $user->incomeSources()->active()->where('frequency', 'monthly')->sum('amount');
            $expenses = $user->expenses()
                ->whereYear('expense_date', $date->year)
                ->whereMonth('expense_date', $date->month)
                ->sum('base_amount');

            return [
                'month'    => $date->format('M Y'),
                'income'   => round($income, 2),
                'expenses' => round($expenses, 2),
                'savings'  => round($income - $expenses, 2),
            ];
        });

        $categoryBreakdown = $user->expenses()
            ->with('category:id,name,icon,color')
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $mon)
            ->get()
            ->groupBy('category_id')
            ->map(fn($g) => [
                'category' => $g->first()->category,
                'amount'   => round($g->sum('base_amount'), 2),
                'count'    => $g->count(),
            ])
            ->sortByDesc('amount')
            ->values()
            ->take(8);

        $goals = $user->goals()->active()->orderBy('priority')->take(5)->get()
            ->map(fn($g) => [
                ...$g->only(['id', 'name', 'type', 'target_amount', 'current_amount', 'icon', 'color']),
                'progress_percent' => round($g->progressPercent(), 1),
            ]);

        $upcomingEmis = $user->debts()->active()
            ->whereNotNull('emi_due_day')
            ->get()
            ->filter(fn($d) => $d->emiDueSoon(7))
            ->map(fn($d) => [
                'id'           => $d->id,
                'name'         => $d->name,
                'lender'       => $d->lender,
                'emi_amount'   => $d->emi_amount,
                'emi_due_day'  => $d->emi_due_day,
            ]);

        $healthScore = $user->latestHealthScore;

        $aiInsights = $healthScore?->insights ?? [
            ['title' => 'Welcome to FinPilot AI!', 'body' => 'Start by adding your income sources and expenses to get personalized insights.', 'type' => 'welcome'],
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'overview' => [
                    'monthly_income'     => round($monthIncome, 2),
                    'monthly_expenses'   => round($monthExpenses, 2),
                    'monthly_savings'    => round($monthIncome - $monthExpenses, 2),
                    'savings_rate'       => $monthIncome > 0
                        ? round((($monthIncome - $monthExpenses) / $monthIncome) * 100, 1)
                        : 0,
                    'expense_change_pct' => $prevMonthExpenses > 0
                        ? round((($monthExpenses - $prevMonthExpenses) / $prevMonthExpenses) * 100, 1)
                        : 0,
                    'currency'           => $user->currency,
                ],
                'health_score'       => $healthScore ? [
                    'total_score' => $healthScore->total_score,
                    'grade'       => $healthScore->grade(),
                    'color'       => $healthScore->gradeColor(),
                    'scores'   => [
                        'savings'   => $healthScore->savings_score,
                        'debt'      => $healthScore->debt_score,
                        'emergency' => $healthScore->emergency_score,
                        'goals'     => $healthScore->goal_score,
                        'budget'    => $healthScore->budget_score,
                    ],
                ] : null,
                'cash_flow'          => $cashFlowData,
                'category_breakdown' => $categoryBreakdown,
                'goals'              => $goals,
                'upcoming_emis'      => $upcomingEmis,
                'ai_insights'        => array_slice($aiInsights, 0, 5),
                'month'              => $month,
            ],
        ]);
    }
}
