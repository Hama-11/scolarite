<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicModule extends Model
{
    use HasFactory;

    protected $table = 'modules';

    protected $fillable = [
        'program_id',
        'semester_id',
        'code',
        'name',
        'credits',
        'coefficient',
        'evaluation_type',
    ];

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class);
    }

    public function prerequisites()
    {
        return $this->belongsToMany(
            AcademicModule::class,
            'module_prerequisites',
            'module_id',
            'prerequisite_module_id'
        );
    }
}
