<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Expense;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\Goal;
use App\Models\GoalContribution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FamilyController extends Controller
{
    // ── Get current user's family ─────────────────────────────────
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->family_id) {
            return response()->json(['success' => false, 'message' => 'No family group.'], 404);
        }

        $family = Family::with(['members.user'])->find($user->family_id);

        return response()->json(['success' => true, 'data' => $this->formatFamily($family, $user)]);
    }

    // ── Create a new family group ─────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:255']);
        $user = $request->user();

        if ($user->family_id) {
            return response()->json(['success' => false, 'message' => 'You are already in a family group.'], 422);
        }

        $family = Family::create([
            'name'     => $request->name,
            'owner_id' => $user->id,
            'currency' => $user->currency ?? 'INR',
        ]);

        $user->update(['family_id' => $family->id]);

        FamilyMember::create([
            'family_id' => $family->id,
            'user_id'   => $user->id,
            'role'      => 'admin',
            'relation'  => 'self',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->formatFamily($family->fresh(['members.user']), $user),
            'message' => 'Family group created!',
        ], 201);
    }

    // ── Join via invite code ──────────────────────────────────────
    public function join(Request $request): JsonResponse
    {
        $request->validate([
            'invite_code' => 'required|string|size:8',
            'relation'    => 'nullable|in:spouse,child,parent,sibling,other',
            'display_name'=> 'nullable|string|max:100',
        ]);

        $user = $request->user();

        if ($user->family_id) {
            return response()->json(['success' => false, 'message' => 'You are already in a family group.'], 422);
        }

        $family = Family::where('invite_code', strtoupper($request->invite_code))->first();

        if (!$family) {
            return response()->json(['success' => false, 'message' => 'Invalid invite code.'], 404);
        }

        $user->update(['family_id' => $family->id]);

        FamilyMember::create([
            'family_id'    => $family->id,
            'user_id'      => $user->id,
            'role'         => 'member',
            'relation'     => $request->relation ?? 'other',
            'display_name' => $request->display_name,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->formatFamily($family->fresh(['members.user']), $user),
            'message' => "Welcome to {$family->name}!",
        ]);
    }

    // ── Regenerate invite code ────────────────────────────────────
    public function regenerateCode(Request $request): JsonResponse
    {
        $user   = $request->user();
        $family = $this->requireFamily($user);

        if ($family->owner_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Only the owner can regenerate the code.'], 403);
        }

        $family->update(['invite_code' => strtoupper(Str::random(8))]);

        return response()->json(['success' => true, 'data' => ['invite_code' => $family->invite_code]]);
    }

    // ── Update member role / spending limit ───────────────────────
    public function updateMember(Request $request, int $memberId): JsonResponse
    {
        $request->validate([
            'role'           => 'nullable|in:admin,co_admin,member,viewer',
            'spending_limit' => 'nullable|numeric|min:0',
            'display_name'   => 'nullable|string|max:100',
        ]);

        $user   = $request->user();
        $family = $this->requireFamily($user);

        $member = FamilyMember::where('family_id', $family->id)->findOrFail($memberId);

        // Only admin/co_admin can update others
        $myMember = FamilyMember::where('family_id', $family->id)->where('user_id', $user->id)->first();
        if (!in_array($myMember?->role, ['admin', 'co_admin'])) {
            return response()->json(['success' => false, 'message' => 'Insufficient permissions.'], 403);
        }

        $member->update(array_filter([
            'role'           => $request->role,
            'spending_limit' => $request->spending_limit,
            'display_name'   => $request->display_name,
        ], fn($v) => $v !== null));

        return response()->json(['success' => true, 'message' => 'Member updated.']);
    }

    // ── Remove a member ───────────────────────────────────────────
    public function removeMember(Request $request, int $memberId): JsonResponse
    {
        $user   = $request->user();
        $family = $this->requireFamily($user);

        $member = FamilyMember::where('family_id', $family->id)->findOrFail($memberId);

        if ($member->user_id === $family->owner_id) {
            return response()->json(['success' => false, 'message' => 'Cannot remove the owner.'], 422);
        }

        $myMember = FamilyMember::where('family_id', $family->id)->where('user_id', $user->id)->first();
        if (!in_array($myMember?->role, ['admin', 'co_admin']) && $member->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Insufficient permissions.'], 403);
        }

        $removedUser = $member->user;
        $member->delete();

        if ($removedUser) {
            $removedUser->update(['family_id' => null]);
        }

        return response()->json(['success' => true, 'message' => 'Member removed.']);
    }

    // ── Leave the family ──────────────────────────────────────────
    public function leave(Request $request): JsonResponse
    {
        $user   = $request->user();
        $family = $this->requireFamily($user);

        if ($family->owner_id === $user->id) {
            return response()->json(['success' => false, 'message' => 'Owner cannot leave. Transfer ownership or delete the group.'], 422);
        }

        FamilyMember::where('family_id', $family->id)->where('user_id', $user->id)->delete();
        $user->update(['family_id' => null]);

        return response()->json(['success' => true, 'message' => 'You have left the family group.']);
    }

    // ── Shared expenses for the month ─────────────────────────────
    public function sharedExpenses(Request $request): JsonResponse
    {
        $user   = $request->user();
        $family = $this->requireFamily($user);

        $month = $request->input('month', now()->format('Y-m'));

        $expenses = Expense::where('family_id', $family->id)
            ->with('user:id,name', 'category:id,name,icon,color')
            ->whereYear('expense_date', substr($month, 0, 4))
            ->whereMonth('expense_date', substr($month, 5, 2))
            ->latest('expense_date')
            ->get()
            ->map(fn($e) => [
                ...$e->toArray(),
                'user_name' => $e->user?->name,
            ]);

        return response()->json(['success' => true, 'data' => $expenses]);
    }

    // ── Helpers ───────────────────────────────────────────────────
    // ── Shared Goals ──────────────────────────────────────────────
    public function sharedGoals(Request $request): JsonResponse
    {
        $user   = $request->user();
        $family = $this->requireFamily($user);

        $goals = Goal::where('family_id', $family->id)
            ->whereIn('status', ['active', 'completed'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn(Goal $g) => [
                'id'             => $g->id,
                'name'           => $g->name,
                'type'           => $g->type,
                'icon'           => $g->icon,
                'color'          => $g->color ?? '#3B82F6',
                'target_amount'  => (float) $g->target_amount,
                'current_amount' => (float) $g->current_amount,
                'monthly_target' => (float) ($g->monthly_target ?? 0),
                'target_date'    => $g->target_date?->format('Y-m-d'),
                'progress'       => round($g->progressPercent(), 1),
                'status'         => $g->status,
            ]);

        return response()->json(['success' => true, 'data' => $goals]);
    }

    public function storeSharedGoal(Request $request): JsonResponse
    {
        $request->validate([
            'name'           => 'required|string|max:255',
            'type'           => 'required|in:emergency_fund,home,car,education,vacation,wedding,retirement,business,custom',
            'target_amount'  => 'required|numeric|min:1',
            'monthly_target' => 'nullable|numeric|min:0',
            'target_date'    => 'nullable|date|after:today',
        ]);

        $user   = $request->user();
        $family = $this->requireFamily($user);
        $member = FamilyMember::where('family_id', $family->id)->where('user_id', $user->id)->first();

        if (!in_array($member?->role, ['admin', 'co_admin'])) {
            return response()->json(['success' => false, 'message' => 'Only admins can create shared goals.'], 403);
        }

        $goal = Goal::create([
            'user_id'        => $user->id,
            'family_id'      => $family->id,
            'name'           => $request->name,
            'type'           => $request->type,
            'target_amount'  => $request->target_amount,
            'monthly_target' => $request->monthly_target,
            'target_date'    => $request->target_date,
            'status'         => 'active',
            'priority'       => 5,
        ]);

        return response()->json(['success' => true, 'data' => $goal, 'message' => 'Shared goal created!'], 201);
    }

    public function contributeSharedGoal(Request $request, int $goalId): JsonResponse
    {
        $request->validate(['amount' => 'required|numeric|min:1', 'note' => 'nullable|string|max:255']);

        $user   = $request->user();
        $family = $this->requireFamily($user);

        $goal = Goal::where('id', $goalId)->where('family_id', $family->id)->firstOrFail();

        $goal->increment('current_amount', $request->amount);

        GoalContribution::create([
            'goal_id' => $goal->id,
            'user_id' => $user->id,
            'amount'  => $request->amount,
            'note'    => $request->note ?? null,
            'source'  => 'family',
        ]);

        $fresh = $goal->fresh();
        if ((float) $fresh->current_amount >= (float) $fresh->target_amount) {
            $fresh->update(['status' => 'completed', 'completed_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'data'    => $fresh,
            'message' => '₹' . number_format($request->amount, 0) . ' added to goal!',
        ]);
    }

    // ── Shared Budgets ────────────────────────────────────────────
    public function sharedBudgets(Request $request): JsonResponse
    {
        $user   = $request->user();
        $family = $this->requireFamily($user);

        $month = $request->input('month', now()->format('Y-m'));
        [$year, $mon] = explode('-', $month);

        $budgets = Budget::where('family_id', $family->id)
            ->where('is_active', true)
            ->whereYear('period_start', (int) $year)
            ->whereMonth('period_start', (int) $mon)
            ->with('category:id,name,icon,color')
            ->get()
            ->map(fn(Budget $b) => [
                'id'          => $b->id,
                'name'        => $b->name,
                'amount'      => (float) $b->amount,
                'spent'       => (float) $b->spent_amount,
                'spent_pct'   => round($b->spentPercent(), 1),
                'remaining'   => (float) $b->remainingAmount(),
                'is_breached' => $b->isBreached(),
                'category'    => $b->category,
            ]);

        return response()->json(['success' => true, 'data' => $budgets]);
    }

    public function storeSharedBudget(Request $request): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'amount'      => 'required|numeric|min:1',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $user   = $request->user();
        $family = $this->requireFamily($user);
        $member = FamilyMember::where('family_id', $family->id)->where('user_id', $user->id)->first();

        if (!in_array($member?->role, ['admin', 'co_admin'])) {
            return response()->json(['success' => false, 'message' => 'Only admins can create shared budgets.'], 403);
        }

        $now    = now();
        $budget = Budget::create([
            'user_id'      => $user->id,
            'family_id'    => $family->id,
            'name'         => $request->name,
            'amount'       => $request->amount,
            'category_id'  => $request->category_id,
            'period'       => 'monthly',
            'period_start' => $now->startOfMonth()->toDateString(),
            'period_end'   => $now->copy()->endOfMonth()->toDateString(),
            'is_active'    => true,
            'alert_at_percent' => 80,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $budget->load('category'),
            'message' => 'Shared budget created!',
        ], 201);
    }

    private function requireFamily($user): Family
    {
        if (!$user->family_id) {
            abort(404, 'No family group.');
        }
        return Family::findOrFail($user->family_id);
    }

    private function formatFamily(Family $family, $user): array
    {
        $now = now()->startOfMonth();

        $members = $family->members->map(function (FamilyMember $m) use ($now, $family) {
            $monthlySpent = $m->user_id
                ? Expense::where('user_id', $m->user_id)
                    ->where('family_id', $family->id)
                    ->whereYear('expense_date', $now->year)
                    ->whereMonth('expense_date', $now->month)
                    ->sum('amount')
                : 0;

            return [
                'id'             => $m->id,
                'user_id'        => $m->user_id,
                'name'           => $m->user?->name ?? 'Unknown',
                'email'          => $m->user?->email ?? '',
                'display_name'   => $m->display_name ?? $m->user?->name,
                'role'           => $m->role,
                'relation'       => $m->relation,
                'spending_limit' => $m->spending_limit,
                'monthly_spent'  => round($monthlySpent, 2),
                'joined_at'      => $m->created_at,
            ];
        });

        $monthTotal = Expense::where('family_id', $family->id)
            ->whereYear('expense_date', $now->year)
            ->whereMonth('expense_date', $now->month)
            ->sum('amount');

        return [
            'id'             => $family->id,
            'name'           => $family->name,
            'invite_code'    => $family->invite_code,
            'currency'       => $family->currency,
            'owner_id'       => $family->owner_id,
            'members'        => $members,
            'month_expenses' => round($monthTotal, 2),
            'shared_budget'  => 0,
            'month_savings'  => 0,
        ];
    }
}
