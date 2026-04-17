<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAcademicCoreAndGovernanceTables extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('faculties')) {
            Schema::create('faculties', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('departments') && !Schema::hasColumn('departments', 'faculty_id')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->unsignedBigInteger('faculty_id')->nullable()->after('id');
                $table->foreign('faculty_id')->references('id')->on('faculties')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('levels')) {
            Schema::create('levels', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->unsignedTinyInteger('order_index')->default(1);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('semesters')) {
            Schema::create('semesters', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('level_id')->nullable();
                $table->string('name');
                $table->unsignedTinyInteger('number')->default(1);
                $table->timestamps();
                $table->foreign('level_id')->references('id')->on('levels')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('modules')) {
            Schema::create('modules', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('program_id')->nullable();
                $table->unsignedBigInteger('semester_id')->nullable();
                $table->string('code')->unique();
                $table->string('name');
                $table->unsignedInteger('credits')->default(0);
                $table->decimal('coefficient', 5, 2)->default(1);
                $table->enum('evaluation_type', ['cc', 'tp', 'examen', 'mixte'])->default('mixte');
                $table->timestamps();
                $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
                $table->foreign('semester_id')->references('id')->on('semesters')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('module_prerequisites')) {
            Schema::create('module_prerequisites', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('module_id');
                $table->unsignedBigInteger('prerequisite_module_id');
                $table->timestamps();
                $table->unique(['module_id', 'prerequisite_module_id'], 'module_prereq_unique');
                $table->foreign('module_id')->references('id')->on('modules')->onDelete('cascade');
                $table->foreign('prerequisite_module_id')->references('id')->on('modules')->onDelete('cascade');
            });
        }

        if (Schema::hasTable('courses') && !Schema::hasColumn('courses', 'module_id')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->unsignedBigInteger('module_id')->nullable()->after('program_id');
                $table->foreign('module_id')->references('id')->on('modules')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('group_rules')) {
            Schema::create('group_rules', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('group_id');
                $table->string('rule_key');
                $table->string('rule_operator')->default('=');
                $table->string('rule_value');
                $table->timestamps();
                $table->foreign('group_id')->references('id')->on('groups')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('group_assignments')) {
            Schema::create('group_assignments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('group_id');
                $table->unsignedBigInteger('student_id');
                $table->string('reason')->nullable();
                $table->timestamps();
                $table->unique(['group_id', 'student_id']);
                $table->foreign('group_id')->references('id')->on('groups')->onDelete('cascade');
                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('timeslots')) {
            Schema::create('timeslots', function (Blueprint $table) {
                $table->id();
                $table->enum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);
                $table->time('start_time');
                $table->time('end_time');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('schedule_conflicts')) {
            Schema::create('schedule_conflicts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('schedule_id')->nullable();
                $table->enum('conflict_type', ['room', 'professor', 'group', 'other']);
                $table->text('details')->nullable();
                $table->enum('status', ['detected', 'resolved'])->default('detected');
                $table->timestamps();
                $table->foreign('schedule_id')->references('id')->on('schedules')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('exam_sessions')) {
            Schema::create('exam_sessions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('course_id');
                $table->enum('session_kind', ['normale', 'rattrapage'])->default('normale');
                $table->date('exam_date');
                $table->time('start_time');
                $table->time('end_time');
                $table->enum('status', ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'archived'])->default('draft');
                $table->timestamps();
                $table->foreign('course_id')->references('id')->on('courses')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('invigilators')) {
            Schema::create('invigilators', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('professor_id');
                $table->string('note')->nullable();
                $table->timestamps();
                $table->foreign('professor_id')->references('id')->on('professors')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('exam_allocations')) {
            Schema::create('exam_allocations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('exam_session_id');
                $table->unsignedBigInteger('room_id')->nullable();
                $table->unsignedBigInteger('invigilator_id')->nullable();
                $table->integer('expected_students')->default(0);
                $table->timestamps();
                $table->foreign('exam_session_id')->references('id')->on('exam_sessions')->onDelete('cascade');
                $table->foreign('room_id')->references('id')->on('rooms')->onDelete('set null');
                $table->foreign('invigilator_id')->references('id')->on('invigilators')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('exam_reports')) {
            Schema::create('exam_reports', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('exam_session_id');
                $table->text('summary')->nullable();
                $table->string('generated_by')->nullable();
                $table->timestamp('generated_at')->nullable();
                $table->timestamps();
                $table->foreign('exam_session_id')->references('id')->on('exam_sessions')->onDelete('cascade');
            });
        }

        if (Schema::hasTable('requests') && !Schema::hasColumn('requests', 'request_type')) {
            Schema::table('requests', function (Blueprint $table) {
                $table->string('request_type')->nullable()->after('group_id');
                $table->timestamp('submitted_at')->nullable()->after('status');
                $table->unsignedInteger('sla_hours')->default(72)->after('submitted_at');
            });
        }

        if (!Schema::hasTable('request_attachments')) {
            Schema::create('request_attachments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('request_id');
                $table->string('file_path');
                $table->string('file_name');
                $table->string('mime_type')->nullable();
                $table->unsignedBigInteger('size_bytes')->nullable();
                $table->timestamps();
                $table->foreign('request_id')->references('id')->on('requests')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('request_status_history')) {
            Schema::create('request_status_history', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('request_id');
                $table->string('from_status')->nullable();
                $table->string('to_status');
                $table->unsignedBigInteger('changed_by')->nullable();
                $table->text('comment')->nullable();
                $table->timestamps();
                $table->foreign('request_id')->references('id')->on('requests')->onDelete('cascade');
                $table->foreign('changed_by')->references('id')->on('users')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('payment_installments')) {
            Schema::create('payment_installments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tuition_id');
                $table->decimal('amount_due', 10, 2);
                $table->date('due_date');
                $table->enum('status', ['pending', 'paid', 'late', 'cancelled'])->default('pending');
                $table->timestamps();
                $table->foreign('tuition_id')->references('id')->on('tuitions')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('receipts')) {
            Schema::create('receipts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('payment_id');
                $table->string('receipt_number')->unique();
                $table->string('pdf_path')->nullable();
                $table->string('signature_hash')->nullable();
                $table->string('verification_qr')->nullable();
                $table->timestamp('issued_at')->nullable();
                $table->timestamps();
                $table->foreign('payment_id')->references('id')->on('payments')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('notification_preferences')) {
            Schema::create('notification_preferences', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->boolean('in_app_enabled')->default(true);
                $table->boolean('email_enabled')->default(true);
                $table->boolean('sms_enabled')->default(false);
                $table->timestamps();
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('action');
                $table->string('resource_type');
                $table->unsignedBigInteger('resource_id')->nullable();
                $table->json('metadata')->nullable();
                $table->ipAddress('ip_address')->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamps();
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('exports')) {
            Schema::create('exports', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('requested_by')->nullable();
                $table->string('type');
                $table->string('format')->default('pdf');
                $table->enum('status', ['queued', 'processing', 'done', 'failed'])->default('queued');
                $table->string('file_path')->nullable();
                $table->text('error_message')->nullable();
                $table->timestamps();
                $table->foreign('requested_by')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('exports')) Schema::dropIfExists('exports');
        if (Schema::hasTable('audit_logs')) Schema::dropIfExists('audit_logs');
        if (Schema::hasTable('notification_preferences')) Schema::dropIfExists('notification_preferences');
        if (Schema::hasTable('receipts')) Schema::dropIfExists('receipts');
        if (Schema::hasTable('payment_installments')) Schema::dropIfExists('payment_installments');
        if (Schema::hasTable('request_status_history')) Schema::dropIfExists('request_status_history');
        if (Schema::hasTable('request_attachments')) Schema::dropIfExists('request_attachments');
        if (Schema::hasTable('exam_reports')) Schema::dropIfExists('exam_reports');
        if (Schema::hasTable('exam_allocations')) Schema::dropIfExists('exam_allocations');
        if (Schema::hasTable('invigilators')) Schema::dropIfExists('invigilators');
        if (Schema::hasTable('exam_sessions')) Schema::dropIfExists('exam_sessions');
        if (Schema::hasTable('schedule_conflicts')) Schema::dropIfExists('schedule_conflicts');
        if (Schema::hasTable('timeslots')) Schema::dropIfExists('timeslots');
        if (Schema::hasTable('group_assignments')) Schema::dropIfExists('group_assignments');
        if (Schema::hasTable('group_rules')) Schema::dropIfExists('group_rules');
        if (Schema::hasTable('module_prerequisites')) Schema::dropIfExists('module_prerequisites');
        if (Schema::hasTable('modules')) Schema::dropIfExists('modules');
        if (Schema::hasTable('semesters')) Schema::dropIfExists('semesters');
        if (Schema::hasTable('levels')) Schema::dropIfExists('levels');
        if (Schema::hasColumn('departments', 'faculty_id')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->dropForeign(['faculty_id']);
                $table->dropColumn('faculty_id');
            });
        }
        if (Schema::hasTable('faculties')) Schema::dropIfExists('faculties');
    }
}
