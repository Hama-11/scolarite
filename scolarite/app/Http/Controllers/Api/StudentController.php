<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Schedule;

class StudentController extends Controller
{
    private function studentRelations(): array
    {
        return ['user', 'group'];
    }

    private function resolveStudentRoleId(): int
    {
        return (int) Role::firstOrCreate([
            'name' => 'etudiant',
        ], [
            'display_name' => 'Etudiant',
        ])->id;
    }

    private function normalizeStudentPayload(array $validated): array
    {
        $payload = [];

        if (array_key_exists('name', $validated)) {
            $payload['name'] = $validated['name'];
        }
        if (array_key_exists('matricule', $validated) || array_key_exists('student_id', $validated)) {
            $payload['matricule'] = $validated['matricule'] ?? ($validated['student_id'] ?? null);
        }
        foreach (['phone', 'address', 'date_of_birth', 'gender'] as $field) {
            if (array_key_exists($field, $validated)) {
                $payload[$field] = $validated[$field];
            }
        }

        if (array_key_exists('classe', $validated)) {
            $payload['classe'] = $validated['classe'];
        } elseif (array_key_exists('group_id', $validated) && $validated['group_id'] !== null) {
            $payload['classe'] = (string) $validated['group_id'];
        }

        return array_filter($payload, static function ($value) {
            return $value !== null;
        });
    }

    /**
     * Authenticated student dashboard payload.
     * Route: GET /api/student/dashboard
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $student = Student::with($this->studentRelations())
            ->where('user_id', $user->id)
            ->first();

        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }

        $courseIds = $student->enrollments()->pluck('course_id');
        $courses = $student->enrollments()->with('course')->get()->pluck('course');

        $gradesCount = $student->grades()->count();
        $scheduleCount = Schedule::whereIn('course_id', $courseIds)->count();

        return response()->json([
            'student' => $student,
            'summary' => [
                'courses_count' => $courses->count(),
                'schedule_items' => $scheduleCount,
                'grades_count' => $gradesCount,
            ],
            'courses' => $courses,
        ]);
    }

    public function index(Request $request)
    {
        $query = Student::with($this->studentRelations());

        if ($request->has('group_id')) {
            $query->where('classe', (string) $request->group_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('matricule', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $students = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($students);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'group_id' => 'nullable|exists:groups,id',
            'classe' => 'nullable|string|max:100',
            'matricule' => 'nullable|string|max:50|unique:students,matricule',
            'student_id' => 'nullable|string|max:50',
        ]);

        $studentIdentifier = $validated['matricule'] ?? ($validated['student_id'] ?? null);
        if ($studentIdentifier !== null && Student::where('matricule', $studentIdentifier)->exists()) {
            return response()->json([
                'message' => 'The matricule has already been taken.',
                'errors' => ['matricule' => ['The matricule has already been taken.']],
            ], 422);
        }

        // Create user account
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $this->resolveStudentRoleId(),
        ]);

        // Create student record
        $studentData = array_merge(
            ['user_id' => $user->id],
            $this->normalizeStudentPayload($validated)
        );

        $student = Student::create($studentData);

        return response()->json($student->load($this->studentRelations()), 201);
    }

    public function show(Student $student)
    {
        return response()->json($student->load(array_merge(
            $this->studentRelations(),
            ['enrollments.course', 'grades.course', 'attendances.course']
        )));
    }

    public function update(Request $request, Student $student)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $student->user_id,
            'password' => 'sometimes|string|min:8',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'group_id' => 'nullable|exists:groups,id',
            'classe' => 'nullable|string|max:100',
            'matricule' => 'nullable|string|max:50|unique:students,matricule,' . $student->id,
            'student_id' => 'nullable|string|max:50',
        ]);

        $studentIdentifier = $validated['matricule'] ?? ($validated['student_id'] ?? null);
        if ($studentIdentifier !== null && Student::where('matricule', $studentIdentifier)->where('id', '!=', $student->id)->exists()) {
            return response()->json([
                'message' => 'The matricule has already been taken.',
                'errors' => ['matricule' => ['The matricule has already been taken.']],
            ], 422);
        }

        // Update user data
        $userPayload = [];
        if (isset($validated['name'])) $userPayload['name'] = $validated['name'];
        if (isset($validated['email'])) $userPayload['email'] = $validated['email'];
        if (isset($validated['password'])) $userPayload['password'] = Hash::make($validated['password']);
        if ($userPayload !== []) {
            $student->user->update($userPayload);
        }

        // Update student data
        $student->update($this->normalizeStudentPayload($validated));

        return response()->json($student->fresh()->load($this->studentRelations()));
    }

    public function destroy(Student $student)
    {
        // Delete associated user
        $student->user->delete();
        
        return response()->json(['message' => 'Student deleted successfully']);
    }

    public function enrollInCourse(Request $request, Student $student)
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        $enrollment = $student->enrollments()->create($validated);
        
        return response()->json($enrollment->load('course'), 201);
    }

    public function assignToGroup(Request $request, Student $student)
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,id',
        ]);

        $student->update(['classe' => (string) $validated['group_id']]);

        return response()->json($student->load(['user', 'group']));
    }

    public function getCourses(Student $student)
    {
        $courses = $student->enrollments()->with('course')->get()->pluck('course');
        
        return response()->json($courses);
    }

    public function getGrades(Student $student)
    {
        $grades = $student->grades()->with('course')->get();
        
        return response()->json($grades);
    }

    public function getAttendance(Student $student)
    {
        $attendances = $student->attendances()->with('schedule.course')->get();
        
        return response()->json($attendances);
    }

    public function getSchedule(Student $student)
    {
        $enrollments = $student->enrollments()->pluck('course_id');
        
        $schedules = \App\Models\Schedule::with(['course', 'room'])
            ->whereIn('course_id', $enrollments)
            ->get();
        
        return response()->json($schedules);
    }
}
