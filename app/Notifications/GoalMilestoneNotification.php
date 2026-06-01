<?php

namespace App\Notifications;

use App\Models\Goal;
use Illuminate\Notifications\Notification;

class GoalMilestoneNotification extends Notification
{
    public function __construct(public Goal $goal, public int $milestone) {}

    public function via(): array { return ['database']; }

    public function toDatabase(): array
    {
        return [
            'type'  => 'success',
            'icon'  => 'target',
            'title' => 'Goal milestone reached!',
            'body'  => "{$this->goal->name} reached {$this->milestone}% — ₹" . number_format($this->goal->current_amount, 0) . ' saved so far',
            'link'  => '/goals/' . $this->goal->id,
            'meta'  => ['goal_id' => $this->goal->id, 'milestone' => $this->milestone],
        ];
    }
}
