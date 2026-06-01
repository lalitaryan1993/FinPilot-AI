<?php

namespace App\Ai\Tools;

use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetGoalProgressTool implements Tool
{
    public function __construct(private readonly User $user) {}

    public function description(): Stringable|string
    {
        return 'Get progress on all active financial goals. Returns each goal with current amount, target, percentage, monthly contribution target, and estimated months to completion.';
    }

    public function handle(Request $request): Stringable|string
    {
        $goals = $this->user->goals()->active()->get();

        $formatted = $goals->map(function ($goal) {
            $monthsRemaining = null;
            if ($goal->monthly_target > 0) {
                $monthsRemaining = (int) ceil($goal->remainingAmount() / $goal->monthly_target);
            }

            return [
                'name'             => $goal->name,
                'type'             => $goal->type,
                'target_amount'    => $goal->target_amount,
                'current_amount'   => $goal->current_amount,
                'remaining_amount' => $goal->remainingAmount(),
                'progress_percent' => round($goal->progressPercent(), 1),
                'monthly_target'   => $goal->monthly_target,
                'target_date'      => $goal->target_date?->format('Y-m-d'),
                'months_to_goal'   => $monthsRemaining,
                'priority'         => $goal->priority,
            ];
        });

        return json_encode([
            'currency'    => $this->user->currency,
            'total_goals' => $goals->count(),
            'goals'       => $formatted->sortBy('priority')->values()->toArray(),
        ], JSON_PRETTY_PRINT);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
