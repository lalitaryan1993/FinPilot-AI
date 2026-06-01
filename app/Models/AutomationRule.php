<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutomationRule extends Model
{
    protected $fillable = [
        'user_id', 'name', 'description',
        'trigger_type', 'trigger_config',
        'action_type', 'action_config',
        'is_active', 'last_fired_at', 'fire_count',
    ];

    protected function casts(): array
    {
        return [
            'trigger_config' => 'array',
            'action_config'  => 'array',
            'is_active'      => 'boolean',
            'last_fired_at'  => 'datetime',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function scopeActive($query): mixed { return $query->where('is_active', true); }
}
