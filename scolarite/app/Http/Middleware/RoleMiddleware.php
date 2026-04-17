<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @param  string  ...$roles
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = Auth::user();
        
        // Check if user has any of the required roles
        if ($user->role) {
            $aliases = array_merge([
                'administrator' => 'admin',
                'professor' => 'enseignant',
                'student' => 'etudiant',
            ], (array) config('rbac.aliases', []));
            $userRole = strtolower($user->role->name);
            $userRole = $aliases[$userRole] ?? $userRole;
            
            foreach ($roles as $role) {
                $required = strtolower((string) $role);
                $required = $aliases[$required] ?? $required;
                if ($userRole === $required) {
                    return $next($request);
                }
            }
        }

        return response()->json([
            'message' => 'Unauthorized. You do not have the required role.',
            'required_roles' => $roles,
            'your_role' => $user->role ? $user->role->name : 'none'
        ], 403);
    }
}
