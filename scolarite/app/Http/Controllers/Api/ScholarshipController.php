<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scholarship;
use App\Models\ScholarshipApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ScholarshipController extends Controller
{
    public function index(Request $request)
    {
        $query = Scholarship::with('academicYear');
        
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        
        $scholarships = $query->orderBy('deadline', 'asc')->paginate(20);
        
        return response()->json($scholarships);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'type' => 'required|in:full,partial,merit,need_based',
            'amount' => 'required|numeric|min:0',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'deadline' => 'required|date',
            'duration_months' => 'nullable|integer|min:1',
            'eligibility_criteria' => 'nullable|string',
            'required_documents' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        
        $scholarship = Scholarship::create($validated);
        
        return response()->json($scholarship->load('academicYear'), 201);
    }

    public function show(Scholarship $scholarship)
    {
        return response()->json($scholarship->load('academicYear'));
    }

    public function update(Request $request, Scholarship $scholarship)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'type' => 'sometimes|in:full,partial,merit,need_based',
            'amount' => 'sometimes|numeric|min:0',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'deadline' => 'sometimes|date',
            'duration_months' => 'nullable|integer|min:1',
            'eligibility_criteria' => 'nullable|string',
            'required_documents' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $scholarship->update($validated);
        
        return response()->json($scholarship->load('academicYear'));
    }

    public function destroy(Scholarship $scholarship)
    {
        $scholarship->delete();
        
        return response()->json(['message' => 'Scholarship deleted successfully']);
    }

    public function availableScholarships()
    {
        $scholarships = Scholarship::with('academicYear')
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('deadline')->orWhere('deadline', '>=', now()->toDateString());
            })
            ->orderBy('deadline', 'asc')
            ->get();

        return response()->json($scholarships);
    }

    // Scholarship Application methods
    public function apply(Request $request, Scholarship $scholarship)
    {
        $student = Auth::user()->student;
        
        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }

        // Check if already applied
        $existing = ScholarshipApplication::where('scholarship_id', $scholarship->id)
            ->where('student_id', $student->id)
            ->first();
        
        if ($existing) {
            return response()->json(['message' => 'Already applied to this scholarship'], 400);
        }

        $validated = $request->validate([
            'motivation_letter' => 'required|string',
            'documents' => 'nullable|array',
        ]);

        $application = ScholarshipApplication::create([
            'scholarship_id' => $scholarship->id,
            'student_id' => $student->id,
            'motivation_letter' => $validated['motivation_letter'],
            'documents' => $validated['documents'] ?? [],
            'status' => 'pending',
        ]);
        
        return response()->json($application->load(['scholarship', 'student.user']), 201);
    }

    public function myApplications()
    {
        $student = Auth::user()->student;
        
        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $applications = ScholarshipApplication::with('scholarship.academicYear')
            ->where('student_id', $student->id)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($applications);
    }

    // Admin methods for managing applications
    public function applications(Request $request, Scholarship $scholarship)
    {
        $query = ScholarshipApplication::with('student.user')
            ->where('scholarship_id', $scholarship->id);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $applications = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json($applications);
    }

    public function reviewApplication(Request $request, ScholarshipApplication $application)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected,waitlisted',
            'review_notes' => 'nullable|string',
        ]);

        $application->update([
            'status' => $validated['status'],
            'admin_notes' => $validated['review_notes'] ?? null,
            'reviewed_at' => now(),
        ]);

        return response()->json($application->load(['scholarship', 'student.user']));
    }
}