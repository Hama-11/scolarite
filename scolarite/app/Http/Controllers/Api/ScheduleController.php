<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ScheduleController extends Controller
{
    private function ensureTeachingWriteAccess(Request $request)
    {
        $user = $request->user();
        if ($user && ($user->isAdministrator() || $user->isProfessor() || $user->hasRole('directeur_etudes'))) {
            return null;
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }

    public function index(Request $request)
    {
        $query = Schedule::with(['course', 'group', 'professor', 'room']);
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }
        
        if ($request->has('day_of_week')) {
            $query->where('day_of_week', $request->day_of_week);
        }
        
        $perPage = (int) $request->get('per_page', 20);
        $perPage = $perPage > 0 ? $perPage : 20;
        $schedules = $query->paginate($perPage);
        
        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        if ($response = $this->ensureTeachingWriteAccess($request)) {
            return $response;
        }

        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'group_id' => 'nullable|exists:groups,id',
            'professor_id' => 'required|exists:professors,id',
            'room_id' => 'nullable|exists:rooms,id',
            'day_of_week' => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'session_type' => 'required|in:cours,td,tp',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'week_parity' => 'nullable|in:1,2',
        ]);

        $schedule = Schedule::create($validated);
        
        return response()->json($schedule->load(['course', 'group', 'professor', 'room']), 201);
    }

    public function show(Schedule $schedule)
    {
        return response()->json($schedule->load(['course', 'group', 'professor', 'room']));
    }

    public function update(Request $request, Schedule $schedule)
    {
        if ($response = $this->ensureTeachingWriteAccess($request)) {
            return $response;
        }

        $validated = $request->validate([
            'course_id' => 'sometimes|exists:courses,id',
            'group_id' => 'nullable|exists:groups,id',
            'professor_id' => 'sometimes|exists:professors,id',
            'room_id' => 'nullable|exists:rooms,id',
            'day_of_week' => 'sometimes|in:monday,tuesday,wednesday,thursday,friday,saturday',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'session_type' => 'sometimes|in:cours,td,tp',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'week_parity' => 'nullable|in:1,2',
        ]);

        $schedule->update($validated);
        
        return response()->json($schedule->load(['course', 'group', 'professor', 'room']));
    }

    public function destroy(Schedule $schedule)
    {
        if ($response = $this->ensureTeachingWriteAccess(request())) {
            return $response;
        }

        $schedule->delete();
        
        return response()->json(['message' => 'Schedule deleted successfully']);
    }

    public function mySchedule(Request $request)
    {
        $user = Auth::user();
        
        if ($user->student) {
            $studentClasse = $user->student->classe;
            
            $query = Schedule::with(['course', 'group', 'professor', 'room']);
            
            // Get schedules by student's class group or by course enrollments
            if ($studentClasse) {
                $query->where('group_id', $studentClasse);
            }
            
            $schedules = $query->get();
            
            // If no schedules found by group, try by course enrollment
            if ($schedules->isEmpty() && $user->student) {
                $courseIds = \App\Models\CourseEnrollment::where('student_id', $user->student->id)
                    ->pluck('course_id');
                
                $schedules = Schedule::with(['course', 'group', 'professor', 'room'])
                    ->whereIn('course_id', $courseIds)
                    ->get();
            }
            
            return response()->json(['data' => $schedules]);
            
        } elseif ($user->professor) {
            $schedules = Schedule::with(['course', 'group', 'professor', 'room'])
                ->where('professor_id', $user->professor->id)
                ->get();
            
            return response()->json(['data' => $schedules]);
        } else {
            return response()->json(['data' => []]);
        }
    }

    public function byDay(Request $request)
    {
        $dayOfWeek = $request->get('day', 'monday');
        
        $schedules = Schedule::with(['course', 'group', 'professor', 'room'])
            ->where('day_of_week', $dayOfWeek)
            ->orderBy('start_time')
            ->get();
        
        return response()->json($schedules);
    }

    public function byRoom($roomId)
    {
        $schedules = Schedule::with(['course', 'group', 'professor', 'room'])
            ->where('room_id', $roomId)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json($schedules);
    }

    public function byCourse($courseId)
    {
        $schedules = Schedule::with(['course', 'group', 'professor', 'room'])
            ->where('course_id', $courseId)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json($schedules);
    }
}
