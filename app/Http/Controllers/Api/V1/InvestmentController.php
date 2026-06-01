<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Investment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvestmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $investments = $request->user()->investments()
            ->when($request->type,   fn($q) => $q->where('type', $request->type))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderBy('invested_amount', 'desc')
            ->get()
            ->map(fn($inv) => [
                ...$inv->toArray(),
                'current_value'      => $inv->currentValue(),
                'gain_loss'          => $inv->gainLoss(),
                'gain_loss_percent'  => $inv->gainLossPercent(),
            ]);

        return response()->json(['success' => true, 'data' => $investments]);
    }

    public function portfolio(Request $request): JsonResponse
    {
        $investments = $request->user()->investments()->get();

        $totalInvested = $investments->sum('invested_amount');
        $totalValue    = $investments->sum(fn($i) => $i->currentValue());
        $totalGainLoss = $totalValue - $totalInvested;

        // Group by type for donut chart
        $byType = $investments->groupBy('type')->map(fn($group, $type) => [
            'type'            => $type,
            'invested_amount' => round($group->sum('invested_amount'), 2),
            'current_value'   => round($group->sum(fn($i) => $i->currentValue()), 2),
            'count'           => $group->count(),
        ])->values();

        // Monthly SIP total
        $monthlySip = $investments
            ->where('is_sip', true)
            ->where('status', 'active')
            ->sum('sip_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'total_invested'       => round($totalInvested, 2),
                'total_current_value'  => round($totalValue, 2),
                'total_gain_loss'      => round($totalGainLoss, 2),
                'total_gain_loss_pct'  => $totalInvested > 0 ? round(($totalGainLoss / $totalInvested) * 100, 2) : 0,
                'monthly_sip'          => round($monthlySip, 2),
                'active_count'         => $investments->where('status', 'active')->count(),
                'by_type'              => $byType,
            ],
        ]);
    }

    public function show(Request $request, Investment $investment): JsonResponse
    {
        abort_unless($investment->user_id === $request->user()->id, 403);
        return response()->json([
            'success' => true,
            'data'    => array_merge($investment->toArray(), [
                'current_value'     => $investment->currentValue(),
                'gain_loss'         => $investment->gainLoss(),
                'gain_loss_percent' => $investment->gainLossPercent(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'type'            => 'required|in:mutual_fund,stock,fd,rd,ppf,epf,nps,gold,real_estate,crypto,bonds,other',
            'symbol'          => 'nullable|string|max:50',
            'isin'            => 'nullable|string|max:20',
            'units'           => 'nullable|numeric|min:0',
            'buy_price'       => 'nullable|numeric|min:0',
            'current_price'   => 'nullable|numeric|min:0',
            'invested_amount' => 'required|numeric|min:0.01',
            'current_value'   => 'nullable|numeric|min:0',
            'is_sip'          => 'boolean',
            'sip_amount'      => 'nullable|numeric|min:0',
            'sip_day'         => 'nullable|integer|min:1|max:31',
            'started_at'      => 'nullable|date',
            'maturity_at'     => 'nullable|date',
        ]);

        $investment = $request->user()->investments()->create([
            ...$validated,
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $investment,
            'message' => 'Investment added.',
        ], 201);
    }

    public function update(Request $request, Investment $investment): JsonResponse
    {
        abort_unless($investment->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'current_price' => 'nullable|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',
            'units'         => 'nullable|numeric|min:0',
            'sip_amount'    => 'nullable|numeric|min:0',
            'sip_day'       => 'nullable|integer|min:1|max:31',
            'status'        => 'sometimes|in:active,paused,redeemed',
            'maturity_at'   => 'nullable|date',
        ]);

        if (isset($validated['current_price']) && $investment->units) {
            $validated['current_value']      = round($investment->units * $validated['current_price'], 2);
            $validated['price_updated_at']   = now();
        }

        $investment->update($validated);
        return response()->json(['success' => true, 'data' => $investment->fresh()]);
    }

    public function destroy(Request $request, Investment $investment): JsonResponse
    {
        abort_unless($investment->user_id === $request->user()->id, 403);
        $investment->delete();
        return response()->json(['success' => true, 'message' => 'Investment moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $investments = $request->user()->investments()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get();
        return response()->json(['success' => true, 'data' => $investments]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $investment = Investment::withTrashed()->findOrFail($id);
        abort_unless($investment->user_id === $request->user()->id, 403);
        $investment->restore();
        return response()->json(['success' => true, 'message' => 'Investment restored.']);
    }
}
