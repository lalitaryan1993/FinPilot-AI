import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key:      import.meta.env.VITE_REVERB_APP_KEY,
    wsHost:   import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    wsPort:   import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort:  import.meta.env.VITE_REVERB_PORT ?? 8080,
    scheme:   import.meta.env.VITE_REVERB_SCHEME ?? 'http',
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
});

export default window.Echo;
