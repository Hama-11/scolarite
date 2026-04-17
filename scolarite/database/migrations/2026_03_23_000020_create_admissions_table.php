<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAdmissionsTable extends Migration
{
    public function up()
    {
        Schema::create('admissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->date('birth_date');
            $table->string('birth_place')->nullable();
            $table->string('address')->nullable();
            $table->string('cin')->nullable();
            $table->string('baccalaureate_type')->nullable();
            $table->decimal('baccalaureate_score', 5, 2)->nullable();
            $table->string('previous_school')->nullable();
            $table->string('document_path')->nullable();
            $table->enum('status', ['submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'])->default('submitted');
            $table->text('motivation_letter')->nullable();
            $table->text('admin_notes')->nullable();
            $table->integer('ranking')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            
            $table->foreign('campaign_id')->references('id')->on('admission_campaigns')->onDelete('cascade');
            $table->unique(['campaign_id', 'email']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('admissions');
    }
}