import { useEffect, useRef } from 'react';

interface RealtimeNotification {
    id: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    icon: string;
    title: string;
    body: string;
    link: string | null;
    read: boolean;
    created_at: string;
}

interface Options {
    userId: number;
    onNotification: (n: RealtimeNotification) => void;
}

export function useReverbNotifications({ userId, onNotification }: Options) {
    const channelRef = useRef<ReturnType<typeof window.Echo.private> | null>(null);

    useEffect(() => {
        // Echo may not be initialised yet (e.g. Reverb server not running in dev).
        // Wrap in try/catch so the app works fine without the WebSocket server.
        try {
            const channel = window.Echo.private(`user.${userId}`);
            channelRef.current = channel;

            channel.listen('.notification.new', (data: RealtimeNotification) => {
                onNotification(data);
            });
        } catch {
            // Reverb not running — silent fallback to polling
        }

        return () => {
            try {
                window.Echo?.leave(`user.${userId}`);
            } catch { /* ignore */ }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
}
