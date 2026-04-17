<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ExtendRequestsStatusEnum extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('requests')) {
            return;
        }

        DB::statement("ALTER TABLE requests MODIFY status ENUM('draft','submitted','in_review','approved','rejected','archived','pending') NOT NULL DEFAULT 'pending'");
    }

    public function down()
    {
        if (!Schema::hasTable('requests')) {
            return;
        }

        DB::statement("ALTER TABLE requests MODIFY status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'");
    }
}
