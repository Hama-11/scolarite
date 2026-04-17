<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequestStatusHistory extends Model
{
    use HasFactory;

    protected $table = 'request_status_history';

    protected $fillable = [
        'request_id',
        'from_status',
        'to_status',
        'changed_by',
        'comment',
    ];

    public function request()
    {
        return $this->belongsTo(Request::class);
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
