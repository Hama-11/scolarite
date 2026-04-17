<?php

namespace Tests\Feature;

use App\Models\Professor;
use App\Models\Role;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConceptionLifecycleApiTest extends TestCase
{
    use RefreshDatabase;

    private function role(string $name, string $display): Role
    {
        return Role::firstOrCreate(['name' => $name], ['display_name' => $display]);
    }

    private function makeStudent(): Student
    {
        $role = $this->role('etudiant', 'Étudiant');
        $user = User::create([
            'name' => 'Stu Test',
            'email' => 'stu-' . uniqid('', true) . '@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);

        return Student::create([
            'user_id' => $user->id,
            'name' => 'Stu Test',
            'matricule' => 'M-' . substr(uniqid(), -6),
        ]);
    }

    private function makeAdmin(): User
    {
        $role = $this->role('admin', 'Administrateur');

        return User::create([
            'name' => 'Admin Test',
            'email' => 'adm-' . uniqid('', true) . '@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);
    }

    public function test_guest_cannot_access_student_lifecycle(): void
    {
        $this->getJson('/api/student/lifecycle')->assertStatus(401);
    }

    public function test_student_can_load_lifecycle_profile(): void
    {
        $student = $this->makeStudent();
        Sanctum::actingAs($student->user);

        $this->getJson('/api/student/lifecycle')
            ->assertOk()
            ->assertJsonStructure(['student' => ['user', 'overall_status']]);
    }

    public function test_student_can_submit_validation(): void
    {
        $student = $this->makeStudent();
        Sanctum::actingAs($student->user);

        $this->postJson('/api/student/lifecycle/submit-validation')
            ->assertOk()
            ->assertJsonPath('student.overall_status', 'pending');
    }

    public function test_admin_can_list_pending_lifecycle_students(): void
    {
        $student = $this->makeStudent();
        $student->update(['overall_status' => 'pending']);

        Sanctum::actingAs($this->makeAdmin());

        $this->getJson('/api/admin/lifecycle/pending-students')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_admin_can_create_school_class(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/school-classes', [
            'name' => 'L3 Info A',
            'department' => 'Informatique',
            'annee_scolaire' => '2025-2026',
        ])
            ->assertStatus(201)
            ->assertJsonPath('name', 'L3 Info A');

        $this->assertDatabaseHas('school_classes', ['name' => 'L3 Info A']);
    }

    public function test_professor_sees_assigned_school_classes(): void
    {
        $role = $this->role('enseignant', 'Enseignant');
        $user = User::create([
            'name' => 'Prof SC',
            'email' => 'profsc-' . uniqid('', true) . '@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);
        $prof = Professor::create(['user_id' => $user->id, 'name' => 'Prof SC']);
        SchoolClass::create([
            'name' => 'Classe X',
            'department' => 'Info',
            'annee_scolaire' => '2025-2026',
            'professor_id' => $prof->id,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/professor/school-classes')
            ->assertOk()
            ->assertJsonCount(1, 'classes');
    }
}
