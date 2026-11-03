<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'user',
            'api_token' => Str::random(80),
        ]);

        return response()->json([
            'message' => 'User registered successfully.',
            'token' => $user->api_token,
            'user' => $this->formatUser($user),
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }
        if ($user->is_locked) {
            throw ValidationException::withMessages([
                'email' => ['Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ.'],
            ]);
        }

        $user->api_token = Str::random(80);
        $user->save();

        return response()->json([
            'message' => 'Login successful.',
            'token' => $user->api_token,
            'user' => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user instanceof User) {
            $user->api_token = null;
            $user->save();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->formatUser($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:1000'],
        ]);

        $user->update($validated);

        return response()->json([
            'data' => $this->formatUser($user->fresh()),
            'message' => 'Đã cập nhật thông tin cá nhân.',
        ]);
    }

    protected function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'role' => $user->role ?? 'user',
            'is_locked' => (bool) $user->is_locked,
        ];
    }
}
