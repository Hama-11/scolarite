<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tuition;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TuitionController extends Controller
{
    private function canManageTuitions($user): bool
    {
        return $user && $user->isAdministrator();
    }

    private function canAccessTuition($user, Tuition $tuition): bool
    {
        if ($this->canManageTuitions($user)) {
            return true;
        }

        return $user
            && $user->student
            && (int) $user->student->id === (int) $tuition->student_id;
    }

    private function normalizeStatus(?string $status): string
    {
        $value = strtolower((string) $status);
        $map = [
            'waived' => 'exempted',
            'overdue' => 'pending',
        ];

        return $map[$value] ?? $value;
    }

    private function serializeTuition(Tuition $tuition): array
    {
        $payload = $tuition->toArray();
        $payload['amount'] = (float) $tuition->total_amount;
        $payload['description'] = $tuition->remarks;
        $payload['due_date'] = null;

        return $payload;
    }

    private function serializePaginator($paginator)
    {
        $paginator->setCollection(
            $paginator->getCollection()->map(fn (Tuition $tuition) => $this->serializeTuition($tuition))
        );

        return $paginator;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Tuition::with(['student.user', 'academicYear']);

        if (!$this->canManageTuitions($user)) {
            if (!$user || !$user->student) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $query->where('student_id', $user->student->id);
        } elseif ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->has('status')) {
            $query->where('status', $this->normalizeStatus($request->status));
        }

        $tuitions = $query->orderByDesc('created_at')->paginate(20);

        return response()->json($this->serializePaginator($tuitions));
    }

    public function store(Request $request)
    {
        if (!$this->canManageTuitions($request->user())) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'amount' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:pending,partial,paid,exempted,waived,overdue',
            'description' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $amount = $validated['total_amount'] ?? ($validated['amount'] ?? null);
        if ($amount === null) {
            return response()->json([
                'message' => 'The amount field is required.',
                'errors' => ['amount' => ['The amount field is required.']],
            ], 422);
        }

        $tuition = Tuition::create([
            'student_id' => $validated['student_id'],
            'academic_year_id' => $validated['academic_year_id'],
            'total_amount' => $amount,
            'paid_amount' => 0,
            'status' => $this->normalizeStatus($validated['status'] ?? 'pending'),
            'remarks' => $validated['remarks'] ?? ($validated['description'] ?? null),
        ]);

        return response()->json($this->serializeTuition($tuition->load(['student.user', 'academicYear'])), 201);
    }

    public function show(Tuition $tuition)
    {
        if (!$this->canAccessTuition(Auth::user(), $tuition)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($this->serializeTuition($tuition->load(['student.user', 'academicYear', 'payments'])));
    }

    public function update(Request $request, Tuition $tuition)
    {
        if (!$this->canManageTuitions($request->user())) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'total_amount' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:pending,partial,paid,exempted,waived,overdue',
            'description' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $payload = [];
        if (array_key_exists('amount', $validated) || array_key_exists('total_amount', $validated)) {
            $payload['total_amount'] = $validated['total_amount'] ?? $validated['amount'];
        }
        if (array_key_exists('status', $validated)) {
            $payload['status'] = $this->normalizeStatus($validated['status']);
        }
        if (array_key_exists('remarks', $validated) || array_key_exists('description', $validated)) {
            $payload['remarks'] = $validated['remarks'] ?? $validated['description'];
        }

        if ($payload !== []) {
            $tuition->update($payload);
        }

        return response()->json($this->serializeTuition($tuition->fresh()->load(['student.user', 'academicYear'])));
    }

    public function destroy(Tuition $tuition)
    {
        if (!$this->canManageTuitions(Auth::user())) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

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
            ->orderByDesc('created_at')
            ->get();

        $totalAmount = $tuitions->sum('total_amount');
        $paidAmount = $tuitions->where('status', 'paid')->sum('total_amount');
        $pendingAmount = $tuitions->whereIn('status', ['pending', 'partial'])->sum('total_amount');

        return response()->json([
            'data' => $tuitions->map(fn (Tuition $tuition) => $this->serializeTuition($tuition))->values(),
            'summary' => [
                'total_amount' => (float) $totalAmount,
                'paid_amount' => (float) $paidAmount,
                'pending_amount' => (float) $pendingAmount,
            ]
        ]);
    }

    public function getPaymentHistory(Tuition $tuition)
    {
        if (!$this->canAccessTuition(Auth::user(), $tuition)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $payments = Payment::where('tuition_id', $tuition->id)
            ->orderBy('payment_date', 'desc')
            ->get();

        return response()->json($payments);
    }
}
