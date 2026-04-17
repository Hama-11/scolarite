<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\GradeDispute;
use App\Models\ParentInfo;
use App\Models\Student;
use App\Models\StudentDocumentRequest;
use Illuminate\Http\Request;
class StudentLifecycleController extends Controller
{
    private function studentOrFail(Request $request): Student
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            abort(404, 'Profil étudiant introuvable.');
        }

        return $student;
    }

    public function show(Request $request)
    {
        $student = $this->studentOrFail($request);
        $student->load(['user:id,name,email', 'parentInfo']);

        return response()->json(['student' => $student]);
    }

    public function updatePersonal(Request $request)
    {
        $student = $this->studentOrFail($request);
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:64',
            'address' => 'nullable|string|max:2000',
            'place_of_birth' => 'nullable|string|max:255',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|max:32',
        ]);
        $student->update($data);
        if ($request->filled('name')) {
            $request->user()->update(['name' => $data['name']]);
        }
        if ($student->overall_status === 'draft' || $student->overall_status === 'in_progress') {
            $student->update([
                'personnel_info_status' => 'pending',
                'overall_status' => 'in_progress',
            ]);
        }

        return response()->json(['student' => $student->fresh()->load('parentInfo')]);
    }

    public function updateParents(Request $request)
    {
        $student = $this->studentOrFail($request);
        $data = $request->validate([
            'father_first_name' => 'nullable|string|max:255',
            'father_last_name' => 'nullable|string|max:255',
            'father_phone' => 'nullable|string|max:64',
            'father_job' => 'nullable|string|max:255',
            'mother_first_name' => 'nullable|string|max:255',
            'mother_last_name' => 'nullable|string|max:255',
            'mother_phone' => 'nullable|string|max:64',
            'mother_job' => 'nullable|string|max:255',
            'parents_relationship' => 'nullable|string|max:255',
        ]);
        ParentInfo::updateOrCreate(
            ['student_id' => $student->id],
            $data
        );
        if (in_array($student->overall_status, ['draft', 'in_progress'], true)) {
            $student->update(['overall_status' => 'in_progress']);
        }

        return response()->json(['parent_info' => $student->parentInfo()->first()]);
    }

    public function uploadDocument(Request $request)
    {
        $student = $this->studentOrFail($request);
        $validated = $request->validate([
            'slot' => 'required|in:payment_proof,certificate_achievement,academic_transcript',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);
        $slot = $validated['slot'];
        $file = $validated['file'];
        $dir = 'student_documents/'.$student->id;
        $path = $file->store($dir, 'public');
        $pathCol = $slot.'_path';
        $statusCol = $slot.'_status';
        $student->update([
            $pathCol => $path,
            $statusCol => 'pending',
            $slot.'_comment' => null,
            'overall_status' => $student->overall_status === 'draft' ? 'in_progress' : $student->overall_status,
        ]);

        return response()->json([
            'message' => 'Document téléversé.',
            'path' => $path,
            'status' => 'pending',
        ]);
    }

    public function submitValidation(Request $request)
    {
        $student = $this->studentOrFail($request);
        $student->update(['overall_status' => 'pending']);

        return response()->json(['message' => 'Dossier soumis pour validation.', 'student' => $student->fresh()]);
    }

    public function myDocumentRequests(Request $request)
    {
        $student = $this->studentOrFail($request);
        $items = $student->documentRequests()->orderByDesc('id')->paginate(20);

        return response()->json($items);
    }

    public function storeDocumentRequest(Request $request)
    {
        $student = $this->studentOrFail($request);
        $data = $request->validate([
            'document_type' => 'required|string|max:128',
            'copies' => 'nullable|integer|min:1|max:20',
        ]);
        $req = StudentDocumentRequest::create([
            'student_id' => $student->id,
            'document_type' => $data['document_type'],
            'copies' => $data['copies'] ?? 1,
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        return response()->json($req, 201);
    }

    public function myGradeDisputes(Request $request)
    {
        $student = $this->studentOrFail($request);
        $items = $student->gradeDisputes()->with('grade.course')->orderByDesc('id')->paginate(20);

        return response()->json($items);
    }

    public function storeGradeDispute(Request $request)
    {
        $student = $this->studentOrFail($request);
        $data = $request->validate([
            'grade_id' => 'required|exists:grades,id',
            'reason' => 'required|string|max:5000',
        ]);
        $grade = Grade::where('id', $data['grade_id'])->where('student_id', $student->id)->first();
        if (!$grade) {
            return response()->json(['message' => 'Note introuvable.'], 422);
        }
        if ($grade->dispute) {
            return response()->json(['message' => 'Une contestation existe déjà pour cette note.'], 422);
        }
        $dispute = GradeDispute::create([
            'student_id' => $student->id,
            'grade_id' => $grade->id,
            'reason' => $data['reason'],
            'status' => 'pending',
        ]);

        return response()->json($dispute->load('grade.course'), 201);
    }
}
