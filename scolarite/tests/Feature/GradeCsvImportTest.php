<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Grade;
use App\Models\Professor;
use App\Models\Program;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GradeCsvImportTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsTeacher(): array
    {
        $teacherRole = Role::firstOrCreate(['name' => 'enseignant'], ['display_name' => 'Enseignant']);
        $studentRole = Role::firstOrCreate(['name' => 'etudiant'], ['display_name' => 'Etudiant']);

        $teacherUser = User::create([
            'name' => 'Prof CSV',
            'email' => 'prof-csv-' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => $teacherRole->id,
            'email_verified_at' => now(),
        ]);
        $prof = Professor::create(['user_id' => $teacherUser->id, 'name' => 'Prof CSV']);

        $deptCode = 'INFO-' . substr(uniqid(), -6);
        $dept = Department::create(['name' => 'INFO', 'code' => $deptCode]);
        $programCode = 'LIC-' . substr(uniqid(), -6);
        $program = Program::create([
            'name' => 'Licence',
            'code' => $programCode,
            'department_id' => $dept->id,
            'level' => 1,
            'duration_years' => 3,
        ]);
        $courseCode = 'ALGO-' . substr(uniqid(), -6);
        $course = Course::create([
            'name' => 'Algo',
            'code' => $courseCode,
            'credits' => 6,
            'program_id' => $program->id,
            'professor_id' => $prof->id,
            'semester' => 1,
            'evaluation_type' => 'mixed',
            'hours_cours' => 10,
            'hours_td' => 10,
            'hours_tp' => 10,
        ]);

        $studentUser = User::create([
            'name' => 'Etudiant CSV',
            'email' => 'etu-csv-' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => $studentRole->id,
            'email_verified_at' => now(),
        ]);
        $student = Student::create([
            'user_id' => $studentUser->id,
            'name' => 'Etudiant CSV',
            'matricule' => 'MAT-' . substr(uniqid(), -6),
        ]);

        Sanctum::actingAs($teacherUser);

        return [$course, $student];
    }

    public function test_teacher_can_import_grades_csv(): void
    {
        [$course, $student] = $this->actingAsTeacher();

        $content = "matricule,value,comments\n" . $student->matricule . ",15,Bien\n";
        $file = UploadedFile::fake()->createWithContent('grades.csv', $content);

        $this->postJson('/api/grades/import-csv', [
            'course_id' => $course->id,
            'type' => 'exam',
            'date' => '2026-04-10',
            'max_value' => 20,
            'file' => $file,
        ])->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('updated', 0);

        $this->assertDatabaseHas('grades', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'type' => 'exam',
            'date' => '2026-04-10',
        ]);
    }

    public function test_import_updates_existing_grade_same_unique_key(): void
    {
        [$course, $student] = $this->actingAsTeacher();

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'grade' => 8.00,
            'type' => 'exam',
            'description' => 'Initial',
            'date' => '2026-04-10',
        ]);

        $content = "matricule,value,comments\n" . $student->matricule . ",18,Maj\n";
        $file = UploadedFile::fake()->createWithContent('grades.csv', $content);

        $this->postJson('/api/grades/import-csv', [
            'course_id' => $course->id,
            'type' => 'exam',
            'date' => '2026-04-10',
            'max_value' => 20,
            'file' => $file,
        ])->assertOk()
            ->assertJsonPath('created', 0)
            ->assertJsonPath('updated', 1);

        $this->assertDatabaseHas('grades', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'grade' => 18.00,
        ]);
    }
}
