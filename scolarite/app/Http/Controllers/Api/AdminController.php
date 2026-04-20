<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Department;
use App\Models\Program;
use App\Models\Room;
use App\Models\AcademicYear;
use App\Models\AuditLog;
use App\Models\Grade;
use App\Models\Student;
use App\Models\SystemSetting;
use App\Models\Professor;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    private const DEFAULT_SYSTEM_SETTINGS = [
        'email' => [
            'from_name' => 'Scolarite',
            'from_address' => 'noreply@scolarite.local',
        ],
        'notifications' => [
            'email_enabled' => true,
            'in_app_enabled' => true,
        ],
        'advanced_rights' => [
            'strict_mode' => false,
            'allow_director_manage_exams' => true,
        ],
    ];

    private function adminResource(Request $request): ?string
    {
        $uri = trim((string) optional($request->route())->uri(), '/');

        foreach (['departments', 'programs', 'rooms', 'academic-years'] as $resource) {
            if (strpos($uri, $resource) !== false) {
                return $resource;
            }
        }

        return null;
    }

    public function index(Request $request)
    {
        $resource = $this->adminResource($request);
        if ($resource === 'departments') {
            return $this->departments($request);
        }
        if ($resource === 'programs') {
            return $this->programs($request);
        }
        if ($resource === 'rooms') {
            return $this->rooms($request);
        }
        if ($resource === 'academic-years') {
            return $this->academicYears($request);
        }

        abort(404);
    }

    public function store(Request $request)
    {
        $resource = $this->adminResource($request);
        if ($resource === 'departments') {
            return $this->storeDepartment($request);
        }
        if ($resource === 'programs') {
            return $this->storeProgram($request);
        }
        if ($resource === 'rooms') {
            return $this->storeRoom($request);
        }
        if ($resource === 'academic-years') {
            return $this->storeAcademicYear($request);
        }

        abort(404);
    }

    public function show(Request $request)
    {
        $resource = $this->adminResource($request);
        if ($resource === 'departments') {
            return $this->showDepartment($request->route('department'));
        }
        if ($resource === 'programs') {
            return $this->showProgram($request->route('program'));
        }
        if ($resource === 'rooms') {
            return $this->showRoom($request->route('room'));
        }
        if ($resource === 'academic-years') {
            return $this->showAcademicYear($request->route('academicYear'));
        }

        abort(404);
    }

    public function update(Request $request)
    {
        $resource = $this->adminResource($request);
        if ($resource === 'departments') {
            return $this->updateDepartment($request, $request->route('department'));
        }
        if ($resource === 'programs') {
            return $this->updateProgram($request, $request->route('program'));
        }
        if ($resource === 'rooms') {
            return $this->updateRoom($request, $request->route('room'));
        }
        if ($resource === 'academic-years') {
            return $this->updateAcademicYear($request, $request->route('academicYear'));
        }

        abort(404);
    }

    public function destroy(Request $request)
    {
        $resource = $this->adminResource($request);
        if ($resource === 'departments') {
            return $this->destroyDepartment($request->route('department'));
        }
        if ($resource === 'programs') {
            return $this->destroyProgram($request->route('program'));
        }
        if ($resource === 'rooms') {
            return $this->destroyRoom($request->route('room'));
        }
        if ($resource === 'academic-years') {
            return $this->destroyAcademicYear($request->route('academicYear'));
        }

        abort(404);
    }

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

    public function resetUserPassword(User $user)
    {
        if ($user->id === Auth::id()) {
            return response()->json(['message' => 'Cannot reset your own password'], 400);
        }

        $tempPassword = 'Temp-' . Str::random(10) . '1!';
        $user->update(['password' => Hash::make($tempPassword)]);

        return response()->json([
            'message' => 'Password reset successfully',
            'temporary_password' => $tempPassword,
        ]);
    }

    // Statistics Dashboard
    public function dashboardStats()
    {
        $students = Student::count();
        $professors = Professor::count();
        $departments = Department::count();
        $programs = Program::count();
        $rooms = Room::count();
        $courses = Course::count();

        $currentYear = AcademicYear::where('is_current', true)->first();

        return response()->json([
            'students' => $students,
            'professors' => $professors,
            'departments' => $departments,
            'programs' => $programs,
            'rooms' => $rooms,
            'courses' => $courses,
            'current_academic_year' => $currentYear ? [
                'id' => $currentYear->id,
                'name' => $currentYear->name,
                'is_current' => (bool) $currentYear->is_current,
            ] : null,
        ]);
    }

    public function systemSettings()
    {
        $stored = SystemSetting::query()->pluck('value', 'key')->toArray();
        return response()->json(array_replace_recursive(self::DEFAULT_SYSTEM_SETTINGS, $stored));
    }

    public function updateSystemSettings(Request $request)
    {
        $data = $request->validate([
            'email.from_name' => 'nullable|string|max:255',
            'email.from_address' => 'nullable|email|max:255',
            'notifications.email_enabled' => 'nullable|boolean',
            'notifications.in_app_enabled' => 'nullable|boolean',
            'advanced_rights.strict_mode' => 'nullable|boolean',
            'advanced_rights.allow_director_manage_exams' => 'nullable|boolean',
        ]);

        foreach (['email', 'notifications', 'advanced_rights'] as $key) {
            if (array_key_exists($key, $data)) {
                SystemSetting::updateOrCreate(['key' => $key], ['value' => $data[$key]]);
            }
        }

        return response()->json(['message' => 'System settings updated']);
    }

    public function rolesPermissionsMatrix()
    {
        return response()->json([
            'roles' => array_values((array) config('rbac.roles', [])),
            'aliases' => (array) config('rbac.aliases', []),
            'matrix' => (array) config('rbac.matrix', []),
        ]);
    }

    public function auditLogs(Request $request)
    {
        $query = AuditLog::with('user:id,name,email')->orderByDesc('id');
        if ($request->filled('resource_type')) {
            $query->where('resource_type', $request->string('resource_type'));
        }
        if ($request->filled('action')) {
            $query->where('action', 'like', '%' . $request->string('action') . '%');
        }

        return response()->json($query->paginate((int) $request->get('per_page', 30)));
    }

    public function importStudentsCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        if ($handle === false) {
            return response()->json(['message' => 'Invalid CSV file'], 422);
        }

        $header = fgetcsv($handle);
        if (!is_array($header)) {
            fclose($handle);
            return response()->json(['message' => 'CSV header is missing'], 422);
        }
        $header = array_map(static fn ($h) => strtolower(trim((string) $h)), $header);
        $required = ['name', 'email', 'role'];
        foreach ($required as $field) {
            if (!in_array($field, $header, true)) {
                fclose($handle);
                return response()->json(['message' => "Missing required column: {$field}"], 422);
            }
        }

        $created = 0;
        $updated = 0;
        while (($row = fgetcsv($handle)) !== false) {
            if (!is_array($row) || count($row) === 0) {
                continue;
            }
            $rowData = array_combine($header, array_pad($row, count($header), null));
            if (!is_array($rowData)) {
                continue;
            }

            $email = strtolower(trim((string) ($rowData['email'] ?? '')));
            $name = trim((string) ($rowData['name'] ?? ''));
            $roleName = trim((string) ($rowData['role'] ?? 'etudiant'));
            if ($email === '' || $name === '') {
                continue;
            }

            $role = Role::where('name', $roleName)->first()
                ?: Role::where('name', config('rbac.aliases.' . strtolower($roleName), 'etudiant'))->first();
            $roleId = $role ? $role->id : Role::where('name', 'etudiant')->value('id');
            $password = (string) ($rowData['password'] ?? ('Temp-' . Str::random(8) . '1!'));

            $existing = User::where('email', $email)->first();
            if ($existing) {
                $existing->update([
                    'name' => $name,
                    'role_id' => $roleId,
                ]);
                $updated++;
            } else {
                User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => Hash::make($password),
                    'role_id' => $roleId,
                ]);
                $created++;
            }
        }
        fclose($handle);

        return response()->json([
            'message' => 'Import completed',
            'created' => $created,
            'updated' => $updated,
        ]);
    }

    public function exportCsv(Request $request, string $dataset): StreamedResponse
    {
        $allowed = ['users', 'students', 'grades', 'audit-logs'];
        if (!in_array($dataset, $allowed, true)) {
            abort(404);
        }

        $filename = $dataset . '-' . now()->format('Ymd_His') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return response()->stream(function () use ($dataset) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fputcsv($out, ['exported_at', now()->toDateTimeString()]);

            if ($dataset === 'users') {
                fputcsv($out, ['id', 'name', 'email', 'role', 'is_active']);
                User::with('role')->orderBy('id')->chunk(500, function ($chunk) use ($out) {
                    foreach ($chunk as $u) {
                        fputcsv($out, [$u->id, $u->name, $u->email, optional($u->role)->name, (int) $u->is_active]);
                    }
                });
            } elseif ($dataset === 'students') {
                fputcsv($out, ['id', 'name', 'email', 'matricule', 'classe']);
                Student::with('user')->orderBy('id')->chunk(500, function ($chunk) use ($out) {
                    foreach ($chunk as $s) {
                        fputcsv($out, [$s->id, $s->name, optional($s->user)->email, $s->matricule, $s->classe]);
                    }
                });
            } elseif ($dataset === 'grades') {
                fputcsv($out, ['id', 'student_id', 'course_id', 'grade', 'type', 'date', 'is_validated']);
                Grade::orderBy('id')->chunk(500, function ($chunk) use ($out) {
                    foreach ($chunk as $g) {
                        fputcsv($out, [$g->id, $g->student_id, $g->course_id, $g->grade, $g->type, $g->date, (int) $g->is_validated]);
                    }
                });
            } else {
                fputcsv($out, ['id', 'user_id', 'action', 'resource_type', 'resource_id', 'ip_address', 'created_at']);
                AuditLog::orderByDesc('id')->chunk(500, function ($chunk) use ($out) {
                    foreach ($chunk as $l) {
                        fputcsv($out, [$l->id, $l->user_id, $l->action, $l->resource_type, $l->resource_id, $l->ip_address, $l->created_at]);
                    }
                });
            }

            fclose($out);
        }, 200, $headers);
    }
}
