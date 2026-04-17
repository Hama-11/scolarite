<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'session_kind',
        'exam_date',
        'start_time',
        'end_time',
        'status',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function allocations()
    {
        return $this->hasMany(ExamAllocation::class);
    }
}
