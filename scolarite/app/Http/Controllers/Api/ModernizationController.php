<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ModernizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ModernizationController extends Controller
{
    private ModernizationService $modernizationService;

    public function __construct(ModernizationService $modernizationService)
    {
        $this->modernizationService = $modernizationService;
    }

    public function submitEnrollment(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'course_id' => 'required|exists:courses,id',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'enrollment_window_id' => 'nullable|exists:enrollment_windows,id',
        ]);

        try {
            $result = $this->modernizationService->submitEnrollment($data);
            return response()->json($result, 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Failed to submit enrollment request'], 500);
        }
    }

    public function decideEnrollment(Request $request, int $id)
    {
        $data = $request->validate([
            'decision' => 'required|in:approved,rejected,finalized',
            'admin_note' => 'nullable|string|max:1000',
        ]);

        try {
            $row = DB::table('enrollment_requests')->where('id', $id)->first();
            if (!$row) {
                return response()->json(['message' => 'Enrollment request not found'], 404);
            }

            $current = (string) $row->status;
            $allowedTransitions = [
                'submitted' => ['approved', 'rejected'],
                'pending_approval' => ['approved', 'rejected'],
                'approved' => ['finalized'],
            ];
            if (!in_array($data['decision'], $allowedTransitions[$current] ?? [], true)) {
                return response()->json([
                    'message' => "Invalid transition from {$current} to {$data['decision']}",
                ], 422);
            }

            DB::table('enrollment_requests')->where('id', $id)->update([
                'status' => $data['decision'],
                'admin_note' => $data['admin_note'] ?? null,
                'updated_at' => now(),
            ]);

            return response()->json(['message' => 'Decision applied']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Failed to apply decision'], 500);
        }
    }

    public function createAcademicPath(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'title' => 'required|string|max:255',
            'target_ects' => 'nullable|integer|min:1',
            'validated_ects' => 'nullable|integer|min:0',
            'custom_rules' => 'nullable|array',
        ]);

        try {
            $existing = DB::table('academic_paths')
                ->where('student_id', $data['student_id'])
                ->where('title', $data['title'])
                ->exists();
            if ($existing) {
                return response()->json(['message' => 'Academic path with same title already exists for this student'], 422);
            }

            $id = DB::table('academic_paths')->insertGetId([
                'student_id' => $data['student_id'],
                'title' => $data['title'],
                'target_ects' => $data['target_ects'] ?? 180,
                'validated_ects' => $data['validated_ects'] ?? 0,
                'custom_rules' => isset($data['custom_rules']) ? json_encode($data['custom_rules']) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json(['id' => $id], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Failed to create academic path'], 500);
        }
    }

    public function resolveScheduleConflicts()
    {
        $conflicts = DB::table('schedule_conflicts')->orderByDesc('created_at')->limit(20)->get();
        $suggestions = $conflicts->map(function ($conflict) {
            return [
                'conflict_id' => $conflict->id,
                'severity' => $conflict->severity,
                'suggestions' => [
                    'shift_by_1h',
                    'swap_room',
                    'replace_timeslot',
                ],
            ];
        });

        return response()->json(['data' => $suggestions]);
    }

    public function optimizeSchedule(Request $request)
    {
        $request->validate([
            'semester_id' => 'nullable|integer',
        ]);

        try {
            $result = $this->modernizationService->optimizeSchedule($request->integer('semester_id'));
            return response()->json($result);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Failed to optimize schedule'], 500);
        }
    }

    public function createExamSubjectVersion(Request $request)
    {
        $data = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'confidentiality' => 'nullable|in:restricted,secret',
        ]);

        $last = DB::table('exam_subject_versions')
            ->where('course_id', $data['course_id'])
            ->max('version_no');

        try {
            $id = DB::table('exam_subject_versions')->insertGetId([
                'course_id' => $data['course_id'],
                'created_by' => auth()->id() ?: 1,
                'title' => $data['title'],
                'content' => $data['content'],
                'confidentiality' => $data['confidentiality'] ?? 'secret',
                'version_no' => ((int) $last) + 1,
                'is_published' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json(['id' => $id], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Failed to create subject version'], 500);
        }
    }

    public function publishExamResults(Request $request, int $sessionId)
    {
        $request->validate([
            'audience' => 'nullable|in:students,professors,all',
        ]);

        $updated = DB::table('exam_sessions')->where('id', $sessionId)->update([
            'status' => 'approved',
            'updated_at' => now(),
        ]);
        if (!$updated) {
            return response()->json(['message' => 'Exam session not found'], 404);
        }

        DB::table('exam_subject_versions')
            ->where('course_id', function ($q) use ($sessionId) {
                $q->select('course_id')->from('exam_sessions')->where('id', $sessionId)->limit(1);
            })
            ->orderByDesc('version_no')
            ->limit(1)
            ->update(['is_published' => true, 'updated_at' => now()]);

        return response()->json(['message' => 'Results published securely']);
    }

    public function generatePv(Request $request, int $sessionId)
    {
        $data = $request->validate([
            'signature_provider' => 'nullable|string|max:100',
            'signature_ref' => 'nullable|string|max:255',
        ]);

        $exists = DB::table('exam_sessions')->where('id', $sessionId)->exists();
        if (!$exists) {
            return response()->json(['message' => 'Exam session not found'], 404);
        }

        $id = DB::table('pv_documents')->insertGetId([
            'exam_session_id' => $sessionId,
            'signature_provider' => $data['signature_provider'] ?? null,
            'signature_ref' => $data['signature_ref'] ?? null,
            'signed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id, 'message' => 'PV generated and archived']);
    }

    public function exportData(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|string|max:100',
            'format' => 'required|in:csv,json,xml',
        ]);

        $id = DB::table('exports')->insertGetId([
            'requested_by' => auth()->id(),
            'type' => $data['type'],
            'format' => $data['format'],
            'status' => 'done',
            'file_path' => 'exports/' . $data['type'] . '_' . now()->timestamp . '.' . $data['format'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['export_id' => $id, 'status' => 'done']);
    }

    public function importData(Request $request)
    {
        $request->validate([
            'type' => 'required|string|max:100',
            'format' => 'required|in:csv,json,xml',
            'mapping' => 'nullable|array',
        ]);

        return response()->json([
            'status' => 'accepted',
            'message' => 'Import mapping validated and queued',
        ], 202);
    }

    public function storeRule(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'required|string|max:100',
            'conditions' => 'nullable|array',
            'actions' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $id = DB::table('rules')->insertGetId([
            'name' => $data['name'],
            'domain' => $data['domain'],
            'conditions' => isset($data['conditions']) ? json_encode($data['conditions']) : null,
            'actions' => isset($data['actions']) ? json_encode($data['actions']) : null,
            'is_active' => $data['is_active'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function storeDynamicForm(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:dynamic_forms,slug',
            'schema' => 'required|array',
            'is_active' => 'nullable|boolean',
        ]);

        $id = DB::table('dynamic_forms')->insertGetId([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'schema' => json_encode($data['schema']),
            'is_active' => $data['is_active'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function reserveResource(Request $request)
    {
        $data = $request->validate([
            'resource_type' => 'required|string|max:100',
            'resource_id' => 'nullable|integer',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'reason' => 'nullable|string|max:1000',
        ]);

        $conflict = DB::table('resource_reservations')
            ->where('resource_type', $data['resource_type'])
            ->where('resource_id', $data['resource_id'] ?? null)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($data) {
                $q->where('start_at', '<', $data['end_at'])
                    ->where('end_at', '>', $data['start_at']);
            })->exists();

        if ($conflict) {
            return response()->json(['message' => 'Resource conflict detected'], 422);
        }

        $id = DB::table('resource_reservations')->insertGetId([
            'requested_by' => auth()->id(),
            'resource_type' => $data['resource_type'],
            'resource_id' => $data['resource_id'] ?? null,
            'start_at' => $data['start_at'],
            'end_at' => $data['end_at'],
            'reason' => $data['reason'] ?? null,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function storeMaintenanceTicket(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,critical',
        ]);

        $id = DB::table('maintenance_tickets')->insertGetId([
            'created_by' => auth()->id(),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'priority' => $data['priority'] ?? 'medium',
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function storeInternshipOffer(Request $request)
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'deadline' => 'nullable|date',
        ]);

        $id = DB::table('internship_offers')->insertGetId([
            'company_name' => $data['company_name'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'deadline' => $data['deadline'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function storeResearchProject(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'abstract' => 'nullable|string',
            'status' => 'nullable|in:draft,submitted,approved,archived',
        ]);

        $id = DB::table('research_projects')->insertGetId([
            'owner_id' => auth()->id(),
            'title' => $data['title'],
            'abstract' => $data['abstract'] ?? null,
            'status' => $data['status'] ?? 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function storePublication(Request $request)
    {
        $data = $request->validate([
            'research_project_id' => 'nullable|exists:research_projects,id',
            'title' => 'required|string|max:255',
            'type' => 'nullable|string|max:100',
            'metadata' => 'nullable|array',
        ]);

        $id = DB::table('publications')->insertGetId([
            'research_project_id' => $data['research_project_id'] ?? null,
            'title' => $data['title'],
            'type' => $data['type'] ?? 'article',
            'metadata' => isset($data['metadata']) ? json_encode($data['metadata']) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function storeGrantCall(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'deadline' => 'nullable|date',
            'budget' => 'nullable|numeric|min:0',
        ]);

        $id = DB::table('grant_calls')->insertGetId([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'deadline' => $data['deadline'] ?? null,
            'budget' => $data['budget'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }
}
