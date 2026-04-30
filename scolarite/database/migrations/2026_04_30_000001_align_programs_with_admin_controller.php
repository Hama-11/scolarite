<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            if (!Schema::hasColumn('programs', 'academic_year_id')) {
                $table->unsignedBigInteger('academic_year_id')->nullable()->after('department_id');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->nullOnDelete();
            }

            if (!Schema::hasColumn('programs', 'credits_required')) {
                $table->unsignedInteger('credits_required')->default(180)->after('duration_years');
            }

            if (!Schema::hasColumn('programs', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('credits_required');
            }
        });
    }

    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            if (Schema::hasColumn('programs', 'academic_year_id')) {
                $table->dropForeign(['academic_year_id']);
                $table->dropColumn('academic_year_id');
            }
            if (Schema::hasColumn('programs', 'credits_required')) {
                $table->dropColumn('credits_required');
            }
            if (Schema::hasColumn('programs', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};
