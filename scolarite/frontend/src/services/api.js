import { api } from '../api/axios';

// Course API Service
export const courseService = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (courseId, data) => api.post(`/courses/${courseId}/enroll`, data),
  unenroll: (courseId, studentId) => api.delete(`/courses/${courseId}/enroll/${studentId}`),
  getStudents: (courseId) => api.get(`/courses/${courseId}/students`),
  getEnrollments: (courseId) => api.get(`/courses/${courseId}/enrollments`),
  getMyCourses: () => api.get('/my/courses'),
  getProfessorCourses: () => api.get('/professor/courses'),
};

// Schedule API Service
export const scheduleService = {
  getAll: (params) => api.get('/schedules', { params }),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
  getByRoom: (roomId) => api.get(`/schedules/room/${roomId}`),
  getByCourse: (courseId) => api.get(`/schedules/course/${courseId}`),
  getMySchedule: () => api.get('/my/schedule'),
};

// Grade API Service
export const gradeService = {
  getAll: (params) => api.get('/grades', { params }),
  getById: (id) => api.get(`/grades/${id}`),
  create: (data) => api.post('/grades', data),
  update: (id, data) => api.put(`/grades/${id}`, data),
  delete: (id) => api.delete(`/grades/${id}`),
  getByStudent: (studentId) => api.get(`/grades/student/${studentId}`),
  getByCourse: (courseId) => api.get(`/grades/course/${courseId}`),
  getStudentAverage: (studentId) => api.get(`/grades/average/${studentId}`),
  getMyGrades: () => api.get('/my/grades'),
  importCsv: (data) => api.post('/grades/import-csv', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Assignment API Service
export const assignmentService = {
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  getByCourse: (courseId) => api.get(`/assignments/course/${courseId}`),
  submit: (assignmentId, data) => api.post(`/assignments/${assignmentId}/submit`, data),
  getSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId, data) => api.put(`/assignments/submissions/${submissionId}/grade`, data),
  getMyAssignments: () => api.get('/my/assignments'),
};

// Document API Service
export const documentService = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  getByCourse: (courseId) => api.get(`/documents/course/${courseId}`),
  download: (documentId) => api.get(`/documents/download/${documentId}`, { responseType: 'blob' }),
  getMyDocuments: () => api.get('/my/documents'),
};

// Attendance API Service
export const attendanceService = {
  getAll: (params) => api.get('/attendances', { params }),
  getById: (id) => api.get(`/attendances/${id}`),
  create: (data) => api.post('/attendances', data),
  update: (id, data) => api.put(`/attendances/${id}`, data),
  delete: (id) => api.delete(`/attendances/${id}`),
  createBulk: (data) => api.post('/attendances/bulk', data),
  getBySchedule: (scheduleId, date) => api.get(`/attendances/schedule/${scheduleId}`, { params: { date } }),
  getStudentsBySchedule: (scheduleId) => api.get(`/attendances/schedule/${scheduleId}/students`),
  getMyAttendance: () => api.get('/my/attendance'),
};

// Message API Service
export const messageService = {
  getAll: (params) => api.get('/messages', { params }),
  getById: (id) => api.get(`/messages/${id}`),
  create: (data) => api.post('/messages', data),
  delete: (id) => api.delete(`/messages/${id}`),
  getConversation: (userId) => api.get(`/messages/conversation/${userId}`),
  getUnreadCount: () => api.get('/messages/unread'),
};

// Announcement API Service
export const announcementService = {
  getAll: (params) => api.get('/announcements', { params }),
  getById: (id) => api.get(`/announcements/${id}`),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  getByCourse: (courseId) => api.get(`/announcements/course/${courseId}`),
  getMyAnnouncements: () => api.get('/my/announcements'),
};

// Notification API Service
export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.put('/notifications/preferences', data),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Statistics API Service
export const statisticsService = {
  getDashboard: () => api.get('/statistics/dashboard'),
  getStats: () => api.get('/statistics/stats'),
  getSessionsByMonth: () => api.get('/statistics/sessions-by-month'),
  getSessionTypes: () => api.get('/statistics/session-types'),
  getRecentGroups: () => api.get('/statistics/recent-groups'),
  getPendingRequests: () => api.get('/statistics/pending-requests'),
  getRecentActivity: () => api.get('/statistics/recent-activity'),
  getDirectionDashboard: () => api.get('/statistics/direction-dashboard'),
  getQualityDashboard: () => api.get('/statistics/quality-dashboard'),
};

// Tuition API Service
export const tuitionService = {
  getAll: (params) => api.get('/tuitions', { params }),
  getById: (id) => api.get(`/tuitions/${id}`),
  create: (data) => api.post('/tuitions', data),
  update: (id, data) => api.put(`/tuitions/${id}`, data),
  delete: (id) => api.delete(`/tuitions/${id}`),
  getPayments: (tuitionId) => api.get(`/tuitions/${tuitionId}/payments`),
  getMyTuitions: () => api.get('/my/tuitions'),
};

// Payment API Service
export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  getReceipt: (paymentId) => api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' }),
  createCheckoutSession: (data) => api.post('/payments/checkout-session', data),
  getMyPayments: () => api.get('/my/payments'),
};

// Scholarship API Service
export const scholarshipService = {
  getAll: (params) => api.get('/scholarships', { params }),
  getById: (id) => api.get(`/scholarships/${id}`),
  create: (data) => api.post('/scholarships', data),
  update: (id, data) => api.put(`/scholarships/${id}`, data),
  delete: (id) => api.delete(`/scholarships/${id}`),
  getAvailable: () => api.get('/scholarships/available'),
  apply: (scholarshipId, data) => api.post(`/scholarships/${scholarshipId}/apply`, data),
  getApplications: (scholarshipId) => api.get(`/scholarships/${scholarshipId}/applications`),
  reviewApplication: (applicationId, data) => api.put(`/scholarship-applications/${applicationId}/review`, data),
  getMyApplications: () => api.get('/my/scholarships'),
};

// Admission API Service
export const admissionService = {
  getCampaigns: (params) => api.get('/admissions/campaigns', { params }),
  getCampaignById: (id) => api.get(`/admissions/campaigns/${id}`),
  createCampaign: (data) => api.post('/admissions/campaigns', data),
  updateCampaign: (id, data) => api.put(`/admissions/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/admissions/campaigns/${id}`),
  getActiveCampaigns: () => api.get('/admissions/campaigns/active'),
  apply: (campaignId, data) => api.post(`/admissions/apply/${campaignId}`, data),
  getMyApplications: () => api.get('/admissions/my-applications'),
  getAll: (params) => api.get('/admissions', { params }),
  getById: (id) => api.get(`/admissions/${id}`),
  review: (id, data) => api.put(`/admissions/${id}/review`, data),
  delete: (id) => api.delete(`/admissions/${id}`),
  getStatistics: (campaignId) => api.get(`/admissions/campaigns/${campaignId}/statistics`),
};

// Admin API Service
export const adminService = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  
  // Departments
  getDepartments: (params) => api.get('/departments', { params }),
  getDepartmentById: (id) => api.get(`/departments/${id}`),
  createDepartment: (data) => api.post('/departments', data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  
  // Programs
  getPrograms: (params) => api.get('/programs', { params }),
  getProgramById: (id) => api.get(`/programs/${id}`),
  createProgram: (data) => api.post('/programs', data),
  updateProgram: (id, data) => api.put(`/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/programs/${id}`),
  
  // Rooms
  getRooms: (params) => api.get('/rooms', { params }),
  getRoomById: (id) => api.get(`/rooms/${id}`),
  createRoom: (data) => api.post('/rooms', data),
  updateRoom: (id, data) => api.put(`/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/rooms/${id}`),
  
  // Academic Years
  getAcademicYears: (params) => api.get('/academic-years', { params }),
  getAcademicYearById: (id) => api.get(`/academic-years/${id}`),
  createAcademicYear: (data) => api.post('/academic-years', data),
  updateAcademicYear: (id, data) => api.put(`/academic-years/${id}`, data),
  deleteAcademicYear: (id) => api.delete(`/academic-years/${id}`),
  
  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

// Student Management API Service
export const studentManagementService = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  enrollInCourse: (studentId, data) => api.post(`/students/${studentId}/enroll`, data),
  assignToGroup: (studentId, groupId) => api.post(`/students/${studentId}/group`, { group_id: groupId }),
  getCourses: (studentId) => api.get(`/students/${studentId}/courses`),
  getGrades: (studentId) => api.get(`/students/${studentId}/grades`),
  getAttendance: (studentId) => api.get(`/students/${studentId}/attendance`),
  getSchedule: (studentId) => api.get(`/students/${studentId}/schedule`),
};

// Professor Management API Service
export const professorManagementService = {
  getAll: (params) => api.get('/professors', { params }),
  getById: (id) => api.get(`/professors/${id}`),
  create: (data) => api.post('/professors', data),
  update: (id, data) => api.put(`/professors/${id}`, data),
  delete: (id) => api.delete(`/professors/${id}`),
  assignCourse: (professorId, data) => api.post(`/professors/${professorId}/courses`, data),
  removeCourse: (professorId, courseId) => api.delete(`/professors/${professorId}/courses/${courseId}`),
  getSchedule: (professorId) => api.get(`/professors/${professorId}/schedule`),
  getStudents: (professorId) => api.get(`/professors/${professorId}/students`),
};

// Forum API Service
export const forumService = {
  getAll: (params) => api.get('/forums', { params }),
  getById: (id) => api.get(`/forums/${id}`),
  create: (data) => api.post('/forums', data),
  update: (id, data) => api.put(`/forums/${id}`, data),
  delete: (id) => api.delete(`/forums/${id}`),
  getMyForums: () => api.get('/forums/my'),
  getPosts: (forumId) => api.get(`/forums/${forumId}/posts`),
  createPost: (forumId, data) => api.post(`/forums/${forumId}/posts`, data),
  getPost: (postId) => api.get(`/forum-posts/${postId}`),
  updatePost: (postId, data) => api.put(`/forum-posts/${postId}`, data),
  deletePost: (postId) => api.delete(`/forum-posts/${postId}`),
};

// Profile API Service
export const profileService = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile/update', data),
  updatePassword: (data) => api.put('/profile/password', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getSettings: () => api.get('/profile/settings'),
  updateSettings: (data) => api.put('/profile/settings', data),
  deactivate: () => api.post('/profile/deactivate'),
};

// Academic Core v1 Service
export const academicCoreService = {
  getHierarchy: () => api.get('/v1/academic/hierarchy'),
  getFaculties: (params) => api.get('/v1/faculties', { params }),
  createFaculty: (data) => api.post('/v1/faculties', data),
  updateFaculty: (id, data) => api.put(`/v1/faculties/${id}`, data),
  getLevels: () => api.get('/v1/levels'),
  createLevel: (data) => api.post('/v1/levels', data),
  getSemesters: (params) => api.get('/v1/semesters', { params }),
  createSemester: (data) => api.post('/v1/semesters', data),
  getModules: (params) => api.get('/v1/modules', { params }),
  createModule: (data) => api.post('/v1/modules', data),
  updateModule: (id, data) => api.put(`/v1/modules/${id}`, data),
  autoAssignGroups: (data) => api.post('/v1/groups/auto-assign', data),
  detectScheduleConflicts: () => api.post('/v1/schedules/detect-conflicts'),
  exportIcs: (params) => api.get('/v1/schedules/export-ics', { params, responseType: 'blob' }),
  getExamSessions: (params) => api.get('/v1/exam-sessions', { params }),
  createExamSession: (data) => api.post('/v1/exam-sessions', data),
  allocateExam: (sessionId, data) => api.post(`/v1/exam-sessions/${sessionId}/allocations`, data),
  generateExamReport: (sessionId) => api.post(`/v1/exam-sessions/${sessionId}/report`),
};

/** Conception UML : cycle de vie étudiant, classes scolaires, demandes officielles, litiges */
export const studentLifecycleService = {
  get: () => api.get('/student/lifecycle'),
  updatePersonal: (data) => api.put('/student/lifecycle/personal', data),
  updateParents: (data) => api.put('/student/lifecycle/parents', data),
  uploadDocument: (formData) =>
    api.post('/student/lifecycle/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  submitValidation: () => api.post('/student/lifecycle/submit-validation'),
  getDocumentRequests: (params) => api.get('/student/document-requests', { params }),
  createDocumentRequest: (data) => api.post('/student/document-requests', data),
  getGradeDisputes: (params) => api.get('/student/grade-disputes', { params }),
  createGradeDispute: (data) => api.post('/student/grade-disputes', data),
};

export const adminLifecycleService = {
  getPendingStudents: (params) => api.get('/admin/lifecycle/pending-students', { params }),
  getStudent: (studentId) => api.get(`/admin/lifecycle/students/${studentId}`),
  reviewDocument: (studentId, data) =>
    api.post(`/admin/lifecycle/students/${studentId}/document-review`, data),
  reviewPersonnel: (studentId, data) =>
    api.post(`/admin/lifecycle/students/${studentId}/personnel-review`, data),
  acceptAll: (studentId) => api.post(`/admin/lifecycle/students/${studentId}/accept-all`),
  rejectProfile: (studentId, data) =>
    api.post(`/admin/lifecycle/students/${studentId}/reject-profile`, data),
  getOfficialDocumentRequests: (params) =>
    api.get('/admin/conception/document-requests', { params }),
  updateOfficialDocumentRequest: (id, data) =>
    api.patch(`/admin/conception/document-requests/${id}`, data),
  getGradeDisputes: (params) => api.get('/admin/conception/grade-disputes', { params }),
  resolveGradeDispute: (id, data) => api.patch(`/admin/conception/grade-disputes/${id}`, data),
};

export const schoolClassService = {
  getAll: (params) => api.get('/school-classes', { params }),
  getById: (id) => api.get(`/school-classes/${id}`),
  create: (data) => api.post('/school-classes', data),
  update: (id, data) => api.put(`/school-classes/${id}`, data),
  delete: (id) => api.delete(`/school-classes/${id}`),
  assignProfessor: (id, professorId) =>
    api.post(`/school-classes/${id}/professor`, { professor_id: professorId }),
  attachStudent: (id, studentId) =>
    api.post(`/school-classes/${id}/students`, { student_id: studentId }),
  detachStudent: (classId, studentId) =>
    api.delete(`/school-classes/${classId}/students/${studentId}`),
};

export const studentRegistryService = {
  getAll: (params) => api.get('/students', { params }),
};

export const professorSchoolService = {
  getMyClasses: () => api.get('/professor/school-classes'),
  getClassStudents: (classId, params) =>
    api.get(`/professor/school-classes/${classId}/students`, { params }),
};

export const professorRegistryService = {
  getAll: (params) => api.get('/professors', { params }),
};
