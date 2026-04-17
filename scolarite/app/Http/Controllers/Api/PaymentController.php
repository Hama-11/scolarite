<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Tuition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\URL;
use Barryvdh\DomPDF\Facade\Pdf;

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
        $payment->load('tuition.student.user', 'tuition.academicYear');
        $user = Auth::user();

        if (!$user || !$user->isAdministrator()) {
            $studentId = optional($payment->tuition)->student_id;
            if (!$user->student || (int) $user->student->id !== (int) $studentId) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        $signaturePayload = implode('|', [
            (string) $payment->id,
            (string) $payment->amount,
            (string) $payment->payment_date,
            (string) $payment->reference,
        ]);
        $receiptSignature = hash_hmac('sha256', $signaturePayload, (string) config('app.key'));
        $verificationUrl = URL::to('/api/payments/' . $payment->id . '/verify?sig=' . $receiptSignature);
        $qrCodeUrl = 'https://quickchart.io/qr?size=220&text=' . urlencode($verificationUrl);

        $pdf = Pdf::loadView('pdf.payment-receipt', [
            'payment' => $payment,
            'receiptSignature' => $receiptSignature,
            'verificationUrl' => $verificationUrl,
            'qrCodeUrl' => $qrCodeUrl,
            'generatedAt' => now(),
        ])->setPaper('a4');

        return $pdf->download('recu-paiement-' . $payment->id . '.pdf');
    }

    public function createCheckoutSession(Request $request)
    {
        $validated = $request->validate([
            'tuition_id' => 'required|exists:tuitions,id',
            'provider' => 'required|in:stripe',
        ]);

        $user = Auth::user();
        $tuition = Tuition::with(['student.user'])->findOrFail($validated['tuition_id']);

        if (!$user || !$user->student || (int) $user->student->id !== (int) $tuition->student_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $alreadyPaid = (float) $tuition->payments()->where('status', 'completed')->sum('amount');
        $remaining = max((float) $tuition->amount - $alreadyPaid, 0);
        if ($remaining <= 0) {
            return response()->json(['message' => 'Tuition already paid'], 422);
        }

        $secret = (string) config('services.stripe.secret');
        if ($validated['provider'] === 'stripe' && $secret === '') {
            return response()->json(['message' => 'Stripe is not configured on server'], 422);
        }

        $payment = Payment::create([
            'tuition_id' => $tuition->id,
            'amount' => $remaining,
            'payment_date' => now()->toDateString(),
            'method' => 'online',
            'status' => 'pending',
            'notes' => 'Pending online payment initialization',
        ]);

        // Stripe Checkout Session via HTTP API
        $frontendSuccess = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/tuitions?checkout=success';
        $frontendCancel = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/tuitions?checkout=cancel';

        $response = Http::asForm()
            ->withToken($secret)
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'payment',
                'success_url' => $frontendSuccess,
                'cancel_url' => $frontendCancel,
                'client_reference_id' => (string) $payment->id,
                'metadata[payment_id]' => (string) $payment->id,
                'metadata[tuition_id]' => (string) $tuition->id,
                'line_items[0][price_data][currency]' => 'eur',
                'line_items[0][price_data][product_data][name]' => 'Frais de scolarite',
                'line_items[0][price_data][product_data][description]' => (string) ($tuition->description ?: ('Tuition #' . $tuition->id)),
                'line_items[0][price_data][unit_amount]' => (int) round($remaining * 100),
                'line_items[0][quantity]' => 1,
            ]);

        if (!$response->successful()) {
            $payment->update([
                'status' => 'failed',
                'notes' => 'Checkout creation failed: ' . substr((string) $response->body(), 0, 500),
            ]);
            return response()->json([
                'message' => 'Unable to initialize online checkout',
                'provider_response' => $response->json(),
            ], 502);
        }

        $session = $response->json();
        $payment->update([
            'reference' => $session['id'] ?? null,
            'notes' => 'Stripe checkout created',
        ]);

        return response()->json([
            'payment_id' => $payment->id,
            'checkout_url' => $session['url'] ?? null,
            'session_id' => $session['id'] ?? null,
            'amount' => $remaining,
        ]);
    }

    public function verifyReceipt(Request $request, Payment $payment)
    {
        $sig = (string) $request->query('sig', '');
        $signaturePayload = implode('|', [
            (string) $payment->id,
            (string) $payment->amount,
            (string) $payment->payment_date,
            (string) $payment->reference,
        ]);
        $expected = hash_hmac('sha256', $signaturePayload, (string) config('app.key'));

        if (!hash_equals($expected, $sig)) {
            return response()->json(['valid' => false, 'message' => 'Invalid signature'], 422);
        }

        return response()->json([
            'valid' => true,
            'payment_id' => $payment->id,
            'amount' => $payment->amount,
            'payment_date' => $payment->payment_date,
            'method' => $payment->method,
        ]);
    }
}