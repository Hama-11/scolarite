<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DirectorAcademicController extends Controller
{
    public function pendingGrades(Request $request)
    {
        $query = Grade::with(['student.user', 'course'])
            ->where('is_validated', false)
            ->orderByDesc('date');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->integer('student_id'));
        }

        return response()->json($query->paginate((int) $request->get('per_page', 25)));
    }

    public function validateGrade(Request $request, Grade $grade)
    {
        $request->validate([
            'is_validated' => 'nullable|boolean',
        ]);

        $grade->update([
            'is_validated' => true,
            'validated_by' => optional($request->user())->id,
            'validated_at' => now(),
        ]);

        return response()->json($grade->fresh()->load(['student.user', 'course']));
    }

    public function validateGradesBulk(Request $request)
    {
        $data = $request->validate([
            'grade_ids' => 'required|array|min:1',
            'grade_ids.*' => 'integer|exists:grades,id',
        ]);

        $count = Grade::whereIn('id', $data['grade_ids'])
            ->where('is_validated', false)
            ->update([
                'is_validated' => true,
                'validated_by' => optional($request->user())->id,
                'validated_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json(['validated_count' => $count]);
    }

    public function studentOverview(Student $student)
    {
        $student->load(['user']);
        $grades = $student->grades()->with('course')->orderByDesc('date')->get();
        $validatedGrades = $grades->where('is_validated', true);

        $average = $validatedGrades->count() > 0 ? round((float) $validatedGrades->avg('grade'), 2) : null;
        $attendanceTotal = $student->attendances()->count();
        $attendancePresent = $student->attendances()->where('status', 'present')->count();
        $attendanceRate = $attendanceTotal > 0 ? (int) round(($attendancePresent / max($attendanceTotal, 1)) * 100) : 0;

        $disputesCount = DB::table('grade_disputes')->where('student_id', $student->id)->count();

        return response()->json([
            'student' => $student,
            'summary' => [
                'grades_total' => $grades->count(),
                'grades_validated' => $validatedGrades->count(),
                'average_validated' => $average,
                'attendance_rate' => $attendanceRate,
                'grade_disputes' => $disputesCount,
            ],
            'grades' => $grades,
        ]);
    }

    public function decideAcademic(Request $request, Student $student)
    {
        $data = $request->validate([
            'semester_id' => 'nullable|integer|exists:semesters,id',
            'decision' => 'required|in:pass,repeat,conditional',
            'jury_notes' => 'nullable|string|max:5000',
        ]);

        $validatedGrades = $student->grades()->where('is_validated', true);
        $avg = $validatedGrades->count() > 0 ? round((float) $validatedGrades->avg('grade'), 2) : null;

        $id = DB::table('academic_decisions')->insertGetId([
            'student_id' => $student->id,
            'semester_id' => $data['semester_id'] ?? null,
            'average' => $avg,
            'decision' => $data['decision'],
            'jury_notes' => $data['jury_notes'] ?? null,
            'decided_by' => optional($request->user())->id,
            'decided_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'id' => $id,
            'student_id' => $student->id,
            'average' => $avg,
            'decision' => $data['decision'],
        ], 201);
    }
}

