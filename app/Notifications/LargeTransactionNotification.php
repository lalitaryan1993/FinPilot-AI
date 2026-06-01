<?php

namespace App\Notifications;

use App\Models\Expense;
use Illuminate\Notifications\Notification;

class LargeTransactionNotification extends Notification
{
    public function __construct(public Expense $expense) {}

    public function via(): array { return ['database']; }

    public function toDatabase(): array
    {
        return [
            'type'  => 'alert',
            'icon'  => 'credit-card',
            'title' => 'Large transaction detected',
            'body'  => '₹' . number_format($this->expense->amount, 2) . ' spent on ' . ($this->expense->description ?? $this->expense->merchant ?? 'expense'),
            'link'  => '/expenses/' . $this->expense->id,
            'meta'  => ['expense_id' => $this->expense->id, 'amount' => $this->expense->amount],
        ];
    }
}
