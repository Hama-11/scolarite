<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Admission extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'birth_date',
        'birth_place',
        'address',
        'cin',
        'baccalaureate_type',
        'baccalaureate_score',
        'previous_school',
        'document_path',
        'status',
        'motivation_letter',
        'admin_notes',
        'ranking',
        'reviewed_at',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'baccalaureate_score' => 'decimal:2',
        'ranking' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(AdmissionCampaign::class);
    }
}