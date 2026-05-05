<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicModule;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Grade;
use App\Models\Payment;
use App\Models\Professor;
use App\Models\Program;
use App\Models\Schedule;
use App\Models\ScheduleConflict;
use App\Models\Student;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    public function getDashboard()
    {
        $cacheKey = 'dashboard_stats_' . date('Y-m-d-H');
        $cacheDuration = 60;

        $data = Cache::remember($cacheKey, $cacheDuration, function () {
            return $this->compileDashboardPayload();
        });

        return response()->json($data);
    }

    private function compileDashboardPayload(): array
    {
        $faculties = Faculty::count();
        $departments = Department::count();
        $programs = Program::count();
        $activePrograms = Program::where('is_active', true)->count();
        $modules = AcademicModule::count();
        $professors = Professor::count();
        $students = Student::count();
        $courses = Course::count();
        $activeCourses = Course::where('is_active', true)->count();
        $totalSchedules = Schedule::count();
        $scheduleConflicts = ScheduleConflict::count();
        $totalEnrollments = CourseEnrollment::count();
        $approvedEnrollments = CourseEnrollment::where('status', 'active')->count();
        $totalGrades = Grade::count();
        $paidPayments = Payment::where('status', 'completed')->count();
        $totalPayments = Payment::count();

        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();
        $scheduleRowsThisMonth = Schedule::where(function ($q) use ($startOfMonth, $endOfMonth) {
            $q->whereBetween('start_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                ->orWhereBetween('end_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()]);
        })->count();

        $pendingRequests = DB::table('enrollment_requests')
            ->whereIn('status', ['submitted', 'pending_approval'])
            ->count();

        $attendanceTotal = \App\Models\Attendance::count();
        $attendancePresent = \App\Models\Attendance::where('status', 'present')->count();
        $attendanceRate = $attendanceTotal > 0
            ? (int) round(($attendancePresent / max($attendanceTotal, 1)) * 100)
            : 0;

        $sessionsByMonth = Schedule::selectRaw('MONTH(COALESCE(start_date, created_at)) as month, COUNT(*) as count')
            ->whereYear(DB::raw('COALESCE(start_date, created_at)'), Carbon::now()->year)
            ->groupBy('month')
            ->pluck('count', 'month')
            ->toArray();

        $monthData = [];
        for ($month = 1; $month <= 12; $month++) {
            $monthData[] = $sessionsByMonth[$month] ?? 0;
        }

        $sessionTypesQuery = Schedule::query()
            ->selectRaw("SUM(CASE WHEN session_type = 'cours' THEN 1 ELSE 0 END) as cours")
            ->selectRaw("SUM(CASE WHEN session_type = 'td' THEN 1 ELSE 0 END) as td")
            ->selectRaw("SUM(CASE WHEN session_type = 'tp' THEN 1 ELSE 0 END) as tp")
            ->selectRaw('COUNT(*) as total')
            ->first();

        $totalTyped = (int) ($sessionTypesQuery->total ?? 0);
        if (!$sessionTypesQuery || $totalTyped === 0) {
            $sessionTypes = [
                'presential' => 0,
                'online' => 0,
                'mixed' => 0,
                'total' => 0,
            ];
        } else {
            $sessionTypes = [
                'presential' => (int) round((($sessionTypesQuery->cours ?? 0) / $totalTyped) * 100),
                'online' => (int) round((($sessionTypesQuery->td ?? 0) / $totalTyped) * 100),
                'mixed' => (int) round((($sessionTypesQuery->tp ?? 0) / $totalTyped) * 100),
                'total' => $totalTyped,
            ];
        }

        $recentGroups = Program::with('department.faculty')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($program) {
                $enrolled = CourseEnrollment::whereHas('course', function ($q) use ($program) {
                    $q->where('program_id', $program->id);
                })->where('status', 'active')->count();
                return [
                    'name' => $program->name,
                    'dept' => optional($program->department)->name ?? 'N/A',
                    'tutor' => optional(optional($program->department)->faculty)->name ?? 'N/A',
                    'students' => $enrolled,
                    'max' => null,
                    'status' => $program->is_active ? 'active' : 'inactive',
                ];
            });

        $pendingRequestsList = DB::table('enrollment_requests')
            ->join('students', 'students.id', '=', 'enrollment_requests.student_id')
            ->join('courses', 'courses.id', '=', 'enrollment_requests.course_id')
            ->whereIn('enrollment_requests.status', ['submitted', 'pending_approval'])
            ->select('students.name as student_name', 'courses.name as course_name', 'enrollment_requests.created_at', 'enrollment_requests.status')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($request) {
                return [
                    'name' => $request->student_name ?? 'N/A',
                    'group' => $request->course_name ?? 'N/A',
                    'date' => Carbon::parse($request->created_at)->format('d/m/Y'),
                    'status' => $request->status,
                ];
            });

        $recentActivity = $this->fetchRecentActivity();

        return [
            'stats' => [
                'active_groups' => $activePrograms,
                'faculties' => $faculties,
                'departments' => $departments,
                'programs' => $programs,
                'modules' => $modules,
                'professors' => $professors,
                'students' => $students,
                'schedules_this_month' => $scheduleRowsThisMonth,
                'pending_requests' => $pendingRequests,
                'attendance_rate' => $attendanceRate,
                'courses' => $courses,
                'active_courses' => $activeCourses,
                'total_schedules' => $totalSchedules,
                'schedule_conflicts' => $scheduleConflicts,
                'total_enrollments' => $totalEnrollments,
                'approved_enrollments' => $approvedEnrollments,
                'total_grades' => $totalGrades,
                'payment_success_rate' => $totalPayments > 0 ? (int) round(($paidPayments / $totalPayments) * 100) : 0,
            ],
            'sessions_by_month' => $monthData,
            'session_types' => $sessionTypes,
            'recent_groups' => $recentGroups,
            'pending_requests_list' => $pendingRequestsList,
            'recent_activity' => $recentActivity,
        ];
    }

    /**
     * Get recent activity - optimized
     */
    private function fetchRecentActivity()
    {
        $activities = [];

        $recentPrograms = Program::orderByDesc('created_at')->limit(3)->get();
        foreach ($recentPrograms as $program) {
            $activities[] = [
                'icon' => '🎓',
                'color' => 'purple',
                'text' => "Nouveau programme «{$program->name}» créé",
                'time' => $program->created_at->diffForHumans(),
                'timestamp' => $program->created_at->timestamp,
            ];
        }

        $recentEnrollmentDecisions = DB::table('enrollment_requests')
            ->join('students', 'students.id', '=', 'enrollment_requests.student_id')
            ->whereIn('enrollment_requests.status', ['approved', 'rejected'])
            ->orderByDesc('enrollment_requests.updated_at')
            ->select('students.name as student_name', 'enrollment_requests.status', 'enrollment_requests.updated_at')
            ->limit(3)
            ->get();

        foreach ($recentEnrollmentDecisions as $decision) {
            $studentName = $decision->student_name ?? 'N/A';
            if ($decision->status === 'approved') {
                $activities[] = [
                    'icon' => '✅',
                    'color' => 'green',
                    'text' => "Inscription validée: {$studentName}",
                    'time' => Carbon::parse($decision->updated_at)->diffForHumans(),
                    'timestamp' => Carbon::parse($decision->updated_at)->timestamp,
                ];
            } elseif ($decision->status === 'rejected') {
                $activities[] = [
                    'icon' => '❌',
                    'color' => 'red',
                    'text' => "Inscription refusée: {$studentName}",
                    'time' => Carbon::parse($decision->updated_at)->diffForHumans(),
                    'timestamp' => Carbon::parse($decision->updated_at)->timestamp,
                ];
            }
        }

        // Sort by actual timestamp (not localized display string)
        usort($activities, function ($a, $b) {
            return ($b['timestamp'] ?? 0) <=> ($a['timestamp'] ?? 0);
        });

        return array_values(array_map(function ($row) {
            unset($row['timestamp']);
            return $row;
        }, array_slice($activities, 0, 5)));
    }

    public function getGroups()
    {
        $cacheKey = 'academic_programs_list';
        
        $data = Cache::remember($cacheKey, 300, function () {
            return Program::with('department.faculty')
                ->get()
                ->map(function ($program) {
                    $studentCount = CourseEnrollment::whereHas('course', function ($q) use ($program) {
                        $q->where('program_id', $program->id);
                    })->where('status', 'active')->count();
                    return [
                        'id' => $program->id,
                        'name' => $program->name,
                        'dept' => optional($program->department)->name ?? 'N/A',
                        'tutor' => optional(optional($program->department)->faculty)->name ?? 'N/A',
                        'tutor_id' => optional(optional($program->department)->faculty)->id,
                        'students' => $studentCount,
                        'max' => null,
                        'type' => 'academic_program',
                        'status' => $program->is_active ? 'active' : 'inactive',
                        'created' => optional($program->created_at)->format('d/m/Y'),
                    ];
                });
        });

        return response()->json($data);
    }

    public function getProfessors()
    {
        $cacheKey = 'professors_list';

        $data = Cache::remember($cacheKey, 300, function () {
            return Professor::with('user')
                ->get()
                ->map(function ($prof) {
                    return [
                        'id' => $prof->id,
                        'name' => optional($prof->user)->name ?? 'N/A',
                        'specialite' => $prof->specialite,
                    ];
                });
        });

        return response()->json($data);
    }

    public function createGroup(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20',
            'department_id' => 'required|exists:departments,id',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'duration_years' => 'nullable|integer|min:1|max:10',
            'credits_required' => 'nullable|integer|min:1|max:300',
        ]);

        $program = Program::create([
            'name' => $data['name'],
            'code' => $data['code'],
            'department_id' => $data['department_id'],
            'academic_year_id' => $data['academic_year_id'] ?? null,
            'duration_years' => $data['duration_years'] ?? 3,
            'credits_required' => $data['credits_required'] ?? 180,
            'is_active' => true,
        ]);
        
        Cache::forget('academic_programs_list');
        Cache::forget('dashboard_stats_' . date('Y-m-d-H'));
        
        return response()->json($program, 201);
    }

    public function getAllRequests()
    {
        $requests = DB::table('enrollment_requests')
            ->join('students', 'students.id', '=', 'enrollment_requests.student_id')
            ->join('courses', 'courses.id', '=', 'enrollment_requests.course_id')
            ->select(
                'enrollment_requests.*',
                'students.name as student_name',
                'courses.name as course_name'
            )
            ->orderByDesc('enrollment_requests.created_at')
            ->paginate(20);
        
        return response()->json($requests);
    }

    public function updateRequestStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,submitted,auto_checked,pending_approval,approved,rejected,finalized',
            'comment' => 'nullable|string|max:1000',
        ]);

        $updated = DB::table('enrollment_requests')
            ->where('id', $id)
            ->update([
                'status' => $validated['status'],
                'admin_note' => $validated['comment'] ?? null,
                'updated_at' => now(),
            ]);
        if (!$updated) {
            return response()->json(['message' => 'Request not found'], 404);
        }
        
        Cache::forget('dashboard_stats_' . date('Y-m-d-H'));
        
        return response()->json(['success' => true, 'status' => $validated['status']]);
    }

    public function getDirectionDashboard()
    {
        $totalStudents = Student::count();
        $totalProfessors = Professor::count();
        $activeGroups = Program::where('is_active', true)->count();
        $sessionsThisMonth = Schedule::whereBetween('start_date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])->count();
        $pendingRequests = DB::table('enrollment_requests')->whereIn('status', ['submitted', 'pending_approval'])->count();
        $approvedRequests = DB::table('enrollment_requests')->where('status', 'approved')->count();
        $approvalRate = ($pendingRequests + $approvedRequests) > 0
            ? round(($approvedRequests / ($pendingRequests + $approvedRequests)) * 100, 2)
            : 0.0;

        return response()->json([
            'students' => $totalStudents,
            'professors' => $totalProfessors,
            'active_groups' => $activeGroups,
            'sessions_this_month' => $sessionsThisMonth,
            'pending_requests' => $pendingRequests,
            'approval_rate' => $approvalRate,
        ]);
    }

    public function getQualityDashboard()
    {
        $requestItems = DB::table('enrollment_requests')
            ->whereIn('status', ['approved', 'rejected', 'finalized'])
            ->get();

        $resolvedWithinSla = 0;
        foreach ($requestItems as $item) {
            $created = Carbon::parse($item->created_at);
            $resolvedAt = Carbon::parse($item->updated_at);
            $deadline = $created->copy()->addHours(72);
            if ($resolvedAt->lessThanOrEqualTo($deadline)) {
                $resolvedWithinSla++;
            }
        }

        $totalResolved = $requestItems->count();
        $slaRate = $totalResolved > 0 ? round(($resolvedWithinSla / $totalResolved) * 100, 2) : 0.0;

        $attendanceTotal = \App\Models\Attendance::count();
        $attendancePresent = \App\Models\Attendance::where('status', 'present')->count();
        $attendanceRate = $attendanceTotal > 0 ? round(($attendancePresent / $attendanceTotal) * 100, 2) : 0.0;

        return response()->json([
            'resolved_requests' => $totalResolved,
            'resolved_within_sla' => $resolvedWithinSla,
            'sla_rate' => $slaRate,
            'attendance_rate' => $attendanceRate,
            'incident_rate' => max(0, round(100 - $slaRate, 2)),
        ]);
    }

    public function getAllSessions()
    {
        $sessions = Schedule::with(['course', 'professor.user', 'room'])
            ->orderBy('start_date', 'asc')
            ->paginate(20);
        
        return response()->json($sessions);
    }

    public function getStats()
    {
        $cacheKey = 'stats_summary';

        $data = Cache::remember($cacheKey, 300, function () {
            $activeGroups = Program::where('is_active', true)->count();
            $professors = Professor::count();
            $students = Student::count();
            $sessionsThisMonth = Schedule::whereBetween('start_date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])->count();
            $pendingRequests = DB::table('enrollment_requests')->whereIn('status', ['submitted', 'pending_approval'])->count();

            $attendanceTotal = \App\Models\Attendance::count();
            $attendancePresent = \App\Models\Attendance::where('status', 'present')->count();
            $attendanceRate = $attendanceTotal > 0
                ? (int) round(($attendancePresent / max($attendanceTotal, 1)) * 100)
                : 0;

            return [
                'active_groups' => $activeGroups,
                'professors' => $professors,
                'students' => $students,
                'sessions_this_month' => $sessionsThisMonth,
                'pending_requests' => $pendingRequests,
                'attendance_rate' => $attendanceRate,
            ];
        });

        return response()->json($data);
    }

    public function getSessionsByMonth()
    {
        $cacheKey = 'sessions_by_month_' . date('Y-m');

        $monthData = Cache::remember($cacheKey, 3600, function () {
            $sessionsByMonth = Schedule::selectRaw('MONTH(COALESCE(start_date, created_at)) as month, COUNT(*) as count')
                ->whereYear(DB::raw('COALESCE(start_date, created_at)'), Carbon::now()->year)
                ->groupBy('month')
                ->pluck('count', 'month')
                ->toArray();

            $out = [];
            for ($month = 1; $month <= 12; $month++) {
                $out[] = $sessionsByMonth[$month] ?? 0;
            }

            return $out;
        });

        return response()->json($monthData);
    }

    public function getSessionTypes()
    {
        $cacheKey = 'session_types';

        $data = Cache::remember($cacheKey, 3600, function () {
            $sessionTypesQuery = Schedule::query()
                ->selectRaw("SUM(CASE WHEN session_type = 'cours' THEN 1 ELSE 0 END) as presential")
                ->selectRaw("SUM(CASE WHEN session_type = 'td' THEN 1 ELSE 0 END) as online")
                ->selectRaw("SUM(CASE WHEN session_type = 'tp' THEN 1 ELSE 0 END) as mixed")
                ->selectRaw('COUNT(*) as total')
                ->first();

            if (!$sessionTypesQuery || (int) ($sessionTypesQuery->total ?? 0) === 0) {
                return [
                    'presential' => 0,
                    'online' => 0,
                    'mixed' => 0,
                    'total' => 0,
                ];
            }

            $total = (int) $sessionTypesQuery->total;

            return [
                'presential' => (int) round((($sessionTypesQuery->presential ?? 0) / max($total, 1)) * 100),
                'online' => (int) round((($sessionTypesQuery->online ?? 0) / max($total, 1)) * 100),
                'mixed' => (int) round((($sessionTypesQuery->mixed ?? 0) / max($total, 1)) * 100),
                'total' => $total,
            ];
        });

        return response()->json($data);
    }

    public function getRecentGroups()
    {
        $cacheKey = 'recent_groups';

        $data = Cache::remember($cacheKey, 300, function () {
            return Program::with('department.faculty')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($program) {
                    $studentCount = CourseEnrollment::whereHas('course', function ($q) use ($program) {
                        $q->where('program_id', $program->id);
                    })->where('status', 'active')->count();
                    return [
                        'name' => $program->name,
                        'dept' => optional($program->department)->name ?? 'N/A',
                        'tutor' => optional(optional($program->department)->faculty)->name ?? 'N/A',
                        'students' => $studentCount,
                        'max' => null,
                        'status' => $program->is_active ? 'active' : 'inactive',
                    ];
                });
        });

        return response()->json($data);
    }

    public function getPendingRequests()
    {
        $cacheKey = 'pending_requests';

        $data = Cache::remember($cacheKey, 120, function () {
            return DB::table('enrollment_requests')
                ->join('students', 'students.id', '=', 'enrollment_requests.student_id')
                ->join('courses', 'courses.id', '=', 'enrollment_requests.course_id')
                ->whereIn('enrollment_requests.status', ['submitted', 'pending_approval'])
                ->orderByDesc('enrollment_requests.created_at')
                ->select('students.name as student_name', 'courses.name as course_name', 'enrollment_requests.created_at', 'enrollment_requests.status')
                ->limit(10)
                ->get()
                ->map(function ($request) {
                    return [
                        'name' => $request->student_name ?? 'N/A',
                        'group' => $request->course_name ?? 'N/A',
                        'date' => Carbon::parse($request->created_at)->format('d/m/Y'),
                        'status' => $request->status,
                    ];
                });
        });

        return response()->json($data);
    }

    public function getRecentActivity()
    {
        $cacheKey = 'recent_activity';

        $data = Cache::remember($cacheKey, 300, function () {
            return $this->fetchRecentActivity();
        });

        return response()->json($data);
    }

    /**
     * Clear all caches (for admin use)
     */
    public function clearCache()
    {
        Cache::flush();
        return response()->json(['message' => 'Cache cleared successfully']);
    }
}
