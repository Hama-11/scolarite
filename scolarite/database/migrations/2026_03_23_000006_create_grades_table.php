<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateGradesTable extends Migration
{
    public function up()
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('course_id');
            $table->decimal('grade', 5, 2);
            $table->enum('type', ['exam', 'ds', 'tp', 'project', 'participation', 'final']);
            $table->string('description')->nullable();
            $table->date('date');
            $table->timestamps();
            
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('course_id')->references('id')->on('courses')->onDelete('cascade');
            $table->unique(['student_id', 'course_id', 'type', 'date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('grades');
    }
}