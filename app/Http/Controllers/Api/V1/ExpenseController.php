<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\EvaluateAutomationRulesJob;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $sortBy  = in_array($request->sort_by, ['expense_date', 'amount']) ? $request->sort_by : 'expense_date';
        $sortDir = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $expenses = $user->expenses()
            ->with('category:id,name,icon,color')
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->payment_method, fn($q) => $q->where('payment_method', $request->payment_method))
            ->when($request->amount_min, fn($q) => $q->where('amount', '>=', $request->amount_min))
            ->when($request->amount_max, fn($q) => $q->where('amount', '<=', $request->amount_max))
            ->when($request->date_from, fn($q) => $q->where('expense_date', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->where('expense_date', '<=', $request->date_to))
            ->when($request->search, fn($q) => $q->where(function ($q2) use ($request) {
                $q2->where('description', 'like', "%{$request->search}%")
                   ->orWhere('merchant', 'like', "%{$request->search}%");
            }))
            ->orderBy($sortBy, $sortDir)
            ->orderByDesc('id')
            ->paginate($request->per_page ?? 25);

        return response()->json(['success' => true, 'data' => $expenses]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string|max:500',
            'amount'      => 'required|numeric|min:0.01',
            'category_id' => 'required|exists:categories,id',
            'expense_date'=> 'required|date',
            'payment_method' => 'nullable|string',
            'merchant'    => 'nullable|string|max:255',
            'notes'       => 'nullable|string',
            'tags'        => 'nullable|array',
            'account_id'  => 'nullable|exists:accounts,id',
        ]);

        $expense = $request->user()->expenses()->create([
            ...$validated,
            'currency'    => $request->user()->currency,
            'base_amount' => $validated['amount'],
            'source'      => 'manual',
        ]);

        event(new \App\Events\ExpenseCreated($expense));
        \App\Jobs\EvaluateAutomationRulesJob::dispatch($expense);

        return response()->json([
            'success' => true,
            'data'    => $expense->load('category'),
            'message' => 'Expense logged successfully.',
        ], 201);
    }

    public function show(Request $request, Expense $expense): JsonResponse
    {
        abort_unless($expense->user_id === $request->user()->id, 403);
        $data = $expense->load('category')->toArray();
        $data['expense_date'] = $expense->expense_date?->format('Y-m-d');
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        abort_unless($expense->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'description' => 'sometimes|string|max:500',
            'amount'      => 'sometimes|numeric|min:0.01',
            'category_id' => 'sometimes|exists:categories,id',
            'expense_date'=> 'sometimes|date',
            'payment_method' => 'nullable|string',
            'merchant'    => 'nullable|string|max:255',
            'notes'       => 'nullable|string',
        ]);

        $expense->update($validated);

        return response()->json(['success' => true, 'data' => $expense->fresh('category')]);
    }

    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        abort_unless($expense->user_id === $request->user()->id, 403);
        $expense->delete();
        return response()->json(['success' => true, 'message' => 'Expense moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $expenses = $request->user()->expenses()
            ->onlyTrashed()
            ->with('category:id,name,icon,color')
            ->orderByDesc('deleted_at')
            ->get();
        return response()->json(['success' => true, 'data' => $expenses]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $expense = Expense::withTrashed()->findOrFail($id);
        abort_unless($expense->user_id === $request->user()->id, 403);
        $expense->restore();
        return response()->json(['success' => true, 'message' => 'Expense restored.']);
    }

    public function summary(Request $request): JsonResponse
    {
        $user  = $request->user();
        $month = $request->get('month', now()->format('Y-m'));
        [$year, $mon] = explode('-', $month);

        $expenses = $user->expenses()
            ->with('category:id,name,icon,color')
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $mon)
            ->get();

        $byCategory = $expenses
            ->groupBy('category_id')
            ->map(fn($group) => [
                'category'    => $group->first()?->category,
                'total'       => round($group->sum('base_amount'), 2),
                'count'       => $group->count(),
                'avg'         => round($group->avg('base_amount'), 2),
            ])
            ->sortByDesc('total')
            ->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'month'       => $month,
                'total'       => round($expenses->sum('base_amount'), 2),
                'count'       => $expenses->count(),
                'by_category' => $byCategory,
                'currency'    => $user->currency,
            ],
        ]);
    }
}
