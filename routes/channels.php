<?php

use Illuminate\Support\Facades\Broadcast;

// Private per-user channel — each user only hears their own notifications
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
