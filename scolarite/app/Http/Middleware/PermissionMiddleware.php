<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = Auth::user();
        $roleName = strtolower((string) optional($user->role)->name);
        $aliases = array_merge([
            'administrator' => 'admin',
            'professor' => 'enseignant',
            'student' => 'etudiant',
        ], (array) config('rbac.aliases', []));
        $defaultMatrix = [
            'admin' => ['*'],
            'enseignant' => [
                'catalog.read', 'groups.read', 'schedules.read', 'schedules.export_ics', 'exams.read',
                'grades.read', 'grades.create', 'grades.update',
                'assignments.read', 'assignments.create', 'assignments.update', 'assignments.grade',
                'attendance.read', 'attendance.create', 'attendance.update',
                'documents.read', 'documents.create', 'documents.update',
                'announcements.read', 'announcements.create', 'announcements.update',
                'messages.read', 'messages.create', 'notifications.read', 'requests.read',
            ],
            'etudiant' => [
                'catalog.read', 'groups.read', 'schedules.read', 'schedules.export_ics',
                'grades.read', 'attendance.read', 'assignments.read', 'assignments.submit',
                'requests.read', 'requests.create', 'payments.read', 'documents.read', 'documents.download',
                'announcements.read', 'messages.read', 'messages.create',
                'notifications.read', 'notifications.update_preferences',
            ],
        ];
        $matrix = array_merge($defaultMatrix, (array) config('rbac.matrix', []));

        $normalizedRole = $aliases[$roleName] ?? $roleName;
        $rolePermissions = (array) ($matrix[$normalizedRole] ?? []);

        if (in_array('*', $rolePermissions, true)) {
            return $next($request);
        }

        if (in_array($permission, $rolePermissions, true)) {
            return $next($request);
        }

        // Wildcard module: "catalog.read", "exams.generate_reports", etc. ↔ "catalog.*", "exams.*"
        if (strpos($permission, '.') !== false) {
            $moduleWildcard = explode('.', $permission, 2)[0] . '.*';
            if (in_array($moduleWildcard, $rolePermissions, true)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'Forbidden: missing permission',
            'required_permission' => $permission,
            'role' => $normalizedRole ?: 'unknown',
        ], 403);
    }
}
