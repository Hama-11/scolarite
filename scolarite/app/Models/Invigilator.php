<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invigilator extends Model
{
    use HasFactory;

    protected $fillable = [
        'professor_id',
        'note',
    ];

    public function professor()
    {
        return $this->belongsTo(Professor::class);
    }
}
