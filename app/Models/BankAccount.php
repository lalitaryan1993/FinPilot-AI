<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankAccount extends Model {
    use SoftDeletes;
    protected $fillable = ['user_id','account_name','bank_name','account_type','balance','currency','account_number','color','is_active'];
    protected $casts = ['balance' => 'float', 'is_active' => 'boolean'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function transactions(): HasMany { return $this->hasMany(BankTransaction::class); }
}
