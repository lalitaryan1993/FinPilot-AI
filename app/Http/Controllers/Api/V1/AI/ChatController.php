<?php

namespace App\Http\Controllers\Api\V1\AI;

use App\Ai\Agents\AnalyticsAgent;
use App\Ai\Agents\BudgetAgent;
use App\Ai\Agents\DebtAgent;
use App\Ai\Agents\FraudDetectionAgent;
use App\Ai\Agents\GoalAgent;
use App\Ai\Agents\SavingsAgent;
use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Ai\AnonymousAgent;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Streaming\Events\TextDelta;

class ChatController extends Controller
{
    private array $agentMap = [
        'budget'    => BudgetAgent::class,
        'debt'      => DebtAgent::class,
        'goal'      => GoalAgent::class,
        'savings'   => SavingsAgent::class,
        'analytics' => AnalyticsAgent::class,
        'fraud'     => FraudDetectionAgent::class,
    ];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
            'context' => 'nullable|string|in:budget,debt,goal,savings,general',
            'history' => 'nullable|array',
        ]);

        $user    = $request->user();
        $context = $validated['context'] ?? 'general';
        $history = $validated['history'] ?? [];

        $provider = $this->configureAiForUser($user);
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'No AI provider configured. Please add an API key in Settings → AI.'], 422);
        }

        $agent = $this->buildAgent($user, $context, $history);
        $response = $agent->prompt($validated['message']);

        return response()->json([
            'success' => true,
            'data'    => [
                'message'  => $response->text,
                'context'  => $context,
                'provider' => $provider,
            ],
        ]);
    }

    public function stream(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
            'context' => 'nullable|string',
            'history' => 'nullable|array',
        ]);

        $user    = $request->user();
        $context = $validated['context'] ?? 'general';
        $history = $validated['history'] ?? [];

        $provider = $this->configureAiForUser($user);

        if (!$provider) {
            return response()->stream(function () {
                echo 'data: ' . json_encode(['content' => 'No AI provider configured. Please add an API key in Settings → AI.']) . "\n\n";
                echo "data: [DONE]\n\n";
                ob_flush();
                flush();
            }, 200, ['Content-Type' => 'text/event-stream', 'Cache-Control' => 'no-cache']);
        }

        return response()->stream(function () use ($user, $validated, $context, $history) {
            $agent  = $this->buildAgent($user, $context, $history);
            $stream = $agent->stream($validated['message']);

            foreach ($stream as $event) {
                if ($event instanceof TextDelta) {
                    echo 'data: ' . json_encode(['content' => $event->delta]) . "\n\n";
                    ob_flush();
                    flush();
                }
            }

            echo "data: [DONE]\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }

    private function buildAgent(User $user, string $context, array $history): object
    {
        if ($context !== 'general' && isset($this->agentMap[$context])) {
            $agentClass = $this->agentMap[$context];
            return new $agentClass($user, $history);
        }

        $messages = array_map(
            fn ($m) => new Message($m['role'], $m['content']),
            $history
        );

        return new AnonymousAgent(
            instructions: $this->generalSystemPrompt($user),
            messages:     $messages,
            tools:        [],
        );
    }

    private function configureAiForUser(User $user): ?string
    {
        // 'default.chat' is set via Settings → AI → Defaults tab
        $provider = AiSetting::getFor($user->id, 'default.chat')
            ?? AiSetting::getFor($user->id, 'provider')
            ?? env('AI_DEFAULT_PROVIDER')
            ?? config('ai.default', 'openai');

        $apiKey = AiSetting::getFor($user->id, "{$provider}.api_key")
            ?? env(strtoupper($provider) . '_API_KEY');

        if (!$apiKey) {
            foreach (['openai', 'anthropic', 'gemini', 'groq'] as $fallback) {
                $fbKey = AiSetting::getFor($user->id, "{$fallback}.api_key")
                    ?? env(strtoupper($fallback) . '_API_KEY');
                if ($fbKey) {
                    $provider = $fallback;
                    $apiKey   = $fbKey;
                    break;
                }
            }
        }

        if (!$apiKey) return null;

        config(["ai.providers.{$provider}.key" => $apiKey]);
        config(['ai.default' => $provider]);

        return $provider;
    }

    private function generalSystemPrompt(User $user): string
    {
        $income = number_format($user->monthlyIncome(), 2);

        return <<<PROMPT
        You are FinPilot AI, a friendly and knowledgeable personal finance assistant for Indians.

        User: {$user->name}
        Monthly Income: {$user->currency} {$income}

        You help with:
        - Budgeting and expense tracking
        - Saving money and reducing spending
        - Debt management and EMI planning
        - Investment guidance (educational, not advisory)
        - Indian tax planning (80C, HRA, etc.)
        - Goal setting and financial planning

        Rules:
        - Always use INR (₹) for amounts
        - Be concise, warm, and actionable
        - Provide specific numbers, not vague advice
        - Acknowledge Indian context: festivals, EMIs, family obligations
        - For investment advice, always say "this is educational, consult a SEBI-registered advisor"
        PROMPT;
    }
}
