<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_session_id',
        'room_id',
        'invigilator_id',
        'expected_students',
    ];

    public function session()
    {
        return $this->belongsTo(ExamSession::class, 'exam_session_id');
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function invigilator()
    {
        return $this->belongsTo(Invigilator::class);
    }
}
