<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class RecurringExpenseController extends Controller
{
    public function detect(Request $request): JsonResponse
    {
        $user  = $request->user();
        $since = now()->subMonths(6)->startOfMonth();

        $expenses = Expense::with('category')
            ->where('user_id', $user->id)
            ->where('expense_date', '>=', $since)
            ->orderBy('expense_date')
            ->get();

        if ($expenses->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Group by normalised description
        $groups = [];
        foreach ($expenses as $expense) {
            $key = $this->normalise($expense->description);
            $groups[$key][] = $expense;
        }

        // Fuzzy-merge very similar keys (levenshtein ≤ 3 on up to 40-char strings)
        $groups = $this->mergeCloseGroups($groups);

        $detected = [];
        foreach ($groups as $key => $items) {
            $items = collect($items);

            $distinctMonths = $items
                ->map(fn($e) => Carbon::parse($e->expense_date)->format('Y-m'))
                ->unique()
                ->count();

            if ($distinctMonths < 3) continue;

            $frequency = $this->detectFrequency($items);
            if (!$frequency) continue;

            $amounts = $items->pluck('amount')->map(fn($a) => (float) $a);
            $avg     = round($amounts->avg(), 2);
            $variancePct = $avg > 0
                ? round($amounts->map(fn($a) => abs($a - $avg) / $avg * 100)->avg(), 1)
                : 0;

            $confidence = $this->confidence($distinctMonths, $variancePct, $frequency);

            $lastItem   = $items->sortByDesc('expense_date')->first();
            $nextDue    = $this->estimateNextDue($items, $frequency);

            $detected[] = [
                'name'              => $this->cleanLabel($lastItem->description),
                'category'          => $lastItem->category ? [
                    'id'    => $lastItem->category->id,
                    'name'  => $lastItem->category->name,
                    'icon'  => $lastItem->category->icon,
                    'color' => $lastItem->category->color,
                ] : null,
                'frequency'         => $frequency,
                'occurrences'       => $items->count(),
                'distinct_months'   => $distinctMonths,
                'avg_amount'        => $avg,
                'amount_variance_pct'=> $variancePct,
                'annual_cost'       => $this->annualCost($avg, $frequency),
                'last_seen'         => $lastItem->expense_date,
                'next_due_estimate' => $nextDue,
                'confidence'        => $confidence,
                'is_fixed'          => $variancePct < 5,
                'sample_expenses'   => $items->sortByDesc('expense_date')->take(3)->values()->map(fn($e) => [
                    'id' => $e->id, 'amount' => (float) $e->amount, 'date' => $e->expense_date,
                ]),
            ];
        }

        // Sort: confidence desc, then annual_cost desc
        usort($detected, fn($a, $b) => $b['confidence'] <=> $a['confidence'] ?: $b['annual_cost'] <=> $a['annual_cost']);

        return response()->json(['success' => true, 'data' => $detected, 'meta' => [
            'total'          => count($detected),
            'total_annual'   => array_sum(array_column($detected, 'annual_cost')),
            'total_monthly'  => round(array_sum(array_column($detected, 'annual_cost')) / 12, 2),
            'analysed_months'=> 6,
        ]]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function normalise(string $desc): string
    {
        $s = mb_strtolower(trim($desc));
        // Remove trailing numbers (order IDs, invoice numbers)
        $s = preg_replace('/\s+#?\d{4,}$/', '', $s);
        // Remove common noise words
        $s = preg_replace('/\b(payment|order|ref|txn|invoice|bill|recharge)\b/', '', $s);
        $s = preg_replace('/[^a-z0-9\s\-]/', ' ', $s);
        $s = preg_replace('/\s+/', ' ', $s);
        return trim($s);
    }

    private function cleanLabel(string $desc): string
    {
        // Strip trailing order/reference IDs
        return preg_replace('/\s+#?\d{6,}$/', '', trim($desc));
    }

    private function mergeCloseGroups(array $groups): array
    {
        $keys   = array_keys($groups);
        $merged = [];
        $used   = [];

        foreach ($keys as $i => $ki) {
            if (isset($used[$ki])) continue;
            $merged[$ki] = $groups[$ki];
            $lenI = strlen($ki);

            foreach ($keys as $j => $kj) {
                if ($i >= $j || isset($used[$kj])) continue;
                $lenJ = strlen($kj);
                // Only attempt fuzzy merge if lengths are similar
                if (abs($lenI - $lenJ) > 8) continue;
                if (levenshtein(substr($ki, 0, 40), substr($kj, 0, 40)) <= 3) {
                    $merged[$ki] = array_merge($merged[$ki], $groups[$kj]);
                    $used[$kj]   = true;
                }
            }
        }

        return $merged;
    }

    private function detectFrequency(Collection $items): ?string
    {
        if ($items->count() < 2) return null;

        $timestamps = $items
            ->pluck('expense_date')
            ->map(fn($d) => Carbon::parse($d)->startOfDay()->timestamp)
            ->sort()
            ->values();

        $gaps = [];
        for ($i = 1; $i < $timestamps->count(); $i++) {
            $gaps[] = ($timestamps[$i] - $timestamps[$i - 1]) / 86400;
        }
        $avg = array_sum($gaps) / count($gaps);

        return match (true) {
            $avg <= 9              => 'weekly',
            $avg <= 20             => 'biweekly',
            $avg >= 25 && $avg <= 45 => 'monthly',
            $avg >= 60 && $avg <= 100 => 'quarterly',
            $avg >= 150 && $avg <= 200 => 'half_yearly',
            $avg >= 330 && $avg <= 400 => 'annually',
            default                => null,
        };
    }

    private function estimateNextDue(Collection $items, string $frequency): ?string
    {
        $lastDate = Carbon::parse(
            $items->pluck('expense_date')->max()
        );

        return match ($frequency) {
            'weekly'      => $lastDate->copy()->addWeek()->toDateString(),
            'biweekly'    => $lastDate->copy()->addWeeks(2)->toDateString(),
            'monthly'     => $lastDate->copy()->addMonth()->toDateString(),
            'quarterly'   => $lastDate->copy()->addMonths(3)->toDateString(),
            'half_yearly' => $lastDate->copy()->addMonths(6)->toDateString(),
            'annually'    => $lastDate->copy()->addYear()->toDateString(),
            default       => null,
        };
    }

    private function annualCost(float $avg, string $frequency): float
    {
        return round($avg * match ($frequency) {
            'weekly'      => 52,
            'biweekly'    => 26,
            'monthly'     => 12,
            'quarterly'   => 4,
            'half_yearly' => 2,
            'annually'    => 1,
            default       => 12,
        }, 2);
    }

    private function confidence(int $months, float $variancePct, string $frequency): int
    {
        $score = 0;
        $score += min(50, $months * 8);               // up to 50 pts for coverage
        $score += $variancePct < 2  ? 30 : ($variancePct < 10 ? 20 : ($variancePct < 25 ? 10 : 0));
        $score += in_array($frequency, ['monthly', 'quarterly']) ? 20 : 10;
        return min(100, $score);
    }
}
