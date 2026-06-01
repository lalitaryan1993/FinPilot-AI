<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialHealthScore extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'score_month', 'total_score',
        'savings_score', 'debt_score', 'emergency_score',
        'goal_score', 'budget_score',
        'savings_rate', 'debt_ratio', 'emergency_months',
        'insights', 'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'score_month'     => 'date',
            'savings_rate'    => 'decimal:3',
            'debt_ratio'      => 'decimal:3',
            'emergency_months'=> 'decimal:2',
            'insights'        => 'array',
            'calculated_at'   => 'datetime',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function grade(): string
    {
        return match(true) {
            $this->total_score >= 85 => 'Excellent',
            $this->total_score >= 70 => 'Good',
            $this->total_score >= 55 => 'Fair',
            $this->total_score >= 40 => 'Needs Work',
            default                  => 'Critical',
        };
    }

    public function gradeColor(): string
    {
        return match($this->grade()) {
            'Excellent'  => '#F5C842',
            'Good'       => '#10B981',
            'Fair'       => '#3B82F6',
            'Needs Work' => '#F59E0B',
            default      => '#EF4444',
        };
    }
}
