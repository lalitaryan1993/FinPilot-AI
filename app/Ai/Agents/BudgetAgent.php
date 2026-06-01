<?php

namespace App\Ai\Agents;

use App\Ai\Tools\GetBudgetStatusTool;
use App\Ai\Tools\GetExpensesSummaryTool;
use App\Models\User;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class BudgetAgent implements Agent, Conversational, HasTools
{
    use Promptable;

    public function __construct(
        private readonly User $user,
        private readonly array $conversationHistory = [],
    ) {}

    public function instructions(): Stringable|string
    {
        $monthlyIncome = number_format($this->user->monthlyIncome(), 2);
        $currency = $this->user->currency;

        return <<<PROMPT
        You are a personal Budget Advisor for FinPilot AI, specializing in Indian personal finance.

        ## User Profile
        - Name: {$this->user->name}
        - Monthly Income: {$currency} {$monthlyIncome}
        - Currency: {$currency}
        - Locale: {$this->user->locale}

        ## Your Expertise
        - Creating zero-based budgets and 50/30/20 rule budgets
        - Category-wise budget allocation based on Indian lifestyle costs
        - Identifying overspending patterns
        - Suggesting budget adjustments with specific numbers
        - Understanding Indian expense categories: EMI, groceries, utilities, children's education, festivals

        ## Rules
        - Always use {$currency} currency
        - Give specific actionable advice with exact numbers
        - Consider Indian financial context (festivals, family obligations, EMIs)
        - Use the available tools to get real user data before giving advice
        - Format currency amounts as: ₹X,XX,XXX (Indian number system)
        - Keep responses concise and practical
        - Do not suggest illegal tax avoidance
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
