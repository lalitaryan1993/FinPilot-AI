<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncomeSource extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'name', 'type', 'amount', 'currency',
        'frequency', 'expected_day', 'tax_category',
        'is_active', 'started_at', 'ended_at', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount'     => 'decimal:2',
            'is_active'  => 'boolean',
            'started_at' => 'date',
            'ended_at'   => 'date',
            'metadata'   => 'array',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function monthlyAmount(): float
    {
        return match($this->frequency) {
            'daily'     => $this->amount * 30,
            'weekly'    => $this->amount * 4.33,
            'biweekly'  => $this->amount * 2.17,
            'monthly'   => $this->amount,
            'quarterly' => $this->amount / 3,
            'annually'  => $this->amount / 12,
            default     => 0,
        };
    }

    public function scopeActive($query): mixed { return $query->where('is_active', true); }
}
