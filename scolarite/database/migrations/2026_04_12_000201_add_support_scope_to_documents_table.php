<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSupportScopeToDocumentsTable extends Migration
{
    public function up()
    {
        Schema::table('documents', function (Blueprint $table) {
            if (!Schema::hasColumn('documents', 'group_id')) {
                $table->unsignedBigInteger('group_id')->nullable()->after('course_id');
                $table->foreign('group_id')->references('id')->on('groups')->onDelete('set null');
            }
            if (!Schema::hasColumn('documents', 'schedule_id')) {
                $table->unsignedBigInteger('schedule_id')->nullable()->after('group_id');
                $table->foreign('schedule_id')->references('id')->on('schedules')->onDelete('set null');
            }
        });
    }

    public function down()
    {
        Schema::table('documents', function (Blueprint $table) {
            if (Schema::hasColumn('documents', 'schedule_id')) {
                $table->dropForeign(['schedule_id']);
                $table->dropColumn('schedule_id');
            }
            if (Schema::hasColumn('documents', 'group_id')) {
                $table->dropForeign(['group_id']);
                $table->dropColumn('group_id');
            }
        });
    }
}

