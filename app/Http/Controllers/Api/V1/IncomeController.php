<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\IncomeSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncomeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sources = $request->user()->incomeSources()
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->orderByDesc('amount')
            ->get()
            ->map(fn($s) => [
                ...$s->toArray(),
                'monthly_equivalent' => $this->monthlyEquivalent($s),
            ]);

        return response()->json(['success' => true, 'data' => $sources]);
    }

    public function summary(Request $request): JsonResponse
    {
        $sources = $request->user()->incomeSources()->where('is_active', true)->get();

        $monthlyTotal = $sources->sum(fn($s) => $this->monthlyEquivalent($s));

        $byType = $sources->groupBy('type')->map(fn($group, $type) => [
            'type'             => $type,
            'monthly_total'    => round($group->sum(fn($s) => $this->monthlyEquivalent($s)), 2),
            'count'            => $group->count(),
        ])->values();

        return response()->json([
            'success' => true,
            'data' => [
                'monthly_total' => round($monthlyTotal, 2),
                'annual_total'  => round($monthlyTotal * 12, 2),
                'by_type'       => $byType,
                'source_count'  => $sources->count(),
            ],
        ]);
    }

    public function show(Request $request, IncomeSource $incomeSource): JsonResponse
    {
        abort_unless($incomeSource->user_id === $request->user()->id, 403);
        return response()->json([
            'success' => true,
            'data'    => array_merge($incomeSource->toArray(), [
                'monthly_equivalent' => $this->monthlyEquivalent($incomeSource),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'type'         => 'required|in:salary,freelance,rental,dividends,business,pension,side_hustle,other',
            'amount'       => 'required|numeric|min:0',
            'currency'     => 'sometimes|string|size:3',
            'frequency'    => 'required|in:one_time,daily,weekly,biweekly,monthly,quarterly,annually',
            'expected_day' => 'nullable|integer|min:1|max:31',
            'is_active'    => 'boolean',
        ]);

        $source = $request->user()->incomeSources()->create([
            ...$validated,
            'currency'  => $validated['currency'] ?? $request->user()->currency ?? 'INR',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $source,
            'message' => 'Income source added.',
        ], 201);
    }

    public function update(Request $request, IncomeSource $incomeSource): JsonResponse
    {
        abort_unless($incomeSource->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'amount'       => 'sometimes|numeric|min:0',
            'frequency'    => 'sometimes|in:one_time,daily,weekly,biweekly,monthly,quarterly,annually',
            'expected_day' => 'nullable|integer|min:1|max:31',
            'is_active'    => 'boolean',
        ]);

        $incomeSource->update($validated);
        return response()->json(['success' => true, 'data' => $incomeSource->fresh()]);
    }

    public function destroy(Request $request, IncomeSource $incomeSource): JsonResponse
    {
        abort_unless($incomeSource->user_id === $request->user()->id, 403);
        $incomeSource->delete();
        return response()->json(['success' => true, 'message' => 'Income source moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $sources = $request->user()->incomeSources()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get();
        return response()->json(['success' => true, 'data' => $sources]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $source = IncomeSource::withTrashed()->findOrFail($id);
        abort_unless($source->user_id === $request->user()->id, 403);
        $source->restore();
        return response()->json(['success' => true, 'message' => 'Income source restored.']);
    }

    private function monthlyEquivalent(IncomeSource $source): float
    {
        return match ($source->frequency) {
            'daily'     => round($source->amount * 30, 2),
            'weekly'    => round($source->amount * 4.33, 2),
            'biweekly'  => round($source->amount * 2.17, 2),
            'monthly'   => (float) $source->amount,
            'quarterly' => round($source->amount / 3, 2),
            'annually'  => round($source->amount / 12, 2),
            default     => 0,
        };
    }
}
