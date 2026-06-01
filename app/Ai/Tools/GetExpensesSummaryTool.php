<?php

namespace App\Ai\Tools;

use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetExpensesSummaryTool implements Tool
{
    public function __construct(private readonly User $user) {}

    public function description(): Stringable|string
    {
        return 'Get a summary of the user\'s expenses for a given month. Returns total spending, category breakdown, top merchants, and comparison with previous month.';
    }

    public function handle(Request $request): Stringable|string
    {
        $month = $request->get('month', now()->format('Y-m'));
        [$year, $monthNum] = explode('-', $month);

        $expenses = $this->user->expenses()
            ->with('category')
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $monthNum)
            ->get();

        $prevMonth = now()->setYear($year)->setMonth($monthNum)->subMonth();
        $prevExpenses = $this->user->expenses()
            ->whereYear('expense_date', $prevMonth->year)
            ->whereMonth('expense_date', $prevMonth->month)
            ->sum('base_amount');

        $total = $expenses->sum('base_amount');
        $byCategory = $expenses->groupBy('category.name')
            ->map(fn($group) => [
                'amount' => round($group->sum('base_amount'), 2),
                'count'  => $group->count(),
            ])
            ->sortByDesc('amount')
            ->take(10);

        $data = [
            'month'            => $month,
            'total_spent'      => round($total, 2),
            'prev_month_total' => round($prevExpenses, 2),
            'change_percent'   => $prevExpenses > 0
                ? round((($total - $prevExpenses) / $prevExpenses) * 100, 1)
                : 0,
            'transaction_count'=> $expenses->count(),
            'currency'         => $this->user->currency,
            'by_category'      => $byCategory->toArray(),
            'largest_expense'  => $expenses->sortByDesc('base_amount')->first()?->only([
                'description', 'base_amount', 'expense_date', 'merchant',
            ]),
        ];

        return json_encode($data, JSON_PRETTY_PRINT);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'month' => $schema->string()
                ->description('Month in YYYY-MM format. Defaults to current month.')
                ->nullable(),
        ];
    }
}
