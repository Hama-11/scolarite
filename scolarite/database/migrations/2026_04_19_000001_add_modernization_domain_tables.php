<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddModernizationDomainTables extends Migration
{
    public function up()
    {
        Schema::create('enrollment_windows', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('allow_exceptions')->default(false);
            $table->timestamps();
        });

        Schema::create('enrollment_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('enrollment_window_id')->nullable();
            $table->enum('status', ['draft', 'submitted', 'auto_checked', 'pending_approval', 'approved', 'rejected', 'finalized'])->default('draft');
            $table->json('auto_checks')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamps();
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('course_id')->references('id')->on('courses')->onDelete('cascade');
        });

        Schema::create('academic_paths', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->string('title');
            $table->unsignedInteger('target_ects')->default(180);
            $table->unsignedInteger('validated_ects')->default(0);
            $table->json('custom_rules')->nullable();
            $table->timestamps();
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
        });

        Schema::create('exam_subject_versions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('created_by');
            $table->string('title');
            $table->unsignedInteger('version_no')->default(1);
            $table->enum('confidentiality', ['restricted', 'secret'])->default('secret');
            $table->text('content');
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->foreign('course_id')->references('id')->on('courses')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('jury_deliberations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('exam_session_id');
            $table->unsignedBigInteger('created_by');
            $table->json('decision_payload')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('pv_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('exam_session_id');
            $table->string('file_path')->nullable();
            $table->string('signature_provider')->nullable();
            $table->string('signature_ref')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('domain');
            $table->json('conditions')->nullable();
            $table->json('actions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('dynamic_forms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->json('schema');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('resource_reservations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('requested_by')->nullable();
            $table->string('resource_type');
            $table->unsignedBigInteger('resource_id')->nullable();
            $table->timestamp('start_at');
            $table->timestamp('end_at');
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->text('reason')->nullable();
            $table->timestamps();
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('maintenance_tickets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['open', 'in_progress', 'resolved', 'closed'])->default('open');
            $table->timestamps();
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('internship_offers', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('deadline')->nullable();
            $table->timestamps();
        });

        Schema::create('research_projects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->string('title');
            $table->text('abstract')->nullable();
            $table->enum('status', ['draft', 'submitted', 'approved', 'archived'])->default('draft');
            $table->timestamps();
            $table->foreign('owner_id')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('publications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('research_project_id')->nullable();
            $table->string('title');
            $table->string('type')->default('article');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('research_project_id')->references('id')->on('research_projects')->onDelete('set null');
        });

        Schema::create('grant_calls', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('deadline')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('grant_calls');
        Schema::dropIfExists('publications');
        Schema::dropIfExists('research_projects');
        Schema::dropIfExists('internship_offers');
        Schema::dropIfExists('maintenance_tickets');
        Schema::dropIfExists('resource_reservations');
        Schema::dropIfExists('dynamic_forms');
        Schema::dropIfExists('rules');
        Schema::dropIfExists('pv_documents');
        Schema::dropIfExists('jury_deliberations');
        Schema::dropIfExists('exam_subject_versions');
        Schema::dropIfExists('academic_paths');
        Schema::dropIfExists('enrollment_requests');
        Schema::dropIfExists('enrollment_windows');
    }
}
