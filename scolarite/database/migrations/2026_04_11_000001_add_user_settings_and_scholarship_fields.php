<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddUserSettingsAndScholarshipFields extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'settings')) {
                $table->json('settings')->nullable()->after('remember_token');
            }
            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('settings');
            }
        });

        Schema::table('scholarships', function (Blueprint $table) {
            if (!Schema::hasColumn('scholarships', 'academic_year_id')) {
                $table->unsignedBigInteger('academic_year_id')->nullable()->after('type');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->nullOnDelete();
            }
            if (!Schema::hasColumn('scholarships', 'deadline')) {
                $table->date('deadline')->nullable()->after('duration_months');
            }
            if (!Schema::hasColumn('scholarships', 'eligibility_criteria')) {
                $table->text('eligibility_criteria')->nullable()->after('deadline');
            }
            if (!Schema::hasColumn('scholarships', 'required_documents')) {
                $table->json('required_documents')->nullable()->after('eligibility_criteria');
            }
        });

        if (Schema::hasColumn('scholarships', 'deadline')) {
            DB::table('scholarships')->whereNull('deadline')->update([
                'deadline' => now()->addMonths(6)->toDateString(),
            ]);
        }

        Schema::table('scholarship_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('scholarship_applications', 'documents')) {
                $table->json('documents')->nullable()->after('motivation_letter');
            }
        });
    }

    public function down(): void
    {
        Schema::table('scholarship_applications', function (Blueprint $table) {
            if (Schema::hasColumn('scholarship_applications', 'documents')) {
                $table->dropColumn('documents');
            }
        });

        Schema::table('scholarships', function (Blueprint $table) {
            if (Schema::hasColumn('scholarships', 'academic_year_id')) {
                $table->dropForeign(['academic_year_id']);
            }
        });

        Schema::table('scholarships', function (Blueprint $table) {
            $cols = [];
            foreach (['required_documents', 'eligibility_criteria', 'deadline', 'academic_year_id'] as $c) {
                if (Schema::hasColumn('scholarships', $c)) {
                    $cols[] = $c;
                }
            }
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'is_active')) {
                $table->dropColumn(['settings', 'is_active']);
            } elseif (Schema::hasColumn('users', 'settings')) {
                $table->dropColumn('settings');
            }
        });
    }
}
