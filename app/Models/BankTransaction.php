<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankTransaction extends Model {
    use SoftDeletes;
    protected $fillable = ['user_id','bank_account_id','type','amount','balance_after','description','merchant','reference_no','transaction_date','category','source','raw_text'];
    protected $casts = ['amount' => 'float', 'balance_after' => 'float', 'transaction_date' => 'date'];
    public function account(): BelongsTo { return $this->belongsTo(BankAccount::class, 'bank_account_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
