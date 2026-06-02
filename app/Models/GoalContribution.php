<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoalContribution extends Model
{
    protected $fillable = ['goal_id', 'user_id', 'amount', 'note', 'source'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function goal(): BelongsTo { return $this->belongsTo(Goal::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
