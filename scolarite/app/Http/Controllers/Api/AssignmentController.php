<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class AssignmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Assignment::with(['course']);

        $perPage = (int) $request->get('per_page', 15);
        if ($perPage < 1) $perPage = 15;
        if ($perPage > 200) $perPage = 200;
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        
        $assignments = $query->orderBy('due_date')->paginate($perPage);
        
        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'required|date',
            'max_score' => 'required|integer|min:1',
            'weight' => 'nullable|numeric|min:0',
            'type' => 'required|in:homework,project,report,presentation',
            'instructions' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $assignment = Assignment::create($validated);
        
        return response()->json($assignment->load(['course']), 201);
    }

    public function show(Assignment $assignment)
    {
        return response()->json($assignment->load(['course', 'submissions']));
    }

    public function update(Request $request, Assignment $assignment)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'sometimes|date',
            'max_score' => 'sometimes|integer|min:1',
            'weight' => 'nullable|numeric|min:0',
            'type' => 'sometimes|in:homework,project,report,presentation',
            'instructions' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $assignment->update($validated);
        
        return response()->json($assignment->load(['course']));
    }

    public function destroy(Assignment $assignment)
    {
        $assignment->delete();
        
        return response()->json(['message' => 'Assignment deleted successfully']);
    }

    public function myAssignments(Request $request)
    {
        $user = Auth::user();
        
        if (!$user->student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $assignments = Assignment::whereHas('course', function ($query) use ($user) {
                $query->whereHas('enrollments', function ($q) use ($user) {
                    $q->where('student_id', $user->student->id);
                });
            })
            ->with(['course', 'submissions' => function ($query) use ($user) {
                $query->where('student_id', $user->student->id);
            }])
            ->orderBy('due_date')
            ->get();
        
        return response()->json($assignments);
    }

    public function submit(Request $request, Assignment $assignment)
    {
        $user = Auth::user();
        
        if (!$user->student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $validated = $request->validate([
            'content' => 'nullable|string',
            'file' => 'nullable|file|max:10240',
        ]);
        
        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('submissions/' . $assignment->id, 'public');
        }
        
        $submission = AssignmentSubmission::updateOrCreate(
            [
                'assignment_id' => $assignment->id,
                'student_id' => $user->student->id,
            ],
            [
                'file_path' => $filePath,
                'content' => $validated['content'] ?? null,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]
        );
        
        return response()->json($submission, 201);
    }

    public function gradeSubmission(Request $request, AssignmentSubmission $submission)
    {
        $validated = $request->validate([
            'score' => 'required|numeric|min:0',
            'feedback' => 'nullable|string',
            'status' => 'sometimes|in:submitted,graded,late,resubmit',
        ]);

        $submission->update($validated);
        
        return response()->json($submission);
    }

    public function courseSubmissions($courseId)
    {
        $submissions = AssignmentSubmission::with(['student.user', 'assignment'])
            ->whereHas('assignment', function ($query) use ($courseId) {
                $query->where('course_id', $courseId);
            })
            ->get();
        
        return response()->json($submissions);
    }

    // Route compatibility aliases
    public function byCourse($courseId)
    {
        return $this->index(new Request(['course_id' => $courseId]));
    }

    public function submissions(Assignment $assignment)
    {
        $rows = AssignmentSubmission::with(['student.user'])
            ->where('assignment_id', $assignment->id)
            ->orderBy('submitted_at', 'desc')
            ->get();

        return response()->json($rows);
    }
}