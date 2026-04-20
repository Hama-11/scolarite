<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_id',
        'grade',
        'type',
        'description',
        'date',
        'is_validated',
        'validated_by',
        'validated_at',
    ];

    protected $casts = [
        'grade' => 'decimal:2',
        'date' => 'date',
        'is_validated' => 'boolean',
        'validated_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function dispute(): HasOne
    {
        return $this->hasOne(GradeDispute::class);
    }
}