<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CourseEnrollment;
use App\Models\Document;
use App\Models\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = Document::with(['course', 'group', 'schedule', 'uploader']);

        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }
        if ($request->has('schedule_id')) {
            $query->where('schedule_id', $request->schedule_id);
        }
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->has('is_public')) {
            $query->where('is_public', $request->boolean('is_public'));
        }

        $documents = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($documents);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'nullable|exists:courses,id',
            'group_id' => 'nullable|exists:groups,id',
            'schedule_id' => 'nullable|exists:schedules,id',
            'title' => 'required|string|max:255',
            'file' => 'required|file|max:20480|mimes:pdf,doc,docx,ppt,pptx,zip,rar,txt,xls,xlsx,jpg,jpeg,png',
            'type' => 'required|in:course_material,syllabus,exam,solution,other',
            'description' => 'nullable|string',
            'is_public' => 'nullable|boolean',
        ]);

        $user = Auth::user();
        if (!$user || (!$user->isProfessor() && !$user->isAdministrator())) {
            return response()->json(['message' => 'Only teachers/admin can upload supports'], 403);
        }

        $groupId = $validated['group_id'] ?? null;
        if (!empty($validated['schedule_id'])) {
            $schedule = Schedule::find($validated['schedule_id']);
            if ($schedule) {
                $groupId = $groupId ?: $schedule->group_id;
            }
        }

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $document = Document::create([
            'course_id' => $validated['course_id'] ?? null,
            'group_id' => $groupId,
            'schedule_id' => $validated['schedule_id'] ?? null,
            'uploader_id' => Auth::id(),
            'title' => $validated['title'],
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'is_public' => $validated['is_public'] ?? true,
        ]);

        return response()->json($document->load(['course', 'group', 'schedule', 'uploader']), 201);
    }

    public function update(Request $request, Document $document)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdministrator() && (int) $document->uploader_id !== (int) $user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:course_material,syllabus,exam,solution,other',
            'course_id' => 'nullable|exists:courses,id',
            'group_id' => 'nullable|exists:groups,id',
            'schedule_id' => 'nullable|exists:schedules,id',
            'is_public' => 'nullable|boolean',
            'file' => 'nullable|file|max:20480|mimes:pdf,doc,docx,ppt,pptx,zip,rar,txt,xls,xlsx,jpg,jpeg,png',
        ]);

        if ($request->hasFile('file')) {
            if ($document->file_path) {
                Storage::disk('public')->delete($document->file_path);
            }
            $file = $request->file('file');
            $validated['file_path'] = $file->store('documents', 'public');
            $validated['file_type'] = $file->getClientOriginalExtension();
            $validated['file_size'] = $file->getSize();
        }

        if (!empty($validated['schedule_id']) && empty($validated['group_id'])) {
            $schedule = Schedule::find($validated['schedule_id']);
            if ($schedule) {
                $validated['group_id'] = $schedule->group_id;
            }
        }

        $document->update($validated);

        return response()->json($document->load(['course', 'group', 'schedule', 'uploader']));
    }

    public function show(Document $document)
    {
        return response()->json($document->load(['course', 'group', 'schedule', 'uploader']));
    }

    public function destroy(Document $document)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdministrator() && (int) $document->uploader_id !== (int) $user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }

    public function download(Document $document)
    {
        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        
        return response()->download(storage_path('app/public/' . $document->file_path), $document->title . '.' . $document->file_type);
    }

    public function myDocuments()
    {
        $user = Auth::user();

        $roleName = strtolower((string) optional($user->role)->name);
        $query = Document::with(['course', 'group', 'schedule', 'uploader'])->orderBy('created_at', 'desc');

        if (in_array($roleName, ['student', 'etudiant'], true) && $user->student) {
            $courseIds = CourseEnrollment::where('student_id', $user->student->id)
                ->where('status', 'active')
                ->pluck('course_id');
            $query->where(function ($q) use ($courseIds) {
                $q->whereIn('course_id', $courseIds)
                  ->orWhere('is_public', true);
            });
        } else {
            $query->where(function ($q) use ($user) {
                $q->where('uploader_id', $user->id)
                  ->orWhere('is_public', true);
            });
        }

        if (request()->has('course_id')) {
            $query->where('course_id', request()->get('course_id'));
        }
        if (request()->has('type')) {
            $query->where('type', request()->get('type'));
        }
        if (request()->has('date_from')) {
            $query->whereDate('created_at', '>=', request()->get('date_from'));
        }
        if (request()->has('date_to')) {
            $query->whereDate('created_at', '<=', request()->get('date_to'));
        }

        $documents = $query->get();

        return response()->json($documents);
    }

    public function byCourse($courseId)
    {
        $documents = Document::with(['uploader', 'group', 'schedule'])
            ->where('course_id', $courseId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }
}