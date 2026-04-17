<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduleConflict extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'conflict_type',
        'details',
        'status',
    ];

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }
}
