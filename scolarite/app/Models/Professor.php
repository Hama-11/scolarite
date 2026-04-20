<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Professor extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'specialite',
        'grade',
        'department_id',
        'hire_date',
        'employee_id',
        'specialization',
        'title',
        'status',
    ];

    protected $casts = [
        'hire_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function courses()
    {
        return $this->hasMany(Course::class, 'professor_id');
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class, 'professor_id');
    }

    public function schoolClasses()
    {
        return $this->hasMany(SchoolClass::class, 'professor_id');
    }
}
