<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Schedule;
use Illuminate\Support\Facades\Schema;

class StudentController extends Controller
{
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

        $dashWith = ['user'];
        if (Schema::hasColumn('students', 'program_id')) {
            $dashWith[] = 'program.department';
        }
        if (Schema::hasColumn('students', 'group_id')) {
            $dashWith[] = 'group';
        }
        $student = Student::with($dashWith)
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
        $query = Student::with(['user', 'program.department', 'group']);
        
        if ($request->has('program_id')) {
            $query->where('program_id', $request->program_id);
        }
        
        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
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
            'program_id' => 'required|exists:programs,id',
            'group_id' => 'nullable|exists:groups,id',
            'enrollment_date' => 'required|date',
            'student_id' => 'nullable|string|max:50|unique:students,student_id',
            'status' => 'nullable|in:active,graduated,suspended,withdrawn',
        ]);

        // Create user account
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => 3, // Student role
        ]);

        // Create student record
        $studentData = [
            'user_id' => $user->id,
            'program_id' => $validated['program_id'],
            'enrollment_date' => $validated['enrollment_date'],
            'status' => $validated['status'] ?? 'active',
        ];
        
        if (isset($validated['group_id'])) {
            $studentData['group_id'] = $validated['group_id'];
        }
        
        if (isset($validated['student_id'])) {
            $studentData['student_id'] = $validated['student_id'];
        }
        
        $student = Student::create($studentData);
        
        return response()->json($student->load(['user', 'program.department', 'group']), 201);
    }

    public function show(Student $student)
    {
        return response()->json($student->load(['user', 'program.department', 'group', 'enrollments.course', 'grades', 'attendances.schedule.course']));
    }

    public function update(Request $request, Student $student)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'program_id' => 'sometimes|exists:programs,id',
            'group_id' => 'nullable|exists:groups,id',
            'enrollment_date' => 'sometimes|date',
            'student_id' => 'nullable|string|max:50|unique:students,student_id,' . $student->id,
            'status' => 'sometimes|in:active,graduated,suspended,withdrawn',
        ]);

        // Update user data
        if (isset($validated['name'])) {
            $student->user->update(['name' => $validated['name']]);
        }

        // Update student data
        $student->update($validated);
        
        return response()->json($student->load(['user', 'program.department', 'group']));
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

        $student->update(['group_id' => $validated['group_id']]);
        
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