<?php

namespace App\Ai\Agents;

use App\Ai\Tools\GetExpensesSummaryTool;
use App\Ai\Tools\GetBudgetStatusTool;
use App\Ai\Tools\GetGoalProgressTool;
use App\Ai\Tools\GetFinancialHealthTool;
use App\Models\User;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Promptable;
use Stringable;

class AnalyticsAgent implements Agent, HasTools
{
    use Promptable;

    public function __construct(private readonly User $user) {}

    public function instructions(): Stringable|string
    {
        return <<<PROMPT
        You are a Financial Analytics Agent for FinPilot AI.
        Generate comprehensive monthly financial reports and proactive insights.

        ## Report Structure
        1. **Executive Summary** — 2-3 sentence overview
        2. **Income vs. Expense** — amounts, savings rate, vs. last month
        3. **Top Spending Categories** — top 5 with trend arrows
        4. **Budget Performance** — over/under for each active budget
        5. **Goals Progress** — each goal with % and months remaining
        6. **Key Wins** — positive financial behaviors this month
        7. **Priority Actions** — exactly 3 specific actions for next month
        8. **Health Score** — current score and change from last month

        ## Rules
        - Fetch all data via tools — never invent numbers
        - Format as clean markdown with tables where appropriate
        - Be encouraging but honest about problem areas
        - Prioritize actions by impact (highest first)
        - Keep under 600 words
        - Use Indian number formatting: ₹X,XX,XXX
        PROMPT;
    }

    public function tools(): iterable
    {
        return [
            new GetExpensesSummaryTool($this->user),
            new GetBudgetStatusTool($this->user),
            new GetGoalProgressTool($this->user),
            new GetFinancialHealthTool($this->user),
        ];
    }
}
