<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiSettingsController extends Controller
{
    // Keys that are API keys → encrypted, masked on read
    private const KEY_FIELDS = [
        'anthropic.api_key', 'openai.api_key', 'gemini.api_key', 'groq.api_key',
        'deepseek.api_key', 'mistral.api_key', 'cohere.api_key', 'xai.api_key',
        'openrouter.api_key', 'ollama.url',
    ];

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $settings = AiSetting::where('user_id', $userId)->get();

        $map = [];
        foreach ($settings as $s) {
            $value = $s->getDecryptedValue();
            // Mask API keys
            if ($s->is_encrypted && $value && strlen($value) > 10) {
                $value = substr($value, 0, 8) . '••••••••';
            }
            $map[$s->key] = $value;
        }

        // Merge env defaults for display (masked if set via env)
        $envDefaults = $this->envDefaults();
        foreach ($envDefaults as $key => $envVal) {
            if (!isset($map[$key]) && $envVal) {
                $map[$key] = substr($envVal, 0, 4) . '•••• (env)';
            }
        }

        return response()->json(['success' => true, 'data' => $map]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string|max:1000',
        ]);

        $userId = $request->user()->id;

        foreach ($validated['settings'] as $key => $value) {
            // Skip empty updates to key fields (user didn't change the masked value)
            if (in_array($key, self::KEY_FIELDS) && ($value === null || str_contains((string) $value, '••••'))) {
                continue;
            }

            $isKey = in_array($key, self::KEY_FIELDS);

            if ($value === null || $value === '') {
                AiSetting::where('user_id', $userId)->where('key', $key)->delete();
            } else {
                AiSetting::setFor($userId, $key, $value, $isKey);
            }
        }

        return response()->json(['success' => true, 'message' => 'AI settings saved.']);
    }

    public function testConnection(Request $request): JsonResponse
    {
        $request->validate(['provider' => 'required|string']);
        $provider = $request->input('provider');
        $userId = $request->user()->id;

        $keyField = "{$provider}.api_key";
        $apiKey = AiSetting::getFor($userId, $keyField)
            ?? env(strtoupper($provider) . '_API_KEY');

        if (!$apiKey || str_contains((string) $apiKey, '••••')) {
            return response()->json(['success' => false, 'message' => 'No API key configured for this provider.'], 422);
        }

        $result = match ($provider) {
            'anthropic' => $this->testAnthropic($apiKey),
            'openai'    => $this->testOpenAI($apiKey),
            'gemini'    => $this->testGemini($apiKey),
            'groq'      => $this->testGroq($apiKey),
            default     => ['ok' => false, 'error' => 'Test not available for this provider'],
        };

        return response()->json([
            'success' => $result['ok'],
            'message' => $result['ok'] ? 'Connection successful!' : ($result['error'] ?? 'Connection failed'),
        ]);
    }

    private function testAnthropic(string $key): array
    {
        try {
            $r = Http::withHeaders(['x-api-key' => $key, 'anthropic-version' => '2023-06-01'])
                ->timeout(10)
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => 'claude-haiku-4-5-20251001',
                    'max_tokens' => 10,
                    'messages' => [['role' => 'user', 'content' => 'Hi']],
                ]);
            return ['ok' => $r->successful()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function testOpenAI(string $key): array
    {
        try {
            $r = Http::withToken($key)->timeout(10)
                ->get('https://api.openai.com/v1/models');
            return ['ok' => $r->successful()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function testGemini(string $key): array
    {
        try {
            $r = Http::timeout(10)
                ->get("https://generativelanguage.googleapis.com/v1beta/models?key={$key}");
            return ['ok' => $r->successful()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function testGroq(string $key): array
    {
        try {
            $r = Http::withToken($key)->timeout(10)
                ->get('https://api.groq.com/openai/v1/models');
            return ['ok' => $r->successful()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function envDefaults(): array
    {
        return [
            'anthropic.api_key' => env('ANTHROPIC_API_KEY'),
            'openai.api_key'    => env('OPENAI_API_KEY'),
            'gemini.api_key'    => env('GEMINI_API_KEY'),
            'groq.api_key'      => env('GROQ_API_KEY'),
            'deepseek.api_key'  => env('DEEPSEEK_API_KEY'),
            'mistral.api_key'   => env('MISTRAL_API_KEY'),
            'cohere.api_key'    => env('COHERE_API_KEY'),
            'xai.api_key'       => env('XAI_API_KEY'),
            'openrouter.api_key'=> env('OPENROUTER_API_KEY'),
            'ollama.url'        => env('OLLAMA_URL', 'http://localhost:11434'),
        ];
    }
}
