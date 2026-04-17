<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;

class AdminUpsertCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:upsert
                            {email : Admin email}
                            {password : Admin password}
                            {--name=Administrateur : Admin display name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create or update an administrator account';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $email = (string) $this->argument('email');
        $password = (string) $this->argument('password');
        $name = (string) $this->option('name');

        $role = Role::firstOrCreate(
            ['name' => 'admin'],
            ['display_name' => 'Administrateur']
        );

        $existing = User::where('email', $email)->first();
        $isNew = !$existing;

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => $password,
                'role_id' => $role->id,
                'email_verified_at' => now(),
                'verification_token' => null,
            ]
        );

        if ($isNew) {
            $this->info("Admin cree avec succes: {$user->email}");
        } else {
            $this->info("Admin mis a jour avec succes: {$user->email}");
        }

        return self::SUCCESS;
    }
}
