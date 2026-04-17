<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class ConceptionSchoolClassesAndStudentLifecycle extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('school_classes')) {
            Schema::create('school_classes', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('department')->nullable();
                $table->string('annee_scolaire')->nullable();
                $table->unsignedBigInteger('professor_id')->nullable();
                $table->timestamps();
                $table->foreign('professor_id')->references('id')->on('professors')->nullOnDelete();
            });
        }

        if (!Schema::hasTable('class_students')) {
            Schema::create('class_students', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('school_class_id');
                $table->unsignedBigInteger('student_id');
                $table->string('status')->default('active');
                $table->timestamp('enrolled_at')->useCurrent();
                $table->timestamps();
                $table->unique(['school_class_id', 'student_id']);
                $table->foreign('school_class_id')->references('id')->on('school_classes')->cascadeOnDelete();
                $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            });
        }

        if (!Schema::hasTable('parent_infos')) {
            Schema::create('parent_infos', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_id')->unique();
                $table->string('father_first_name')->nullable();
                $table->string('father_last_name')->nullable();
                $table->string('father_phone')->nullable();
                $table->string('father_job')->nullable();
                $table->string('father_info_status')->default('pending');
                $table->string('mother_first_name')->nullable();
                $table->string('mother_last_name')->nullable();
                $table->string('mother_phone')->nullable();
                $table->string('mother_job')->nullable();
                $table->string('mother_info_status')->default('pending');
                $table->string('parents_relationship')->nullable();
                $table->timestamps();
                $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            });
        }

        if (!Schema::hasTable('student_document_requests')) {
            Schema::create('student_document_requests', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_id');
                $table->string('document_type');
                $table->unsignedInteger('copies')->default(1);
                $table->string('status')->default('pending');
                $table->decimal('price', 10, 2)->nullable();
                $table->string('payment_status')->nullable();
                $table->string('generated_file')->nullable();
                $table->text('admin_comment')->nullable();
                $table->timestamp('requested_at')->useCurrent();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
                $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            });
        }

        if (!Schema::hasTable('grade_disputes')) {
            Schema::create('grade_disputes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_id');
                $table->unsignedBigInteger('grade_id');
                $table->text('reason');
                $table->string('status')->default('pending');
                $table->text('director_comment')->nullable();
                $table->decimal('new_grade', 5, 2)->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();
                $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
                $table->foreign('grade_id')->references('id')->on('grades')->cascadeOnDelete();
            });
        }

        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'phone')) {
                $table->string('phone')->nullable()->after('name');
            }
            if (!Schema::hasColumn('students', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('students', 'place_of_birth')) {
                $table->string('place_of_birth')->nullable()->after('address');
            }
            if (!Schema::hasColumn('students', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('place_of_birth');
            }
            if (!Schema::hasColumn('students', 'gender')) {
                $table->string('gender', 32)->nullable()->after('date_of_birth');
            }
            if (!Schema::hasColumn('students', 'overall_status')) {
                $table->string('overall_status', 64)->default('draft')->after('gender');
            }
            if (!Schema::hasColumn('students', 'personnel_info_status')) {
                $table->string('personnel_info_status', 32)->default('pending')->after('overall_status');
            }
            if (!Schema::hasColumn('students', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('personnel_info_status');
            }
            if (!Schema::hasColumn('students', 'validation_comment')) {
                $table->text('validation_comment')->nullable()->after('approved_at');
            }
            if (!Schema::hasColumn('students', 'payment_proof_path')) {
                $table->string('payment_proof_path')->nullable()->after('validation_comment');
            }
            if (!Schema::hasColumn('students', 'payment_proof_status')) {
                $table->string('payment_proof_status', 32)->nullable()->after('payment_proof_path');
            }
            if (!Schema::hasColumn('students', 'payment_proof_comment')) {
                $table->text('payment_proof_comment')->nullable()->after('payment_proof_status');
            }
            if (!Schema::hasColumn('students', 'certificate_achievement_path')) {
                $table->string('certificate_achievement_path')->nullable()->after('payment_proof_comment');
            }
            if (!Schema::hasColumn('students', 'certificate_achievement_status')) {
                $table->string('certificate_achievement_status', 32)->nullable()->after('certificate_achievement_path');
            }
            if (!Schema::hasColumn('students', 'certificate_achievement_comment')) {
                $table->text('certificate_achievement_comment')->nullable()->after('certificate_achievement_status');
            }
            if (!Schema::hasColumn('students', 'academic_transcript_path')) {
                $table->string('academic_transcript_path')->nullable()->after('certificate_achievement_comment');
            }
            if (!Schema::hasColumn('students', 'academic_transcript_status')) {
                $table->string('academic_transcript_status', 32)->nullable()->after('academic_transcript_path');
            }
            if (!Schema::hasColumn('students', 'academic_transcript_comment')) {
                $table->text('academic_transcript_comment')->nullable()->after('academic_transcript_status');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_disputes');
        Schema::dropIfExists('student_document_requests');
        Schema::dropIfExists('parent_infos');
        Schema::dropIfExists('class_students');
        Schema::dropIfExists('school_classes');

        Schema::table('students', function (Blueprint $table) {
            foreach ([
                'academic_transcript_comment', 'academic_transcript_status', 'academic_transcript_path',
                'certificate_achievement_comment', 'certificate_achievement_status', 'certificate_achievement_path',
                'payment_proof_comment', 'payment_proof_status', 'payment_proof_path',
                'validation_comment', 'approved_at', 'personnel_info_status', 'overall_status',
                'gender', 'date_of_birth', 'place_of_birth', 'address', 'phone',
            ] as $col) {
                if (Schema::hasColumn('students', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
}
