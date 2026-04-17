<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeDispute extends Model
{
    protected $fillable = [
        'student_id',
        'grade_id',
        'reason',
        'status',
        'director_comment',
        'new_grade',
        'resolved_at',
    ];

    protected $casts = [
        'new_grade' => 'decimal:2',
        'resolved_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }
}
