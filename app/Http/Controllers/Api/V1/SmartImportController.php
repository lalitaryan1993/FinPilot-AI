<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessSmartImportJob;
use App\Models\Category;
use App\Models\Expense;
use App\Models\IncomeSource;
use App\Models\SmartImport;
use App\Models\SmartImportItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SmartImportController extends Controller
{
    // ── List user imports ─────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $imports = $request->user()
            ->smartImports()
            ->with(['items' => fn($q) => $q->where('status', 'pending')])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn($i) => $this->formatImport($i));

        return response()->json(['success' => true, 'data' => $imports]);
    }

    // ── Show single import with all items ─────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $import = $request->user()->smartImports()->with('items')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $this->formatImport($import)]);
    }

    // ── Upload a file and process with AI (synchronous) ──────────
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:20480|mimes:jpeg,jpg,png,webp,gif,pdf',
        ]);

        $file     = $request->file('file');
        $path     = $file->store("smart-imports/{$request->user()->id}", 'local');
        $mimeType = $file->getMimeType();
        $fileType = str_starts_with($mimeType, 'image/') ? 'image' : 'pdf';

        $import = SmartImport::create([
            'user_id'       => $request->user()->id,
            'original_name' => $file->getClientOriginalName(),
            'file_path'     => $path,
            'file_type'     => $fileType,
            'mime_type'     => $mimeType,
            'file_size'     => $file->getSize(),
            'status'        => 'pending',
        ]);

        // Process synchronously — no queue worker needed.
        // Allow up to 3 minutes for the AI API call.
        set_time_limit(180);

        try {
            (new ProcessSmartImportJob($import))->handle();
        } catch (\Throwable) {
            // The job itself writes the failed status + error_message.
        }

        // Return the completed import with all extracted items.
        $import->refresh()->load('items');

        $msg = match ($import->status) {
            'done'   => $import->total_items > 0
                            ? "Found {$import->total_items} transaction(s). Review and confirm below."
                            : 'No transactions detected in this file.',
            'failed' => $import->error_message ?? 'AI processing failed.',
            default  => 'Processing…',
        };

        return response()->json([
            'success' => true,
            'data'    => $this->formatImport($import),
            'message' => $msg,
        ], 201);
    }

    // ── Poll status of a single import ────────────────────────────
    public function status(Request $request, int $id): JsonResponse
    {
        $import = $request->user()->smartImports()->with('items')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $this->formatImport($import)]);
    }

    // ── Confirm a single item → create Expense or IncomeSource ───
    public function confirmItem(Request $request, int $importId, int $itemId): JsonResponse
    {
        $import = $request->user()->smartImports()->findOrFail($importId);
        $item   = $import->items()->where('id', $itemId)->where('status', 'pending')->firstOrFail();

        $validated = $request->validate([
            'description'    => 'nullable|string|max:255',
            'amount'         => 'nullable|numeric|min:0.01',
            'transaction_date'=> 'nullable|date',
            'category_slug'  => 'nullable|string',
            'payment_method' => 'nullable|string',
            'notes'          => 'nullable|string|max:500',
        ]);

        // Merge overrides
        $description = $validated['description'] ?? $item->description;
        $amount      = $validated['amount']       ?? $item->amount;
        $date        = $validated['transaction_date'] ?? $item->transaction_date?->toDateString() ?? today()->toDateString();
        $payment     = $validated['payment_method']   ?? $item->payment_method ?? 'other';
        $notes       = $validated['notes'] ?? null;

        $record = null;

        if ($item->type === 'expense' || $item->type === 'transfer') {
            $category = $this->resolveCategory($request->user()->id, $validated['category_slug'] ?? $item->suggested_category);

            $record = Expense::create([
                'user_id'        => $request->user()->id,
                'category_id'    => $category?->id,
                'description'    => $description,
                'amount'         => $amount,
                'currency'       => 'INR',
                'expense_date'   => $date,
                'payment_method' => $payment,
                'merchant'       => $item->merchant,
                'notes'          => $notes,
                'source'         => 'ai_extracted',
                'ai_confidence'  => $item->confidence,
            ]);

        } elseif ($item->type === 'income') {
            $record = IncomeSource::create([
                'user_id'    => $request->user()->id,
                'name'       => $description,
                'type'       => 'other',
                'amount'     => $amount,
                'frequency'  => 'one_time',
                'currency'   => 'INR',
                'started_at' => $date,
                'notes'      => $notes,
                'is_active'  => true,
            ]);
        }

        $item->update([
            'status'                => 'confirmed',
            'confirmed_record_id'   => $record?->id,
            'confirmed_record_type' => $record ? get_class($record) : null,
        ]);

        $import->increment('confirmed_count');

        return response()->json([
            'success' => true,
            'data'    => $item->fresh(),
            'message' => 'Transaction confirmed and added.',
        ]);
    }

    // ── Dismiss a single item ─────────────────────────────────────
    public function dismissItem(Request $request, int $importId, int $itemId): JsonResponse
    {
        $import = $request->user()->smartImports()->findOrFail($importId);
        $item   = $import->items()->where('id', $itemId)->where('status', 'pending')->firstOrFail();

        $item->update(['status' => 'dismissed']);
        $import->increment('dismissed_count');

        return response()->json(['success' => true, 'message' => 'Item dismissed.']);
    }

    // ── Confirm ALL pending items with defaults ───────────────────
    public function confirmAll(Request $request, int $importId): JsonResponse
    {
        $import = $request->user()->smartImports()->with('items')->findOrFail($importId);
        $pending = $import->items()->where('status', 'pending')->get();

        $count = 0;
        foreach ($pending as $item) {
            $category = $this->resolveCategory($request->user()->id, $item->suggested_category);

            if ($item->type === 'expense' || $item->type === 'transfer') {
                $record = Expense::create([
                    'user_id'        => $request->user()->id,
                    'category_id'    => $category?->id,
                    'description'    => $item->description,
                    'amount'         => $item->amount,
                    'currency'       => 'INR',
                    'expense_date'   => $item->transaction_date?->toDateString() ?? today()->toDateString(),
                    'payment_method' => $item->payment_method ?? 'other',
                    'merchant'       => $item->merchant,
                    'source'         => 'ai_extracted',
                    'ai_confidence'  => $item->confidence,
                ]);
            } elseif ($item->type === 'income') {
                $record = IncomeSource::create([
                    'user_id'    => $request->user()->id,
                    'name'       => $item->description,
                    'type'       => 'other',
                    'amount'     => $item->amount,
                    'frequency'  => 'one_time',
                    'currency'   => 'INR',
                    'started_at' => $item->transaction_date?->toDateString() ?? today()->toDateString(),
                    'is_active'  => true,
                ]);
            } else {
                $record = null;
            }

            $item->update([
                'status'                => 'confirmed',
                'confirmed_record_id'   => $record?->id,
                'confirmed_record_type' => $record ? get_class($record) : null,
            ]);
            $count++;
        }

        $import->increment('confirmed_count', $count);

        return response()->json([
            'success' => true,
            'message' => "{$count} transaction(s) confirmed and added to your records.",
            'count'   => $count,
        ]);
    }

    // ── Delete an import (and its items) ─────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $import = $request->user()->smartImports()->findOrFail($id);
        Storage::disk('local')->delete($import->file_path);
        $import->delete();

        return response()->json(['success' => true, 'message' => 'Import deleted.']);
    }

    // ── Helpers ──────────────────────────────────────────────────
    private function formatImport(SmartImport $import): array
    {
        return [
            'id'               => $import->id,
            'original_name'    => $import->original_name,
            'file_type'        => $import->file_type,
            'file_size_human'  => $import->fileSizeForHumans(),
            'status'           => $import->status,
            'error_message'    => $import->error_message,
            'source_type'      => $import->source_type,
            'ai_notes'         => $import->ai_notes,
            'total_items'      => $import->total_items,
            'confirmed_count'  => $import->confirmed_count,
            'dismissed_count'  => $import->dismissed_count,
            'items'            => $import->items->map(fn($i) => $this->formatItem($i))->values(),
            'created_at'       => $import->created_at,
        ];
    }

    private function formatItem(SmartImportItem $item): array
    {
        return [
            'id'                 => $item->id,
            'type'               => $item->type,
            'amount'             => (float) $item->amount,
            'description'        => $item->description,
            'merchant'           => $item->merchant,
            'transaction_date'   => $item->transaction_date?->toDateString(),
            'suggested_category' => $item->suggested_category,
            'payment_method'     => $item->payment_method,
            'confidence'         => (float) $item->confidence,
            'status'             => $item->status,
            'notes'              => $item->notes,
        ];
    }

    private function resolveCategory(int $userId, ?string $slug): ?Category
    {
        if (!$slug) return null;

        // Map common AI category slugs to our category names
        $nameMap = [
            'food_dining'   => ['Food', 'Dining', 'Restaurant', 'Groceries'],
            'transport'     => ['Transport', 'Travel', 'Fuel', 'Uber', 'Ola'],
            'shopping'      => ['Shopping', 'Clothing', 'Fashion'],
            'entertainment' => ['Entertainment', 'Movies', 'Games'],
            'healthcare'    => ['Healthcare', 'Medical', 'Pharmacy', 'Health'],
            'utilities'     => ['Utilities', 'Electricity', 'Internet', 'Mobile'],
            'education'     => ['Education', 'School', 'College'],
            'rent'          => ['Rent', 'Housing'],
        ];

        $names = $nameMap[$slug] ?? [ucfirst(str_replace('_', ' ', $slug))];

        return Category::forUser($userId)
            ->where(function ($q) use ($names) {
                foreach ($names as $name) {
                    $q->orWhere('name', 'like', "%{$name}%");
                }
            })
            ->first();
    }
}
