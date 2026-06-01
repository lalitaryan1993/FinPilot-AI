<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Debt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DebtController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $debts = $request->user()->debts()
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderByRaw("FIELD(status,'active','closed','defaulted')")
            ->orderBy('emi_due_day')
            ->get()
            ->map(fn($d) => [
                ...$d->toArray(),
                'monthly_interest'  => round($d->monthlyInterest(), 2),
                'emi_due_soon'      => $d->emiDueSoon(5),
                'paid_off_percent'  => $d->principal_amount > 0
                    ? round((1 - ($d->current_balance / $d->principal_amount)) * 100, 1)
                    : 0,
            ]);

        return response()->json(['success' => true, 'data' => $debts]);
    }

    public function show(Request $request, Debt $debt): JsonResponse
    {
        abort_unless($debt->user_id === $request->user()->id, 403);
        return response()->json([
            'success' => true,
            'data'    => array_merge($debt->toArray(), [
                'monthly_interest' => round($debt->monthlyInterest(), 2),
                'emi_due_soon'     => $debt->emiDueSoon(5),
                'paid_off_percent' => $debt->principal_amount > 0
                    ? round((1 - ($debt->current_balance / $debt->principal_amount)) * 100, 1)
                    : 0,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'type'             => 'required|in:home_loan,personal_loan,car_loan,credit_card,education_loan,other',
            'lender'           => 'nullable|string|max:255',
            'principal_amount' => 'required|numeric|min:1',
            'current_balance'  => 'required|numeric|min:0',
            'interest_rate'    => 'required|numeric|min:0|max:100',
            'emi_amount'       => 'nullable|numeric|min:0',
            'emi_due_day'      => 'nullable|integer|min:1|max:31',
            'tenure_months'    => 'nullable|integer|min:1',
            'strategy'         => 'in:snowball,avalanche,none',
            'disbursed_at'     => 'nullable|date',
        ]);

        $debt = $request->user()->debts()->create([
            ...$validated,
            'status'   => 'active',
            'strategy' => $validated['strategy'] ?? 'none',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $debt,
            'message' => 'Debt added.',
        ], 201);
    }

    public function update(Request $request, Debt $debt): JsonResponse
    {
        abort_unless($debt->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'current_balance' => 'sometimes|numeric|min:0',
            'interest_rate'   => 'sometimes|numeric|min:0|max:100',
            'emi_amount'      => 'nullable|numeric|min:0',
            'emi_due_day'     => 'nullable|integer|min:1|max:31',
            'strategy'        => 'sometimes|in:snowball,avalanche,none',
            'status'          => 'sometimes|in:active,closed,defaulted',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'closed') {
            $validated['closed_at']       = now();
            $validated['current_balance'] = 0;
        }

        $debt->update($validated);
        return response()->json(['success' => true, 'data' => $debt->fresh()]);
    }

    public function destroy(Request $request, Debt $debt): JsonResponse
    {
        abort_unless($debt->user_id === $request->user()->id, 403);
        $debt->delete();
        return response()->json(['success' => true, 'message' => 'Debt moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $debts = $request->user()->debts()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get();
        return response()->json(['success' => true, 'data' => $debts]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $debt = Debt::withTrashed()->findOrFail($id);
        abort_unless($debt->user_id === $request->user()->id, 403);
        $debt->restore();
        return response()->json(['success' => true, 'message' => 'Debt restored.']);
    }

    public function emiCalendar(Request $request): JsonResponse
    {
        $debts = $request->user()->debts()->active()->get();

        $calendar = collect();
        foreach ($debts as $debt) {
            if (!$debt->emi_due_day || !$debt->emi_amount) continue;

            // Current month due date
            $due = now()->day($debt->emi_due_day);
            if ($due->isPast()) $due->addMonth();

            $calendar->push([
                'debt_id'     => $debt->id,
                'name'        => $debt->name,
                'lender'      => $debt->lender,
                'emi_amount'  => (float) $debt->emi_amount,
                'due_date'    => $due->toDateString(),
                'due_day'     => $debt->emi_due_day,
                'days_until'  => now()->diffInDays($due),
                'is_due_soon' => $debt->emiDueSoon(5),
                'type'        => $debt->type,
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => $calendar->sortBy('days_until')->values(),
        ]);
    }
}
