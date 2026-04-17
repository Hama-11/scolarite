<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotificationPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $query = Notification::where('user_id', Auth::id());
        
        if ($request->has('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }
        
        $notifications = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json($notifications);
    }

    public function show(Notification $notification)
    {
        if ($notification->user_id != Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($notification);
    }

    public function markAsRead(Notification $notification)
    {
        if ($notification->user_id != Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $notification->update(['is_read' => true]);
        
        return response()->json($notification);
    }

    public function markAllAsRead()
    {
        Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update(['is_read' => true]);
        
        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function unreadCount()
    {
        $count = Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->count();
        
        return response()->json(['unread_count' => $count]);
    }

    public function destroy(Notification $notification)
    {
        if ($notification->user_id != Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $notification->delete();
        
        return response()->json(['message' => 'Notification deleted successfully']);
    }

    public function preferences()
    {
        $pref = NotificationPreference::firstOrCreate(
            ['user_id' => Auth::id()],
            ['in_app_enabled' => true, 'email_enabled' => true, 'sms_enabled' => false]
        );
        return response()->json($pref);
    }

    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'in_app_enabled' => 'sometimes|boolean',
            'email_enabled' => 'sometimes|boolean',
            'sms_enabled' => 'sometimes|boolean',
        ]);

        $pref = NotificationPreference::firstOrCreate(
            ['user_id' => Auth::id()],
            ['in_app_enabled' => true, 'email_enabled' => true, 'sms_enabled' => false]
        );
        $pref->update($validated);
        return response()->json($pref);
    }
}