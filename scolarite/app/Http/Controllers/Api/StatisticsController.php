<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Student;
use App\Models\Professor;
use App\Models\Group;
use App\Models\TutoringSession;
use App\Models\Request as TutoringRequest;
use App\Models\RequestStatusHistory;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class StatisticsController extends Controller
{
    /**
     * Combined dashboard endpoint - fetches all stats in one request
     * This replaces 6 separate API calls with a single optimized request
     */
    public function getDashboard()
    {
        $cacheKey = 'dashboard_stats_' . date('Y-m-d-H');
        $cacheDuration = 60; // Cache for 1 hour

        return Cache::remember($cacheKey, $cacheDuration, function () {
            // Get counts from database - optimized single queries
            $activeGroups = Group::where('status', 'active')->count();
            $professors = Professor::count();
            $students = Student::count();

            // Sessions this month
            $startOfMonth = Carbon::now()->startOfMonth();
            $endOfMonth = Carbon::now()->endOfMonth();
            $sessionsThisMonth = TutoringSession::whereBetween('scheduled_at', [$startOfMonth, $endOfMonth])->count();

            // Pending requests
            $pendingRequests = TutoringRequest::where('status', 'pending')->count();

            // Attendance rate - use actual data
            $totalSessions = TutoringSession::where('status', 'completed')->count();
            $completedAttendances = \App\Models\Attendance::whereNotNull('present')->count();
            $attendanceRate = $totalSessions > 0 ? round(($completedAttendances / max($totalSessions, 1)) * 100) : 0;

            // Sessions by month - single query with group by
            $sessionsByMonth = TutoringSession::selectRaw('MONTH(scheduled_at) as month, COUNT(*) as count')
                ->whereYear('scheduled_at', Carbon::now()->year)
                ->groupBy('month')
                ->pluck('count', 'month')
                ->toArray();

            $monthData = [];
            for ($month = 1; $month <= 12; $month++) {
                $monthData[] = $sessionsByMonth[$month] ?? 0;
            }

            // Session types - single query
            $sessionTypesQuery = TutoringSession::where('status', 'completed')
                ->selectRaw("SUM(CASE WHEN type = 'presential' THEN 1 ELSE 0 END) as presential")
                ->selectRaw("SUM(CASE WHEN type = 'online' THEN 1 ELSE 0 END) as online")
                ->selectRaw("SUM(CASE WHEN type = 'mixed' THEN 1 ELSE 0 END) as mixed")
                ->selectRaw('COUNT(*) as total')
                ->first();

            $total = $sessionTypesQuery->total ?: 1;
            $sessionTypes = [
                'presential' => $total > 0 ? round(($sessionTypesQuery->presential / $total) * 100) : 0,
                'online' => $total > 0 ? round(($sessionTypesQuery->online / $total) * 100) : 0,
                'mixed' => $total > 0 ? round(($sessionTypesQuery->mixed / $total) * 100) : 0,
                'total' => $sessionTypesQuery->total ?: 0,
            ];

            // Recent groups - optimized with join for student count
            $recentGroups = Group::select('groups.*')
                ->with('professor.user')
                ->leftJoin('tutoring_requests', function ($join) {
                    $join->on('groups.id', '=', 'tutoring_requests.group_id')
                        ->where('tutoring_requests.status', '=', 'approved');
                })
                ->orderBy('groups.created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($group) {
                    return [
                        'name' => $group->name,
                        'dept' => $group->departement,
                        'tutor' => $group->professor->user->name ?? 'N/A',
                        'students' => $group->student_count ?? 0,
                        'max' => $group->max_students,
                        'status' => $group->status,
                    ];
                });

            // Pending requests - optimized query
            $pendingRequestsList = TutoringRequest::with(['student.user', 'group'])
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($request) {
                    return [
                        'name' => $request->student->user->name ?? 'N/A',
                        'group' => $request->group->name ?? 'N/A',
                        'date' => $request->created_at->format('d/m/Y'),
                        'status' => $request->status,
                    ];
                });

            // Recent activity - optimized single query
            $recentActivity = $this->fetchRecentActivity();

            return response()->json([
                'stats' => [
                    'active_groups' => $activeGroups,
                    'professors' => $professors,
                    'students' => $students,
                    'sessions_this_month' => $sessionsThisMonth,
                    'pending_requests' => $pendingRequests,
                    'attendance_rate' => $attendanceRate,
                ],
                'sessions_by_month' => $monthData,
                'session_types' => $sessionTypes,
                'recent_groups' => $recentGroups,
                'pending_requests_list' => $pendingRequestsList,
                'recent_activity' => $recentActivity,
            ]);
        });
    }

    /**
     * Get recent activity - optimized
     */
    private function fetchRecentActivity()
    {
        $activities = [];

        // Get recent groups
        $recentGroups = Group::orderBy('created_at', 'desc')->limit(2)->get();

        foreach ($recentGroups as $group) {
            $activities[] = [
                'icon' => '👥',
                'color' => 'purple',
                'text' => "Nouveau groupe «{$group->name}» créé",
                'time' => $group->created_at->diffForHumans(),
            ];
        }

        // Get recent requests - optimized
        $recentRequests = TutoringRequest::with(['student.user', 'group'])
            ->orderBy('updated_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($recentRequests as $request) {
            $studentName = optional($request->student->user)->name ?? 'N/A';
            if ($request->status === 'approved') {
                $activities[] = [
                    'icon' => '✅',
                    'color' => 'green',
                    'text' => "Inscription acceptée: {$studentName}",
                    'time' => $request->updated_at->diffForHumans(),
                ];
            } elseif ($request->status === 'rejected') {
                $activities[] = [
                    'icon' => '❌',
                    'color' => 'red',
                    'text' => "Inscription refusée: {$studentName}",
                    'time' => $request->updated_at->diffForHumans(),
                ];
            }
        }

        // Sort by time
        usort($activities, function ($a, $b) {
            return strcmp($a['time'], $b['time']);
        });

        return array_slice($activities, 0, 5);
    }

    public function getGroups()
    {
        $cacheKey = 'groups_list';
        
        return Cache::remember($cacheKey, 300, function () {
            $groups = Group::with('professor.user')
                ->get()
                ->map(function ($group) {
                    $studentCount = TutoringRequest::where('group_id', $group->id)
                        ->where('status', 'approved')
                        ->count();
                    return [
                        'id' => $group->id,
                        'name' => $group->name,
                        'dept' => $group->departement,
                        'tutor' => $group->professor->user->name ?? 'N/A',
                        'tutor_id' => $group->professor->id ?? null,
                        'students' => $studentCount,
                        'max' => $group->max_students,
                        'type' => 'presentiel',
                        'status' => $group->status,
                        'created' => $group->created_at->format('d/m/Y'),
                    ];
                });
            
            return response()->json($groups);
        });
    }

    public function getProfessors()
    {
        $cacheKey = 'professors_list';
        
        return Cache::remember($cacheKey, 300, function () {
            $professors = Professor::with('user')
                ->get()
                ->map(function ($prof) {
                    return [
                        'id' => $prof->id,
                        'name' => $prof->user->name ?? 'N/A',
                        'specialite' => $prof->specialite,
                    ];
                });
            
            return response()->json($professors);
        });
    }

    public function createGroup(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'departement' => 'required|string|max:255',
            'professor_id' => 'required|exists:professors,id',
            'max_students' => 'required|integer|min:1|max:50',
        ]);

        $group = Group::create($data);
        
        // Clear cache when new group is created
        Cache::forget('groups_list');
        Cache::forget('dashboard_stats_' . date('Y-m-d-H'));
        
        return response()->json($group, 201);
    }

    public function getAllRequests()
    {
        $requests = TutoringRequest::with(['student.user', 'group'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        
        return response()->json($requests);
    }

    public function updateRequestStatus(Request $request, $id)
    {
        $requestData = TutoringRequest::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:draft,submitted,in_review,approved,rejected,archived,pending',
            'comment' => 'nullable|string|max:1000',
        ]);

        $fromStatus = (string) $requestData->status;
        $toStatus = (string) $validated['status'];

        $requestData->status = $toStatus;
        if ($toStatus === 'submitted' && !$requestData->submitted_at) {
            $requestData->submitted_at = now();
        }
        $requestData->save();

        RequestStatusHistory::create([
            'request_id' => $requestData->id,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'changed_by' => optional(auth()->user())->id,
            'comment' => $validated['comment'] ?? null,
        ]);
        
        // Clear cache
        Cache::forget('dashboard_stats_' . date('Y-m-d-H'));
        
        return response()->json(['success' => true, 'status' => $toStatus]);
    }

    public function getDirectionDashboard()
    {
        $totalStudents = Student::count();
        $totalProfessors = Professor::count();
        $activeGroups = Group::where('status', 'active')->count();
        $sessionsThisMonth = TutoringSession::whereBetween('scheduled_at', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])->count();
        $pendingRequests = TutoringRequest::whereIn('status', ['pending', 'submitted', 'in_review'])->count();
        $approvedRequests = TutoringRequest::where('status', 'approved')->count();
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
        $requestItems = TutoringRequest::query()
            ->whereNotNull('submitted_at')
            ->whereIn('status', ['approved', 'rejected', 'archived'])
            ->get();

        $resolvedWithinSla = 0;
        foreach ($requestItems as $item) {
            $resolvedAt = $item->updated_at;
            $deadline = optional($item->submitted_at)->copy()->addHours((int) ($item->sla_hours ?? 72));
            if ($deadline && $resolvedAt && $resolvedAt->lessThanOrEqualTo($deadline)) {
                $resolvedWithinSla++;
            }
        }

        $totalResolved = $requestItems->count();
        $slaRate = $totalResolved > 0 ? round(($resolvedWithinSla / $totalResolved) * 100, 2) : 0.0;

        $attendanceTotal = \App\Models\Attendance::count();
        $attendancePresent = \App\Models\Attendance::where('present', true)->count();
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
        $sessions = TutoringSession::with('group.professor.user')
            ->orderBy('scheduled_at', 'asc')
            ->paginate(20);
        
        return response()->json($sessions);
    }

    public function getStats()
    {
        $cacheKey = 'stats_summary';
        
        return Cache::remember($cacheKey, 300, function () {
            $activeGroups = Group::where('status', 'active')->count();
            $professors = Professor::count();
            $students = Student::count();
            
            $startOfMonth = Carbon::now()->startOfMonth();
            $endOfMonth = Carbon::now()->endOfMonth();
            $sessionsThisMonth = TutoringSession::whereBetween('scheduled_at', [$startOfMonth, $endOfMonth])->count();
            
            $pendingRequests = TutoringRequest::where('status', 'pending')->count();
            
            $totalSessions = TutoringSession::where('status', 'completed')->count();
            $completedAttendances = \App\Models\Attendance::whereNotNull('present')->count();
            $attendanceRate = $totalSessions > 0 ? round(($completedAttendances / max($totalSessions, 1)) * 100) : 0;
            
            return response()->json([
                'active_groups' => $activeGroups,
                'professors' => $professors,
                'students' => $students,
                'sessions_this_month' => $sessionsThisMonth,
                'pending_requests' => $pendingRequests,
                'attendance_rate' => $attendanceRate,
            ]);
        });
    }

    public function getSessionsByMonth()
    {
        $cacheKey = 'sessions_by_month_' . date('Y-m');
        
        return Cache::remember($cacheKey, 3600, function () {
            $sessionsByMonth = TutoringSession::selectRaw('MONTH(scheduled_at) as month, COUNT(*) as count')
                ->whereYear('scheduled_at', Carbon::now()->year)
                ->groupBy('month')
                ->pluck('count', 'month')
                ->toArray();

            $monthData = [];
            for ($month = 1; $month <= 12; $month++) {
                $monthData[] = $sessionsByMonth[$month] ?? 0;
            }
            
            return response()->json($monthData);
        });
    }

    public function getSessionTypes()
    {
        $cacheKey = 'session_types';
        
        return Cache::remember($cacheKey, 3600, function () {
            $sessionTypesQuery = TutoringSession::where('status', 'completed')
                ->selectRaw("SUM(CASE WHEN type = 'presential' THEN 1 ELSE 0 END) as presential")
                ->selectRaw("SUM(CASE WHEN type = 'online' THEN 1 ELSE 0 END) as online")
                ->selectRaw("SUM(CASE WHEN type = 'mixed' THEN 1 ELSE 0 END) as mixed")
                ->selectRaw('COUNT(*) as total')
                ->first();

            $total = $sessionTypesQuery->total ?: 1;
            
            return response()->json([
                'presential' => $total > 0 ? round(($sessionTypesQuery->presential / $total) * 100) : 0,
                'online' => $total > 0 ? round(($sessionTypesQuery->online / $total) * 100) : 0,
                'mixed' => $total > 0 ? round(($sessionTypesQuery->mixed / $total) * 100) : 0,
                'total' => $sessionTypesQuery->total ?: 0,
            ]);
        });
    }

    public function getRecentGroups()
    {
        $cacheKey = 'recent_groups';
        
        return Cache::remember($cacheKey, 300, function () {
            $groups = Group::with('professor.user')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($group) {
                    $studentCount = TutoringRequest::where('group_id', $group->id)
                        ->where('status', 'approved')
                        ->count();
                    return [
                        'name' => $group->name,
                        'dept' => $group->departement,
                        'tutor' => $group->professor->user->name ?? 'N/A',
                        'students' => $studentCount,
                        'max' => $group->max_students,
                        'status' => $group->status,
                    ];
                });
            
            return response()->json($groups);
        });
    }

    public function getPendingRequests()
    {
        $cacheKey = 'pending_requests';
        
        return Cache::remember($cacheKey, 120, function () {
            $requests = TutoringRequest::with(['student.user', 'group'])
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($request) {
                    return [
                        'name' => $request->student->user->name ?? 'N/A',
                        'group' => $request->group->name ?? 'N/A',
                        'date' => $request->created_at->format('d/m/Y'),
                        'status' => $request->status,
                    ];
                });
            
            return response()->json($requests);
        });
    }

    public function getRecentActivity()
    {
        $cacheKey = 'recent_activity';
        
        return Cache::remember($cacheKey, 300, function () {
            return response()->json($this->fetchRecentActivity());
        });
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
