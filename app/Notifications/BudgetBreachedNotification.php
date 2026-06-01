<?php

namespace App\Notifications;

use App\Models\Budget;
use Illuminate\Notifications\Notification;

class BudgetBreachedNotification extends Notification
{
    public function __construct(public Budget $budget, public float $spent) {}

    public function via(): array { return ['database']; }

    public function toDatabase(): array
    {
        $over = round($this->spent - $this->budget->amount, 2);
        return [
            'type'    => 'warning',
            'icon'    => 'alert-triangle',
            'title'   => 'Budget limit exceeded',
            'body'    => "{$this->budget->name} is over by ₹" . number_format($over, 2) . ' this month',
            'link'    => '/budget',
            'meta'    => ['budget_id' => $this->budget->id, 'spent' => $this->spent],
        ];
    }
}
