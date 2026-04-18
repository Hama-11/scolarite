<?php

namespace App\Http\Controllers\Api;

use App\Events\CourseMessagePosted;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $query = Message::with(['sender', 'receiver', 'course'])
            ->where(function ($q) use ($user) {
                $q->where('sender_id', $user->id)
                  ->orWhere('receiver_id', $user->id);
            });
        
        if ($request->has('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }
        
        $messages = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json($messages);
    }

    public function conversation($userId)
    {
        $user = Auth::user();
        $messages = Message::with(['sender', 'receiver', 'course'])
            ->where('type', 'direct')
            ->where(function ($q) use ($user, $userId) {
                $q->where(function ($q2) use ($user, $userId) {
                    $q2->where('sender_id', $user->id)->where('receiver_id', $userId);
                })->orWhere(function ($q2) use ($user, $userId) {
                    $q2->where('sender_id', $userId)->where('receiver_id', $user->id);
                });
            })
            ->orderBy('created_at', 'asc')
            ->paginate(30);

        return response()->json($messages);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'course_id' => 'nullable|exists:courses,id',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'type' => 'nullable|in:direct,course,broadcast',
        ]);

        $message = Message::create([
            'sender_id' => Auth::id(),
            'receiver_id' => $validated['receiver_id'],
            'course_id' => $validated['course_id'] ?? null,
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'type' => $validated['type'] ?? 'direct',
        ]);
        
        return response()->json($message->load(['sender', 'receiver', 'course']), 201);
    }

    public function courseThread(Request $request, Course $course)
    {
        $user = Auth::user();
        if (!$this->canAccessCourse($user->id, $course->id)) {
            return response()->json(['message' => 'Unauthorized course access'], 403);
        }

        $perPage = (int) $request->get('per_page', 30);
        if ($perPage < 1) $perPage = 30;
        if ($perPage > 100) $perPage = 100;

        $messages = Message::with(['sender', 'course'])
            ->where('type', 'course')
            ->where('course_id', $course->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($messages);
    }

    public function postCourseMessage(Request $request, Course $course)
    {
        $user = Auth::user();
        if (!$this->canAccessCourse($user->id, $course->id)) {
            return response()->json(['message' => 'Unauthorized course access'], 403);
        }

        $validated = $request->validate([
            'body' => 'required|string|max:4000',
            'subject' => 'nullable|string|max:255',
        ]);

        $message = Message::create([
            'sender_id' => $user->id,
            'receiver_id' => null,
            'course_id' => $course->id,
            'subject' => $validated['subject'] ?? ('Discussion ' . $course->name),
            'body' => $validated['body'],
            'type' => 'course',
        ]);

        $message->load('sender', 'course');
        event(new CourseMessagePosted($message));

        return response()->json($message->load(['sender', 'course']), 201);
    }

    public function show(Message $message)
    {
        if ($message->receiver_id == Auth::id() && !$message->is_read) {
            $message->update(['is_read' => true]);
        }
        
        return response()->json($message->load(['sender', 'receiver', 'course']));
    }

    public function destroy(Message $message)
    {
        if ($message->sender_id != Auth::id() && $message->receiver_id != Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $message->delete();
        
        return response()->json(['message' => 'Message deleted successfully']);
    }

    public function inbox()
    {
        $messages = Message::with(['sender', 'course'])
            ->where('receiver_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($messages);
    }

    public function sent()
    {
        $messages = Message::with(['receiver', 'course'])
            ->where('sender_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($messages);
    }

    public function unreadCount()
    {
        $count = Message::where('receiver_id', Auth::id())
            ->where('is_read', false)
            ->count();
        
        return response()->json(['unread_count' => $count]);
    }

    private function canAccessCourse(int $userId, int $courseId): bool
    {
        $user = Auth::user();
        if ($user && $user->isAdministrator()) {
            return true;
        }

        $isProfessorOnCourse = Course::where('id', $courseId)
            ->whereHas('professor.user', function ($q) use ($userId) {
                $q->where('id', $userId);
            })
            ->exists();

        if ($isProfessorOnCourse) {
            return true;
        }

        $studentId = optional($user->student)->id;
        if (!$studentId) {
            return false;
        }

        return CourseEnrollment::where('student_id', $studentId)
            ->where('course_id', $courseId)
            ->where('status', 'active')
            ->exists();
    }
}