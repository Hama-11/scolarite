<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Schedule;
use App\Models\Course;
use App\Models\CourseEnrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with(['student.user', 'course']);
        
        if ($request->has('schedule_id')) {
            $schedule = Schedule::find($request->schedule_id);
            if ($schedule) {
                $query->where('course_id', $schedule->course_id);
            }
        }

        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $attendances = $query->orderBy('date', 'desc')->paginate(30);
        
        return response()->json($attendances);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'schedule_id' => 'nullable|exists:schedules,id',
            'course_id' => 'nullable|exists:courses,id',
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date',
            'status' => 'required|in:present,absent,late,excused',
            'notes' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $courseId = $validated['course_id'] ?? null;
        if (!$courseId && !empty($validated['schedule_id'])) {
            $schedule = Schedule::find($validated['schedule_id']);
            $courseId = $schedule ? $schedule->course_id : null;
        }

        if (!$courseId) {
            return response()->json(['message' => 'course_id or schedule_id is required'], 422);
        }

        $attendance = Attendance::updateOrCreate(
            [
                'course_id' => $courseId,
                'student_id' => $validated['student_id'],
                'date' => $validated['date'],
            ],
            [
                'course_id' => $courseId,
                'student_id' => $validated['student_id'],
                'date' => $validated['date'],
                'status' => $validated['status'],
                'remarks' => $validated['remarks'] ?? ($validated['notes'] ?? null),
            ]
        );
        
        return response()->json($attendance->load(['student.user', 'course']), 201);
    }

    public function storeBulk(Request $request)
    {
        $validated = $request->validate([
            'schedule_id' => 'nullable|exists:schedules,id',
            'course_id' => 'nullable|exists:courses,id',
            'date' => 'required|date',
            'attendances' => 'required|array',
            'attendances.*.student_id' => 'required|exists:students,id',
            'attendances.*.status' => 'required|in:present,absent,late,excused',
            'attendances.*.notes' => 'nullable|string',
            'attendances.*.remarks' => 'nullable|string',
        ]);

        $courseId = $validated['course_id'] ?? null;
        if (!$courseId && !empty($validated['schedule_id'])) {
            $schedule = Schedule::find($validated['schedule_id']);
            $courseId = $schedule ? $schedule->course_id : null;
        }
        if (!$courseId) {
            return response()->json(['message' => 'course_id or schedule_id is required'], 422);
        }

        $created = [];
        foreach ($validated['attendances'] as $att) {
            $attendance = Attendance::updateOrCreate(
                [
                    'course_id' => $courseId,
                    'student_id' => $att['student_id'],
                    'date' => $validated['date'],
                ],
                [
                    'course_id' => $courseId,
                    'status' => $att['status'],
                    'remarks' => $att['remarks'] ?? ($att['notes'] ?? null),
                ]
            );
            $created[] = $attendance;
        }
        
        return response()->json([
            'message' => 'Attendance recorded successfully',
            'count' => count($created)
        ]);
    }

    public function show(Attendance $attendance)
    {
        return response()->json($attendance->load(['student.user', 'course']));
    }

    public function update(Request $request, Attendance $attendance)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:present,absent,late,excused',
            'notes' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $attendance->update([
            'status' => $validated['status'] ?? $attendance->status,
            'remarks' => $validated['remarks'] ?? ($validated['notes'] ?? $attendance->remarks),
        ]);
        
        return response()->json($attendance->load(['student.user', 'course']));
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->delete();
        
        return response()->json(['message' => 'Attendance deleted successfully']);
    }

    public function myAttendance()
    {
        $student = Auth::user()->student;
        
        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $attendances = Attendance::with(['course'])
            ->where('student_id', $student->id)
            ->orderBy('date', 'desc')
            ->get();
        
        // Calculate attendance rate
        $total = $attendances->count();
        $present = $attendances->where('status', 'present')->count();
        $late = $attendances->where('status', 'late')->count();
        $rate = $total > 0 ? (($present + $late) / $total) * 100 : 0;
        
        return response()->json([
            'attendances' => $attendances,
            'statistics' => [
                'total' => $total,
                'present' => $present,
                'absent' => $attendances->where('status', 'absent')->count(),
                'late' => $late,
                'excused' => $attendances->where('status', 'excused')->count(),
                'attendance_rate' => round($rate, 2),
            ]
        ]);
    }

    public function scheduleAttendance(Request $request, Schedule $schedule)
    {
        $attendances = Attendance::with(['student.user'])
            ->where('course_id', $schedule->course_id)
            ->where('date', $request->date ?? date('Y-m-d'))
            ->get();
        
        return response()->json($attendances);
    }

    public function scheduleStudents(Schedule $schedule)
    {
        $students = CourseEnrollment::with(['student.user'])
            ->where('course_id', $schedule->course_id)
            ->where('status', 'active')
            ->get()
            ->pluck('student')
            ->filter()
            ->values();

        // Fallback: if no enrollment rows, include students currently attached to the same group id.
        if ($students->isEmpty() && $schedule->group_id) {
            $students = \App\Models\Student::with('user')
                ->where('classe', (string) $schedule->group_id)
                ->orWhere('group_id', $schedule->group_id)
                ->get()
                ->values();
        }

        return response()->json(['data' => $students]);
    }
}