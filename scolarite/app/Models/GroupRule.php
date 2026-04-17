<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GroupRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'group_id',
        'rule_key',
        'rule_operator',
        'rule_value',
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}
