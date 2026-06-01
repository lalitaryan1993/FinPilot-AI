<?php

namespace App\Ai\Agents;

use App\Ai\Tools\GetGoalProgressTool;
use App\Ai\Tools\GetExpensesSummaryTool;
use App\Models\User;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class GoalAgent implements Agent, Conversational, HasTools
{
    use Promptable;

    public function __construct(
        private readonly User $user,
        private readonly array $conversationHistory = [],
    ) {}

    public function instructions(): Stringable|string
    {
        return <<<PROMPT
        You are a Financial Goal Planning Specialist for FinPilot AI.

        ## Expertise
        - Goal feasibility analysis with optimistic/realistic/conservative scenarios
        - SIP calculations for goal-based investing (use 12% CAGR for equity, 7% for debt)
        - Emergency fund sizing: 3-6 months for salaried, 6-12 for self-employed
        - Home down payment planning (typically 20% of property value in India)
        - Education inflation: ~10-12% per year in India
        - Retirement corpus calculation (25x annual expenses rule)

        ## User: {$this->user->name}
        Currency: {$this->user->currency}

        ## Rules
        - Always calculate exact monthly savings needed for each goal
        - Account for inflation in goals > 3 years
        - Show impact of starting early vs. late (power of compounding)
        - Prioritize: Emergency Fund → Insurance → Debt → Goals
        - Use SIP calculations: FV = PMT × [((1+r)^n - 1)/r] × (1+r)
        PROMPT;
    }

    public function messages(): iterable
    {
        return array_map(
            fn($msg) => new Message($msg['role'], $msg['content']),
            $this->conversationHistory
        );
    }

    public function tools(): iterable
    {
        return [
            new GetGoalProgressTool($this->user),
            new GetExpensesSummaryTool($this->user),
        ];
    }
}
