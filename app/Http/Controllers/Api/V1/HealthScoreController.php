<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\CalculateHealthScoreJob;
use App\Models\FinancialHealthScore;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthScoreController extends Controller
{
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();

        $score = FinancialHealthScore::where('user_id', $user->id)
            ->orderByDesc('score_month')
            ->first();

        $today      = now()->startOfMonth();
        $alreadyRun = $score && Carbon::parse($score->score_month)->eq($today);

        if (!$alreadyRun) {
            CalculateHealthScoreJob::dispatch($user, $today);
        }

        if (!$score) {
            return response()->json([
                'success' => true,
                'data'    => null,
                'message' => 'Score is being calculated — check back in a few seconds.',
            ]);
        }

        return response()->json(['success' => true, 'data' => $this->format($score)]);
    }

    public function history(Request $request): JsonResponse
    {
        $scores = FinancialHealthScore::where('user_id', $request->user()->id)
            ->orderByDesc('score_month')
            ->limit(12)
            ->get()
            ->map(fn($s) => $this->format($s));

        return response()->json(['success' => true, 'data' => $scores]);
    }

    private function format(FinancialHealthScore $s): array
    {
        return [
            'month'            => $s->score_month->format('Y-m'),
            'total_score'      => $s->total_score,
            'grade'            => $s->grade(),
            'grade_color'      => $s->gradeColor(),
            'savings_score'    => $s->savings_score,
            'debt_score'       => $s->debt_score,
            'emergency_score'  => $s->emergency_score,
            'goal_score'       => $s->goal_score,
            'budget_score'     => $s->budget_score,
            'savings_rate'     => $s->savings_rate,
            'debt_ratio'       => $s->debt_ratio,
            'emergency_months' => $s->emergency_months,
            'insights'         => $s->insights ?? [],
            'calculated_at'    => $s->calculated_at,
        ];
    }
}
