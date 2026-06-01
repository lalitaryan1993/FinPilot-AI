<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\EvaluateAutomationRulesJob;
use App\Models\AutomationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationRuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rules = AutomationRule::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $rules]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string|max:500',
            'trigger_type'   => 'required|in:expense_amount,expense_category,budget_breach,goal_milestone',
            'trigger_config' => 'required|array',
            'action_type'    => 'required|in:notify,tag,email',
            'action_config'  => 'required|array',
            'is_active'      => 'boolean',
        ]);

        $rule = AutomationRule::create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $rule,
            'message' => 'Automation rule created.',
        ], 201);
    }

    public function show(Request $request, AutomationRule $automationRule): JsonResponse
    {
        abort_unless($automationRule->user_id === $request->user()->id, 403);
        return response()->json(['success' => true, 'data' => $automationRule]);
    }

    public function update(Request $request, AutomationRule $automationRule): JsonResponse
    {
        abort_unless($automationRule->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'description'    => 'nullable|string|max:500',
            'trigger_type'   => 'sometimes|in:expense_amount,expense_category,budget_breach,goal_milestone',
            'trigger_config' => 'sometimes|array',
            'action_type'    => 'sometimes|in:notify,tag,email',
            'action_config'  => 'sometimes|array',
            'is_active'      => 'boolean',
        ]);

        $automationRule->update($validated);

        return response()->json(['success' => true, 'data' => $automationRule->fresh(), 'message' => 'Rule updated.']);
    }

    public function destroy(Request $request, AutomationRule $automationRule): JsonResponse
    {
        abort_unless($automationRule->user_id === $request->user()->id, 403);
        $automationRule->delete();
        return response()->json(['success' => true, 'message' => 'Rule deleted.']);
    }

    public function toggle(Request $request, AutomationRule $automationRule): JsonResponse
    {
        abort_unless($automationRule->user_id === $request->user()->id, 403);
        $automationRule->update(['is_active' => !$automationRule->is_active]);
        $state = $automationRule->is_active ? 'enabled' : 'disabled';
        return response()->json(['success' => true, 'data' => $automationRule, 'message' => "Rule {$state}."]);
    }
}
