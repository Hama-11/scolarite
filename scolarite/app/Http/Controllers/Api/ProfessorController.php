<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Professor;
use App\Models\Role;
use App\Models\User;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use App\Models\Student;

class ProfessorController extends Controller
{
    private function resolveProfessorRoleId(): int
    {
        return (int) Role::firstOrCreate([
            'name' => 'enseignant',
        ], [
            'display_name' => 'Enseignant',
        ])->id;
    }

    private function normalizeProfessorPayload(array $validated): array
    {
        $payload = [];

        if (array_key_exists('name', $validated)) {
            $payload['name'] = $validated['name'];
        }
        if (array_key_exists('specialite', $validated) || array_key_exists('specialization', $validated)) {
            $payload['specialite'] = $validated['specialite'] ?? ($validated['specialization'] ?? null);
        }
        if (array_key_exists('grade', $validated) || array_key_exists('title', $validated)) {
            $payload['grade'] = $validated['grade'] ?? ($validated['title'] ?? null);
        }

        foreach (['department_id', 'hire_date', 'employee_id', 'specialization', 'title', 'status'] as $column) {
            if (array_key_exists($column, $validated) && Schema::hasColumn('professors', $column)) {
                $payload[$column] = $validated[$column];
            }
        }

        return array_filter($payload, static function ($value) {
            return $value !== null;
        });
    }

    private function professorForRequest(Request $request): ?Professor
    {
        $user = $request->user();
        if (!$user) {
            return null;
        }

        return Professor::where('user_id', $user->id)->first();
    }

    public function index(Request $request)
    {
        $query = Professor::with(['user', 'courses']);

        if ($request->has('department_id') && Schema::hasColumn('professors', 'department_id')) {
            $query->where('department_id', $request->department_id);
        }
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $professors = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json($professors);
    }

    public function store(Request $request)
    {
        $rules = [
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'name' => 'required|string|max:255',
            'specialite' => 'nullable|string|max:255',
            'specialization' => 'nullable|string|max:255',
            'grade' => 'nullable|string|max:100',
            'title' => 'nullable|string|max:100',
        ];

        if (Schema::hasColumn('professors', 'department_id')) {
            $rules['department_id'] = 'nullable|exists:departments,id';
        }
        if (Schema::hasColumn('professors', 'hire_date')) {
            $rules['hire_date'] = 'required|date';
        }
        if (Schema::hasColumn('professors', 'employee_id')) {
            $rules['employee_id'] = 'nullable|string|max:50|unique:professors,employee_id';
        }
        if (Schema::hasColumn('professors', 'status')) {
            $rules['status'] = 'nullable|in:active,on_leave,retired';
        }

        $validated = $request->validate($rules);

        // Create user account
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $this->resolveProfessorRoleId(),
        ]);

        // Create professor record
        $professorData = array_merge(
            ['user_id' => $user->id],
            $this->normalizeProfessorPayload($validated)
        );

        $professor = Professor::create($professorData);
        
        return response()->json($professor->load(['user', 'courses']), 201);
    }

    public function show(Professor $professor)
    {
        return response()->json($professor->load(['user', 'courses', 'schedules.course', 'schedules.room']));
    }

    public function update(Request $request, Professor $professor)
    {
        $rules = [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $professor->user_id,
            'password' => 'sometimes|string|min:8',
            'specialite' => 'nullable|string|max:255',
            'specialization' => 'nullable|string|max:255',
            'grade' => 'nullable|string|max:100',
            'title' => 'nullable|string|max:100',
        ];

        if (Schema::hasColumn('professors', 'department_id')) {
            $rules['department_id'] = 'nullable|exists:departments,id';
        }
        if (Schema::hasColumn('professors', 'hire_date')) {
            $rules['hire_date'] = 'sometimes|date';
        }
        if (Schema::hasColumn('professors', 'employee_id')) {
            $rules['employee_id'] = 'nullable|string|max:50|unique:professors,employee_id,' . $professor->id;
        }
        if (Schema::hasColumn('professors', 'status')) {
            $rules['status'] = 'sometimes|in:active,on_leave,retired';
        }

        $validated = $request->validate($rules);

        // Update user data
        $userPayload = [];
        if (isset($validated['name'])) $userPayload['name'] = $validated['name'];
        if (isset($validated['email'])) $userPayload['email'] = $validated['email'];
        if (isset($validated['password'])) $userPayload['password'] = Hash::make($validated['password']);
        if ($userPayload !== []) {
            $professor->user->update($userPayload);
        }

        // Update professor data
        $professor->update($this->normalizeProfessorPayload($validated));
        
        return response()->json($professor->load(['user', 'courses']));
    }

    public function destroy(Professor $professor)
    {
        // Delete associated user
        $professor->user->delete();
        
        return response()->json(['message' => 'Professor deleted successfully']);
    }

    public function assignCourse(Request $request, Professor $professor)
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'is_primary' => 'nullable|boolean',
        ]);

        $professor->courses()->attach($validated['course_id'], [
            'academic_year_id' => $validated['academic_year_id'],
            'is_primary' => $validated['is_primary'] ?? false,
        ]);
        
        return response()->json(['message' => 'Course assigned successfully']);
    }

    public function removeCourse(Professor $professor, Course $course)
    {
        $professor->courses()->detach($course->id);
        
        return response()->json(['message' => 'Course removed successfully']);
    }

    public function getSchedule(Request $request)
    {
        $professor = $this->professorForRequest($request);
        if (!$professor) {
            return response()->json([]);
        }

        $schedules = $professor->schedules()->with(['course', 'room'])->get();

        return response()->json($schedules);
    }

    public function getStudents(Request $request)
    {
        $professor = $this->professorForRequest($request);
        if (!$professor) {
            return response()->json([]);
        }

        $courseIds = $professor->courses()->pluck('id');
        $with = ['user'];
        if (Schema::hasColumn('students', 'program_id')) {
            $with[] = 'program';
        }

        $students = Student::whereHas('enrollments', function ($query) use ($courseIds) {
            $query->whereIn('course_id', $courseIds);
        })->with($with)->get();

        return response()->json($students);
    }
}
