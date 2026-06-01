<?php

namespace App\Jobs;

use App\Models\AutomationRule;
use App\Models\Budget;
use App\Models\Expense;
use App\Notifications\AutomationRuleFiredNotification;
use App\Notifications\LargeTransactionNotification;
use App\Notifications\BudgetBreachedNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class EvaluateAutomationRulesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Expense $expense) {}

    public function handle(): void
    {
        $user  = $this->expense->user;
        $rules = AutomationRule::where('user_id', $user->id)->active()->get();

        foreach ($rules as $rule) {
            $fired = match ($rule->trigger_type) {
                'expense_amount'   => $this->checkAmount($rule),
                'expense_category' => $this->checkCategory($rule),
                'budget_breach'    => $this->checkBudgetBreach($rule),
                default            => false,
            };

            if (!$fired) continue;

            $this->runAction($rule, $user);

            $rule->update([
                'last_fired_at' => now(),
                'fire_count'    => $rule->fire_count + 1,
            ]);
        }

        // Always notify for large transactions (> ₹10,000 by default, configurable per-user)
        $threshold = (float) ($user->large_transaction_threshold ?? 10000);
        if ($this->expense->amount >= $threshold) {
            $user->notify(new LargeTransactionNotification($this->expense));
        }

        // Check all active budgets for breaches after this expense
        $this->checkAllBudgets($user);
    }

    private function checkAmount(AutomationRule $rule): bool
    {
        $operator  = $rule->trigger_config['operator'] ?? '>=';
        $threshold = (float) ($rule->trigger_config['amount'] ?? 0);

        return match ($operator) {
            '>='    => $this->expense->amount >= $threshold,
            '>'     => $this->expense->amount >  $threshold,
            '<='    => $this->expense->amount <= $threshold,
            default => false,
        };
    }

    private function checkCategory(AutomationRule $rule): bool
    {
        $categoryIds = (array) ($rule->trigger_config['category_ids'] ?? []);
        return in_array($this->expense->category_id, $categoryIds);
    }

    private function checkBudgetBreach(AutomationRule $rule): bool
    {
        $budgetId = $rule->trigger_config['budget_id'] ?? null;
        if (!$budgetId) return false;

        $budget = Budget::find($budgetId);
        return $budget && $budget->is_breached;
    }

    private function runAction(AutomationRule $rule, $user): void
    {
        match ($rule->action_type) {
            'notify' => $user->notify(new AutomationRuleFiredNotification(
                $rule,
                $rule->action_config['message'] ?? "Rule \"{$rule->name}\" triggered on ₹" . number_format($this->expense->amount, 2) . ' expense'
            )),
            default => null,
        };
    }

    private function checkAllBudgets($user): void
    {
        $month = now();

        $budgets = Budget::where('user_id', $user->id)
            ->where('period', 'monthly')
            ->where('is_active', true)
            ->get();

        foreach ($budgets as $budget) {
            if (!$budget->is_breached) continue;

            // Only notify once per breach (check if already notified this month)
            $alreadyNotified = $user->notifications()
                ->where('type', 'App\\Notifications\\BudgetBreachedNotification')
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->whereJsonContains('data->meta->budget_id', $budget->id)
                ->exists();

            if (!$alreadyNotified) {
                $spent = Expense::where('user_id', $user->id)
                    ->where('category_id', $budget->category_id)
                    ->whereYear('expense_date', $month->year)
                    ->whereMonth('expense_date', $month->month)
                    ->sum('amount');

                $user->notify(new BudgetBreachedNotification($budget, (float) $spent));
            }
        }
    }
}
