<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
}