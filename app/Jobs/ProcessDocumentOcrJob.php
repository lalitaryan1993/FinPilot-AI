<?php

namespace App\Jobs;

use App\Models\Category;
use App\Models\Document;
use App\Models\Expense;
use App\Models\IncomeSource;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessDocumentOcrJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 180;

    public function __construct(public Document $document) {}

    public function handle(): void
    {
        $this->document->update([
            'ocr_status'        => 'processing',
            'extraction_status' => 'processing',
        ]);

        try {
            $transactions = $this->extractTransactions();

            $imported = 0;
            $user     = $this->document->user;

            foreach ($transactions as $tx) {
                $type = strtolower($tx['type'] ?? 'expense');

                $categoryId = $this->resolveCategory($tx['suggested_category'] ?? null, $type, $user->id);
                $date       = $this->parseDate($tx['date'] ?? null);

                if ($type === 'income') {
                    IncomeSource::create([
                        'user_id'     => $user->id,
                        'name'        => $tx['description'] ?? 'Imported Income',
                        'amount'      => abs((float) ($tx['amount'] ?? 0)),
                        'frequency'   => 'one_time',
                        'type'        => 'other',
                        'is_active'   => true,
                        'received_on' => $date,
                        'notes'       => 'Imported from document: ' . $this->document->name,
                    ]);
                } else {
                    Expense::create([
                        'user_id'      => $user->id,
                        'category_id'  => $categoryId,
                        'amount'       => abs((float) ($tx['amount'] ?? 0)),
                        'description'  => $tx['description'] ?? ($tx['merchant'] ?? 'Imported expense'),
                        'expense_date' => $date,
                        'payment_mode' => $tx['payment_method'] ?? 'other',
                        'merchant'     => $tx['merchant'] ?? null,
                        'notes'        => 'Imported from document: ' . $this->document->name,
                    ]);
                }

                $imported++;
            }

            $this->document->update([
                'ocr_status'            => 'completed',
                'extraction_status'     => 'completed',
                'transactions_imported' => $imported,
                'extracted_data'        => ['transactions' => $transactions],
                'processed_at'          => now(),
            ]);

        } catch (\Throwable $e) {
            Log::error('Document OCR processing failed', [
                'document_id' => $this->document->id,
                'error'       => $e->getMessage(),
            ]);

            $this->document->update([
                'ocr_status'        => 'failed',
                'extraction_status' => 'failed',
            ]);
        }
    }

    private function extractTransactions(): array
    {
        $filePath = $this->document->file_path;
        $mimeType = $this->document->mime_type ?? 'application/pdf';

        if ($mimeType === 'application/pdf') {
            $text = $this->extractPdfText($filePath);
            $raw  = $this->callClaudeText($text);
        } else {
            $raw = $this->callClaudeVision($filePath, $mimeType);
        }

        if (!$raw) {
            return [];
        }

        $this->document->update(['ocr_text' => $raw['notes'] ?? null]);

        return $raw['transactions'] ?? [];
    }

    private function callClaudeVision(string $filePath, string $mimeType): ?array
    {
        $fileContents = Storage::get($filePath);
        if (!$fileContents) return null;

        $base64 = base64_encode($fileContents);

        $payload = [
            'model'      => 'claude-opus-4-8',
            'max_tokens' => 4096,
            'system'     => $this->systemPrompt(),
            'messages'   => [[
                'role'    => 'user',
                'content' => [
                    ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $mimeType, 'data' => $base64]],
                    ['type' => 'text',  'text'    => 'Extract all financial transactions from this document. Return strict JSON only.'],
                ],
            ]],
        ];

        return $this->sendToAnthropic($payload);
    }

    private function callClaudeText(string $text): ?array
    {
        $payload = [
            'model'      => 'claude-sonnet-4-6',
            'max_tokens' => 4096,
            'system'     => $this->systemPrompt(),
            'messages'   => [[
                'role'    => 'user',
                'content' => "Extract all financial transactions from the following document text:\n\n{$text}\n\nReturn strict JSON only.",
            ]],
        ];

        return $this->sendToAnthropic($payload);
    }

    private function sendToAnthropic(array $payload): ?array
    {
        $apiKey = config('services.anthropic.key') ?? env('ANTHROPIC_API_KEY');

        $response = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type'      => 'application/json',
        ])->timeout(120)->post('https://api.anthropic.com/v1/messages', $payload);

        if (!$response->successful()) return null;

        $content = $response->json('content.0.text') ?? '';

        // Strip markdown code fences if present
        $json = preg_replace('/^```(?:json)?\n?|\n?```$/s', '', trim($content));

        $parsed = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) return null;

        return $parsed;
    }

    private function extractPdfText(string $filePath): string
    {
        $absolutePath = Storage::path($filePath);
        $output = shell_exec("pdftotext " . escapeshellarg($absolutePath) . " -");

        if ($output) return $output;

        // Fallback: read raw bytes and strip non-printable characters
        $raw = Storage::get($filePath) ?? '';
        return preg_replace('/[^\x20-\x7E\n\r\t]/', ' ', $raw);
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are a financial document parser for Indian bank statements, UPI transaction reports, and financial documents.

Extract ALL transactions and return ONLY a valid JSON object in this exact format:
{
  "source_type": "bank_statement|upi_statement|invoice|receipt|other",
  "notes": "Brief description of the document",
  "transactions": [
    {
      "type": "expense|income|transfer",
      "amount": 1500.00,
      "description": "Transaction description",
      "merchant": "Merchant or sender name if available",
      "date": "YYYY-MM-DD",
      "suggested_category": "food|transport|shopping|utilities|entertainment|healthcare|education|rent|salary|investment|other",
      "payment_method": "upi|card|netbanking|cash|emi|other",
      "confidence": 0.95,
      "notes": "any extra context"
    }
  ]
}

Rules:
- Debit/withdrawal = expense, Credit/deposit = income
- UPI payments are typically expenses
- Salary credits are income
- Always output valid JSON, no explanation text
- Use INR amounts as plain numbers (no ₹ symbol)
- If date is missing, use today's date
PROMPT;
    }

    private function resolveCategory(?string $slug, string $type, int $userId): ?int
    {
        if (!$slug) return null;

        $category = Category::where('slug', $slug)
            ->where(fn($q) => $q->where('user_id', $userId)->orWhereNull('user_id'))
            ->first();

        if (!$category) {
            $category = Category::where('name', 'like', "%{$slug}%")
                ->where('type', $type === 'income' ? 'income' : 'expense')
                ->where(fn($q) => $q->where('user_id', $userId)->orWhereNull('user_id'))
                ->first();
        }

        return $category?->id;
    }

    private function parseDate(?string $date): string
    {
        if (!$date) return now()->toDateString();

        try {
            return Carbon::parse($date)->toDateString();
        } catch (\Throwable) {
            return now()->toDateString();
        }
    }
}
