<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * La table roles n’a pas de contrainte unique sur name : des doublons peuvent exister.
 * Cette migration fusionne tout vers exactement 3 lignes : etudiant, enseignant, admin.
 */
class CleanupDuplicateRolesAndMergeLegacy extends Migration
{
    public function up(): void
    {
        $mergeRoleName = static function (string $canonicalName): ?int {
            $ids = DB::table('roles')->where('name', $canonicalName)->orderBy('id')->pluck('id')->all();
            if ($ids === []) {
                return null;
            }
            $primary = (int) $ids[0];
            foreach (array_slice($ids, 1) as $dupId) {
                $dupId = (int) $dupId;
                DB::table('users')->where('role_id', $dupId)->update(['role_id' => $primary]);
                DB::table('roles')->where('id', $dupId)->delete();
            }

            return $primary;
        };

        // Cibles (après fusion des doublons de même nom)
        $etudiantId = $mergeRoleName('etudiant');
        $enseignantId = $mergeRoleName('enseignant');
        $adminId = $mergeRoleName('admin');

        if (!$etudiantId || !$enseignantId || !$adminId) {
            return;
        }

        $reassignAndDeleteRoles = static function (int $targetId, array $sourceNames): void {
            $ids = DB::table('roles')->whereIn('name', $sourceNames)->pluck('id');
            foreach ($ids as $rid) {
                $rid = (int) $rid;
                if ($rid === $targetId) {
                    continue;
                }
                DB::table('users')->where('role_id', $rid)->update(['role_id' => $targetId]);
                DB::table('roles')->where('id', $rid)->delete();
            }
        };

        $reassignAndDeleteRoles($adminId, [
            'super_admin', 'admin_scolarite', 'administrator',
            'chef_departement', 'finance', 'support',
        ]);
        $reassignAndDeleteRoles($enseignantId, ['professor', 'professeur']);
        $reassignAndDeleteRoles($etudiantId, ['student', 'étudiant']);

        // Au cas où de nouveaux doublons auraient été créés entre-temps
        $mergeRoleName('etudiant');
        $mergeRoleName('enseignant');
        $mergeRoleName('admin');

        DB::table('roles')->whereNotIn('name', ['etudiant', 'enseignant', 'admin'])->delete();

        $now = now();
        DB::table('roles')->where('name', 'etudiant')->update([
            'display_name' => 'Étudiant',
            'updated_at' => $now,
        ]);
        DB::table('roles')->where('name', 'enseignant')->update([
            'display_name' => 'Enseignant',
            'updated_at' => $now,
        ]);
        DB::table('roles')->where('name', 'admin')->update([
            'display_name' => 'Administrateur',
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        // Irréversible sans sauvegarde des anciennes lignes.
    }
}
