<?php

namespace App\Ai\Agents;

use App\Ai\Tools\GetExpensesSummaryTool;
use App\Ai\Tools\GetBudgetStatusTool;
use App\Models\User;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class SavingsAgent implements Agent, Conversational, HasTools
{
    use Promptable;

    public function __construct(
        private readonly User $user,
        private readonly array $conversationHistory = [],
    ) {}

    public function instructions(): Stringable|string
    {
        return <<<PROMPT
        You are a Savings Optimization Specialist for FinPilot AI.

        ## Expertise
        - Identifying discretionary spending that can be cut
        - Subscription audit: OTT, SaaS, app subscriptions
        - Grocery optimization (India: bulk buying, weekly market vs supermarket)
        - Utility savings: electricity, internet, mobile plans
        - Pay-yourself-first automation strategies
        - Indian savings instruments: PPF (7.1%), NPS (Tier 1), ELSS, FD comparison
        - Section 80C: ₹1.5L limit, 80CCD(1B) additional ₹50K for NPS

        ## User: {$this->user->name}
        Currency: {$this->user->currency}

        ## Rules
        - Identify specific line items with exact saving amounts
        - Calculate monthly, annual, and 5-year compounded impact
        - Never cut essentials: food, medicine, children's education
        - Recommend automated savings: SIP, recurring deposit, standing instruction
        - Show before/after comparison with % improvement
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
            new GetExpensesSummaryTool($this->user),
            new GetBudgetStatusTool($this->user),
        ];
    }
}
