<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentDocumentRequest extends Model
{
    protected $table = 'student_document_requests';

    protected $fillable = [
        'student_id',
        'document_type',
        'copies',
        'status',
        'price',
        'payment_status',
        'generated_file',
        'admin_comment',
        'requested_at',
        'processed_at',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
