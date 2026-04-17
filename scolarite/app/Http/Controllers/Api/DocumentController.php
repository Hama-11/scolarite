<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\CourseEnrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = Document::with(['course', 'uploader']);
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        if ($request->has('type')) {
            $query->where('type', $request->type);
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
            'title' => 'required|string|max:255',
            'file' => 'required|file|max:51200',
            'type' => 'required|in:course_material,syllabus,exam,solution,other',
            'description' => 'nullable|string',
            'is_public' => 'nullable|boolean',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');
        
        $document = Document::create([
            'course_id' => $validated['course_id'] ?? null,
            'uploader_id' => Auth::id(),
            'title' => $validated['title'],
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'is_public' => $validated['is_public'] ?? true,
        ]);
        
        return response()->json($document->load(['course', 'uploader']), 201);
    }

    public function show(Document $document)
    {
        return response()->json($document->load(['course', 'uploader']));
    }

    public function destroy(Document $document)
    {
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
        $query = Document::with(['course', 'uploader'])->orderBy('created_at', 'desc');

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

        $documents = $query->get();
        
        return response()->json($documents);
    }

    public function courseDocuments($courseId)
    {
        $documents = Document::with(['uploader'])
            ->where('course_id', $courseId)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($documents);
    }
}