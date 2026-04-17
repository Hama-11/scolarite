<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Professor;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\Request;

class SchoolClassController extends Controller
{
    public function index(Request $request)
    {
        $q = SchoolClass::query()->with('professor.user');
        if ($request->filled('department')) {
            $q->where('department', 'like', '%'.$request->department.'%');
        }
        if ($request->filled('annee_scolaire')) {
            $q->where('annee_scolaire', $request->annee_scolaire);
        }

        return response()->json($q->orderBy('name')->paginate(30));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'annee_scolaire' => 'nullable|string|max:64',
            'professor_id' => 'nullable|exists:professors,id',
        ]);
        $exists = SchoolClass::where('name', $data['name'])
            ->when(isset($data['department']), fn ($q) => $q->where('department', $data['department'] ?? null))
            ->when(isset($data['annee_scolaire']), fn ($q) => $q->where('annee_scolaire', $data['annee_scolaire'] ?? null))
            ->exists();
        if ($exists) {
            return response()->json(['message' => 'Une classe identique existe déjà.'], 422);
        }
        $class = SchoolClass::create($data);

        return response()->json($class->load('professor.user'), 201);
    }

    public function show(SchoolClass $school_class)
    {
        return response()->json($school_class->load(['professor.user', 'students.user']));
    }

    public function update(Request $request, SchoolClass $school_class)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'department' => 'nullable|string|max:255',
            'annee_scolaire' => 'nullable|string|max:64',
            'professor_id' => 'nullable|exists:professors,id',
        ]);
        $school_class->update($data);

        return response()->json($school_class->fresh()->load('professor.user'));
    }

    public function destroy(SchoolClass $school_class)
    {
        if ($school_class->students()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer : des étudiants sont inscrits. Réaffectez-les d’abord.',
            ], 422);
        }
        $school_class->delete();

        return response()->json(['message' => 'Classe supprimée.']);
    }

    public function assignProfessor(Request $request, SchoolClass $school_class)
    {
        $data = $request->validate([
            'professor_id' => 'required|exists:professors,id',
        ]);
        $school_class->update(['professor_id' => $data['professor_id']]);

        return response()->json($school_class->fresh()->load('professor.user'));
    }

    public function attachStudent(Request $request, SchoolClass $school_class)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
        ]);
        $student = Student::findOrFail($data['student_id']);
        $student->schoolClasses()->detach();
        $school_class->students()->attach($student->id, [
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
        $student->update(['classe' => $school_class->name]);

        return response()->json([
            'message' => 'Étudiant affecté à la classe.',
            'class' => $school_class->load('students.user'),
        ]);
    }

    public function detachStudent(SchoolClass $school_class, Student $student)
    {
        if (!$school_class->students()->where('students.id', $student->id)->exists()) {
            return response()->json(['message' => 'Cet étudiant n’est pas dans cette classe.'], 422);
        }
        $school_class->students()->detach($student->id);
        if ($student->classe === $school_class->name) {
            $student->update(['classe' => null]);
        }

        return response()->json(['message' => 'Étudiant retiré de la classe.']);
    }

    public function professorMyClasses(Request $request)
    {
        $user = $request->user();
        $prof = Professor::where('user_id', $user->id)->first();
        if (!$prof) {
            return response()->json(['message' => 'Profil enseignant introuvable.'], 404);
        }
        $classes = SchoolClass::where('professor_id', $prof->id)->withCount('students')->orderBy('name')->get();

        return response()->json(['classes' => $classes]);
    }

    public function professorClassStudents(Request $request, SchoolClass $school_class)
    {
        $user = $request->user();
        $prof = Professor::where('user_id', $user->id)->first();
        if (!$prof || (int) $school_class->professor_id !== (int) $prof->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }
        $students = $school_class->students()->with('user')->orderBy('name')->paginate(50);

        return response()->json($students);
    }
}
