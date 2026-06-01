<?php

namespace App\Ai\Tools;

use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetDebtSummaryTool implements Tool
{
    public function __construct(private readonly User $user) {}

    public function description(): Stringable|string
    {
        return 'Get all active debts/loans for the user. Returns balance, EMI, interest rate, due dates, monthly interest cost, and debt-to-income ratio.';
    }

    public function handle(Request $request): Stringable|string
    {
        $debts         = $this->user->debts()->active()->get();
        $totalBalance  = $debts->sum('current_balance');
        $totalEmi      = $debts->sum('emi_amount');
        $monthlyIncome = $this->user->monthlyIncome();

        $formatted = $debts->map(fn($debt) => [
            'name'             => $debt->name,
            'type'             => $debt->type,
            'lender'           => $debt->lender,
            'current_balance'  => $debt->current_balance,
            'interest_rate'    => $debt->interest_rate . '% p.a.',
            'emi_amount'       => $debt->emi_amount,
            'emi_due_day'      => $debt->emi_due_day,
            'monthly_interest' => round($debt->monthlyInterest(), 2),
            'strategy'         => $debt->strategy,
            'due_soon'         => $debt->emiDueSoon(),
        ]);

        return json_encode([
            'currency'           => $this->user->currency,
            'total_outstanding'  => round($totalBalance, 2),
            'total_monthly_emi'  => round($totalEmi, 2),
            'monthly_income'     => round($monthlyIncome, 2),
            'debt_to_income_pct' => $monthlyIncome > 0
                ? round(($totalEmi / $monthlyIncome) * 100, 1)
                : null,
            'debt_count'         => $debts->count(),
            'debts'              => $formatted->toArray(),
        ], JSON_PRETTY_PRINT);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
