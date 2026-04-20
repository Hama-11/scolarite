<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Get admin role
        $adminRole = DB::table('roles')->where('name', 'admin')->first();
        $directorRole = DB::table('roles')->where('name', 'directeur_etudes')->first();

        if (!$adminRole) {
            // Create admin role if it doesn't exist
            $adminRoleId = DB::table('roles')->insertGetId([
                'name' => 'admin',
                'display_name' => 'Administrateur',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $adminRoleId = $adminRole->id;
        }

        // Create default admin user if it doesn't exist
        $adminExists = DB::table('users')->where('email', 'admin@scolarite.com')->exists();

        if (!$adminExists) {
            DB::table('users')->insert([
                'name' => 'Administrateur',
                'email' => 'admin@scolarite.com',
                'password' => Hash::make('admin123'),
                'role_id' => $adminRoleId,
                'email_verified_at' => now(),
                'verification_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            echo "Default admin user created: admin@scolarite.com / admin123\n";
        } else {
            echo "Admin user already exists\n";
        }

        // Create default director of studies if it doesn't exist
        if ($directorRole) {
            $directorExists = DB::table('users')->where('email', 'director@scolarite.com')->exists();
            if (!$directorExists) {
                DB::table('users')->insert([
                    'name' => 'Directeur des études',
                    'email' => 'director@scolarite.com',
                    'password' => Hash::make('director123'),
                    'role_id' => $directorRole->id,
                    'email_verified_at' => now(),
                    'verification_token' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                echo "Default director user created: director@scolarite.com / director123\n";
            } else {
                echo "Director user already exists\n";
            }
        }
    }
}
