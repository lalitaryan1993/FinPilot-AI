<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $limit = (int) $request->input('limit', 20);

        $notifications = $user->notifications()
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn($n) => $this->format($n));

        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'notifications' => $notifications,
                'unread_count'  => $unreadCount,
            ],
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    private function format($notification): array
    {
        $data = $notification->data;

        return [
            'id'         => $notification->id,
            'type'       => $data['type']  ?? 'info',
            'icon'       => $data['icon']  ?? 'bell',
            'title'      => $data['title'] ?? 'Notification',
            'body'       => $data['body']  ?? '',
            'link'       => $data['link']  ?? null,
            'meta'       => $data['meta']  ?? [],
            'read'       => !is_null($notification->read_at),
            'created_at' => $notification->created_at,
        ];
    }
}
