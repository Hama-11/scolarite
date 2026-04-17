import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import RequireRole from "./routes/RequireRole";
import { ROLE } from "./auth/roles";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Groups = lazy(() => import("./pages/Groups"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Reports = lazy(() => import("./pages/Reports"));
const Requests = lazy(() => import("./pages/Requests"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Courses = lazy(() => import("./pages/Courses"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Grades = lazy(() => import("./pages/Grades"));
const Assignments = lazy(() => import("./pages/Assignments"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Documents = lazy(() => import("./pages/Documents"));
const Students = lazy(() => import("./pages/Students"));
const Messages = lazy(() => import("./pages/Messages"));
const Tuitions = lazy(() => import("./pages/Tuitions"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AcademicCore = lazy(() => import("./pages/AcademicCore"));
const StudentDossier = lazy(() => import("./pages/StudentDossier"));
const AdminStudentValidation = lazy(() => import("./pages/AdminStudentValidation"));
const AdminSchoolClasses = lazy(() => import("./pages/AdminSchoolClasses"));
const AdminOfficialRequests = lazy(() => import("./pages/AdminOfficialRequests"));
const AdminGradeDisputesPage = lazy(() => import("./pages/AdminGradeDisputesPage"));
const ProfessorSchoolClasses = lazy(() => import("./pages/ProfessorSchoolClasses"));
const StudentPathway = lazy(() => import("./pages/StudentPathway"));
const ProfessorRisk = lazy(() => import("./pages/ProfessorRisk"));
const ProfessorStudentRiskDetail = lazy(() => import("./pages/ProfessorStudentRiskDetail"));

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="spinner"></div>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Landing page */}
          <Route path="/" element={<Home />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute><Grades /></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/tuitions" element={<ProtectedRoute><Tuitions /></ProtectedRoute>} />
          <Route path="/scholarships" element={<ProtectedRoute><Scholarships /></ProtectedRoute>} />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ADMIN]}>
                  <Groups />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/academic-core" element={<ProtectedRoute><AdminRoute><AcademicCore /></AdminRoute></ProtectedRoute>} />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ADMIN]}>
                  <Sessions />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ADMIN]}>
                  <Reports />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ADMIN]}>
                  <Requests />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route
            path="/student-dossier"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ETUDIANT]}>
                  <StudentDossier />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/pathway"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ETUDIANT]}>
                  <StudentPathway />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor/school-classes"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ENSEIGNANT]}>
                  <ProfessorSchoolClasses />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor/risk"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ENSEIGNANT]}>
                  <ProfessorRisk />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor/risk/student/:studentId"
            element={
              <ProtectedRoute>
                <RequireRole allow={[ROLE.ENSEIGNANT]}>
                  <ProfessorStudentRiskDetail />
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/student-validation" element={<ProtectedRoute><AdminRoute><AdminStudentValidation /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/school-classes" element={<ProtectedRoute><AdminRoute><AdminSchoolClasses /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/official-requests" element={<ProtectedRoute><AdminRoute><AdminOfficialRequests /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/conception-grade-disputes" element={<ProtectedRoute><AdminRoute><AdminGradeDisputesPage /></AdminRoute></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
