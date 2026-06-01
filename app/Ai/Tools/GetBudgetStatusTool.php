<?php

namespace App\Ai\Tools;

use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetBudgetStatusTool implements Tool
{
    public function __construct(private readonly User $user) {}

    public function description(): Stringable|string
    {
        return 'Get the current month budget status. Returns each active budget with amount, spent, remaining, and percent used. Flags over-budget and near-limit categories.';
    }

    public function handle(Request $request): Stringable|string
    {
        $budgets = $this->user->budgets()
            ->active()
            ->currentMonth()
            ->with('category')
            ->get();

        $formatted = $budgets->map(fn($budget) => [
            'name'          => $budget->name,
            'category'      => $budget->category?->name ?? 'Overall',
            'amount'        => $budget->amount,
            'spent'         => $budget->spent_amount,
            'remaining'     => $budget->remainingAmount(),
            'percent_used'  => round($budget->spentPercent(), 1),
            'is_breached'   => $budget->isBreached(),
            'is_near_limit' => $budget->isNearLimit(),
        ]);

        return json_encode([
            'currency'           => $this->user->currency,
            'total_budgets'      => $budgets->count(),
            'over_budget_count'  => $formatted->where('is_breached', true)->count(),
            'near_limit_count'   => $formatted->where('is_near_limit', true)->count(),
            'budgets'            => $formatted->values()->toArray(),
        ], JSON_PRETTY_PRINT);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
