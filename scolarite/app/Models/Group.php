<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'departement',
        'professor_id',
        'max_students',
        'status',
    ];

    public function professor()
    {
        return $this->belongsTo(Professor::class);
    }

    public function sessions()
    {
        return $this->hasMany(Session::class);
    }

    public function requests()
    {
        return $this->hasMany(Request::class);
    }

    public function rules()
    {
        return $this->hasMany(GroupRule::class);
    }

    public function assignments()
    {
        return $this->hasMany(GroupAssignment::class);
    }
}
