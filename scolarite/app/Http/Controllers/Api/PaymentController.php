<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Tuition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with(['tuition.student.user']);
        
        if ($request->has('tuition_id')) {
            $query->where('tuition_id', $request->tuition_id);
        }
        
        if ($request->has('student_id')) {
            $query->whereHas('tuition', function ($q) use ($request) {
                $q->where('student_id', $request->student_id);
            });
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('method')) {
            $query->where('method', $request->method);
        }
        
        $payments = $query->orderBy('payment_date', 'desc')->paginate(20);
        
        return response()->json($payments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tuition_id' => 'required|exists:tuitions,id',
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'method' => 'required|in:cash,check,bank_transfer,credit_card,online',
            'reference' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,completed,failed,refunded',
            'notes' => 'nullable|string',
        ]);

        $payment = Payment::create($validated);
        
        // Update tuition status if payment is completed
        if ($validated['status'] === 'completed') {
            $tuition = Tuition::find($validated['tuition_id']);
            $totalPaid = $tuition->payments()->where('status', 'completed')->sum('amount') + $validated['amount'];
            
            if ($totalPaid >= $tuition->amount) {
                $tuition->update(['status' => 'paid']);
            }
        }
        
        return response()->json($payment->load('tuition.student.user'), 201);
    }

    public function show(Payment $payment)
    {
        return response()->json($payment->load('tuition.student.user'));
    }

    public function update(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'payment_date' => 'sometimes|date',
            'method' => 'sometimes|in:cash,check,bank_transfer,credit_card,online',
            'reference' => 'nullable|string|max:255',
            'status' => 'sometimes|in:pending,completed,failed,refunded',
            'notes' => 'nullable|string',
        ]);

        $payment->update($validated);
        
        // Update tuition status
        $tuition = $payment->tuition;
        $totalPaid = $tuition->payments()->where('status', 'completed')->sum('amount');
        
        if ($totalPaid >= $tuition->amount) {
            $tuition->update(['status' => 'paid']);
        } else {
            $tuition->update(['status' => 'pending']);
        }
        
        return response()->json($payment->load('tuition.student.user'));
    }

    public function destroy(Payment $payment)
    {
        $payment->delete();
        
        return response()->json(['message' => 'Payment deleted successfully']);
    }

    public function myPayments()
    {
        $student = Auth::user()->student;
        
        if (!$student) {
            return response()->json(['message' => 'Student profile not found'], 404);
        }
        
        $payments = Payment::whereHas('tuition', function ($q) use ($student) {
            $q->where('student_id', $student->id);
        })->with('tuition.academicYear')
          ->orderBy('payment_date', 'desc')
          ->get();
        
        return response()->json($payments);
    }

    public function generateReceipt(Payment $payment)
    {
        // In a real application, this would generate a PDF receipt
        return response()->json([
            'receipt' => [
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
                'payment_date' => $payment->payment_date,
                'method' => $payment->method,
                'reference' => $payment->reference,
                'student' => $payment->tuition->student->user->name,
                'tuition' => $payment->tuition->description,
            ]
        ]);
    }
}