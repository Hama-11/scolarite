<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Semester extends Model
{
    use HasFactory;

    protected $fillable = [
        'level_id',
        'name',
        'number',
    ];

    public function level()
    {
        return $this->belongsTo(Level::class);
    }

    public function modules()
    {
        return $this->hasMany(AcademicModule::class, 'semester_id');
    }
}
