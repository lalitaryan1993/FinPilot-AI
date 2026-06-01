<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'name', 'type', 'file_path', 'file_size', 'mime_type',
        'ocr_status', 'ocr_text', 'extraction_status', 'extracted_data',
        'transactions_imported', 'period_from', 'period_to', 'processed_at',
    ];

    protected $casts = [
        'extracted_data'        => 'array',
        'period_from'           => 'date',
        'period_to'             => 'date',
        'processed_at'          => 'datetime',
        'transactions_imported' => 'integer',
        'file_size'             => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fileSizeForHumans(): string
    {
        $bytes = $this->file_size ?? 0;
        if ($bytes < 1024) return "{$bytes} B";
        if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 1) . ' MB';
    }

    public function isProcessed(): bool
    {
        return $this->ocr_status === 'completed' && $this->extraction_status === 'completed';
    }
}
