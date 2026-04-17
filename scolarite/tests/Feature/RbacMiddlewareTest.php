<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RbacMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['api', 'auth:sanctum', 'permission:catalog.read'])
            ->get('/api/test-permission-catalog-read', fn () => response()->json(['ok' => true]));

        Route::middleware(['api', 'auth:sanctum', 'role:enseignant'])
            ->get('/api/test-role-enseignant', fn () => response()->json(['ok' => true]));
    }

    public function test_legacy_admin_alias_can_pass_permission_middleware(): void
    {
        $role = Role::create(['name' => 'admin', 'display_name' => 'Administrateur (legacy)']);
        $user = User::create([
            'name' => 'Legacy Admin',
            'email' => 'legacy-admin@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/test-permission-catalog-read')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_legacy_professor_alias_can_pass_role_middleware(): void
    {
        $role = Role::create(['name' => 'professor', 'display_name' => 'Professeur (legacy)']);
        $user = User::create([
            'name' => 'Legacy Professor',
            'email' => 'legacy-prof@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/test-role-enseignant')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
