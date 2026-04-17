<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class SimplifyRolesToStudentProfessorAdmin extends Migration
{
    private const KEEP = ['etudiant', 'enseignant', 'admin'];

    /**
     * Réduit les rôles à etudiant / enseignant / admin et réassigne les utilisateurs.
     */
    public function up(): void
    {
        $now = now();

        foreach ([
            ['etudiant', 'Étudiant'],
            ['enseignant', 'Enseignant'],
            ['admin', 'Administrateur'],
        ] as [$name, $display]) {
            $exists = DB::table('roles')->where('name', $name)->first();
            if ($exists) {
                DB::table('roles')->where('name', $name)->update([
                    'display_name' => $display,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('roles')->insert([
                    'name' => $name,
                    'display_name' => $display,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        $adminId = DB::table('roles')->where('name', 'admin')->value('id');
        $etudiantId = DB::table('roles')->where('name', 'etudiant')->value('id');
        $enseignantId = DB::table('roles')->where('name', 'enseignant')->value('id');

        if ($adminId) {
            $mergeToAdmin = [
                'super_admin', 'admin_scolarite', 'administrator',
                'chef_departement', 'finance', 'support',
            ];
            foreach ($mergeToAdmin as $oldName) {
                $oid = DB::table('roles')->where('name', $oldName)->value('id');
                if ($oid) {
                    DB::table('users')->where('role_id', $oid)->update(['role_id' => $adminId]);
                }
            }
        }

        if ($etudiantId) {
            $sid = DB::table('roles')->where('name', 'student')->value('id');
            if ($sid) {
                DB::table('users')->where('role_id', $sid)->update(['role_id' => $etudiantId]);
            }
        }

        if ($enseignantId) {
            $pid = DB::table('roles')->where('name', 'professor')->value('id');
            if ($pid) {
                DB::table('users')->where('role_id', $pid)->update(['role_id' => $enseignantId]);
            }
        }

        DB::table('roles')->whereNotIn('name', self::KEEP)->delete();
    }

    public function down(): void
    {
        // Non réversible sans réintroduire les anciens rôles.
    }
}
