<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Family extends Model
{
    protected $fillable = ['name', 'owner_id', 'invite_code', 'currency', 'settings'];

    protected function casts(): array
    {
        return ['settings' => 'array'];
    }

    protected static function booted(): void
    {
        static::creating(function (Family $family) {
            $family->invite_code = strtoupper(Str::random(8));
        });
    }

    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'owner_id'); }
    public function members(): HasMany { return $this->hasMany(FamilyMember::class); }
    public function users(): HasMany { return $this->hasMany(User::class); }
    public function budgets(): HasMany { return $this->hasMany(Budget::class); }
    public function goals(): HasMany { return $this->hasMany(Goal::class); }
    public function expenses(): HasMany { return $this->hasMany(Expense::class); }
}
