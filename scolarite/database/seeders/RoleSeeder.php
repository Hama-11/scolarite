<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Trois rôles uniquement : étudiant, enseignant, administrateur (créé par seeder, pas par inscription).
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'etudiant', 'display_name' => 'Étudiant'],
            ['name' => 'enseignant', 'display_name' => 'Enseignant'],
            ['name' => 'admin', 'display_name' => 'Administrateur'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['name' => $role['name']],
                ['display_name' => $role['display_name']]
            );
        }
    }
}
