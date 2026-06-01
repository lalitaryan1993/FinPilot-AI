<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class RegisterController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
            'currency' => 'nullable|string|size:3',
            'phone'    => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'currency' => $validated['currency'] ?? 'INR',
            'phone'    => $validated['phone'] ?? null,
            'timezone' => 'Asia/Kolkata',
            'locale'   => 'en_IN',
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'data'    => ['user' => $user],
            'message' => 'Welcome to FinPilot AI! Let\'s set up your financial profile.',
        ], 201);
    }
}
