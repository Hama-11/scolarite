<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Forum;
use App\Models\ForumPost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ForumController extends Controller
{
    public function index(Request $request)
    {
        $query = Forum::with(['course', 'group', 'creator']);
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }
        
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        
        $forums = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json($forums);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'course_id' => 'nullable|exists:courses,id',
            'group_id' => 'nullable|exists:groups,id',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['creator_id'] = Auth::id();
        $validated['is_active'] = $validated['is_active'] ?? true;
        
        $forum = Forum::create($validated);
        
        return response()->json($forum->load(['course', 'group', 'creator']), 201);
    }

    public function show(Forum $forum)
    {
        return response()->json($forum->load(['course', 'group', 'creator', 'posts.user', 'posts.replies.user']));
    }

    public function update(Request $request, Forum $forum)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $forum->update($validated);
        
        return response()->json($forum->load(['course', 'group', 'creator']));
    }

    public function destroy(Forum $forum)
    {
        $forum->delete();
        
        return response()->json(['message' => 'Forum deleted successfully']);
    }

    // Forum Posts
    public function posts(Request $request, Forum $forum)
    {
        $posts = ForumPost::with('user')
            ->where('forum_id', $forum->id)
            ->whereNull('parent_id')
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        
        return response()->json($posts);
    }

    public function createPost(Request $request, Forum $forum)
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'parent_id' => 'nullable|exists:forum_posts,id',
        ]);

        $validated['forum_id'] = $forum->id;
        $validated['user_id'] = Auth::id();
        
        $post = ForumPost::create($validated);
        
        return response()->json($post->load('user'), 201);
    }

    public function showPost(ForumPost $post)
    {
        return response()->json($post->load(['user', 'forum', 'replies.user']));
    }

    public function updatePost(Request $request, ForumPost $post)
    {
        // Only allow owner to edit
        if ($post->user_id != Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'content' => 'sometimes|string',
        ]);

        $post->update($validated);
        
        return response()->json($post->load('user'));
    }

    public function deletePost(ForumPost $post)
    {
        // Only allow owner or admin to delete
        if ($post->user_id != Auth::id() && !Auth::user()->hasRole(['administrator', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $post->delete();
        
        return response()->json(['message' => 'Post deleted successfully']);
    }

    // My Forums (for students/teachers)
    public function myForums()
    {
        $user = Auth::user();
        
        $forums = Forum::with(['course', 'group'])
            ->where('is_active', true)
            ->where(function ($query) use ($user) {
                $query->whereNull('course_id')
                    ->whereNull('group_id')
                    ->orWhereHas('group', function ($q) use ($user) {
                        $q->whereHas('students', function ($sq) use ($user) {
                            $sq->where('user_id', $user->id);
                        });
                    });
            })
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($forums);
    }
}