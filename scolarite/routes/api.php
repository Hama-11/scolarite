<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Controllers
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\TuitionController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ScholarshipController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ForumController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\ProfessorController;
use App\Http\Controllers\Api\AcademicCoreController;
use App\Http\Controllers\Api\StudentLifecycleController;
use App\Http\Controllers\Api\AdminLifecycleController;
use App\Http\Controllers\Api\SchoolClassController;

// ============================================
// Public Routes (Authentication)
// ============================================

Route::get('/roles', [AuthController::class, 'getRoles']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
Route::post('/verify-email-otp', [AuthController::class, 'verifyEmailOtp']);
Route::post('/resend-verification-otp', [AuthController::class, 'resendVerificationOtp']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/resend-otp', [AuthController::class, 'resendOtp']);

// Public Admission Routes
Route::get('/admissions/campaigns/active', [AdmissionController::class, 'activeCampaigns']);
Route::post('/admissions/apply/{campaign}', [AdmissionController::class, 'apply']);
Route::get('/admissions/my-applications', [AdmissionController::class, 'myApplications']);

// Public Scholarship Routes
Route::get('/scholarships/available', [ScholarshipController::class, 'availableScholarships']);

// ============================================
// Shared authenticated routes (tous rôles : session, profil, stats tableau de bord)
// IMPORTANT : ne pas restreindre /me ni /profile aux seuls étudiants (sinon 403 pour enseignants/admins).
// ============================================

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile/update', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::get('/profile/settings', [ProfileController::class, 'getSettings']);
    Route::put('/profile/settings', [ProfileController::class, 'updateSettings']);
    Route::post('/profile/deactivate', [ProfileController::class, 'deactivate']);

    Route::get('/statistics/dashboard', [StatisticsController::class, 'getDashboard']);
    Route::get('/statistics/stats', [StatisticsController::class, 'getStats']);
    Route::get('/statistics/sessions-by-month', [StatisticsController::class, 'getSessionsByMonth']);
    Route::get('/statistics/session-types', [StatisticsController::class, 'getSessionTypes']);
    Route::get('/statistics/recent-groups', [StatisticsController::class, 'getRecentGroups']);
    Route::get('/statistics/pending-requests', [StatisticsController::class, 'getPendingRequests']);
    Route::get('/statistics/recent-activity', [StatisticsController::class, 'getRecentActivity']);
    Route::get('/statistics/direction-dashboard', [StatisticsController::class, 'getDirectionDashboard'])->middleware('permission:bi.read');
    Route::get('/statistics/quality-dashboard', [StatisticsController::class, 'getQualityDashboard'])->middleware('permission:bi.read');
});

// ============================================
// Student Routes
// ============================================

Route::middleware(['auth:sanctum', 'role:etudiant'])->group(function () {
    // Student Dashboard Data
    Route::get('/student/dashboard', [StudentController::class, 'dashboard']);
    
    // My Academic Data
    Route::get('/my/courses', [CourseController::class, 'myCourses']);
    Route::get('/my/schedule', [ScheduleController::class, 'mySchedule']);
    Route::get('/my/grades', [GradeController::class, 'myGrades']);
    Route::get('/my/assignments', [AssignmentController::class, 'myAssignments']);
    Route::get('/my/attendance', [AttendanceController::class, 'myAttendance']);
    Route::get('/my/documents', [DocumentController::class, 'myDocuments']);
    Route::get('/my/announcements', [AnnouncementController::class, 'myAnnouncements']);
    
    // My Financial Data
    Route::get('/my/tuitions', [TuitionController::class, 'myTuitions']);
    Route::get('/my/payments', [PaymentController::class, 'myPayments']);
    
    // My Scholarships
    Route::get('/my/scholarships', [ScholarshipController::class, 'myApplications']);
    
    // Apply for Scholarship
    Route::post('/scholarships/{scholarship}/apply', [ScholarshipController::class, 'apply']);

    // Conception : cycle de vie étudiant (profil, parents, pièces, demandes administratives, contestations)
    Route::get('/student/lifecycle', [StudentLifecycleController::class, 'show']);
    Route::put('/student/lifecycle/personal', [StudentLifecycleController::class, 'updatePersonal']);
    Route::put('/student/lifecycle/parents', [StudentLifecycleController::class, 'updateParents']);
    Route::post('/student/lifecycle/documents', [StudentLifecycleController::class, 'uploadDocument']);
    Route::post('/student/lifecycle/submit-validation', [StudentLifecycleController::class, 'submitValidation']);
    Route::get('/student/document-requests', [StudentLifecycleController::class, 'myDocumentRequests']);
    Route::post('/student/document-requests', [StudentLifecycleController::class, 'storeDocumentRequest']);
    Route::get('/student/grade-disputes', [StudentLifecycleController::class, 'myGradeDisputes']);
    Route::post('/student/grade-disputes', [StudentLifecycleController::class, 'storeGradeDispute']);
});

// ============================================
// Professor/Teacher Routes
// ============================================

Route::middleware(['auth:sanctum', 'role:enseignant,admin'])->group(function () {
    // Professor Courses
    Route::get('/professor/courses', [CourseController::class, 'professorCourses']);
    Route::get('/professor/students', [ProfessorController::class, 'getStudents']);
    Route::get('/professor/schedule', [ProfessorController::class, 'getSchedule']);
    Route::get('/professor/school-classes', [SchoolClassController::class, 'professorMyClasses']);
    Route::get('/professor/school-classes/{school_class}/students', [SchoolClassController::class, 'professorClassStudents']);
});

// ============================================
// Course Management Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:schedules.read'])->group(function () {
    // Courses
    Route::apiResource('courses', CourseController::class);
    Route::post('/courses/{course}/enroll', [CourseController::class, 'enroll']);
    Route::delete('/courses/{course}/enroll/{student}', [CourseController::class, 'unenroll']);
    Route::get('/courses/{course}/students', [CourseController::class, 'students']);
    Route::get('/courses/{course}/enrollments', [CourseController::class, 'enrollments']);
});

// ============================================
// Schedule Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:schedules.read'])->group(function () {
    Route::apiResource('schedules', ScheduleController::class);
    Route::get('/schedules/room/{room}', [ScheduleController::class, 'byRoom']);
    Route::get('/schedules/course/{course}', [ScheduleController::class, 'byCourse']);
});

// ============================================
// Grade Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:grades.read'])->group(function () {
    Route::apiResource('grades', GradeController::class);
    Route::post('/grades/import-csv', [GradeController::class, 'importCsv'])->middleware('permission:grades.create');
    Route::get('/grades/student/{student}', [GradeController::class, 'byStudent']);
    Route::get('/grades/course/{course}', [GradeController::class, 'byCourse']);
    Route::get('/grades/average/{student}', [GradeController::class, 'studentAverage']);
});

// ============================================
// Assignment Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:assignments.read'])->group(function () {
    Route::apiResource('assignments', AssignmentController::class);
    Route::get('/assignments/course/{course}', [AssignmentController::class, 'byCourse']);
    Route::post('/assignments/{assignment}/submit', [AssignmentController::class, 'submit']);
    Route::get('/assignments/{assignment}/submissions', [AssignmentController::class, 'submissions']);
    Route::put('/assignments/submissions/{submission}/grade', [AssignmentController::class, 'gradeSubmission']);
});

// ============================================
// Document Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:documents.read'])->group(function () {
    Route::apiResource('documents', DocumentController::class);
    Route::get('/documents/course/{course}', [DocumentController::class, 'byCourse']);
    Route::get('/documents/download/{document}', [DocumentController::class, 'download']);
});

// ============================================
// Attendance Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:attendance.read'])->group(function () {
    Route::apiResource('attendances', AttendanceController::class);
    Route::post('/attendances/bulk', [AttendanceController::class, 'storeBulk']);
    Route::get('/attendances/schedule/{schedule}', [AttendanceController::class, 'scheduleAttendance']);
    Route::get('/attendances/schedule/{schedule}/students', [AttendanceController::class, 'scheduleStudents']);
});

// ============================================
// Message Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:messages.read'])->group(function () {
    Route::apiResource('messages', MessageController::class);
    Route::get('/messages/conversation/{userId}', [MessageController::class, 'conversation']);
    Route::get('/messages/course/{course}', [MessageController::class, 'courseThread']);
    Route::get('/messages/unread', [MessageController::class, 'unreadCount']);
    Route::post('/messages/course/{course}', [MessageController::class, 'postCourseMessage'])->middleware('permission:messages.create');
});

// ============================================
// Announcement Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:announcements.read'])->group(function () {
    Route::apiResource('announcements', AnnouncementController::class);
    Route::get('/announcements/course/{course}', [AnnouncementController::class, 'index']);
});

// ============================================
// Notification Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:notifications.read'])->group(function () {
    Route::get('/notifications/preferences', [NotificationController::class, 'preferences']);
    Route::put('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
    // Routes littérales AVANT apiResource, sinon {notification} capture "unread-count", "read-all", etc.
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::apiResource('notifications', NotificationController::class)->only(['index', 'show', 'destroy']);
});

// ============================================
// Financial Routes
// ============================================

Route::middleware(['auth:sanctum', 'permission:payments.read'])->group(function () {
    // Tuitions
    Route::apiResource('tuitions', TuitionController::class);
    Route::get('/tuitions/{tuition}/payments', [TuitionController::class, 'getPaymentHistory']);
    
    // Payments
    Route::apiResource('payments', PaymentController::class);
    Route::get('/payments/{payment}/receipt', [PaymentController::class, 'generateReceipt']);
    Route::post('/payments/checkout-session', [PaymentController::class, 'createCheckoutSession'])->middleware('permission:payments.create');
});

Route::get('/payments/{payment}/verify', [PaymentController::class, 'verifyReceipt']);

// ============================================
// Scholarship Routes
// ============================================

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('scholarships', ScholarshipController::class);
    Route::get('/scholarships/{scholarship}/applications', [ScholarshipController::class, 'applications']);
    Route::put('/scholarship-applications/{application}/review', [ScholarshipController::class, 'reviewApplication']);
});

// ============================================
// Admission Routes
// ============================================

Route::middleware(['auth:sanctum', 'role:admin,enseignant'])->group(function () {
    // Campaigns
    Route::apiResource('admissions/campaigns', AdmissionController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    Route::get('/admissions/campaigns/{campaign}/statistics', [AdmissionController::class, 'statistics']);
    
    // Applications
    Route::apiResource('admissions', AdmissionController::class)->only(['index', 'show', 'update', 'destroy']);
    Route::put('/admissions/{admission}/review', [AdmissionController::class, 'reviewAdmission']);
});

// ============================================
// Forum Routes
// ============================================

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('forums', ForumController::class);
    Route::get('/forums/my', [ForumController::class, 'myForums']);
    Route::get('/forums/{forum}/posts', [ForumController::class, 'posts']);
    Route::post('/forums/{forum}/posts', [ForumController::class, 'createPost']);
    Route::get('/forum-posts/{post}', [ForumController::class, 'showPost']);
    Route::put('/forum-posts/{post}', [ForumController::class, 'updatePost']);
    Route::delete('/forum-posts/{post}', [ForumController::class, 'deletePost']);
});

// ============================================
// Admin Routes
// ============================================

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    // Dashboard
    Route::get('/admin/dashboard', [AdminController::class, 'dashboardStats']);
    
    // Departments
    Route::apiResource('departments', AdminController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    
    // Programs
    Route::apiResource('programs', AdminController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    
    // Rooms
    Route::apiResource('rooms', AdminController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    
    // Academic Years
    Route::apiResource('academic-years', AdminController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    
    // Users
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::put('/admin/users/{user}', [AdminController::class, 'updateUser']);
    Route::delete('/admin/users/{user}', [AdminController::class, 'destroyUser']);

    // Conception : classes scolaires (CRUD, affectation prof / étudiants)
    Route::apiResource('school-classes', SchoolClassController::class);
    Route::post('/school-classes/{school_class}/professor', [SchoolClassController::class, 'assignProfessor']);
    Route::post('/school-classes/{school_class}/students', [SchoolClassController::class, 'attachStudent']);
    Route::delete('/school-classes/{school_class}/students/{student}', [SchoolClassController::class, 'detachStudent']);

    // Conception : validation dossier, demandes de documents, litiges de notes (rôle admin = directeur fusionné)
    Route::get('/admin/lifecycle/pending-students', [AdminLifecycleController::class, 'pendingReview']);
    Route::get('/admin/lifecycle/students/{student}', [AdminLifecycleController::class, 'showStudent']);
    Route::post('/admin/lifecycle/students/{student}/document-review', [AdminLifecycleController::class, 'reviewDocumentSlot']);
    Route::post('/admin/lifecycle/students/{student}/personnel-review', [AdminLifecycleController::class, 'reviewPersonnel']);
    Route::post('/admin/lifecycle/students/{student}/accept-all', [AdminLifecycleController::class, 'acceptAllDocuments']);
    Route::post('/admin/lifecycle/students/{student}/reject-profile', [AdminLifecycleController::class, 'rejectProfile']);
    Route::get('/admin/conception/document-requests', [AdminLifecycleController::class, 'documentRequestsIndex']);
    Route::patch('/admin/conception/document-requests/{studentDocumentRequest}', [AdminLifecycleController::class, 'updateDocumentRequest']);
    Route::get('/admin/conception/grade-disputes', [AdminLifecycleController::class, 'gradeDisputesIndex']);
    Route::patch('/admin/conception/grade-disputes/{gradeDispute}', [AdminLifecycleController::class, 'resolveGradeDispute']);
});

// ============================================
// Student Management Routes (Admin/Professor)
// ============================================

Route::middleware(['auth:sanctum', 'role:admin,enseignant'])->group(function () {
    Route::apiResource('students', StudentController::class);
    Route::post('/students/{student}/enroll', [StudentController::class, 'enrollInCourse']);
    Route::post('/students/{student}/group', [StudentController::class, 'assignToGroup']);
    Route::get('/students/{student}/courses', [StudentController::class, 'getCourses']);
    Route::get('/students/{student}/grades', [StudentController::class, 'getGrades']);
    Route::get('/students/{student}/attendance', [StudentController::class, 'getAttendance']);
    Route::get('/students/{student}/schedule', [StudentController::class, 'getSchedule']);
});

// ============================================
// Professor Management Routes (Admin)
// ============================================

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('professors', ProfessorController::class);
    Route::post('/professors/{professor}/courses', [ProfessorController::class, 'assignCourse']);
    Route::delete('/professors/{professor}/courses/{course}', [ProfessorController::class, 'removeCourse']);
});

// ============================================
// Groups Routes
// ============================================

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/groups', [StatisticsController::class, 'getGroups']);
    Route::post('/groups', [StatisticsController::class, 'createGroup']);
});

// ============================================
// Requests Routes
// ============================================

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/requests', [StatisticsController::class, 'getAllRequests']);
    Route::put('/requests/{id}', [StatisticsController::class, 'updateRequestStatus']);
});

// ============================================
// Sessions Routes
// ============================================

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/sessions', [StatisticsController::class, 'getAllSessions']);
});

// ============================================
// Academic Core v1 (Phase 1)
// ============================================
Route::prefix('v1')->middleware(['auth:sanctum', 'permission:catalog.read'])->group(function () {
    Route::get('/academic/hierarchy', [AcademicCoreController::class, 'hierarchy']);

    Route::get('/faculties', [AcademicCoreController::class, 'faculties']);
    Route::post('/faculties', [AcademicCoreController::class, 'faculties'])->middleware('permission:catalog.create');
    Route::put('/faculties/{faculty}', [AcademicCoreController::class, 'updateFaculty'])->middleware('permission:catalog.update');

    Route::get('/levels', [AcademicCoreController::class, 'levels']);
    Route::post('/levels', [AcademicCoreController::class, 'levels'])->middleware('permission:catalog.create');
    Route::get('/semesters', [AcademicCoreController::class, 'semesters']);
    Route::post('/semesters', [AcademicCoreController::class, 'semesters'])->middleware('permission:catalog.create');

    Route::get('/modules', [AcademicCoreController::class, 'modules']);
    Route::post('/modules', [AcademicCoreController::class, 'modules'])->middleware('permission:catalog.create');
    Route::put('/modules/{module}', [AcademicCoreController::class, 'updateModule'])->middleware('permission:catalog.update');

    Route::post('/groups/auto-assign', [AcademicCoreController::class, 'autoGenerateGroupAssignments'])->middleware('permission:groups.assign');
    Route::post('/schedules/detect-conflicts', [AcademicCoreController::class, 'detectScheduleConflicts'])->middleware('permission:schedules.update');
    Route::get('/schedules/export-ics', [AcademicCoreController::class, 'exportScheduleIcs'])->middleware('permission:schedules.export_ics');

    Route::get('/exam-sessions', [AcademicCoreController::class, 'examSessions'])->middleware('permission:exams.read');
    Route::post('/exam-sessions', [AcademicCoreController::class, 'examSessions'])->middleware('permission:exams.create');
    Route::post('/exam-sessions/{examSession}/allocations', [AcademicCoreController::class, 'allocateExam'])->middleware('permission:exams.update');
    Route::post('/exam-sessions/{examSession}/report', [AcademicCoreController::class, 'generateExamReport'])->middleware('permission:exams.generate_reports');
});
