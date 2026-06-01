<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="FinPilot AI — Your Personal AI Financial Operating System">
    <meta name="theme-color" content="#0A1628">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="FinPilot">

    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/ios/32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/ios/16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/ios/180.png">
    <link rel="apple-touch-icon" sizes="167x167" href="/icons/ios/167.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/icons/ios/152.png">
    <link rel="apple-touch-icon" sizes="120x120" href="/icons/ios/120.png">

    <!-- Preload fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <title inertia>{{ config('app.name', 'FinPilot AI') }}</title>

    @inertiaHead
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body class="antialiased">
    @inertia
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
        }
    </script>
</body>
</html>
