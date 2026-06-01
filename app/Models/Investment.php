<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Investment extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'name', 'type', 'symbol', 'isin', 'units', 'buy_price',
        'current_price', 'invested_amount', 'current_value', 'is_sip',
        'sip_amount', 'sip_day', 'started_at', 'maturity_at', 'status',
        'price_updated_at', 'metadata',
    ];

    protected $casts = [
        'units'            => 'float',
        'buy_price'        => 'float',
        'current_price'    => 'float',
        'invested_amount'  => 'float',
        'current_value'    => 'float',
        'sip_amount'       => 'float',
        'is_sip'           => 'boolean',
        'started_at'       => 'date',
        'maturity_at'      => 'date',
        'price_updated_at' => 'datetime',
        'metadata'         => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gainLoss(): float
    {
        $value = $this->current_value ?? $this->invested_amount;
        return round($value - $this->invested_amount, 2);
    }

    public function gainLossPercent(): float
    {
        if ($this->invested_amount <= 0) return 0;
        return round(($this->gainLoss() / $this->invested_amount) * 100, 2);
    }

    public function currentValue(): float
    {
        if ($this->current_value !== null) return (float) $this->current_value;
        if ($this->units && $this->current_price) return round($this->units * $this->current_price, 2);
        return (float) $this->invested_amount;
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
