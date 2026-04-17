<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCoursesTable extends Migration
{
    public function up()
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->text('objectives')->nullable();
            $table->text('prerequisites')->nullable();
            $table->integer('credits');
            $table->integer('hours_cours')->default(0);
            $table->integer('hours_td')->default(0);
            $table->integer('hours_tp')->default(0);
            $table->unsignedBigInteger('program_id');
            $table->unsignedBigInteger('professor_id')->nullable();
            $table->integer('semester')->default(1);
            $table->enum('evaluation_type', ['exam', 'cc', 'mixed'])->default('mixed');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->foreign('professor_id')->references('id')->on('professors')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('courses');
    }
}