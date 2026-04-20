<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Student;
use App\Models\Professor;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function ensureDefaultRoles(): void
    {
        foreach ([
            ['name' => 'etudiant', 'display_name' => 'Étudiant'],
            ['name' => 'enseignant', 'display_name' => 'Enseignant'],
            ['name' => 'admin', 'display_name' => 'Administrateur'],
        ] as $role) {
            Role::firstOrCreate(
                ['name' => $role['name']],
                ['display_name' => $role['display_name']]
            );
        }
    }

    /**
     * Rôles autorisés à l’inscription publique (pas l’admin, créé par seeder).
     */
    public function getRoles()
    {
        $this->ensureDefaultRoles();
        $roles = Role::query()
            ->whereIn('name', ['etudiant', 'enseignant'])
            ->orderBy('name')
            ->get(['id', 'name', 'display_name']);

        return response()->json($roles);
    }

    public function register(Request $request)
    {
        $this->ensureDefaultRoles();

        Log::info('Registration request received', [
            'email' => $request->input('email'),
            'role_id' => $request->input('role_id'),
        ]);
        
        $data = $request->validate([
            'name'         => ['required','string','max:100'],
            'email'        => ['required','email','max:255','unique:users,email'],
            'password'     => ['required','confirmed'],
            'role_id'      => ['required','integer','exists:roles,id'],
            'matricule'    => ['nullable','string','max:50'],
            'classe'       => ['nullable','string','max:100'],
            'specialite'   => ['nullable','string','max:100'],
            'grade'        => ['nullable','string','max:100'],
        ]);

        Log::info('Validation passed, creating user');

        // Generate verification OTP
        $verificationOtp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        try {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => $data['password'],
                'role_id'  => $data['role_id'],
                'email_verified_at' => null, // User must verify email
                'verification_token' => $verificationOtp,
            ]);
        } catch (\Exception $e) {
            Log::error('User creation failed', [
                'email' => $request->input('email'),
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erreur lors de la creation du compte.'], 500);
        }

        // Send verification OTP via email
        $this->sendVerificationOtp($user, $verificationOtp);

        $role = Role::find($data['role_id']);
        if (!$role) {
            return response()->json(['message' => 'Rôle invalide'], 422);
        }

        // Compte administrateur : uniquement via seed / console, jamais via inscription.
        if (strtolower((string) $role->name) === 'admin') {
            $user->delete();
            return response()->json([
                'message' => 'La création de compte administrateur est désactivée. Utilisez un compte créé par l’administration.',
            ], 403);
        }

        if ($role->name === 'etudiant') {
            Student::create([
                'user_id'   => $user->id,
                'name'      => $data['name'],
                'matricule' => $data['matricule'] ?? null,
                'classe'    => $data['classe'] ?? null,
            ]);
        } elseif ($role->name === 'enseignant') {
            Professor::create([
                'user_id'    => $user->id,
                'name'       => $data['name'],
                'specialite' => $data['specialite'] ?? null,
                'grade'      => $data['grade'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'Inscription réussie ! Un code de vérification a été envoyé à votre adresse email.',
            'email_verification_required' => true,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $role->name,
                'role_display_name' => $role->display_name,
            ],
        ], 201);
    }

    /**
     * Step 1: Login with email and password
     * If credentials are correct, generate and send OTP
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required','email'],
            'password' => ['required','string'],
        ]);

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json(['message' => 'Identifiants incorrects'], 401);
        }

        // Backward-compatible password check:
        // - preferred: hashed passwords
        // - fallback: legacy plain-text records, then auto-migrate to hash
        $stored = (string) $user->password;
        $input = (string) $request->password;

        $isValidPassword =
            Hash::check($input, $stored) // bcrypt/argon Laravel
            || hash_equals($stored, $input); // legacy plain text

        // Legacy MD5/SHA1 (très fréquent dans anciens projets) -> migrer vers bcrypt au login
        if (!$isValidPassword) {
            $looksLikeMd5 = (bool) preg_match('/^[a-f0-9]{32}$/i', $stored);
            $looksLikeSha1 = (bool) preg_match('/^[a-f0-9]{40}$/i', $stored);

            if ($looksLikeMd5 && hash_equals(strtolower($stored), md5($input))) {
                $isValidPassword = true;
            } elseif ($looksLikeSha1 && hash_equals(strtolower($stored), sha1($input))) {
                $isValidPassword = true;
            }
        }

        if (!$isValidPassword) {
            return response()->json(['message' => 'Identifiants incorrects'], 401);
        }

        // Après succès, on force la migration vers un hash Laravel sécurisé
        // (le mutator User::setPasswordAttribute gère déjà la compatibilité)
        if (!Hash::check($input, (string) $user->password)) {
            $user->password = $input;
            $user->save();
        }

        $roleName = strtolower((string) optional($user->role)->name);
        $aliases = (array) config('rbac.aliases', []);
        $canonicalRole = $aliases[$roleName] ?? $roleName;
        $isAdmin = ($canonicalRole === 'admin');

        // Admin can login directly with existing DB credentials.
        // Other roles must verify email first.
        if (!$isAdmin && !$user->email_verified_at) {
            return response()->json([
                'message' => 'Veuillez vérifier votre adresse email avant de vous connecter.',
                'email_verified' => false,
                'email' => $user->email,
            ], 403);
        }

        // Direct login with credentials (no OTP step)
        $token = $user->createToken('web')->plainTextToken;
        $role = $user->role;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $role ? $role->name : null,
                'role_display_name' => $role ? $role->display_name : null,
            ],
        ]);
    }

    /**
     * Step 2: Verify OTP and complete login
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => ['required','email'],
            'otp_code' => ['nullable','string','size:6'],
            'otp' => ['nullable','string','size:6'],
        ]);

        $otpCode = (string) ($request->input('otp_code') ?: $request->input('otp'));
        if ($otpCode === '') {
            return response()->json([
                'message' => 'Le code OTP est requis',
                'errors' => ['otp_code' => ['Le code OTP est requis']],
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        // Check if OTP is valid
        if ($user->otp_code !== $otpCode) {
            return response()->json(['message' => 'Code OTP incorrect'], 401);
        }

        // Check if OTP is expired
        if (!$user->otp_expires_at || now()->greaterThan($user->otp_expires_at)) {
            return response()->json(['message' => 'Code OTP expiré'], 401);
        }

        // Clear OTP after successful verification
        $user->otp_code = null;
        $user->otp_expires_at = null;
        $user->save();

        // Create token for the user
        $token = $user->createToken('web')->plainTextToken;
        $role = $user->role;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $role ? $role->name : null,
                'role_display_name' => $role ? $role->display_name : null,
            ],
        ]);
    }

    /**
     * Resend OTP if user didn't receive it
     */
    public function resendOtp(Request $request)
    {
        $request->validate([
            'email' => ['required','email'],
        ]);

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        // Generate new 6-digit OTP
        $otpCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        $user->otp_code = $otpCode;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        $this->sendOtpEmail($user, $otpCode);

        return response()->json([
            'message' => 'Nouveau code OTP envoyé',
        ]);
    }

    /**
     * Send OTP email
     */
    private function sendOtpEmail($user, $otpCode)
    {
        try {
            \Mail::send('emails.otp', [
                'name' => $user->name, 
                'otp' => $otpCode
            ], function($message) use ($user) {
                $message->to($user->email, $user->name);
                $message->subject('Code de vérification - University');
            });
        } catch (\Exception $e) {
            // Log for debugging
            Log::error('Failed to send OTP email: ' . $e->getMessage());
            Log::info('OTP Email (fallback)', [
                'email' => $user->email,
                'otp' => $otpCode,
            ]);
        }
    }

    /**
     * Send verification OTP email
     */
    private function sendVerificationOtp($user, $otpCode)
    {
        try {
            \Mail::send('emails.otp', [
                'name' => $user->name,
                'otp' => $otpCode
            ], function($message) use ($user) {
                $message->to($user->email, $user->name);
                $message->subject('Code de vérification de votre email - University');
            });
        } catch (\Exception $e) {
            // Log for debugging
            Log::error('Failed to send verification OTP: ' . $e->getMessage());
            Log::info('Verification OTP (fallback)', [
                'email' => $user->email,
                'otp' => $otpCode,
            ]);
        }
    }

    /**
     * Verify email with OTP
     */
    public function verifyEmailOtp(Request $request)
    {
        $request->validate([
            'email' => ['required','email'],
            'otp_code' => ['required','string','size:6'],
        ]);

        $user = User::where('email', $request->email)
                    ->where('verification_token', $request->otp_code)
                    ->first();

        if (!$user) {
            return response()->json(['message' => 'Code de vérification incorrect'], 401);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email déjà vérifié'], 400);
        }

        $user->email_verified_at = now();
        $user->verification_token = null;
        $user->save();

        return response()->json(['message' => 'Email vérifié avec succès !']);
    }

    /**
     * Resend verification OTP
     */
    public function resendVerificationOtp(Request $request)
    {
        $request->validate([
            'email' => ['required','email'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email déjà vérifié'], 400);
        }

        // Generate new 6-digit OTP
        $otpCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->verification_token = $otpCode;
        $user->save();

        $this->sendVerificationOtp($user, $otpCode);

        return response()->json([
            'message' => 'Nouveau code de vérification envoyé',
        ]);
    }

    /**
     * Verify email with token (legacy - kept for compatibility)
     */
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'token' => ['required','string'],
        ]);

        $user = User::where('verification_token', $request->token)->first();

        if (!$user) {
            return response()->json(['message' => 'Token de vérification invalide'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email déjà vérifié'], 400);
        }

        $user->email_verified_at = now();
        $user->verification_token = null;
        $user->save();

        return response()->json(['message' => 'Email vérifié avec succès !']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $role = $user->role;
        
        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $role ? $role->name : null,
            'role_display_name' => $role ? $role->display_name : null,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'string', 'min:8'],
        ]);

        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['email'])) {
            $user->email = $data['email'];
        }
        if (isset($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();

        $role = $user->role;
        
        return response()->json([
            'message' => 'Profil mis à jour avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role ? $role->name : null,
                'role_display_name' => $role ? $role->display_name : null,
            ],
        ]);
    }
}
