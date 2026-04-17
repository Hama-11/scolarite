<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Professor;
use App\Models\Program;
use App\Models\Role;
use App\Models\Room;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicCorePhase1Test extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdminScolarite(): void
    {
        $role = Role::create([
            'name' => 'admin',
            'display_name' => 'Administrateur',
        ]);

        $user = User::create([
            'name' => 'Admin Scolarite',
            'email' => 'admin-scolarite-' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);
    }

    public function test_can_create_faculty_v1_endpoint(): void
    {
        $this->actingAsAdminScolarite();

        $this->postJson('/api/v1/faculties', [
            'name' => 'Faculte des Sciences',
            'code' => 'FDS',
            'description' => 'Sciences et technologies',
        ])->assertStatus(201)
            ->assertJsonPath('code', 'FDS');

        $this->assertDatabaseHas('faculties', [
            'code' => 'FDS',
            'name' => 'Faculte des Sciences',
        ]);
    }

    public function test_detect_schedule_conflicts_v1_endpoint(): void
    {
        $this->actingAsAdminScolarite();

        $profUser = User::create([
            'name' => 'Prof Test',
            'email' => 'prof-test@example.com',
            'password' => 'password123',
            'role_id' => Role::firstOrCreate(['name' => 'enseignant'], ['display_name' => 'Enseignant'])->id,
            'email_verified_at' => now(),
        ]);
        $professor = Professor::create(['user_id' => $profUser->id, 'name' => 'Prof Test']);

        $dept = Department::create(['name' => 'Informatique', 'code' => 'INFO']);
        $program = Program::create([
            'name' => 'Licence Info',
            'code' => 'LINFO',
            'department_id' => $dept->id,
            'level' => 1,
            'duration_years' => 3,
        ]);
        $course = Course::create([
            'name' => 'Algo',
            'code' => 'ALGO101',
            'credits' => 6,
            'program_id' => $program->id,
            'professor_id' => $professor->id,
            'semester' => 1,
            'evaluation_type' => 'mixed',
            'hours_cours' => 10,
            'hours_td' => 10,
            'hours_tp' => 10,
        ]);
        $room = Room::create([
            'name' => 'A1',
            'building' => 'B1',
            'capacity' => 40,
            'type' => 'classroom',
            'is_available' => true,
        ]);

        Schedule::create([
            'course_id' => $course->id,
            'professor_id' => $professor->id,
            'room_id' => $room->id,
            'day_of_week' => 'monday',
            'start_time' => '08:00',
            'end_time' => '10:00',
            'session_type' => 'cours',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
        ]);
        Schedule::create([
            'course_id' => $course->id,
            'professor_id' => $professor->id,
            'room_id' => $room->id,
            'day_of_week' => 'monday',
            'start_time' => '09:00',
            'end_time' => '11:00',
            'session_type' => 'td',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
        ]);

        $this->postJson('/api/v1/schedules/detect-conflicts')
            ->assertOk()
            ->assertJsonPath('count', 1);
    }
}
