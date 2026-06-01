<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'remember' => 'boolean',
        ]);

        if (!Auth::attempt(['email' => $validated['email'], 'password' => $validated['password']], $validated['remember'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
                'errors'  => ['email' => ['The email or password is incorrect.']],
            ], 401);
        }

        $request->session()->regenerate();

        $user = Auth::user();

        return response()->json([
            'success' => true,
            'data'    => ['user' => $user],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['success' => true, 'message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $request->user()]);
    }
}
