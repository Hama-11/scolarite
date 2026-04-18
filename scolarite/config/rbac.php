<?php

return [
    'roles' => [
        'etudiant',
        'enseignant',
        'admin',
    ],

    'aliases' => [
        // Compatibilité : noms hérités / francisés / RBAC étendu → 3 rôles canoniques (etudiant, enseignant, admin).
        'student' => 'etudiant',
        'professor' => 'enseignant',
        'professeur' => 'enseignant',
        'étudiant' => 'etudiant',
        'administrator' => 'admin',
        'super_admin' => 'admin',
        'admin_scolarite' => 'admin',
        'adminscolarite' => 'admin',
        'chef_departement' => 'admin',
        'chefdepartement' => 'admin',
        'finance' => 'admin',
        'support' => 'admin',
    ],

    'permissions' => [
        'catalog' => ['read', 'create', 'update', 'delete'],
        'groups' => ['read', 'create', 'update', 'delete', 'assign'],
        'schedules' => ['read', 'create', 'update', 'delete', 'publish', 'export_ics'],
        'exams' => ['read', 'create', 'update', 'delete', 'publish', 'generate_reports'],
        'grades' => ['read', 'create', 'update', 'validate', 'publish'],
        'assignments' => ['read', 'create', 'update', 'delete', 'grade', 'submit'],
        'attendance' => ['read', 'create', 'update'],
        'requests' => ['read', 'create', 'update', 'approve', 'reject', 'archive'],
        'payments' => ['read', 'create', 'update', 'reconcile', 'receipt'],
        'documents' => ['read', 'create', 'update', 'delete', 'download'],
        'announcements' => ['read', 'create', 'update', 'delete'],
        'messages' => ['read', 'create'],
        'notifications' => ['read', 'create', 'update_preferences'],
        'users' => ['read', 'create', 'update', 'delete'],
        'audit' => ['read', 'export'],
        'bi' => ['read', 'export'],
    ],

    'matrix' => [
        'admin' => ['*'],
        'enseignant' => [
            'catalog.read', 'groups.read',
            'schedules.read', 'schedules.export_ics',
            'exams.read',
            'grades.read', 'grades.create', 'grades.update',
            'assignments.read', 'assignments.create', 'assignments.update', 'assignments.grade',
            'attendance.read', 'attendance.create', 'attendance.update',
            'documents.read', 'documents.create', 'documents.update',
            'announcements.read', 'announcements.create', 'announcements.update',
            'messages.read', 'messages.create',
            'notifications.read',
            'requests.read',
        ],
        'etudiant' => [
            'catalog.read', 'groups.read',
            'schedules.read', 'schedules.export_ics',
            'grades.read', 'attendance.read',
            'assignments.read', 'assignments.submit',
            'requests.read', 'requests.create',
            'payments.read', 'payments.create', 'documents.read', 'documents.download',
            'announcements.read', 'messages.read', 'messages.create',
            'notifications.read', 'notifications.update_preferences',
        ],
    ],
];
