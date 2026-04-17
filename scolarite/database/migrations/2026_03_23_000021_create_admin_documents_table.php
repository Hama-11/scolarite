<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAdminDocumentsTable extends Migration
{
    public function up()
    {
        Schema::create('admin_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('requested_by');
            $table->unsignedBigInteger('processed_by')->nullable();
            $table->enum('type', ['certificate', 'attestation', 'releve_notes', 'attestation_reussite', 'other']);
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();
            
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('processed_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('admin_documents');
    }
}