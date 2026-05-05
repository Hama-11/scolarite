<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddMissingForeignKeysModernizationTables extends Migration
{
    public function up()
    {
        $this->addForeignIfMissing(
            'enrollment_requests',
            'enrollment_requests_academic_year_id_fk',
            function (Blueprint $table) {
                $table->foreign('academic_year_id', 'enrollment_requests_academic_year_id_fk')
                    ->references('id')
                    ->on('academic_years')
                    ->onDelete('set null');
            }
        );

        $this->addForeignIfMissing(
            'enrollment_requests',
            'enrollment_requests_enrollment_window_id_fk',
            function (Blueprint $table) {
                $table->foreign('enrollment_window_id', 'enrollment_requests_enrollment_window_id_fk')
                    ->references('id')
                    ->on('enrollment_windows')
                    ->onDelete('set null');
            }
        );

        $this->addForeignIfMissing(
            'academic_paths',
            'academic_paths_student_id_fk',
            function (Blueprint $table) {
                $table->foreign('student_id', 'academic_paths_student_id_fk')
                    ->references('id')
                    ->on('students')
                    ->onDelete('cascade');
            }
        );

        $this->addForeignIfMissing(
            'exam_subject_versions',
            'exam_subject_versions_course_id_fk',
            function (Blueprint $table) {
                $table->foreign('course_id', 'exam_subject_versions_course_id_fk')
                    ->references('id')
                    ->on('courses')
                    ->onDelete('cascade');
            }
        );

        $this->addForeignIfMissing(
            'exam_subject_versions',
            'exam_subject_versions_created_by_fk',
            function (Blueprint $table) {
                $table->foreign('created_by', 'exam_subject_versions_created_by_fk')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            }
        );
    }

    public function down()
    {
        $this->dropForeignIfExists('enrollment_requests', 'enrollment_requests_academic_year_id_fk');
        $this->dropForeignIfExists('enrollment_requests', 'enrollment_requests_enrollment_window_id_fk');
        $this->dropForeignIfExists('academic_paths', 'academic_paths_student_id_fk');
        $this->dropForeignIfExists('exam_subject_versions', 'exam_subject_versions_course_id_fk');
        $this->dropForeignIfExists('exam_subject_versions', 'exam_subject_versions_created_by_fk');
    }

    private function addForeignIfMissing(string $table, string $constraintName, \Closure $callback): void
    {
        if (!$this->foreignExists($table, $constraintName)) {
            Schema::table($table, $callback);
        }
    }

    private function dropForeignIfExists(string $table, string $constraintName): void
    {
        if ($this->foreignExists($table, $constraintName)) {
            Schema::table($table, function (Blueprint $blueprint) use ($constraintName) {
                $blueprint->dropForeign($constraintName);
            });
        }
    }

    private function foreignExists(string $table, string $constraintName): bool
    {
        $db = DB::getDatabaseName();
        $row = DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', $db)
            ->where('TABLE_NAME', $table)
            ->where('CONSTRAINT_NAME', $constraintName)
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->first();
        return $row !== null;
    }
}

