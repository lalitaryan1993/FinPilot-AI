<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Models\BankAccount;
use App\Models\BankTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BankAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accounts = $request->user()->bankAccounts()->with(['transactions' => fn($q) => $q->latest()->limit(5)])->get();
        return response()->json(['success' => true, 'data' => $accounts]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'account_name'   => 'required|string|max:100',
            'bank_name'      => 'required|string|max:100',
            'account_type'   => 'required|in:savings,current,credit_card,wallet,fd',
            'balance'        => 'required|numeric',
            'account_number' => 'nullable|string|max:10',
            'color'          => 'nullable|string|max:7',
        ]);
        $account = $request->user()->bankAccounts()->create([
            ...$v,
            'currency' => $request->user()->currency ?? 'INR',
            'color'    => $v['color'] ?? '#3B82F6',
        ]);
        return response()->json(['success' => true, 'data' => $account, 'message' => 'Bank account added.'], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $account = $request->user()->bankAccounts()->findOrFail($id);
        $v = $request->validate([
            'account_name'   => 'sometimes|string|max:100',
            'bank_name'      => 'sometimes|string|max:100',
            'account_type'   => 'sometimes|in:savings,current,credit_card,wallet,fd',
            'balance'        => 'sometimes|numeric',
            'account_number' => 'nullable|string|max:10',
            'color'          => 'nullable|string|max:7',
            'is_active'      => 'sometimes|boolean',
        ]);
        $account->update($v);
        return response()->json(['success' => true, 'data' => $account->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $account = $request->user()->bankAccounts()->findOrFail($id);
        $account->delete();
        return response()->json(['success' => true, 'message' => 'Account removed.']);
    }

    // ── Single transaction CRUD ───────────────────────────────────
    public function showTransaction(Request $request, int $id): JsonResponse
    {
        $txn = BankTransaction::where('user_id', $request->user()->id)->findOrFail($id);
        return response()->json(['success' => true, 'data' => $txn->load('account')]);
    }

    public function updateTransaction(Request $request, int $id): JsonResponse
    {
        $txn = BankTransaction::where('user_id', $request->user()->id)->findOrFail($id);
        $v = $request->validate([
            'type'             => 'sometimes|in:credit,debit',
            'amount'           => 'sometimes|numeric|min:0.01',
            'description'      => 'sometimes|string|max:255',
            'merchant'         => 'nullable|string|max:255',
            'reference_no'     => 'nullable|string|max:100',
            'transaction_date' => 'sometimes|date',
            'category'         => 'nullable|string|max:100',
        ]);

        // Adjust account balance if type or amount changed
        if ((isset($v['type']) || isset($v['amount'])) && $txn->account) {
            $account   = $txn->account;
            $oldDelta  = $txn->type === 'credit' ? (float)$txn->amount : -(float)$txn->amount;
            $newType   = $v['type']   ?? $txn->type;
            $newAmount = isset($v['amount']) ? (float)$v['amount'] : (float)$txn->amount;
            $newDelta  = $newType === 'credit' ? $newAmount : -$newAmount;
            $account->increment('balance', $newDelta - $oldDelta);
            $account->refresh();
            $v['balance_after'] = $account->balance;
        }

        $txn->update($v);
        return response()->json(['success' => true, 'data' => $txn->fresh()->load('account'), 'message' => 'Transaction updated.']);
    }

    public function destroyTransaction(Request $request, int $id): JsonResponse
    {
        $txn = BankTransaction::where('user_id', $request->user()->id)->findOrFail($id);

        // Reverse the balance effect on the linked account
        if ($txn->account) {
            $delta = $txn->type === 'credit' ? -(float)$txn->amount : (float)$txn->amount;
            $txn->account->increment('balance', $delta);
        }

        $txn->delete();
        return response()->json(['success' => true, 'message' => 'Transaction deleted.']);
    }

    // ── Transactions for one account ─────────────────────────────
    public function transactions(Request $request, int $id): JsonResponse
    {
        $account = $request->user()->bankAccounts()->findOrFail($id);
        $txns = $account->transactions()
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->when($request->date_from, fn($q) => $q->where('transaction_date', '>=', $request->date_from))
            ->when($request->date_to,   fn($q) => $q->where('transaction_date', '<=', $request->date_to))
            ->orderByDesc('transaction_date')->orderByDesc('id')
            ->paginate($request->per_page ?? 50);
        return response()->json(['success' => true, 'data' => $txns]);
    }

    // ── Add single transaction manually ──────────────────────────
    public function addTransaction(Request $request, int $id): JsonResponse
    {
        $account = $request->user()->bankAccounts()->findOrFail($id);
        $v = $request->validate([
            'type'             => 'required|in:credit,debit',
            'amount'           => 'required|numeric|min:0.01',
            'description'      => 'required|string|max:255',
            'merchant'         => 'nullable|string|max:255',
            'reference_no'     => 'nullable|string|max:100',
            'transaction_date' => 'required|date',
            'category'         => 'nullable|string|max:100',
        ]);

        // Update account balance
        $delta = $v['type'] === 'credit' ? $v['amount'] : -$v['amount'];
        $account->increment('balance', $delta);
        $account->refresh();

        $txn = BankTransaction::create([
            ...$v,
            'user_id'         => $request->user()->id,
            'bank_account_id' => $account->id,
            'balance_after'   => $account->balance,
            'source'          => 'manual',
        ]);

        return response()->json(['success' => true, 'data' => $txn->load('account'), 'message' => 'Transaction added.'], 201);
    }

    // ── AI-powered statement / SMS import ────────────────────────
    public function importStatement(Request $request): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|integer',
            'text'       => 'nullable|string',
            'file'       => 'nullable|file|max:20480|mimes:jpeg,jpg,png,webp,pdf',
        ]);

        $account = $request->user()->bankAccounts()->findOrFail($request->account_id);
        $userId  = $request->user()->id;

        // Build prompt
        $systemPrompt = <<<SYSTEM
        You are a bank statement parser. Extract ALL transactions from the provided bank statement or SMS.
        Respond ONLY with a JSON object:
        {
          "transactions": [
            {
              "date": "YYYY-MM-DD",
              "type": "credit|debit",
              "amount": 1234.56,
              "description": "Transaction description",
              "merchant": "Merchant name if identifiable",
              "reference_no": "Reference number if present",
              "balance_after": 45678.90,
              "category": "food_dining|transport|shopping|entertainment|healthcare|utilities|salary|investment|other"
            }
          ],
          "account_summary": {
            "opening_balance": 12345.00,
            "closing_balance": 67890.00
          }
        }
        Rules: amounts always positive, date in YYYY-MM-DD, type is credit for money coming in, debit for money going out. If balance_after is not visible, set null.
        SYSTEM;

        try {
            // Get API key
            $provider = AiSetting::getFor($userId, 'provider') ?? 'anthropic';
            $apiKey   = AiSetting::getFor($userId, "{$provider}.api_key") ?? env(strtoupper($provider) . '_API_KEY');
            foreach (['anthropic', 'openai'] as $fb) {
                if ($apiKey) break;
                $apiKey = AiSetting::getFor($userId, "{$fb}.api_key") ?? env(strtoupper($fb) . '_API_KEY');
                if ($apiKey) $provider = $fb;
            }
            if (!$apiKey) throw new \RuntimeException('No AI API key configured.');

            $rawText = null;
            if ($request->hasFile('file')) {
                $bytes  = file_get_contents($request->file('file')->getRealPath());
                $base64 = base64_encode($bytes);
                $mime   = $request->file('file')->getMimeType();
                $isImage = str_starts_with($mime, 'image/');

                if ($isImage && $provider === 'anthropic') {
                    $resp = Http::withHeaders(['x-api-key' => $apiKey, 'anthropic-version' => '2023-06-01', 'content-type' => 'application/json'])
                        ->timeout(90)->post('https://api.anthropic.com/v1/messages', [
                            'model' => 'claude-opus-4-8', 'max_tokens' => 2048, 'system' => $systemPrompt,
                            'messages' => [['role' => 'user', 'content' => [
                                ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $mime, 'data' => $base64]],
                                ['type' => 'text', 'text' => 'Extract all transactions from this bank statement.'],
                            ]]],
                        ]);
                    $rawText = $resp->json('content.0.text', '');
                } elseif ($isImage && $provider === 'openai') {
                    $resp = Http::withToken($apiKey)->timeout(90)->post('https://api.openai.com/v1/chat/completions', [
                        'model' => 'gpt-4o', 'max_tokens' => 2048,
                        'messages' => [['role' => 'user', 'content' => [
                            ['type' => 'text', 'text' => $systemPrompt . "\n\nExtract all transactions."],
                            ['type' => 'image_url', 'image_url' => ['url' => "data:{$mime};base64,{$base64}"]],
                        ]]],
                    ]);
                    $rawText = $resp->json('choices.0.message.content', '');
                } else {
                    $rawText = "PDF text: " . preg_replace('/[^\x20-\x7E\n]/', ' ', $bytes);
                }
            } elseif ($request->text) {
                $rawText = $request->text;
            } else {
                return response()->json(['success' => false, 'message' => 'Provide a file or SMS text.'], 422);
            }

            // For text input or PDF, call text API
            if (!$request->hasFile('file') || !str_starts_with($request->file('file')->getMimeType(), 'image/')) {
                if ($provider === 'anthropic') {
                    $resp = Http::withHeaders(['x-api-key' => $apiKey, 'anthropic-version' => '2023-06-01', 'content-type' => 'application/json'])
                        ->timeout(60)->post('https://api.anthropic.com/v1/messages', [
                            'model' => 'claude-sonnet-4-6', 'max_tokens' => 2048, 'system' => $systemPrompt,
                            'messages' => [['role' => 'user', 'content' => $rawText]],
                        ]);
                    $rawText = $resp->json('content.0.text', '');
                } else {
                    $resp = Http::withToken($apiKey)->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
                        'model' => 'gpt-4o-mini', 'max_tokens' => 2048,
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $rawText],
                        ],
                    ]);
                    $rawText = $resp->json('choices.0.message.content', '');
                }
            }

            // Parse JSON
            if (preg_match('/```json\s*([\s\S]*?)\s*```/', $rawText, $m)) $json = $m[1];
            elseif (preg_match('/\{[\s\S]*\}/', $rawText, $m)) $json = $m[0];
            else $json = $rawText;

            $parsed = json_decode($json, true);
            if (!is_array($parsed) || empty($parsed['transactions'])) {
                return response()->json(['success' => false, 'message' => 'Could not parse any transactions from the input.'], 422);
            }

            $created = [];
            foreach ($parsed['transactions'] as $tx) {
                $amount = abs((float) ($tx['amount'] ?? 0));
                if ($amount <= 0) continue;

                $delta = ($tx['type'] ?? 'debit') === 'credit' ? $amount : -$amount;
                $account->increment('balance', $delta);
                $account->refresh();

                $t = BankTransaction::create([
                    'user_id'          => $userId,
                    'bank_account_id'  => $account->id,
                    'type'             => $tx['type'] ?? 'debit',
                    'amount'           => $amount,
                    'description'      => $tx['description'] ?? 'Imported transaction',
                    'merchant'         => $tx['merchant'] ?? null,
                    'reference_no'     => $tx['reference_no'] ?? null,
                    'transaction_date' => \Carbon\Carbon::parse($tx['date'] ?? now())->toDateString(),
                    'category'         => $tx['category'] ?? null,
                    'balance_after'    => $tx['balance_after'] ?? $account->balance,
                    'source'           => 'statement_import',
                ]);
                $created[] = $t;
            }

            // Update closing balance if provided
            if (!empty($parsed['account_summary']['closing_balance'])) {
                $account->update(['balance' => $parsed['account_summary']['closing_balance']]);
            }

            return response()->json([
                'success'  => true,
                'imported' => count($created),
                'message'  => count($created) . ' transaction(s) imported successfully.',
                'data'     => $created,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ── All transactions across all accounts (money flow) ────────
    public function moneyFlow(Request $request): JsonResponse
    {
        $user = $request->user();
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo   = $request->date_to   ?? now()->endOfMonth()->toDateString();
        $type     = $request->type; // credit | debit | null = both

        // Bank transactions
        $bankTxns = BankTransaction::where('user_id', $user->id)
            ->with('account:id,account_name,bank_name,color,account_type')
            ->when($type, fn($q) => $q->where('type', $type))
            ->whereBetween('transaction_date', [$dateFrom, $dateTo])
            ->orderByDesc('transaction_date')->orderByDesc('id')
            ->get()
            ->map(fn($t) => [
                'id'           => 'bt_' . $t->id,
                'raw_id'       => $t->id,
                'source_type'  => 'bank',
                'type'         => $t->type,
                'amount'       => (float) $t->amount,
                'description'  => $t->description,
                'merchant'     => $t->merchant,
                'date'         => $t->transaction_date->toDateString(),
                'category'     => $t->category,
                'balance_after'=> $t->balance_after,
                'reference_no' => $t->reference_no,
                'source'       => $t->source,
                'account'      => $t->account ? [
                    'name'  => $t->account->account_name,
                    'bank'  => $t->account->bank_name,
                    'color' => $t->account->color,
                    'type'  => $t->account->account_type,
                ] : null,
            ]);

        // Expenses as debits (if no type filter or debit)
        $expenses = [];
        if (!$type || $type === 'debit') {
            $expenses = $user->expenses()
                ->with('category:id,name,icon,color')
                ->whereBetween('expense_date', [$dateFrom, $dateTo])
                ->orderByDesc('expense_date')->orderByDesc('id')
                ->get()
                ->map(fn($e) => [
                    'id'          => 'exp_' . $e->id,
                    'raw_id'      => $e->id,
                    'source_type' => 'expense',
                    'type'        => 'debit',
                    'amount'      => (float) $e->amount,
                    'description' => $e->description,
                    'merchant'    => $e->merchant,
                    'date'        => $e->expense_date->toDateString(),
                    'category'    => $e->category?->name,
                    'category_color' => $e->category?->color,
                    'category_icon'  => $e->category?->icon,
                    'payment_method' => $e->payment_method,
                    'account'     => null,
                ]);
        }

        $all = collect([...$bankTxns, ...$expenses])
            ->sortByDesc(fn($t) => $t['date'])
            ->values();

        $totalCredit = $all->where('type', 'credit')->sum('amount');
        $totalDebit  = $all->where('type', 'debit')->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'transactions' => $all,
                'summary' => [
                    'total_credit' => round($totalCredit, 2),
                    'total_debit'  => round($totalDebit, 2),
                    'net_flow'     => round($totalCredit - $totalDebit, 2),
                    'count'        => $all->count(),
                ],
            ],
        ]);
    }
}
