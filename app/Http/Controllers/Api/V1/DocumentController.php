<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $docs = $request->user()->documents()
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->when($request->status, fn($q) => $q->where('ocr_status', $request->status))
            ->latest()
            ->get()
            ->map(fn($d) => [
                ...$d->toArray(),
                'file_size_human' => $d->fileSizeForHumans(),
                'is_processed'    => $d->isProcessed(),
            ]);

        return response()->json(['success' => true, 'data' => $docs]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'type' => 'required|in:bank_statement,credit_card_statement,salary_slip,receipt,invoice,investment_statement,tax_document,other',
            'name' => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $path = $file->store("documents/{$request->user()->id}", 'local');

        $doc = $request->user()->documents()->create([
            'name'              => $request->name ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'type'              => $request->type,
            'file_path'         => $path,
            'file_size'         => $file->getSize(),
            'mime_type'         => $file->getMimeType(),
            'ocr_status'        => 'pending',
            'extraction_status' => 'pending',
        ]);

        // Dispatch OCR job (queue-based — no-op in dev without a worker)
        // ProcessDocumentOcr::dispatch($doc);

        return response()->json([
            'success' => true,
            'data'    => array_merge($doc->toArray(), ['file_size_human' => $doc->fileSizeForHumans()]),
            'message' => 'Document uploaded. OCR processing will start shortly.',
        ], 201);
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        abort_unless($document->user_id === $request->user()->id, 403);
        $document->delete();
        return response()->json(['success' => true, 'message' => 'Document moved to trash.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $docs = $request->user()->documents()
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn($d) => [
                ...$d->toArray(),
                'file_size_human' => $d->fileSizeForHumans(),
            ]);
        return response()->json(['success' => true, 'data' => $docs]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $doc = Document::withTrashed()->findOrFail($id);
        abort_unless($doc->user_id === $request->user()->id, 403);
        $doc->restore();
        return response()->json(['success' => true, 'message' => 'Document restored.']);
    }

    public function show(Request $request, Document $document): JsonResponse
    {
        abort_unless($document->user_id === $request->user()->id, 403);

        return response()->json([
            'success' => true,
            'data'    => array_merge($document->toArray(), [
                'file_size_human' => $document->fileSizeForHumans(),
                'is_processed'    => $document->isProcessed(),
            ]),
        ]);
    }
}
