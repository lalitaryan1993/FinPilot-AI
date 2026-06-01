<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = [
        'user_id', 'parent_id', 'name', 'slug',
        'icon', 'color', 'type', 'is_system',
        'ai_keywords', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_system'   => 'boolean',
            'ai_keywords' => 'array',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function parent(): BelongsTo { return $this->belongsTo(Category::class, 'parent_id'); }
    public function children(): HasMany { return $this->hasMany(Category::class, 'parent_id'); }
    public function expenses(): HasMany { return $this->hasMany(Expense::class); }

    public function scopeSystem($query): mixed { return $query->where('is_system', true); }
    public function scopeForUser($query, ?int $userId): mixed
    {
        return $query->where(fn($q) => $q->whereNull('user_id')->orWhere('user_id', $userId));
    }
}
