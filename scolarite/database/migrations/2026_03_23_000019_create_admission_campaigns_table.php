<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAdmissionCampaignsTable extends Migration
{
    public function up()
    {
        Schema::create('admission_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedBigInteger('program_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('max_candidates')->nullable();
            $table->text('requirements')->nullable();
            $table->text('selection_criteria')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('admission_campaigns');
    }
}