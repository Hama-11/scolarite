<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddDirectorAcademicValidationTables extends Migration
{
    public function up()
    {
        Schema::table('grades', function (Blueprint $table) {
            if (!Schema::hasColumn('grades', 'is_validated')) {
                $table->boolean('is_validated')->default(false)->after('date');
            }
            if (!Schema::hasColumn('grades', 'validated_by')) {
                $table->unsignedBigInteger('validated_by')->nullable()->after('is_validated');
            }
            if (!Schema::hasColumn('grades', 'validated_at')) {
                $table->timestamp('validated_at')->nullable()->after('validated_by');
            }
        });

        if (!Schema::hasTable('academic_decisions')) {
            Schema::create('academic_decisions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_id');
                $table->unsignedBigInteger('semester_id')->nullable();
                $table->decimal('average', 5, 2)->nullable();
                $table->enum('decision', ['pass', 'repeat', 'conditional'])->default('pass');
                $table->text('jury_notes')->nullable();
                $table->unsignedBigInteger('decided_by')->nullable();
                $table->timestamp('decided_at')->nullable();
                $table->timestamps();

                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
                $table->foreign('decided_by')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('academic_decisions')) {
            Schema::dropIfExists('academic_decisions');
        }

        Schema::table('grades', function (Blueprint $table) {
            if (Schema::hasColumn('grades', 'validated_at')) $table->dropColumn('validated_at');
            if (Schema::hasColumn('grades', 'validated_by')) $table->dropColumn('validated_by');
            if (Schema::hasColumn('grades', 'is_validated')) $table->dropColumn('is_validated');
        });
    }
}

