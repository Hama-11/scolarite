<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Level extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'order_index',
    ];

    public function semesters()
    {
        return $this->hasMany(Semester::class);
    }
}
