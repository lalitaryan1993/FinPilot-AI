<?php

namespace App\Jobs;

use App\Models\AiSetting;
use App\Models\SmartImport;
use App\Models\SmartImportItem;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessSmartImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 120;

    public function __construct(public SmartImport $import) {}

    public function handle(): void
    {
        $this->import->update(['status' => 'processing']);

        try {
            $transactions = $this->extractTransactions();

            if (empty($transactions)) {
                $this->import->update([
                    'status'       => 'done',
                    'ai_notes'     => 'No transactions detected in the uploaded file.',
                    'total_items'  => 0,
                ]);
                return;
            }

            foreach ($transactions as $tx) {
                SmartImportItem::create([
                    'smart_import_id'   => $this->import->id,
                    'type'              => $tx['type'] ?? 'expense',
                    'amount'            => abs((float) ($tx['amount'] ?? 0)),
                    'description'       => $tx['description'] ?? 'Unknown',
                    'merchant'          => $tx['merchant'] ?? null,
                    'transaction_date'  => $this->parseDate($tx['date'] ?? null),
                    'suggested_category'=> $tx['suggested_category'] ?? null,
                    'payment_method'    => $tx['payment_method'] ?? null,
                    'confidence'        => min(1, max(0, (float) ($tx['confidence'] ?? 0.8))),
                    'notes'             => $tx['notes'] ?? null,
                ]);
            }

            $this->import->update([
                'status'      => 'done',
                'total_items' => count($transactions),
                'ai_notes'    => $this->import->raw_ai_response['notes'] ?? null,
                'source_type' => $this->import->raw_ai_response['source_type'] ?? null,
            ]);

        } catch (\Throwable $e) {
            Log::error('SmartImport processing failed', [
                'import_id' => $this->import->id,
                'error'     => $e->getMessage(),
            ]);
            $this->import->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }
    }

    private function extractTransactions(): array
    {
        $userId   = $this->import->user_id;
        $filePath = $this->import->file_path;
        $mimeType = $this->import->mime_type ?? 'image/jpeg';

        // Read provider + model from user's AI settings (falls back to anthropic)
        $provider = AiSetting::getFor($userId, 'smart_import.provider') ?? 'anthropic';
        $isImage  = str_starts_with($mimeType, 'image/');

        $storedModel = AiSetting::getFor($userId, 'smart_import.model');
        $model = $this->resolveModel($provider, $storedModel, $isImage);

        // Resolve API key: DB first, then env
        $apiKey = AiSetting::getFor($userId, "{$provider}.api_key")
            ?? env(strtoupper($provider) . '_API_KEY');

        // If chosen provider has no key, try anthropic then openai as fallback
        if (!$apiKey) {
            foreach (['anthropic', 'openai', 'gemini'] as $fallback) {
                $fbKey = AiSetting::getFor($userId, "{$fallback}.api_key") ?? env(strtoupper($fallback) . '_API_KEY');
                if ($fbKey) { $provider = $fallback; $apiKey = $fbKey; break; }
            }
        }

        if (!$apiKey) {
            throw new \RuntimeException('No AI API key configured. Please add one in Settings → AI Configuration.');
        }

        if ($isImage) {
            $response = $this->callVision($filePath, $mimeType, $provider, $model, $apiKey);
        } elseif ($provider === 'anthropic') {
            // Use Anthropic's native PDF API — far better than raw text extraction
            $response = $this->callAnthropicPdf($filePath, $model, $apiKey);
        } else {
            $text     = $this->extractPdfText($filePath);
            $response = $this->callText($text, $provider, $model, $apiKey);
        }

        $this->import->update(['raw_ai_response' => $response]);
        return $response['transactions'] ?? [];
    }

    private function callVision(string $filePath, string $mimeType, string $provider, string $model, string $apiKey): array
    {
        $bytes  = Storage::disk('local')->get($filePath);
        $base64 = base64_encode($bytes);

        return match ($provider) {
            'openai' => $this->sendToOpenAI([
                'model'      => $model ?: 'gpt-4o',
                'max_tokens' => 2048,
                'messages'   => [[
                    'role'    => 'user',
                    'content' => [
                        ['type' => 'text',       'text'      => $this->systemPrompt() . "\n\n" . $this->userPrompt()],
                        ['type' => 'image_url',  'image_url' => ['url' => "data:{$mimeType};base64,{$base64}"]],
                    ],
                ]],
            ], $apiKey),

            'gemini' => $this->sendToGemini($base64, $mimeType, $model ?: 'gemini-1.5-flash', $apiKey),

            default => $this->sendToAnthropic([
                'model'      => $model ?: 'claude-opus-4-8',
                'max_tokens' => 2048,
                'system'     => $this->systemPrompt(),
                'messages'   => [[
                    'role'    => 'user',
                    'content' => [
                        ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $mimeType, 'data' => $base64]],
                        ['type' => 'text',  'text'   => $this->userPrompt()],
                    ],
                ]],
            ], $apiKey),
        };
    }

    private function callAnthropicPdf(string $filePath, string $model, string $apiKey): array
    {
        $bytes  = Storage::disk('local')->get($filePath);
        $base64 = base64_encode($bytes);

        $resp = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'anthropic-beta'    => 'pdfs-2024-09-25',
            'content-type'      => 'application/json',
        ])->timeout(120)->post('https://api.anthropic.com/v1/messages', [
            'model'      => $model ?: 'claude-opus-4-8',
            'max_tokens' => 4096,
            'system'     => $this->systemPrompt(),
            'messages'   => [[
                'role'    => 'user',
                'content' => [
                    [
                        'type'   => 'document',
                        'source' => [
                            'type'       => 'base64',
                            'media_type' => 'application/pdf',
                            'data'       => $base64,
                        ],
                    ],
                    ['type' => 'text', 'text' => $this->userPrompt()],
                ],
            ]],
        ]);

        if (!$resp->successful()) {
            Log::warning('Anthropic PDF API failed, falling back to text extraction', [
                'status' => $resp->status(),
                'body'   => substr($resp->body(), 0, 300),
            ]);
            $text = $this->extractPdfText($filePath);
            return $this->callText($text, 'anthropic', $model, $apiKey);
        }

        return $this->parseJsonResponse($resp->json('content.0.text', ''));
    }

    private function callText(string $text, string $provider, string $model, string $apiKey): array
    {
        $userContent = "Here is the extracted text from a financial document:\n\n{$text}\n\n" . $this->userPrompt();

        return match ($provider) {
            'openai' => $this->sendToOpenAI([
                'model'      => $model ?: 'gpt-4o',
                'max_tokens' => 2048,
                'messages'   => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    ['role' => 'user',   'content' => $userContent],
                ],
            ], $apiKey),

            default => $this->sendToAnthropic([
                'model'      => $model ?: 'claude-sonnet-4-6',
                'max_tokens' => 2048,
                'system'     => $this->systemPrompt(),
                'messages'   => [['role' => 'user', 'content' => $userContent]],
            ], $apiKey),
        };
    }

    private function sendToAnthropic(array $payload, string $apiKey): array
    {
        $resp = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->timeout(90)->post('https://api.anthropic.com/v1/messages', $payload);

        if (!$resp->successful()) {
            throw new \RuntimeException('Anthropic API error: ' . $resp->body());
        }

        return $this->parseJsonResponse($resp->json('content.0.text', ''));
    }

    private function sendToOpenAI(array $payload, string $apiKey): array
    {
        $resp = Http::withToken($apiKey)
            ->withHeaders(['content-type' => 'application/json'])
            ->timeout(90)
            ->post('https://api.openai.com/v1/chat/completions', $payload);

        if (!$resp->successful()) {
            throw new \RuntimeException('OpenAI API error: ' . $resp->body());
        }

        return $this->parseJsonResponse($resp->json('choices.0.message.content', ''));
    }

    private function sendToGemini(string $base64, string $mimeType, string $model, string $apiKey): array
    {
        $resp = Http::timeout(90)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                'system_instruction' => ['parts' => [['text' => $this->systemPrompt()]]],
                'contents' => [[
                    'parts' => [
                        ['text' => $this->userPrompt()],
                        ['inline_data' => ['mime_type' => $mimeType, 'data' => $base64]],
                    ],
                ]],
                'generationConfig' => ['maxOutputTokens' => 2048],
            ]);

        if (!$resp->successful()) {
            throw new \RuntimeException('Gemini API error: ' . $resp->body());
        }

        return $this->parseJsonResponse($resp->json('candidates.0.content.parts.0.text', ''));
    }

    private function resolveModel(string $provider, ?string $stored, bool $isImage): string
    {
        $providerDefaults = [
            'anthropic' => $isImage ? 'claude-opus-4-8'    : 'claude-sonnet-4-6',
            'openai'    => $isImage ? 'gpt-4o'             : 'gpt-4o-mini',
            'gemini'    => $isImage ? 'gemini-1.5-flash'   : 'gemini-1.5-flash',
        ];

        $providerPrefixes = [
            'anthropic' => ['claude'],
            'openai'    => ['gpt-', 'o1', 'o3', 'o4'],
            'gemini'    => ['gemini'],
        ];

        $default = $providerDefaults[$provider] ?? $providerDefaults['anthropic'];

        if (!$stored) return $default;

        // If stored model belongs to a different provider, ignore it and use default
        $validPrefixes = $providerPrefixes[$provider] ?? [];
        foreach ($validPrefixes as $prefix) {
            if (str_starts_with($stored, $prefix)) return $stored;
        }

        return $default;
    }

    private function parseJsonResponse(string $text): array
    {
        if (preg_match('/```json\s*([\s\S]*?)\s*```/', $text, $m)) {
            $json = $m[1];
        } elseif (preg_match('/\{[\s\S]*\}/', $text, $m)) {
            $json = $m[0];
        } else {
            $json = $text;
        }

        $parsed = json_decode($json, true);
        if (!is_array($parsed)) {
            throw new \RuntimeException('Could not parse AI response as JSON. Raw: ' . substr($text, 0, 500));
        }

        return $parsed;
    }

    private function extractPdfText(string $filePath): string
    {
        $absPath = Storage::disk('local')->path($filePath);

        // Try pdftotext (poppler) if available
        if (function_exists('shell_exec')) {
            $tmp  = sys_get_temp_dir() . '/si_' . uniqid() . '.txt';
            $cmd  = "pdftotext " . escapeshellarg($absPath) . " " . escapeshellarg($tmp) . " 2>/dev/null";
            shell_exec($cmd);
            if (file_exists($tmp) && filesize($tmp) > 0) {
                $text = file_get_contents($tmp);
                @unlink($tmp);
                return $text;
            }
        }

        // Fallback: read raw bytes and strip non-printable chars
        $raw = Storage::disk('local')->get($filePath);
        return preg_replace('/[^\x20-\x7E\n]/', ' ', $raw);
    }

    private function systemPrompt(): string
    {
        return <<<SYSTEM
        You are a financial transaction extraction assistant specialised in Indian finance.
        You receive financial documents — screenshots of UPI apps (GPay, PhonePe, Paytm, BHIM),
        bank statements, credit card statements, salary slips, receipts, invoices — and extract
        all transactions from them.

        ALWAYS respond with a single JSON object in this exact schema:
        {
          "source_type": "upi_screenshot | bank_statement | credit_card_statement | receipt | salary_slip | other",
          "notes": "Brief description of what you found",
          "transactions": [
            {
              "date": "YYYY-MM-DD",
              "description": "Merchant or description",
              "merchant": "Merchant name if identifiable",
              "amount": 1234.56,
              "type": "expense | income | transfer | investment",
              "suggested_category": "food_dining | transport | shopping | entertainment | healthcare | utilities | education | rent | salary | investment | other",
              "payment_method": "upi | card | cash | netbanking | other",
              "confidence": 0.95,
              "notes": "Optional extra info"
            }
          ]
        }

        Rules:
        - Amounts must always be positive numbers
        - Use "expense" for debits/payments, "income" for credits/receipts
        - For UPI, payment_method = "upi"
        - If date is unclear, use today's date in IST
        - If you cannot find any transactions, return an empty transactions array
        - Do not invent data — only extract what is clearly visible
        - Respond ONLY with the JSON block, no other text
        SYSTEM;
    }

    private function userPrompt(): string
    {
        return 'Please extract all financial transactions from this document/screenshot and return the JSON as specified.';
    }

    private function parseDate(?string $date): ?string
    {
        if (!$date) return today()->toDateString();
        try {
            return \Carbon\Carbon::parse($date)->toDateString();
        } catch (\Throwable) {
            return today()->toDateString();
        }
    }
}
