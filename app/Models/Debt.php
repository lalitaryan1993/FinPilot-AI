<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Debt extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'name', 'type', 'lender',
        'principal_amount', 'current_balance', 'interest_rate',
        'emi_amount', 'emi_due_day', 'disbursed_at', 'tenure_months',
        'foreclosure_penalty', 'strategy', 'status', 'closed_at', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'principal_amount'     => 'decimal:2',
            'current_balance'      => 'decimal:2',
            'interest_rate'        => 'decimal:3',
            'emi_amount'           => 'decimal:2',
            'foreclosure_penalty'  => 'decimal:3',
            'disbursed_at'         => 'date',
            'closed_at'            => 'date',
            'metadata'             => 'array',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function payments(): HasMany { return $this->hasMany(DebtPayment::class); }

    public function monthlyInterest(): float
    {
        return ($this->current_balance * ($this->interest_rate / 100)) / 12;
    }

    public function emiDueSoon(int $days = 3): bool
    {
        if (!$this->emi_due_day || $this->status !== 'active') return false;
        $dueDate = now()->day($this->emi_due_day);
        if ($dueDate->isPast()) $dueDate->addMonth();
        return now()->diffInDays($dueDate) <= $days;
    }

    public function scopeActive($query): mixed { return $query->where('status', 'active'); }
}
