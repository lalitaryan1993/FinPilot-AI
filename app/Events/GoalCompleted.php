<?php

namespace App\Events;

use App\Models\Goal;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class GoalCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Goal $goal) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("user.{$this->goal->user_id}")];
    }

    public function broadcastAs(): string
    {
        return 'notification.new';
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => (string) Str::uuid(),
            'type'       => 'success',
            'icon'       => 'target',
            'title'      => "Goal achieved: {$this->goal->name} 🎉",
            'body'       => "You've reached your ₹" . number_format($this->goal->target_amount, 0) . " goal. Congratulations!",
            'link'       => "/goals/{$this->goal->id}",
            'read'       => false,
            'created_at' => now()->toISOString(),
        ];
    }
}
