<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\NotificationPreference;
use App\Models\Professor;
use App\Models\Role;
use App\Models\Student;
use App\Models\Request as TutoringRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkflowAndBiPhase2Test extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $role = Role::firstOrCreate(
            ['name' => 'admin'],
            ['display_name' => 'Administrateur']
        );

        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin-' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);
        return $user;
    }

    public function test_request_status_update_creates_history_entry(): void
    {
        $admin = $this->actingAsAdmin();

        $studentUser = User::create([
            'name' => 'Etudiant A',
            'email' => 'student-' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => Role::firstOrCreate(['name' => 'etudiant'], ['display_name' => 'Etudiant'])->id,
            'email_verified_at' => now(),
        ]);
        $student = Student::create(['user_id' => $studentUser->id, 'name' => 'Etudiant A']);

        $profUser = User::create([
            'name' => 'Prof A',
            'email' => 'prof-' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => Role::firstOrCreate(['name' => 'enseignant'], ['display_name' => 'Enseignant'])->id,
            'email_verified_at' => now(),
        ]);
        $prof = Professor::create(['user_id' => $profUser->id, 'name' => 'Prof A']);
        $group = Group::create([
            'name' => 'G1',
            'departement' => 'INFO',
            'professor_id' => $prof->id,
            'max_students' => 30,
            'status' => 'active',
        ]);

        $request = TutoringRequest::create([
            'student_id' => $student->id,
            'group_id' => $group->id,
            'status' => 'submitted',
            'request_type' => 'attestation',
            'submitted_at' => now()->subHour(),
            'sla_hours' => 72,
        ]);

        $this->putJson('/api/requests/' . $request->id, [
            'status' => 'approved',
            'comment' => 'Valide.',
        ])->assertOk();

        $this->assertDatabaseHas('request_status_history', [
            'request_id' => $request->id,
            'from_status' => 'submitted',
            'to_status' => 'approved',
            'changed_by' => $admin->id,
        ]);
    }

    public function test_notification_preferences_endpoints(): void
    {
        $user = $this->actingAsAdmin();

        $this->getJson('/api/notifications/preferences')
            ->assertOk()
            ->assertJsonPath('user_id', $user->id);

        $this->putJson('/api/notifications/preferences', [
            'email_enabled' => false,
            'sms_enabled' => true,
        ])->assertOk()
            ->assertJsonPath('email_enabled', false)
            ->assertJsonPath('sms_enabled', true);

        $pref = NotificationPreference::where('user_id', $user->id)->first();
        $this->assertNotNull($pref);
        $this->assertFalse((bool) $pref->email_enabled);
        $this->assertTrue((bool) $pref->sms_enabled);
    }
}
