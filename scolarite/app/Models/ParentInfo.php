<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentInfo extends Model
{
    protected $table = 'parent_infos';

    protected $fillable = [
        'student_id',
        'father_first_name',
        'father_last_name',
        'father_phone',
        'father_job',
        'father_info_status',
        'mother_first_name',
        'mother_last_name',
        'mother_phone',
        'mother_job',
        'mother_info_status',
        'parents_relationship',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
