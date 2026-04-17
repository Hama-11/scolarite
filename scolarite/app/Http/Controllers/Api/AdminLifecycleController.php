<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GradeDispute;
use App\Models\Student;
use App\Models\StudentDocumentRequest;
use Illuminate\Http\Request;

class AdminLifecycleController extends Controller
{
    private const SLOTS = [
        'payment_proof',
        'certificate_achievement',
        'academic_transcript',
    ];

    public function pendingReview(Request $request)
    {
        $q = Student::query()->with(['user:id,name,email', 'parentInfo']);
        $q->where(function ($w) {
            $w->where('overall_status', 'pending')
                ->orWhere('payment_proof_status', 'pending')
                ->orWhere('certificate_achievement_status', 'pending')
                ->orWhere('academic_transcript_status', 'pending');
        });
        if ($request->filled('search')) {
            $s = $request->search;
            $q->whereHas('user', function ($u) use ($s) {
                $u->where('name', 'like', '%'.$s.'%')->orWhere('email', 'like', '%'.$s.'%');
            });
        }

        return response()->json($q->orderByDesc('updated_at')->paginate(25));
    }

    public function showStudent(Student $student)
    {
        $student->load(['user', 'parentInfo']);

        return response()->json(['student' => $student]);
    }

    public function reviewDocumentSlot(Request $request, Student $student)
    {
        $data = $request->validate([
            'slot' => 'required|in:payment_proof,certificate_achievement,academic_transcript',
            'decision' => 'required|in:accepted,rejected',
            'comment' => 'nullable|string|max:5000',
        ]);
        if ($data['decision'] === 'rejected' && empty(trim((string) ($data['comment'] ?? '')))) {
            return response()->json(['message' => 'Un motif est requis pour un refus.'], 422);
        }
        $slot = $data['slot'];
        $path = $student->{$slot.'_path'};
        if (!$path) {
            return response()->json(['message' => 'Aucun fichier pour ce type de document.'], 422);
        }
        $updates = [
            $slot.'_status' => $data['decision'],
            $slot.'_comment' => $data['comment'] ?? null,
        ];
        if ($data['decision'] === 'rejected') {
            $updates['overall_status'] = 'pending';
            $updates['validation_comment'] = $data['comment'];
        }
        $student->update($updates);
        $this->maybeActivateStudent($student->fresh());

        return response()->json(['student' => $student->fresh()->load('user', 'parentInfo')]);
    }

    public function acceptAllDocuments(Request $request, Student $student)
    {
        $updates = [
            'personnel_info_status' => 'accepted',
            'payment_proof_status' => $student->payment_proof_path ? 'accepted' : $student->payment_proof_status,
            'certificate_achievement_status' => $student->certificate_achievement_path ? 'accepted' : $student->certificate_achievement_status,
            'academic_transcript_status' => $student->academic_transcript_path ? 'accepted' : $student->academic_transcript_status,
            'overall_status' => 'accepted',
            'approved_at' => now(),
            'validation_comment' => null,
        ];
        $student->update($updates);
        if ($student->user) {
            $student->user->update(['is_active' => true]);
        }

        return response()->json(['student' => $student->fresh()->load('user', 'parentInfo')]);
    }

    public function rejectProfile(Request $request, Student $student)
    {
        $data = $request->validate([
            'comment' => 'required|string|max:5000',
        ]);
        $student->update([
            'overall_status' => 'pending',
            'validation_comment' => $data['comment'],
        ]);

        return response()->json(['student' => $student->fresh()->load('user', 'parentInfo')]);
    }

    public function reviewPersonnel(Request $request, Student $student)
    {
        $data = $request->validate([
            'decision' => 'required|in:accepted,rejected',
            'comment' => 'nullable|string|max:5000',
        ]);
        if ($data['decision'] === 'rejected' && empty(trim((string) ($data['comment'] ?? '')))) {
            return response()->json(['message' => 'Un motif est requis pour un refus.'], 422);
        }
        $updates = ['personnel_info_status' => $data['decision']];
        if (array_key_exists('comment', $data) && $data['comment'] !== null) {
            $updates['validation_comment'] = $data['comment'];
        }
        if ($data['decision'] === 'rejected') {
            $updates['overall_status'] = 'pending';
        }
        $student->update($updates);
        $this->maybeActivateStudent($student->fresh());

        return response()->json(['student' => $student->fresh()->load('user', 'parentInfo')]);
    }

    public function documentRequestsIndex(Request $request)
    {
        $q = StudentDocumentRequest::query()->with('student.user');
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }

        return response()->json($q->orderByDesc('id')->paginate(25));
    }

    public function updateDocumentRequest(Request $request, StudentDocumentRequest $studentDocumentRequest)
    {
        $data = $request->validate([
            'status' => 'sometimes|in:pending,processing,ready,rejected',
            'admin_comment' => 'nullable|string|max:5000',
            'price' => 'nullable|numeric|min:0',
            'payment_status' => 'nullable|string|max:64',
            'generated_file' => 'nullable|string|max:500',
        ]);
        $newStatus = $data['status'] ?? $studentDocumentRequest->status;
        $studentDocumentRequest->update(array_merge($data, [
            'processed_at' => in_array($newStatus, ['ready', 'rejected'], true)
                ? now()
                : $studentDocumentRequest->processed_at,
        ]));

        return response()->json($studentDocumentRequest->fresh()->load('student.user'));
    }

    public function gradeDisputesIndex(Request $request)
    {
        $q = GradeDispute::query()->with(['student.user', 'grade.course']);
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }

        return response()->json($q->orderByDesc('id')->paginate(25));
    }

    public function resolveGradeDispute(Request $request, GradeDispute $gradeDispute)
    {
        $data = $request->validate([
            'status' => 'required|in:accepted,rejected',
            'director_comment' => 'nullable|string|max:5000',
            'new_grade' => 'nullable|numeric|min:0|max:100',
        ]);
        $gradeDispute->update([
            'status' => $data['status'] === 'accepted' ? 'resolved' : 'rejected',
            'director_comment' => $data['director_comment'] ?? null,
            'new_grade' => $data['new_grade'] ?? null,
            'resolved_at' => now(),
        ]);
        if ($data['status'] === 'accepted' && isset($data['new_grade']) && $gradeDispute->grade) {
            $gradeDispute->grade->update(['grade' => $data['new_grade']]);
        }

        return response()->json($gradeDispute->fresh()->load(['student.user', 'grade.course']));
    }

    private function maybeActivateStudent(Student $student): void
    {
        $allAccepted = true;
        foreach (self::SLOTS as $slot) {
            $path = $student->{$slot.'_path'};
            $st = $student->{$slot.'_status'};
            if ($path && $st !== 'accepted') {
                $allAccepted = false;
                break;
            }
        }
        if ($allAccepted && $student->personnel_info_status === 'accepted') {
            $student->update([
                'overall_status' => 'accepted',
                'approved_at' => now(),
            ]);
            if ($student->user) {
                $student->user->update(['is_active' => true]);
            }
        }
    }
}
