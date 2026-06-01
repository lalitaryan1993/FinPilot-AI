<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Budget extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'family_id', 'category_id', 'name',
        'amount', 'spent_amount', 'period',
        'period_start', 'period_end', 'rollover',
        'alert_at_percent', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount'           => 'decimal:2',
            'spent_amount'     => 'decimal:2',
            'period_start'     => 'date',
            'period_end'       => 'date',
            'rollover'         => 'boolean',
            'is_active'        => 'boolean',
            'alert_at_percent' => 'integer',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function family(): BelongsTo { return $this->belongsTo(Family::class); }
    public function category(): BelongsTo { return $this->belongsTo(Category::class); }

    public function remainingAmount(): float { return max(0, $this->amount - $this->spent_amount); }
    public function spentPercent(): float
    {
        if ($this->amount <= 0) return 0;
        return ($this->spent_amount / $this->amount) * 100;
    }

    public function isBreached(): bool { return $this->spent_amount > $this->amount; }
    public function isNearLimit(): bool { return $this->spentPercent() >= $this->alert_at_percent; }

    public function scopeActive($query): mixed { return $query->where('is_active', true); }

    public function scopeCurrentMonth($query): mixed
    {
        return $query->whereDate('period_start', '<=', now())
                     ->whereDate('period_end', '>=', now());
    }
}
