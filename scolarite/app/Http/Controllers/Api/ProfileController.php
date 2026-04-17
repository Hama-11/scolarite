<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class ProfileController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        
        $profileData = [
            'user' => $user->load('role'),
        ];

        // Add role-specific profile data with existing relations only.
        $roleName = strtolower((string) optional($user->role)->name);
        if (in_array($roleName, ['student', 'etudiant'], true)) {
            $profileData['profile'] = $user->student ? $user->student->load(['group']) : null;
        } elseif (in_array($roleName, ['professor', 'enseignant'], true)) {
            $profileData['profile'] = $user->professor ?: null;
        }

        return response()->json($profileData);
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'profile_image' => 'nullable|string',
        ]);

        $user->update($validated);

        // Update role-specific profile
        $roleName = strtolower((string) optional($user->role)->name);
        if (in_array($roleName, ['student', 'etudiant'], true) && $user->student) {
            $studentValidates = $request->validate([
                'emergency_contact' => 'nullable|string|max:255',
                'emergency_phone' => 'nullable|string|max:50',
            ]);
            $user->student->update($studentValidates);
        } elseif (in_array($roleName, ['professor', 'enseignant'], true) && $user->professor) {
            $professorValidates = $request->validate([
                'office_location' => 'nullable|string|max:100',
                'office_hours' => 'nullable|string',
                'bio' => 'nullable|string',
                'research_interests' => 'nullable|array',
            ]);
            $user->professor->update($professorValidates);
        }

        return response()->json($user->fresh()->load('role'));
    }

    public function updatePassword(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Verify current password
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function uploadAvatar(Request $request)
    {
        $validated = $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = Auth::user();

        // Store the image
        $path = $request->file('avatar')->store('avatars', 'public');

        // Update user avatar
        $user->update(['profile_image' => $path]);

        return response()->json([
            'message' => 'Avatar uploaded successfully',
            'avatar' => $path,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'email_notifications' => 'nullable|boolean',
            'sms_notifications' => 'nullable|boolean',
            'language' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:50',
        ]);

        // Store settings (would typically be in a separate settings table)
        $user->settings = array_merge($user->settings ?? [], $validated);
        $user->save();

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function getSettings()
    {
        $user = Auth::user();
        
        return response()->json($user->settings ?? [
            'email_notifications' => true,
            'sms_notifications' => false,
            'language' => 'en',
            'timezone' => 'UTC',
        ]);
    }

    public function deactivate()
    {
        $user = Auth::user();
        
        // Soft delete or deactivate the account
        $user->update(['is_active' => false]);
        
        Auth::logout();
        
        return response()->json(['message' => 'Account deactivated successfully']);
    }
}