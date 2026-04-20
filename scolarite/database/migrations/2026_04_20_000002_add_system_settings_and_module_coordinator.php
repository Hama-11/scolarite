<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSystemSettingsAndModuleCoordinator extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('system_settings')) {
            Schema::create('system_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->json('value')->nullable();
                $table->timestamps();
            });
        }

        Schema::table('modules', function (Blueprint $table) {
            if (!Schema::hasColumn('modules', 'coordinator_professor_id')) {
                $table->unsignedBigInteger('coordinator_professor_id')->nullable()->after('semester_id');
                $table->foreign('coordinator_professor_id')
                    ->references('id')
                    ->on('professors')
                    ->onDelete('set null');
            }
        });
    }

    public function down()
    {
        Schema::table('modules', function (Blueprint $table) {
            if (Schema::hasColumn('modules', 'coordinator_professor_id')) {
                $table->dropForeign(['coordinator_professor_id']);
                $table->dropColumn('coordinator_professor_id');
            }
        });

        Schema::dropIfExists('system_settings');
    }
}

