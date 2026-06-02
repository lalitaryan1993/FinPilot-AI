<?php

namespace App\Events;

use App\Models\Debt;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class EmiDueSoon implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Debt $debt) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("user.{$this->debt->user_id}")];
    }

    public function broadcastAs(): string
    {
        return 'notification.new';
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => (string) Str::uuid(),
            'type'       => 'warning',
            'icon'       => 'credit-card',
            'title'      => "EMI due soon: {$this->debt->name}",
            'body'       => "₹" . number_format($this->debt->emi_amount, 0) . " EMI is due on day {$this->debt->emi_due_day} of this month.",
            'link'       => '/debts',
            'read'       => false,
            'created_at' => now()->toISOString(),
        ];
    }
}
