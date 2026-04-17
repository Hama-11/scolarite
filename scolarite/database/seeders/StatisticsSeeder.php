<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Role;
use App\Models\User;
use App\Models\Professor;
use App\Models\Student;
use App\Models\Group;
use App\Models\TutoringSession;
use App\Models\Request as TutoringRequest;

class StatisticsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $studentRole = Role::where('name', 'etudiant')->first();
        $professorRole = Role::where('name', 'enseignant')->first();

        // Create professors if not exist
        $professors = Professor::count();
        if ($professors == 0) {
            // Create users and professors
            $profData = [
                ['name' => 'Dr. Amira Mansouri', 'email' => 'amira@univ.dz', 'specialite' => 'Mathématiques', 'grade' => 'Maître de conférences'],
                ['name' => 'Prof. Karim Boudiaf', 'email' => 'karim@univ.dz', 'specialite' => 'Informatique', 'grade' => 'Professeur'],
                ['name' => 'Dr. Nadia Cheniour', 'email' => 'nadia@univ.dz', 'specialite' => 'Physique', 'grade' => 'Maître de conférences'],
                ['name' => 'Prof. Leila Tahar', 'email' => 'leila@univ.dz', 'specialite' => 'Gestion', 'grade' => 'Professeur'],
                ['name' => 'Dr. Hassan Benali', 'email' => 'hassan@univ.dz', 'specialite' => 'Droit', 'grade' => 'Professeur'],
                ['name' => 'Prof. Fatma Ziani', 'email' => 'fatma.ziani@univ.dz', 'specialite' => 'Chimie', 'grade' => 'Professeur'],
                ['name' => 'Dr. Ali Berkane', 'email' => 'ali.berkane@univ.dz', 'specialite' => 'Biologie', 'grade' => 'Maître de conférences'],
                ['name' => 'Prof. Sarah Amir', 'email' => 'sarah.amir@univ.dz', 'specialite' => 'Économie', 'grade' => 'Professeur'],
            ];

            foreach ($profData as $p) {
                $user = User::create([
                    'name' => $p['name'],
                    'email' => $p['email'],
                    'password' => 'password',
                    'role_id' => $professorRole->id,
                ]);
                Professor::create([
                    'user_id' => $user->id,
                    'name' => $p['name'],
                    'specialite' => $p['specialite'],
                    'grade' => $p['grade'],
                ]);
            }
        }

        // Create students if not exist
        $students = Student::count();
        if ($students == 0) {
            $studentNames = [
                ['name' => 'Ahmed Boudiaf', 'email' => 'ahmed.boudiaf@univ.dz', 'matricule' => '2025-0001', 'classe' => 'L2 Informatique'],
                ['name' => 'Sara Chaoui', 'email' => 'sara.chaoui@univ.dz', 'matricule' => '2025-0002', 'classe' => 'L2 Informatique'],
                ['name' => 'Yacine Tebbal', 'email' => 'yacine.tebbal@univ.dz', 'matricule' => '2025-0003', 'classe' => 'L1 Sciences'],
                ['name' => 'Fatima Zohra', 'email' => 'fatima.zohra@univ.dz', 'matricule' => '2025-0004', 'classe' => 'L3 Mathématiques'],
                ['name' => 'Samir Belkadi', 'email' => 'samir.belkadi@univ.dz', 'matricule' => '2025-0005', 'classe' => 'L2 Gestion'],
                ['name' => 'Lina Amrani', 'email' => 'lina.amrani@univ.dz', 'matricule' => '2025-0006', 'classe' => 'L1 Droit'],
                ['name' => 'Mohamed Khelif', 'email' => 'mohamed.khelif@univ.dz', 'matricule' => '2025-0007', 'classe' => 'L2 Physique'],
                ['name' => 'Rania Djebbar', 'email' => 'rania.djebbar@univ.dz', 'matricule' => '2025-0008', 'classe' => 'L3 Chimie'],
                ['name' => 'Omar Hamadouche', 'email' => 'omar.hamadouche@univ.dz', 'matricule' => '2025-0009', 'classe' => 'L1 Biologie'],
                ['name' => 'Nadia Mehana', 'email' => 'nadia.mehana@univ.dz', 'matricule' => '2025-0010', 'classe' => 'L2 Économie'],
                ['name' => 'Karim Younes', 'email' => 'karim.younes@univ.dz', 'matricule' => '2025-0011', 'classe' => 'L3 Gestion'],
                ['name' => 'Malak Slamani', 'email' => 'malak.slamani@univ.dz', 'matricule' => '2025-0012', 'classe' => 'L1 Mathématiques'],
            ];

            foreach ($studentNames as $s) {
                $user = User::create([
                    'name' => $s['name'],
                    'email' => $s['email'],
                    'password' => 'password',
                    'role_id' => $studentRole->id,
                ]);
                Student::create([
                    'user_id' => $user->id,
                    'name' => $s['name'],
                    'matricule' => $s['matricule'],
                    'classe' => $s['classe'],
                ]);
            }
        }

        // Create groups
        $groups = Group::count();
        if ($groups == 0) {
            $professorIds = Professor::pluck('id')->toArray();
            
            $groupData = [
                ['name' => 'Mathématiques L1', 'departement' => 'Sciences', 'max_students' => 20, 'status' => 'active'],
                ['name' => 'Algorithmique', 'departement' => 'Informatique', 'max_students' => 20, 'status' => 'active'],
                ['name' => 'Physique Générale', 'departement' => 'Sciences', 'max_students' => 15, 'status' => 'active'],
                ['name' => 'Comptabilité L2', 'departement' => 'Gestion', 'max_students' => 18, 'status' => 'waiting'],
                ['name' => 'Droit Civil', 'departement' => 'Droit', 'max_students' => 15, 'status' => 'active'],
            ];

            foreach ($groupData as $i => $g) {
                Group::create([
                    'name' => $g['name'],
                    'departement' => $g['departement'],
                    'professor_id' => $professorIds[$i % count($professorIds)],
                    'max_students' => $g['max_students'],
                    'status' => $g['status'],
                ]);
            }
        }

        // Create sessions
        $sessions = TutoringSession::count();
        if ($sessions == 0) {
            $groupIds = Group::pluck('id')->toArray();
            $types = ['presential', 'online', 'mixed'];
            
            // Create sessions for the current year
            for ($month = 0; $month < 12; $month++) {
                $numSessions = rand(5, 10);
                for ($i = 0; $i < $numSessions; $i++) {
                    $date = now()->startOfYear()->addMonths($month)->addDays(rand(1, 28))->addHours(rand(8, 16));
                    TutoringSession::create([
                        'group_id' => $groupIds[array_rand($groupIds)],
                        'scheduled_at' => $date,
                        'duration' => 60,
                        'type' => $types[array_rand($types)],
                        'location' => 'Salle ' . rand(1, 10),
                        'status' => $date < now() ? 'completed' : 'scheduled',
                    ]);
                }
            }
        }

        // Create requests
        $requests = TutoringRequest::count();
        if ($requests == 0) {
            $studentIds = Student::pluck('id')->toArray();
            $groupIds = Group::pluck('id')->toArray();
            $statuses = ['pending', 'approved', 'rejected'];

            $requestData = [
                ['student_id' => 1, 'group_id' => 1, 'status' => 'pending'],
                ['student_id' => 2, 'group_id' => 2, 'status' => 'pending'],
                ['student_id' => 3, 'group_id' => 3, 'status' => 'pending'],
            ];

            foreach ($requestData as $r) {
                TutoringRequest::create($r);
            }
        }
    }
}
