<?php

namespace App\Notifications;

use App\Models\AutomationRule;
use Illuminate\Notifications\Notification;

class AutomationRuleFiredNotification extends Notification
{
    public function __construct(public AutomationRule $rule, public string $detail) {}

    public function via(): array { return ['database']; }

    public function toDatabase(): array
    {
        return [
            'type'  => 'info',
            'icon'  => 'zap',
            'title' => "Rule triggered: {$this->rule->name}",
            'body'  => $this->detail,
            'link'  => '/automations',
            'meta'  => ['rule_id' => $this->rule->id],
        ];
    }
}
