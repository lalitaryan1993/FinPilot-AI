<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Expense extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'user_id', 'family_id', 'category_id', 'account_id',
        'description', 'amount', 'currency', 'base_amount', 'exchange_rate',
        'expense_date', 'payment_method', 'merchant', 'notes', 'tags',
        'receipt_path', 'is_recurring', 'recurring_id', 'source',
        'ai_confidence', 'is_split', 'split_group_id',
        'approval_status', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'         => 'decimal:2',
            'base_amount'    => 'decimal:2',
            'exchange_rate'  => 'decimal:6',
            'ai_confidence'  => 'decimal:4',
            'expense_date'   => 'date',
            'approved_at'    => 'datetime',
            'is_recurring'   => 'boolean',
            'is_split'       => 'boolean',
            'tags'           => 'array',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['description', 'amount', 'category_id', 'expense_date']);
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function family(): BelongsTo { return $this->belongsTo(Family::class); }
    public function category(): BelongsTo { return $this->belongsTo(Category::class); }
    public function account(): BelongsTo { return $this->belongsTo(Account::class); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function recurringParent(): BelongsTo { return $this->belongsTo(Expense::class, 'recurring_id'); }
    public function recurringChildren(): HasMany { return $this->hasMany(Expense::class, 'recurring_id'); }

    public function scopeForUser($query, int $userId): mixed
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForMonth($query, string $month): mixed
    {
        return $query->whereYear('expense_date', substr($month, 0, 4))
                     ->whereMonth('expense_date', substr($month, 5, 2));
    }
}
