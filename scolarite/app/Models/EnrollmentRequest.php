<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnrollmentRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_id',
        'academic_year_id',
        'enrollment_window_id',
        'status',
        'auto_checks',
        'admin_note',
    ];

    protected $casts = [
        'auto_checks' => 'array',
    ];
}
