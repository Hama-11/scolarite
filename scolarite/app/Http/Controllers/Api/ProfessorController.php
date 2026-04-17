<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Professor;
use App\Models\User;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use App\Models\Student;

class ProfessorController extends Controller
{
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
        $validated = $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'department_id' => 'nullable|exists:departments,id',
            'specialization' => 'nullable|string|max:255',
            'hire_date' => 'required|date',
            'employee_id' => 'nullable|string|max:50|unique:professors,employee_id',
            'title' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,on_leave,retired',
        ]);

        // Create user account
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => 2, // Professor role
        ]);

        // Create professor record
        $professorData = [
            'user_id' => $user->id,
            'department_id' => $validated['department_id'] ?? null,
            'hire_date' => $validated['hire_date'],
            'status' => $validated['status'] ?? 'active',
        ];
        
        if (isset($validated['employee_id'])) {
            $professorData['employee_id'] = $validated['employee_id'];
        }
        
        if (isset($validated['specialization'])) {
            $professorData['specialization'] = $validated['specialization'];
        }
        
        if (isset($validated['title'])) {
            $professorData['title'] = $validated['title'];
        }
        
        $professor = Professor::create($professorData);
        
        return response()->json($professor->load(['user', 'courses']), 201);
    }

    public function show(Professor $professor)
    {
        return response()->json($professor->load(['user', 'courses', 'schedules.course', 'schedules.room']));
    }

    public function update(Request $request, Professor $professor)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'department_id' => 'nullable|exists:departments,id',
            'specialization' => 'nullable|string|max:255',
            'hire_date' => 'sometimes|date',
            'employee_id' => 'nullable|string|max:50|unique:professors,employee_id,' . $professor->id,
            'title' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,on_leave,retired',
        ]);

        // Update user data
        if (isset($validated['name'])) {
            $professor->user->update(['name' => $validated['name']]);
        }

        // Update professor data
        $professor->update($validated);
        
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