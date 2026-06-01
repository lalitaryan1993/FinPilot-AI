<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $month   = $request->get('month', now()->format('Y-m'));
        [$year, $mon] = explode('-', $month);

        $budgets = $request->user()->budgets()
            ->with('category:id,name,icon,color')
            ->whereYear('period_start', $year)
            ->whereMonth('period_start', $mon)
            ->orWhere(fn($q) => $q->whereDate('period_start', '<=', now())
                ->whereDate('period_end', '>=', now()))
            ->get()
            ->map(fn($b) => [
                ...$b->toArray(),
                'remaining'    => $b->remainingAmount(),
                'percent_used' => round($b->spentPercent(), 1),
                'is_breached'  => $b->isBreached(),
                'is_near_limit'=> $b->isNearLimit(),
            ]);

        return response()->json(['success' => true, 'data' => $budgets]);
    }

    public function show(Request $request, Budget $budget): JsonResponse
    {
        abort_unless($budget->user_id === $request->user()->id, 403);
        return response()->json([
            'success' => true,
            'data'    => array_merge($budget->load('category:id,name,icon,color')->toArray(), [
                'remaining'     => $budget->remainingAmount(),
                'percent_used'  => round($budget->spentPercent(), 1),
                'is_breached'   => $budget->isBreached(),
                'is_near_limit' => $budget->isNearLimit(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'amount'           => 'required|numeric|min:1',
            'category_id'      => 'nullable|exists:categories,id',
            'period'           => 'required|in:monthly,weekly,quarterly,annual,custom',
            'period_start'     => 'required|date',
            'period_end'       => 'required|date|after:period_start',
            'rollover'         => 'boolean',
            'alert_at_percent' => 'integer|min:10|max:100',
        ]);

        $budget = $request->user()->budgets()->create($validated);

        return response()->json([
            'success' => true,
            'data'    => $budget->load('category'),
            'message' => 'Budget created successfully.',
        ], 201);
    }

    public function update(Request $request, Budget $budget): JsonResponse
    {
        abort_unless($budget->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'amount'           => 'sometimes|numeric|min:1',
            'alert_at_percent' => 'sometimes|integer|min:10|max:100',
            'is_active'        => 'sometimes|boolean',
        ]);

        $budget->update($validated);
        return response()->json(['success' => true, 'data' => $budget->fresh('category')]);
    }

    public function destroy(Request $request, Budget $budget): JsonResponse
    {
        abort_unless($budget->user_id === $request->user()->id, 403);
        $budget->delete();
        return response()->json(['success' => true, 'message' => 'Budget moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $budgets = $request->user()->budgets()
            ->onlyTrashed()
            ->with('category:id,name,icon,color')
            ->orderByDesc('deleted_at')
            ->get();
        return response()->json(['success' => true, 'data' => $budgets]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $budget = Budget::withTrashed()->findOrFail($id);
        abort_unless($budget->user_id === $request->user()->id, 403);
        $budget->restore();
        return response()->json(['success' => true, 'message' => 'Budget restored.']);
    }

    public function status(Request $request): JsonResponse
    {
        $budgets = $request->user()->budgets()->active()->currentMonth()->with('category')->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'total_budget'     => $budgets->sum('amount'),
                'total_spent'      => $budgets->sum('spent_amount'),
                'over_budget'      => $budgets->filter->isBreached()->count(),
                'near_limit'       => $budgets->filter->isNearLimit()->count(),
                'budgets'          => $budgets->map(fn($b) => [
                    ...$b->toArray(),
                    'remaining'    => $b->remainingAmount(),
                    'percent_used' => round($b->spentPercent(), 1),
                ]),
            ],
        ]);
    }
}
