<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $query = Course::with(['program', 'professor', 'module.semester']);
        
        if ($request->has('program_id')) {
            $query->where('program_id', $request->program_id);
        }
        
        if ($request->has('semester')) {
            $query->where('semester', $request->semester);
        }
        
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        
        $courses = $query->paginate(15);
        
        return response()->json($courses);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:courses,code',
            'description' => 'nullable|string',
            'objectives' => 'nullable|string',
            'prerequisites' => 'nullable|string',
            'credits' => 'required|integer|min:1',
            'hours_cours' => 'nullable|integer|min:0',
            'hours_td' => 'nullable|integer|min:0',
            'hours_tp' => 'nullable|integer|min:0',
            'program_id' => 'required|exists:programs,id',
            'professor_id' => 'nullable|exists:professors,id',
            'semester' => 'required|integer|min:1|max:2',
            'evaluation_type' => 'required|in:exam,cc,mixed',
        ]);

        $course = Course::create($validated);
        
        return response()->json($course->load(['program', 'professor']), 201);
    }

    public function show(Course $course)
    {
        return response()->json($course->load(['program', 'professor', 'module.semester', 'assignments', 'documents']));
    }

    public function update(Request $request, Course $course)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|unique:courses,code,' . $course->id,
            'description' => 'nullable|string',
            'objectives' => 'nullable|string',
            'prerequisites' => 'nullable|string',
            'credits' => 'sometimes|integer|min:1',
            'hours_cours' => 'nullable|integer|min:0',
            'hours_td' => 'nullable|integer|min:0',
            'hours_tp' => 'nullable|integer|min:0',
            'program_id' => 'sometimes|exists:programs,id',
            'professor_id' => 'nullable|exists:professors,id',
            'semester' => 'sometimes|integer|min:1|max:2',
            'evaluation_type' => 'sometimes|in:exam,cc,mixed',
            'is_active' => 'sometimes|boolean',
        ]);

        $course->update($validated);
        
        return response()->json($course->load(['program', 'professor']));
    }

    public function destroy(Course $course)
    {
        $course->delete();
        
        return response()->json(['message' => 'Course deleted successfully']);
    }

    public function myCourses()
    {
        $user = Auth::user();
        
        // Check if user has student profile
        if (!$user->student) {
            // Return empty array if no student profile
            return response()->json(['data' => []]);
        }
        
        $enrollments = CourseEnrollment::where('student_id', $user->student->id)
            ->with(['course.program', 'course.professor', 'course.module.semester'])
            ->get();
        
        // Extract courses from enrollments
        $courses = $enrollments->pluck('course')->filter()->values();
        
        return response()->json(['data' => $courses]);
    }

    public function enroll(Request $request, Course $course)
    {
        $user = Auth::user();
        
        if (!$user->student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);
        
        $enrollment = CourseEnrollment::create([
            'student_id' => $user->student->id,
            'course_id' => $course->id,
            'academic_year_id' => $validated['academic_year_id'],
            'status' => 'active',
        ]);
        
        return response()->json($enrollment, 201);
    }

    public function unenroll(Course $course, $studentId)
    {
        $deleted = CourseEnrollment::where('course_id', $course->id)
            ->where('student_id', (int) $studentId)
            ->delete();

        return response()->json([
            'message' => $deleted ? 'Enrollment removed successfully' : 'Enrollment not found',
        ]);
    }

    public function students(Course $course)
    {
        $students = CourseEnrollment::with(['student.user'])
            ->where('course_id', $course->id)
            ->get()
            ->pluck('student')
            ->filter()
            ->values();

        return response()->json($students);
    }

    public function enrollments(Course $course)
    {
        $rows = CourseEnrollment::with(['student.user', 'academicYear'])
            ->where('course_id', $course->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($rows);
    }

    public function professorCourses()
    {
        $user = Auth::user();
        if (!$user || !$user->professor) {
            return response()->json(['data' => []]);
        }

        $courses = Course::with(['program', 'professor', 'module.semester'])
            ->where('professor_id', $user->professor->id)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $courses]);
    }
}