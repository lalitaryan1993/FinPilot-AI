<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'name', 'provider', 'category',
        'amount', 'currency', 'billing_cycle',
        'next_billing_date', 'started_at', 'is_active',
        'auto_detected', 'usage_score', 'cancel_url', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount'            => 'decimal:2',
            'next_billing_date' => 'date',
            'started_at'        => 'date',
            'is_active'         => 'boolean',
            'auto_detected'     => 'boolean',
            'metadata'          => 'array',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function annualCost(): float
    {
        return match($this->billing_cycle) {
            'daily'     => $this->amount * 365,
            'weekly'    => $this->amount * 52,
            'monthly'   => $this->amount * 12,
            'quarterly' => $this->amount * 4,
            'annually'  => $this->amount,
            default     => $this->amount * 12,
        };
    }

    public function isDueSoon(int $days = 7): bool
    {
        return $this->is_active && $this->next_billing_date->diffInDays(now()) <= $days;
    }

    public function scopeActive($query): mixed { return $query->where('is_active', true); }
}
