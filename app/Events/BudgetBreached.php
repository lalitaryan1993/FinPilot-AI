<?php

namespace App\Events;

use App\Models\Budget;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class BudgetBreached implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly Budget $budget,
        public readonly float $spentPercent,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("user.{$this->user->id}")];
    }

    public function broadcastAs(): string
    {
        return 'notification.new';
    }

    public function broadcastWith(): array
    {
        $pct = round($this->spentPercent);
        return [
            'id'         => (string) Str::uuid(),
            'type'       => $pct >= 100 ? 'alert' : 'warning',
            'icon'       => 'alert-triangle',
            'title'      => $pct >= 100
                ? "Budget exceeded: {$this->budget->name}"
                : "Budget alert: {$this->budget->name}",
            'body'       => "You've used {$pct}% of your {$this->budget->name} budget"
                . ($pct >= 100 ? ' — limit reached!' : '.'),
            'link'       => '/budget',
            'read'       => false,
            'created_at' => now()->toISOString(),
        ];
    }
}
