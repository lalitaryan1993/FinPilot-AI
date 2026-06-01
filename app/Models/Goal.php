<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Goal extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'family_id', 'name', 'type',
        'target_amount', 'current_amount', 'monthly_target',
        'target_date', 'priority', 'icon', 'color', 'notes',
        'status', 'completed_at', 'ai_analysis',
    ];

    protected function casts(): array
    {
        return [
            'target_amount'  => 'decimal:2',
            'current_amount' => 'decimal:2',
            'monthly_target' => 'decimal:2',
            'target_date'    => 'date',
            'completed_at'   => 'datetime',
            'ai_analysis'    => 'array',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function family(): BelongsTo { return $this->belongsTo(Family::class); }
    public function contributions(): HasMany { return $this->hasMany(GoalContribution::class); }

    public function progressPercent(): float
    {
        if ($this->target_amount <= 0) return 0;
        return min(100, ($this->current_amount / $this->target_amount) * 100);
    }

    public function remainingAmount(): float
    {
        return max(0, $this->target_amount - $this->current_amount);
    }

    public function scopeActive($query): mixed { return $query->where('status', 'active'); }
}
