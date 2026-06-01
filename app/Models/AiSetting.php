<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class AiSetting extends Model
{
    protected $fillable = ['user_id', 'key', 'value', 'is_encrypted'];

    protected function casts(): array
    {
        return ['is_encrypted' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getDecryptedValue(): ?string
    {
        if (!$this->value) return null;
        if ($this->is_encrypted) {
            try {
                return Crypt::decryptString($this->value);
            } catch (\Throwable) {
                return null;
            }
        }
        return $this->value;
    }

    public static function getFor(int $userId, string $key, mixed $default = null): mixed
    {
        $setting = static::where('user_id', $userId)->where('key', $key)->first();
        if (!$setting) return $default;
        return $setting->is_encrypted ? $setting->getDecryptedValue() : $setting->value;
    }

    public static function setFor(int $userId, string $key, mixed $value, bool $encrypted = false): void
    {
        $stored = $encrypted && $value ? Crypt::encryptString((string) $value) : (string) $value;

        static::updateOrCreate(
            ['user_id' => $userId, 'key' => $key],
            ['value' => $stored, 'is_encrypted' => $encrypted]
        );
    }
}
