<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Message;
use App\Models\Program;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiRegressionFixesTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $roleName, string $email): User
    {
        $role = Role::firstOrCreate([
            'name' => $roleName,
        ], [
            'display_name' => ucfirst($roleName),
        ]);

        return User::create([
            'name' => ucfirst($roleName) . ' User',
            'email' => $email,
            'password' => 'password123',
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);
    }

    private function makeCourse(): Course
    {
        $suffix = strtoupper(substr(uniqid('', true), -6));

        $department = Department::create([
            'name' => 'Computer Science',
            'code' => 'CS-' . $suffix,
        ]);

        $program = Program::create([
            'name' => 'Licence Informatique',
            'code' => 'LINFO-' . $suffix,
            'department_id' => $department->id,
            'level' => 1,
            'duration_years' => 3,
        ]);

        return Course::create([
            'name' => 'Algorithms',
            'code' => 'CS101-' . $suffix,
            'credits' => 6,
            'program_id' => $program->id,
            'semester' => 1,
            'evaluation_type' => 'exam',
        ]);
    }

    public function test_admin_can_access_departments_index_endpoint(): void
    {
        $admin = $this->makeUser('admin', 'admin@example.com');
        Sanctum::actingAs($admin);

        $this->getJson('/api/departments')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_messages_unread_literal_route_is_not_shadowed(): void
    {
        $user = $this->makeUser('student', 'student-a@example.com');
        Sanctum::actingAs($user);

        $this->getJson('/api/messages/unread')
            ->assertOk()
            ->assertJson(['unread_count' => 0]);
    }

    public function test_unrelated_user_cannot_view_someone_elses_message(): void
    {
        $sender = $this->makeUser('student', 'sender@example.com');
        $receiver = $this->makeUser('student', 'receiver@example.com');
        $intruder = $this->makeUser('student', 'intruder@example.com');

        $message = Message::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'subject' => 'Private',
            'body' => 'Hidden body',
            'type' => 'direct',
        ]);

        Sanctum::actingAs($intruder);

        $this->getJson('/api/messages/' . $message->id)
            ->assertForbidden();
    }

    public function test_student_cannot_create_grade_through_read_only_route_group(): void
    {
        $user = $this->makeUser('student', 'graded-student@example.com');
        $student = Student::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'matricule' => 'MAT-001',
        ]);
        $course = $this->makeCourse();

        Sanctum::actingAs($user);

        $this->postJson('/api/grades', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'grade' => 15,
            'type' => 'exam',
        ])->assertForbidden();
    }

    public function test_admin_created_student_uses_canonical_student_role(): void
    {
        $admin = $this->makeUser('admin', 'admin-student-create@example.com');
        Role::create([
            'name' => 'etudiant',
            'display_name' => 'Etudiant',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/students', [
            'name' => 'New Student',
            'email' => 'new-student@example.com',
            'password' => 'password123',
            'matricule' => 'MAT-002',
        ]);

        $response->assertCreated();

        $createdUser = User::where('email', 'new-student@example.com')->firstOrFail();
        $this->assertSame('etudiant', optional($createdUser->role)->name);
    }
}
