<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'matricule',
        'classe',
        'phone',
        'address',
        'place_of_birth',
        'date_of_birth',
        'gender',
        'overall_status',
        'personnel_info_status',
        'approved_at',
        'validation_comment',
        'payment_proof_path',
        'payment_proof_status',
        'payment_proof_comment',
        'certificate_achievement_path',
        'certificate_achievement_status',
        'certificate_achievement_comment',
        'academic_transcript_path',
        'academic_transcript_status',
        'academic_transcript_comment',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class, 'classe');
    }

    public function enrollments()
    {
        return $this->hasMany(CourseEnrollment::class, 'student_id');
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function parentInfo(): HasOne
    {
        return $this->hasOne(ParentInfo::class);
    }

    public function schoolClasses(): BelongsToMany
    {
        return $this->belongsToMany(SchoolClass::class, 'class_students', 'student_id', 'school_class_id')
            ->withPivot(['status', 'enrolled_at'])
            ->withTimestamps();
    }

    public function documentRequests(): HasMany
    {
        return $this->hasMany(StudentDocumentRequest::class);
    }

    public function gradeDisputes(): HasMany
    {
        return $this->hasMany(GradeDispute::class);
    }
}
