<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_current',
        'is_registration_open',
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'is_registration_open' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function tuitions(): HasMany
    {
        return $this->hasMany(Tuition::class);
    }

    public function courseEnrollments(): HasMany
    {
        return $this->hasMany(CourseEnrollment::class);
    }
}