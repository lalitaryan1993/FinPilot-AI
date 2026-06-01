<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Goal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $goals = $request->user()->goals()
            ->withSum('contributions', 'amount')
            ->orderBy('priority')
            ->get()
            ->map(fn($g) => [
                ...$g->toArray(),
                'progress_percent' => round($g->progressPercent(), 1),
                'remaining_amount' => $g->remainingAmount(),
            ]);

        return response()->json(['success' => true, 'data' => $goals]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'type'           => 'required|string',
            'target_amount'  => 'required|numeric|min:1',
            'monthly_target' => 'nullable|numeric|min:0',
            'target_date'    => 'nullable|date',
            'priority'       => 'integer|min:1|max:10',
            'icon'           => 'nullable|string|max:50',
            'color'          => 'nullable|string|max:7',
            'notes'          => 'nullable|string',
        ]);

        $goal = $request->user()->goals()->create($validated);

        return response()->json([
            'success' => true,
            'data'    => $goal,
            'message' => 'Goal created! You\'re on your way.',
        ], 201);
    }

    public function show(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 403);

        return response()->json([
            'success' => true,
            'data'    => [
                ...$goal->load('contributions')->toArray(),
                'progress_percent' => round($goal->progressPercent(), 1),
                'remaining_amount' => $goal->remainingAmount(),
            ],
        ]);
    }

    public function update(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'target_amount'  => 'sometimes|numeric|min:1',
            'monthly_target' => 'nullable|numeric|min:0',
            'target_date'    => 'nullable|date',
            'priority'       => 'sometimes|integer|min:1|max:10',
            'status'         => 'sometimes|in:active,paused,completed,abandoned',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'completed') {
            $validated['completed_at'] = now();
        }

        $goal->update($validated);
        return response()->json(['success' => true, 'data' => $goal->fresh()]);
    }

    public function destroy(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 403);
        $goal->delete();
        return response()->json(['success' => true, 'message' => 'Goal moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $goals = $request->user()->goals()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get();
        return response()->json(['success' => true, 'data' => $goals]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $goal = Goal::withTrashed()->findOrFail($id);
        abort_unless($goal->user_id === $request->user()->id, 403);
        $goal->restore();
        return response()->json(['success' => true, 'message' => 'Goal restored.']);
    }

    public function contribute(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'note'           => 'nullable|string|max:255',
            'contributed_at' => 'date',
        ]);

        $goal->contributions()->create([
            ...$validated,
            'user_id'        => $request->user()->id,
            'contributed_at' => $validated['contributed_at'] ?? now()->toDateString(),
        ]);

        $goal->increment('current_amount', $validated['amount']);

        if ($goal->fresh()->current_amount >= $goal->target_amount) {
            $goal->update(['status' => 'completed', 'completed_at' => now()]);
            event(new \App\Events\GoalCompleted($goal));
        }

        return response()->json([
            'success' => true,
            'data'    => $goal->fresh(),
            'message' => "₹" . number_format($validated['amount'], 0) . " added to your goal!",
        ], 201);
    }
}
