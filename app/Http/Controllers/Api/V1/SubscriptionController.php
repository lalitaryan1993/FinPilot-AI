<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $subs = $request->user()->subscriptions()
            ->when($request->has('is_active'), fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->category, fn($q) => $q->where('category', $request->category))
            ->orderBy('next_billing_date')
            ->get()
            ->map(fn($s) => [
                ...$s->toArray(),
                'annual_cost'     => $s->annualCost(),
                'monthly_cost'    => round($s->annualCost() / 12, 2),
                'days_until_bill' => now()->diffInDays($s->next_billing_date, false),
                'is_due_soon'     => $s->isDueSoon(7),
            ]);

        return response()->json(['success' => true, 'data' => $subs]);
    }

    public function summary(Request $request): JsonResponse
    {
        $active = $request->user()->subscriptions()->active()->get();

        $monthlyTotal = $active->sum(fn($s) => round($s->annualCost() / 12, 2));
        $annualTotal  = $active->sum(fn($s) => $s->annualCost());

        $byCategory = $active->groupBy('category')->map(fn($group, $cat) => [
            'category'     => $cat,
            'monthly_cost' => round($group->sum(fn($s) => $s->annualCost() / 12), 2),
            'count'        => $group->count(),
        ])->values();

        $dueSoon = $active->filter(fn($s) => $s->isDueSoon(7))->values();

        return response()->json([
            'success' => true,
            'data' => [
                'monthly_total'  => round($monthlyTotal, 2),
                'annual_total'   => round($annualTotal, 2),
                'active_count'   => $active->count(),
                'by_category'    => $byCategory,
                'due_soon'       => $dueSoon->map(fn($s) => [
                    'id'               => $s->id,
                    'name'             => $s->name,
                    'amount'           => (float) $s->amount,
                    'next_billing_date'=> $s->next_billing_date->toDateString(),
                    'days_until_bill'  => now()->diffInDays($s->next_billing_date, false),
                ]),
            ],
        ]);
    }

    public function show(Request $request, Subscription $subscription): JsonResponse
    {
        abort_unless($subscription->user_id === $request->user()->id, 403);
        return response()->json([
            'success' => true,
            'data'    => array_merge($subscription->toArray(), [
                'annual_cost'     => $subscription->annualCost(),
                'monthly_cost'    => round($subscription->annualCost() / 12, 2),
                'days_until_bill' => now()->diffInDays($subscription->next_billing_date, false),
                'is_due_soon'     => $subscription->isDueSoon(7),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'provider'          => 'nullable|string|max:100',
            'category'          => 'required|in:entertainment,productivity,health,finance,education,shopping,cloud,other',
            'amount'            => 'required|numeric|min:0',
            'currency'          => 'sometimes|string|size:3',
            'billing_cycle'     => 'required|in:daily,weekly,monthly,quarterly,annually',
            'next_billing_date' => 'required|date',
            'started_at'        => 'nullable|date',
            'usage_score'       => 'nullable|integer|min:1|max:10',
            'cancel_url'        => 'nullable|url|max:500',
        ]);

        $sub = $request->user()->subscriptions()->create([
            ...$validated,
            'currency'  => $validated['currency'] ?? $request->user()->currency ?? 'INR',
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $sub,
            'message' => 'Subscription added.',
        ], 201);
    }

    public function update(Request $request, Subscription $subscription): JsonResponse
    {
        abort_unless($subscription->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name'              => 'sometimes|string|max:255',
            'amount'            => 'sometimes|numeric|min:0',
            'billing_cycle'     => 'sometimes|in:daily,weekly,monthly,quarterly,annually',
            'next_billing_date' => 'sometimes|date',
            'is_active'         => 'boolean',
            'usage_score'       => 'nullable|integer|min:1|max:10',
            'cancel_url'        => 'nullable|url|max:500',
        ]);

        $subscription->update($validated);
        return response()->json(['success' => true, 'data' => $subscription->fresh()]);
    }

    public function destroy(Request $request, Subscription $subscription): JsonResponse
    {
        abort_unless($subscription->user_id === $request->user()->id, 403);
        $subscription->delete();
        return response()->json(['success' => true, 'message' => 'Subscription moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $subs = $request->user()->subscriptions()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get();
        return response()->json(['success' => true, 'data' => $subs]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $sub = Subscription::withTrashed()->findOrFail($id);
        abort_unless($sub->user_id === $request->user()->id, 403);
        $sub->restore();
        return response()->json(['success' => true, 'message' => 'Subscription restored.']);
    }
}
