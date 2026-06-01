<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SmartImport extends Model
{
    protected $fillable = [
        'user_id', 'original_name', 'file_path', 'file_type', 'mime_type', 'file_size',
        'status', 'error_message', 'raw_ai_response', 'source_type', 'ai_notes',
        'total_items', 'confirmed_count', 'dismissed_count',
    ];

    protected function casts(): array
    {
        return [
            'raw_ai_response' => 'array',
            'file_size'       => 'integer',
            'total_items'     => 'integer',
            'confirmed_count' => 'integer',
            'dismissed_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SmartImportItem::class);
    }

    public function pendingItems(): HasMany
    {
        return $this->hasMany(SmartImportItem::class)->where('status', 'pending');
    }

    public function fileSizeForHumans(): string
    {
        $bytes = $this->file_size ?? 0;
        foreach (['B', 'KB', 'MB', 'GB'] as $unit) {
            if ($bytes < 1024) return round($bytes, 1) . ' ' . $unit;
            $bytes /= 1024;
        }
        return $bytes . ' TB';
    }
}
