<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Program;
use App\Models\Room;
use App\Models\AcademicYear;
use App\Models\Student;
use App\Models\Professor;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    // Department Management
    public function departments(Request $request)
    {
        $query = Department::with('head');
        
        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        
        $departments = $query->orderBy('name')->paginate(20);
        
        return response()->json($departments);
    }

    public function storeDepartment(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
            'code' => 'required|string|max:20|unique:departments,code',
            'description' => 'nullable|string',
            'head_id' => 'nullable|exists:professors,id',
        ]);

        $department = Department::create($validated);
        
        return response()->json($department->load('head'), 201);
    }

    public function showDepartment(Department $department)
    {
        return response()->json($department->load('head', 'programs', 'professors'));
    }

    public function updateDepartment(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:departments,name,' . $department->id,
            'code' => 'sometimes|string|max:20|unique:departments,code,' . $department->id,
            'description' => 'nullable|string',
            'head_id' => 'nullable|exists:professors,id',
        ]);

        $department->update($validated);
        
        return response()->json($department->load('head'));
    }

    public function destroyDepartment(Department $department)
    {
        $department->delete();
        
        return response()->json(['message' => 'Department deleted successfully']);
    }

    // Program Management
    public function programs(Request $request)
    {
        $query = Program::with('department', 'academicYear');
        
        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        
        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }
        
        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        
        $programs = $query->orderBy('name')->paginate(20);
        
        return response()->json($programs);
    }

    public function storeProgram(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20',
            'department_id' => 'required|exists:departments,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'description' => 'nullable|string',
            'duration_years' => 'required|integer|min:1|max:10',
            'credits_required' => 'required|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        
        $program = Program::create($validated);
        
        return response()->json($program->load(['department', 'academicYear']), 201);
    }

    public function showProgram(Program $program)
    {
        return response()->json($program->load(['department', 'academicYear', 'courses']));
    }

    public function updateProgram(Request $request, Program $program)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:20',
            'department_id' => 'sometimes|exists:departments,id',
            'academic_year_id' => 'sometimes|exists:academic_years,id',
            'description' => 'nullable|string',
            'duration_years' => 'sometimes|integer|min:1|max:10',
            'credits_required' => 'sometimes|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        $program->update($validated);
        
        return response()->json($program->load(['department', 'academicYear']));
    }

    public function destroyProgram(Program $program)
    {
        $program->delete();
        
        return response()->json(['message' => 'Program deleted successfully']);
    }

    // Room Management
    public function rooms(Request $request)
    {
        $query = Room::query();
        
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        
        if ($request->has('capacity')) {
            $query->where('capacity', '>=', $request->capacity);
        }
        
        if ($request->has('building')) {
            $query->where('building', 'like', "%{$request->building}%");
        }
        
        $rooms = $query->orderBy('building')->orderBy('name')->paginate(20);
        
        return response()->json($rooms);
    }

    public function storeRoom(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'building' => 'required|string|max:100',
            'type' => 'required|in:classroom,lecture_hall,lab,library,office,other',
            'capacity' => 'required|integer|min:1',
            'equipment' => 'nullable|array',
            'is_available' => 'nullable|boolean',
        ]);

        $validated['is_available'] = $validated['is_available'] ?? true;
        
        $room = Room::create($validated);
        
        return response()->json($room, 201);
    }

    public function showRoom(Room $room)
    {
        return response()->json($room);
    }

    public function updateRoom(Request $request, Room $room)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:50',
            'building' => 'sometimes|string|max:100',
            'type' => 'sometimes|in:classroom,lecture_hall,lab,library,office,other',
            'capacity' => 'sometimes|integer|min:1',
            'equipment' => 'nullable|array',
            'is_available' => 'nullable|boolean',
        ]);

        $room->update($validated);
        
        return response()->json($room);
    }

    public function destroyRoom(Room $room)
    {
        $room->delete();
        
        return response()->json(['message' => 'Room deleted successfully']);
    }

    // Academic Year Management
    public function academicYears(Request $request)
    {
        $academicYears = AcademicYear::orderBy('start_date', 'desc')->paginate(20);
        
        return response()->json($academicYears);
    }

    public function storeAcademicYear(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_current' => 'nullable|boolean',
        ]);

        if ($validated['is_current'] ?? false) {
            AcademicYear::where('is_current', true)->update(['is_current' => false]);
        }

        $academicYear = AcademicYear::create($validated);
        
        return response()->json($academicYear, 201);
    }

    public function showAcademicYear(AcademicYear $academicYear)
    {
        return response()->json($academicYear);
    }

    public function updateAcademicYear(Request $request, AcademicYear $academicYear)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'is_current' => 'nullable|boolean',
        ]);

        if (($validated['is_current'] ?? false) && !$academicYear->is_current) {
            AcademicYear::where('is_current', true)->update(['is_current' => false]);
        }

        $academicYear->update($validated);
        
        return response()->json($academicYear);
    }

    public function destroyAcademicYear(AcademicYear $academicYear)
    {
        $academicYear->delete();
        
        return response()->json(['message' => 'Academic year deleted successfully']);
    }

    // User Management (Admin functions)
    public function users(Request $request)
    {
        $query = User::with('role');
        
        if ($request->has('role')) {
            $query->whereHas('role', function ($q) use ($request) {
                $q->where('name', $request->role);
            });
        }
        
        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }
        
        $users = $query->orderBy('name')->paginate(20);
        
        return response()->json($users);
    }

    public function createUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => 'required|exists:roles,id',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        
        $user = User::create($validated);
        
        return response()->json($user->load('role'), 201);
    }

    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:8|confirmed',
            'role_id' => 'sometimes|exists:roles,id',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);
        
        return response()->json($user->load('role'));
    }

    public function destroyUser(User $user)
    {
        // Prevent deleting own account
        if ($user->id === Auth::id()) {
            return response()->json(['message' => 'Cannot delete your own account'], 400);
        }
        
        $user->delete();
        
        return response()->json(['message' => 'User deleted successfully']);
    }

    // Statistics Dashboard
    public function dashboardStats()
    {
        $students = Student::count();
        $professors = Professor::count();
        $departments = Department::count();
        $programs = Program::count();
        $rooms = Room::count();
        
        $currentYear = AcademicYear::where('is_current', true)->first();
        
        return response()->json([
            'students' => $students,
            'professors' => $professors,
            'departments' => $departments,
            'programs' => $programs,
            'rooms' => $rooms,
            'current_academic_year' => $currentYear,
        ]);
    }
}