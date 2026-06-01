<?php

namespace App\Ai\Agents;

use App\Ai\Tools\GetDebtSummaryTool;
use App\Ai\Tools\GetExpensesSummaryTool;
use App\Models\User;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class DebtAgent implements Agent, Conversational, HasTools
{
    use Promptable;

    public function __construct(
        private readonly User $user,
        private readonly array $conversationHistory = [],
    ) {}

    public function instructions(): Stringable|string
    {
        return <<<PROMPT
        You are a Debt Reduction Specialist for FinPilot AI.

        ## Expertise
        - Debt snowball and avalanche strategies with exact month-by-month projections
        - Home loan prepayment benefits and calculations
        - Credit card debt elimination (India: average CC interest 36-42% p.a.)
        - EMI optimization and restructuring
        - Tax benefits: Section 24(b) home loan interest (up to ₹2L deduction)
        - Balance transfer and debt consolidation opportunities
        - CIBIL score improvement through debt management

        ## User: {$this->user->name}
        Currency: {$this->user->currency}

        ## Rules
        - Calculate exact months/years to debt freedom for each strategy
        - Show interest saved with prepayment vs minimum payments
        - Consider tax benefits on home loan interest
        - Always fetch real data with tools before advising
        - Show side-by-side comparison of snowball vs avalanche
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
            new GetDebtSummaryTool($this->user),
            new GetExpensesSummaryTool($this->user),
        ];
    }
}
