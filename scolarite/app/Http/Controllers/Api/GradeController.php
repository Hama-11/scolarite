<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Course;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GradeController extends Controller
{
    private const ALLOWED_TYPES = ['exam', 'ds', 'tp', 'project', 'participation', 'final'];

    private function normalizeType(?string $type): string
    {
        $value = strtolower((string) $type);
        $map = [
            'quiz' => 'ds',
            'homework' => 'tp',
            'midterm' => 'exam',
        ];
        $normalized = $map[$value] ?? $value;

        return in_array($normalized, self::ALLOWED_TYPES, true) ? $normalized : 'exam';
    }

    public function index(Request $request)
    {
        $query = Grade::with(['student.user', 'course']);
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        
        $grades = $query->paginate(20);
        
        return response()->json($grades);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'course_id' => 'required|exists:courses,id',
            // Support legacy payload (grade/date/description) and new frontend payload (value/max_value/comments)
            'grade' => 'nullable|numeric|min:0|max:20',
            'value' => 'nullable|numeric|min:0|max:100',
            'max_value' => 'nullable|numeric|min:1|max:100',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'comments' => 'nullable|string',
            'date' => 'nullable|date',
            'semester' => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:50',
        ]);

        $normalizedGrade = $validated['grade'] ?? null;
        if ($normalizedGrade === null && isset($validated['value'])) {
            $maxValue = isset($validated['max_value']) ? (float) $validated['max_value'] : 100.0;
            $maxValue = $maxValue > 0 ? $maxValue : 100.0;
            $normalizedGrade = round((((float) $validated['value']) / $maxValue) * 20, 2);
        }

        if ($normalizedGrade === null) {
            return response()->json(['message' => 'grade or value is required'], 422);
        }

        $payload = [
            'student_id' => $validated['student_id'],
            'course_id' => $validated['course_id'],
            'grade' => $normalizedGrade,
            'type' => $this->normalizeType($validated['type']),
            'description' => $validated['description'] ?? ($validated['comments'] ?? null),
            'date' => $validated['date'] ?? now()->toDateString(),
        ];

        $grade = Grade::create($payload);
        
        return response()->json($grade->load(['student.user', 'course']), 201);
    }

    public function show(Grade $grade)
    {
        return response()->json($grade->load(['student.user', 'course']));
    }

    public function update(Request $request, Grade $grade)
    {
        $validated = $request->validate([
            'grade' => 'nullable|numeric|min:0|max:20',
            'value' => 'nullable|numeric|min:0|max:100',
            'max_value' => 'nullable|numeric|min:1|max:100',
            'type' => 'sometimes|string',
            'description' => 'nullable|string',
            'comments' => 'nullable|string',
            'date' => 'sometimes|date',
        ]);

        $payload = $validated;

        if (array_key_exists('value', $validated)) {
            $maxValue = isset($validated['max_value']) ? (float) $validated['max_value'] : 100.0;
            $maxValue = $maxValue > 0 ? $maxValue : 100.0;
            $payload['grade'] = round((((float) $validated['value']) / $maxValue) * 20, 2);
        }

        if (array_key_exists('comments', $validated) && !array_key_exists('description', $validated)) {
            $payload['description'] = $validated['comments'];
        }

        if (array_key_exists('type', $validated)) {
            $payload['type'] = $this->normalizeType($validated['type']);
        }

        unset($payload['value'], $payload['max_value'], $payload['comments']);

        $grade->update($payload);
        
        return response()->json($grade->load(['student.user', 'course']));
    }

    public function destroy(Grade $grade)
    {
        $grade->delete();
        
        return response()->json(['message' => 'Grade deleted successfully']);
    }

    public function myGrades(Request $request)
    {
        $user = Auth::user();
        
        // Return empty if no student profile
        if (!$user->student) {
            return response()->json(['data' => []]);
        }
        
        $query = Grade::with(['course'])
            ->where('student_id', $user->student->id);
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        $grades = $query->orderBy('date', 'desc')->get();
        
        return response()->json(['data' => $grades]);
    }

    public function courseGrades($courseId)
    {
        $grades = Grade::with(['student.user'])
            ->where('course_id', $courseId)
            ->orderBy('student_id')
            ->orderBy('date')
            ->get();
        
        return response()->json($grades);
    }

    public function calculateAverage(Request $request)
    {
        $user = Auth::user();
        
        if (!$user->student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $courseId = $request->get('course_id');
        
        $query = Grade::where('student_id', $user->student->id);
        
        if ($courseId) {
            $query->where('course_id', $courseId);
            $grades = $query->get();
            
            if ($grades->isEmpty()) {
                return response()->json(['average' => null, 'message' => 'No grades found']);
            }
            
            $average = $grades->avg('grade');
            return response()->json([
                'course_id' => $courseId,
                'average' => round($average, 2),
                'grades_count' => $grades->count(),
            ]);
        }
        
        $grades = $query->get();
        
        if ($grades->isEmpty()) {
            return response()->json(['average' => null, 'message' => 'No grades found']);
        }
        
        $average = $grades->avg('grade');
        
        return response()->json([
            'overall_average' => round($average, 2),
            'grades_count' => $grades->count(),
        ]);
    }

    public function importCsv(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'type' => 'required|string',
            'date' => 'required|date',
            'max_value' => 'nullable|numeric|min:1|max:100',
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('file');
        $rows = array_map('str_getcsv', file($file->getRealPath()));
        if (count($rows) < 2) {
            return response()->json(['message' => 'Fichier CSV vide ou invalide'], 422);
        }

        $headers = array_map(function ($h) {
            return strtolower(trim((string) $h));
        }, $rows[0]);

        $requiredOneOf = ['student_id', 'matricule', 'email'];
        $hasIdentifier = count(array_intersect($requiredOneOf, $headers)) > 0;
        $hasValue = in_array('value', $headers, true) || in_array('grade', $headers, true);
        if (!$hasIdentifier || !$hasValue) {
            return response()->json([
                'message' => 'Colonnes requises: (student_id ou matricule ou email) + (value ou grade)',
            ], 422);
        }

        $normalizedType = $this->normalizeType($validated['type']);
        $targetDate = $validated['date'];
        $defaultMax = isset($validated['max_value']) ? (float) $validated['max_value'] : 20.0;
        $defaultMax = $defaultMax > 0 ? $defaultMax : 20.0;

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        for ($i = 1; $i < count($rows); $i++) {
            $line = $rows[$i];
            if (count(array_filter($line, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $data = [];
            foreach ($headers as $idx => $header) {
                $data[$header] = isset($line[$idx]) ? trim((string) $line[$idx]) : null;
            }

            $student = $this->resolveStudentFromCsv($data);
            if (!$student) {
                $skipped++;
                $errors[] = "Ligne " . ($i + 1) . ": etudiant introuvable";
                continue;
            }

            $rawValue = $data['value'] ?? $data['grade'] ?? null;
            if ($rawValue === null || $rawValue === '') {
                $skipped++;
                $errors[] = "Ligne " . ($i + 1) . ": note manquante";
                continue;
            }

            $rawValue = str_replace(',', '.', (string) $rawValue);
            if (!is_numeric($rawValue)) {
                $skipped++;
                $errors[] = "Ligne " . ($i + 1) . ": note invalide";
                continue;
            }

            $maxValue = isset($data['max_value']) && $data['max_value'] !== ''
                ? (float) str_replace(',', '.', (string) $data['max_value'])
                : $defaultMax;
            $maxValue = $maxValue > 0 ? $maxValue : $defaultMax;

            $grade20 = round((((float) $rawValue) / $maxValue) * 20, 2);
            if ($grade20 < 0 || $grade20 > 20) {
                $skipped++;
                $errors[] = "Ligne " . ($i + 1) . ": note hors plage";
                continue;
            }

            $payload = [
                'grade' => $grade20,
                'description' => $data['description'] ?? ($data['comments'] ?? null),
            ];

            $grade = Grade::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'course_id' => (int) $validated['course_id'],
                    'type' => $normalizedType,
                    'date' => $targetDate,
                ],
                $payload
            );

            if ($grade->wasRecentlyCreated) {
                $created++;
            } else {
                $updated++;
            }
        }

        return response()->json([
            'message' => 'Import CSV termine',
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 50),
        ]);
    }

    private function resolveStudentFromCsv(array $row): ?Student
    {
        if (!empty($row['student_id']) && ctype_digit((string) $row['student_id'])) {
            return Student::find((int) $row['student_id']);
        }

        if (!empty($row['matricule'])) {
            return Student::where('matricule', $row['matricule'])->first();
        }

        if (!empty($row['email'])) {
            return Student::whereHas('user', function ($q) use ($row) {
                $q->where('email', $row['email']);
            })->first();
        }

        return null;
    }

    // Route compatibility aliases
    public function byCourse($courseId)
    {
        return $this->courseGrades($courseId);
    }

    public function studentAverage($studentId)
    {
        $grades = Grade::where('student_id', $studentId)->get();
        if ($grades->isEmpty()) {
            return response()->json(['average' => null, 'message' => 'No grades found']);
        }

        return response()->json([
            'student_id' => (int) $studentId,
            'average' => round((float) $grades->avg('grade'), 2),
            'grades_count' => $grades->count(),
        ]);
    }
}