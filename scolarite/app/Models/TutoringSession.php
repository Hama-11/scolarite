<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TutoringSession extends Model
{
    use HasFactory;

    protected $table = 'sessions';

    protected $fillable = [
        'group_id',
        'scheduled_at',
        'duration',
        'type',
        'location',
        'status',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}
