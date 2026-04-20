<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AnnouncementController extends Controller
{
    private function ensureTeachingWriteAccess(Request $request)
    {
        $user = $request->user();
        if ($user && ($user->isAdministrator() || $user->isProfessor())) {
            return null;
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }

    public function index(Request $request)
    {
        $query = Announcement::with(['author', 'course', 'group']);
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }
        
        if ($request->has('is_published')) {
            $query->where('is_published', $request->boolean('is_published'));
        }
        
        $announcements = $query->orderBy('published_at', 'desc')->paginate(15);
        
        return response()->json($announcements);
    }

    public function store(Request $request)
    {
        if ($response = $this->ensureTeachingWriteAccess($request)) {
            return $response;
        }

        $validated = $request->validate([
            'course_id' => 'nullable|exists:courses,id',
            'group_id' => 'nullable|exists:groups,id',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'is_published' => 'nullable|boolean',
            'published_at' => 'nullable|date',
        ]);

        $validated['author_id'] = Auth::id();
        
        if ($request->boolean('is_published') && !$request->has('published_at')) {
            $validated['published_at'] = now();
        }

        $announcement = Announcement::create($validated);
        
        return response()->json($announcement->load(['author', 'course', 'group']), 201);
    }

    public function show(Announcement $announcement)
    {
        return response()->json($announcement->load(['author', 'course', 'group']));
    }

    public function update(Request $request, Announcement $announcement)
    {
        if ($response = $this->ensureTeachingWriteAccess($request)) {
            return $response;
        }

        $validated = $request->validate([
            'course_id' => 'nullable|exists:courses,id',
            'group_id' => 'nullable|exists:groups,id',
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'priority' => 'sometimes|in:low,normal,high,urgent',
            'is_published' => 'nullable|boolean',
            'published_at' => 'nullable|date',
        ]);

        $announcement->update($validated);
        
        return response()->json($announcement->load(['author', 'course', 'group']));
    }

    public function destroy(Announcement $announcement)
    {
        if ($response = $this->ensureTeachingWriteAccess(request())) {
            return $response;
        }

        $announcement->delete();
        
        return response()->json(['message' => 'Announcement deleted successfully']);
    }

    public function myAnnouncements()
    {
        $announcements = Announcement::with(['author', 'course', 'group'])
            ->where('is_published', true)
            ->orderBy('published_at', 'desc')
            ->get();
        
        return response()->json($announcements);
    }
}
