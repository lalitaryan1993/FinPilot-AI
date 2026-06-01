<?php

namespace App\Ai\Tools;

use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetFinancialHealthTool implements Tool
{
    public function __construct(private readonly User $user) {}

    public function description(): Stringable|string
    {
        return 'Get the user\'s latest financial health score (0-100) and breakdown across savings, debt, emergency fund, goals, and budget discipline dimensions.';
    }

    public function handle(Request $request): Stringable|string
    {
        $score = $this->user->latestHealthScore;

        if (!$score) {
            return json_encode(['error' => 'No financial health score available yet.']);
        }

        return json_encode([
            'total_score'       => $score->total_score,
            'grade'             => $score->grade(),
            'score_month'       => $score->score_month->format('Y-m'),
            'breakdown'         => [
                'savings_rate_score'     => $score->savings_score,
                'debt_ratio_score'       => $score->debt_score,
                'emergency_fund_score'   => $score->emergency_score,
                'goal_progress_score'    => $score->goal_score,
                'budget_discipline_score'=> $score->budget_score,
            ],
            'key_metrics'       => [
                'savings_rate_pct'    => $score->savings_rate,
                'debt_to_income_pct'  => $score->debt_ratio,
                'emergency_fund_months'=> $score->emergency_months,
            ],
            'ai_insights'       => array_slice($score->insights ?? [], 0, 5),
        ], JSON_PRETTY_PRINT);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
