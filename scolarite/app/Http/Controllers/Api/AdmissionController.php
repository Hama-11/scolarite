<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmissionCampaign;
use App\Models\Admission;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdmissionController extends Controller
{
    // Campaign Management
    public function campaigns(Request $request)
    {
        $query = AdmissionCampaign::with('academicYear', 'program');
        
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        
        $campaigns = $query->orderBy('start_date', 'desc')->paginate(20);
        
        return response()->json($campaigns);
    }

    public function storeCampaign(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'program_id' => 'required|exists:programs,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'max_applicants' => 'nullable|integer|min:1',
            'requirements' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        
        $campaign = AdmissionCampaign::create($validated);
        
        return response()->json($campaign->load(['academicYear', 'program']), 201);
    }

    public function showCampaign(AdmissionCampaign $campaign)
    {
        return response()->json($campaign->load(['academicYear', 'program']));
    }

    public function updateCampaign(Request $request, AdmissionCampaign $campaign)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'program_id' => 'sometimes|exists:programs,id',
            'academic_year_id' => 'sometimes|exists:academic_years,id',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'max_applicants' => 'nullable|integer|min:1',
            'requirements' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $campaign->update($validated);
        
        return response()->json($campaign->load(['academicYear', 'program']));
    }

    public function destroyCampaign(AdmissionCampaign $campaign)
    {
        $campaign->delete();
        
        return response()->json(['message' => 'Campaign deleted successfully']);
    }

    public function activeCampaigns()
    {
        $campaigns = AdmissionCampaign::with('academicYear', 'program')
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->orderBy('end_date', 'asc')
            ->get();
        
        return response()->json($campaigns);
    }

    // Admission Application Management
    public function apply(Request $request, AdmissionCampaign $campaign)
    {
        // Check if campaign is still active
        if (!$campaign->is_active || $campaign->start_date > now() || $campaign->end_date < now()) {
            return response()->json(['message' => 'Campaign is not active'], 400);
        }

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:50',
            'date_of_birth' => 'required|date',
            'address' => 'required|string',
            'high_school' => 'required|string|max:255',
            'high_school_graduation_year' => 'required|integer|min:1900|max:2100',
            'high_school_grade' => 'nullable|string|max:50',
            'documents' => 'nullable|array',
            'motivation_letter' => 'nullable|string',
        ]);

        $validated['campaign_id'] = $campaign->id;
        $validated['status'] = 'pending';
        
        $admission = Admission::create($validated);
        
        return response()->json($admission->load('campaign'), 201);
    }

    public function myApplications()
    {
        // For logged in users
        if (Auth::check()) {
            $admissions = Admission::with('campaign.program', 'campaign.academicYear')
                ->where('email', Auth::user()->email)
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        return response()->json($admissions);
    }

    public function admissions(Request $request)
    {
        $query = Admission::with('campaign.program', 'campaign.academicYear');
        
        if ($request->has('campaign_id')) {
            $query->where('campaign_id', $request->campaign_id);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $admissions = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json($admissions);
    }

    public function showAdmission(Admission $admission)
    {
        return response()->json($admission->load(['campaign.program', 'campaign.academicYear']));
    }

    public function reviewAdmission(Request $request, Admission $admission)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,reviewed,accepted,rejected,waitlisted',
            'review_notes' => 'nullable|string',
            'score' => 'nullable|numeric|min:0|max:100',
        ]);

        $admission->update($validated);
        
        return response()->json($admission->load(['campaign.program', 'campaign.academicYear']));
    }

    public function updateAdmission(Request $request, Admission $admission)
    {
        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'phone' => 'sometimes|string|max:50',
            'date_of_birth' => 'sometimes|date',
            'address' => 'sometimes|string',
            'high_school' => 'sometimes|string|max:255',
            'high_school_graduation_year' => 'sometimes|integer|min:1900|max:2100',
            'high_school_grade' => 'nullable|string|max:50',
            'documents' => 'nullable|array',
            'motivation_letter' => 'nullable|string',
        ]);

        $admission->update($validated);
        
        return response()->json($admission->load(['campaign.program', 'campaign.academicYear']));
    }

    public function destroyAdmission(Admission $admission)
    {
        $admission->delete();
        
        return response()->json(['message' => 'Admission deleted successfully']);
    }

    public function statistics(AdmissionCampaign $campaign)
    {
        $total = $campaign->admissions()->count();
        $pending = $campaign->admissions()->where('status', 'pending')->count();
        $reviewed = $campaign->admissions()->where('status', 'reviewed')->count();
        $accepted = $campaign->admissions()->where('status', 'accepted')->count();
        $rejected = $campaign->admissions()->where('status', 'rejected')->count();
        $waitlisted = $campaign->admissions()->where('status', 'waitlisted')->count();
        
        return response()->json([
            'total' => $total,
            'pending' => $pending,
            'reviewed' => $reviewed,
            'accepted' => $accepted,
            'rejected' => $rejected,
            'waitlisted' => $waitlisted,
        ]);
    }
}