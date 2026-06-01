<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmartImportItem extends Model
{
    protected $fillable = [
        'smart_import_id', 'type', 'amount', 'description', 'merchant',
        'transaction_date', 'suggested_category', 'payment_method',
        'confidence', 'status', 'confirmed_record_id', 'confirmed_record_type', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount'           => 'decimal:2',
            'confidence'       => 'decimal:3',
            'transaction_date' => 'date',
        ];
    }

    public function smartImport(): BelongsTo
    {
        return $this->belongsTo(SmartImport::class);
    }
}
