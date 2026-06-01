<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id'                       => $request->user()->id,
                    'name'                     => $request->user()->name,
                    'email'                    => $request->user()->email,
                    'phone'                    => $request->user()->phone,
                    'currency'                 => $request->user()->currency ?? 'INR',
                    'locale'                   => $request->user()->locale ?? 'en_IN',
                    'timezone'                 => $request->user()->timezone ?? 'Asia/Kolkata',
                    'avatar_path'              => $request->user()->avatar_path,
                    'onboarding_step'          => $request->user()->onboarding_step ?? 0,
                    'is_active'                => $request->user()->is_active ?? true,
                    'notification_preferences' => $request->user()->notification_preferences,
                    'ai_preferences'           => $request->user()->ai_preferences,
                ] : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ]);
    }
}
