<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_fetch_me_profile(): void
    {
        $role = Role::create([
            'name' => 'student',
            'display_name' => 'Etudiant',
        ]);

        $user = User::create([
            'name' => 'Test Student',
            'email' => 'student@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'student@example.com',
            'password' => 'password123',
        ]);

        $login->assertOk()->assertJsonStructure([
            'token',
            'user' => ['id', 'name', 'email', 'role', 'role_display_name'],
        ]);

        $token = $login->json('token');
        $this->assertNotEmpty($token);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJson([
                'id' => $user->id,
                'email' => 'student@example.com',
                'role' => 'student',
            ]);
    }

    public function test_unverified_user_cannot_login(): void
    {
        $role = Role::create([
            'name' => 'student',
            'display_name' => 'Etudiant',
        ]);

        User::create([
            'name' => 'Unverified User',
            'email' => 'unverified@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'email_verified_at' => null,
        ]);

        $this->postJson('/api/login', [
            'email' => 'unverified@example.com',
            'password' => 'password123',
        ])->assertStatus(403);
    }

    public function test_admin_cannot_self_register(): void
    {
        $studentRole = Role::create([
            'name' => 'student',
            'display_name' => 'Etudiant',
        ]);

        $adminRole = Role::create([
            'name' => 'admin',
            'display_name' => 'Administrateur',
        ]);

        $this->postJson('/api/register', [
            'name' => 'Admin Candidate',
            'email' => 'admin-candidate@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_id' => $adminRole->id,
        ])->assertStatus(403);

        $this->assertDatabaseMissing('users', [
            'email' => 'admin-candidate@example.com',
        ]);
    }
}
