<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tuition;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TuitionController extends Controller
{
    public function index(Request $request)
    {
        $query = Tuition::with(['student.user', 'academicYear']);
        
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        
        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $tuitions = $query->orderBy('due_date', 'asc')->paginate(20);
        
        return response()->json($tuitions);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'status' => 'nullable|in:pending,paid,overdue,waived',
            'description' => 'nullable|string',
        ]);

        $tuition = Tuition::create($validated);
        
        return response()->json($tuition->load(['student.user', 'academicYear']), 201);
    }

    public function show(Tuition $tuition)
    {
        return response()->json($tuition->load(['student.user', 'academicYear', 'payments']));
    }

    public function update(Request $request, Tuition $tuition)
    {
        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|date',
            'status' => 'sometimes|in:pending,paid,overdue,waived',
            'description' => 'nullable|string',
        ]);

        $tuition->update($validated);
        
        return response()->json($tuition->load(['student.user', 'academicYear']));
    }

    public function destroy(Tuition $tuition)
    {
        $tuition->delete();
        
        return response()->json(['message' => 'Tuition deleted successfully']);
    }

    public function myTuitions()
    {
        $student = Auth::user()->student;
        
        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $tuitions = Tuition::with('academicYear')
            ->where('student_id', $student->id)
            ->orderBy('due_date', 'asc')
            ->get();
        
        $totalAmount = $tuitions->sum('amount');
        $paidAmount = $tuitions->where('status', 'paid')->sum('amount');
        $pendingAmount = $tuitions->whereIn('status', ['pending', 'overdue'])->sum('amount');
        
        return response()->json([
            'tuitions' => $tuitions,
            'summary' => [
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'pending_amount' => $pendingAmount,
            ]
        ]);
    }

    public function getPaymentHistory(Tuition $tuition)
    {
        $payments = Payment::where('tuition_id', $tuition->id)
            ->orderBy('payment_date', 'desc')
            ->get();
        
        return response()->json($payments);
    }
}