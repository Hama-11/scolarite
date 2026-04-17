import { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE, roleLabel } from "../auth/roles";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Badge, Button, Spinner, Alert } from "../components/ui";
import {
  adminService,
  courseService,
  scheduleService,
  gradeService,
  announcementService,
  notificationService,
  statisticsService,
} from "../services/api";

export default function Dashboard() {
  const { user, loading: authLoading, canonicalRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [grades, setGrades] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const isStudentUser = canonicalRole === ROLE.ETUDIANT;
  const isProfessorUser = canonicalRole === ROLE.ENSEIGNANT;
  const isAdminUser = canonicalRole === ROLE.ADMIN;
  const roleKey = useMemo(
    () => (isAdminUser ? "admin" : isProfessorUser ? "professor" : "student"),
    [isAdminUser, isProfessorUser]
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const unreadRes = await notificationService.getUnreadCount();
        const unread = Number(unreadRes?.data?.unread_count ?? unreadRes?.data?.count ?? unreadRes?.data ?? 0);
        if (mounted) setUnreadNotifications(Number.isFinite(unread) ? unread : 0);

        if (roleKey === "admin") {
          const [adminStatsRes, dashRes, coursesRes, annRes] = await Promise.all([
            adminService.getDashboardStats(),
            statisticsService.getDashboard(),
            courseService.getAll({ per_page: 4 }),
            announcementService.getAll({ per_page: 3 }),
          ]);

          const dash = dashRes?.data;
          const adminStats = adminStatsRes?.data || {};
          const coursesPayload = coursesRes?.data;
          const coursesList = Array.isArray(coursesPayload) ? coursesPayload : coursesPayload?.data || [];
          const annPayload = annRes?.data;
          const annList = Array.isArray(annPayload) ? annPayload : annPayload?.data || [];

          if (!mounted) return;
          setStats({
            students: adminStats.students,
            professors: adminStats.professors,
            departments: adminStats.departments,
            programs: adminStats.programs,
            rooms: adminStats.rooms,
            pending_requests: dash?.stats?.pending_requests ?? 0,
          });
          setRecentActivity(dash?.recent_activity || []);
          setCourses(coursesList);
          setAnnouncements(annList);
          setSchedule([]);
          setGrades([]);
          return;
        }

        if (roleKey === "professor") {
          const [coursesRes, scheduleRes, annRes] = await Promise.all([
            courseService.getProfessorCourses(),
            scheduleService.getAll({ scope: "professor" }).catch(() => ({ data: [] })),
            announcementService.getAll({ per_page: 3 }),
          ]);
          const coursesList = Array.isArray(coursesRes?.data) ? coursesRes.data : coursesRes?.data?.data || [];
          const annPayload = annRes?.data;
          const annList = Array.isArray(annPayload) ? annPayload : annPayload?.data || [];
          const schedPayload = scheduleRes?.data;
          const schedList = Array.isArray(schedPayload) ? schedPayload : schedPayload?.data || [];
          if (!mounted) return;
          setStats({
            courses: coursesList.length,
            schedule: schedList.length,
          });
          setCourses(coursesList);
          setSchedule(schedList);
          setAnnouncements(annList);
          setGrades([]);
          setRecentActivity([]);
          return;
        }

        const [coursesRes, scheduleRes, gradesRes, annRes] = await Promise.all([
          courseService.getMyCourses(),
          scheduleService.getMySchedule(),
          gradeService.getMyGrades(),
          announcementService.getMyAnnouncements(),
        ]);
        const cList = Array.isArray(coursesRes?.data) ? coursesRes.data : coursesRes?.data?.data || [];
        const sList = Array.isArray(scheduleRes?.data) ? scheduleRes.data : scheduleRes?.data?.data || [];
        const rawG = gradesRes?.data;
        const gArr = Array.isArray(rawG?.data) ? rawG.data : Array.isArray(rawG) ? rawG : [];
        const aPayload = annRes?.data;
        const aList = Array.isArray(aPayload) ? aPayload : aPayload?.data || [];
        if (!mounted) return;
        setStats({
          courses: cList.length,
          schedule: sList.length,
          grades: gArr.length,
        });
        setCourses(cList);
        setSchedule(sList);
        setGrades(gArr);
        setAnnouncements(aList);
        setRecentActivity([]);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Erreur lors du chargement du dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user, roleKey]);

  if (authLoading || loading) {
    return (
      <AppLayout title="Tableau de bord">
        <div className="muted-center">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (isAdminUser) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AppLayout title="Tableau de bord">
      <div className="page-header">
        <h2>Tableau de bord</h2>
        <p>
          Bon retour, {user?.name?.split(" ")[0] || "Utilisateur"} — {roleLabel(canonicalRole || ROLE.ETUDIANT)}
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">
            Fermer
          </button>
        </Alert>
      )}

      <div className="stats-grid">
        {isAdminUser ? (
          <>
            <StatCard title="Étudiants" value={stats?.students} icon={<StudentIcon />} color="blue" />
            <StatCard title="Professeurs" value={stats?.professors} icon={<ProfessorIcon />} color="green" />
            <StatCard title="Départements" value={stats?.departments} icon={<CourseIcon />} color="purple" />
            <StatCard title="Demandes en attente" value={stats?.pending_requests} icon={<ReportIcon />} color="orange" />
          </>
        ) : isProfessorUser ? (
          <>
            <StatCard title="Mes cours" value={stats?.courses} icon={<CourseIcon />} color="blue" />
            <StatCard title="Emploi du temps" value={stats?.schedule} icon={<StudentIcon />} color="green" />
            <StatCard title="Notifications" value={unreadNotifications || 0} icon={<GradeIcon />} color="purple" />
            <StatCard title="Messages" value={0} icon={<BellIcon />} color="orange" />
          </>
        ) : (
          <>
            <StatCard title="Mes cours" value={stats?.courses} icon={<CourseIcon />} color="blue" />
            <StatCard title="Emploi du temps" value={stats?.schedule} icon={<ScheduleIcon />} color="green" />
            <StatCard title="Notes" value={stats?.grades} icon={<GradeIcon />} color="purple" />
            <StatCard title="Notifications" value={unreadNotifications || 0} icon={<BellIcon />} color="orange" />
          </>
        )}
      </div>

      <div className="grid-70-30">
        <div style={{ display: "grid", gap: 20 }}>
          <Card>
            <CardHeader
              title={isAdminUser ? "Tous les cours" : "Mes cours"}
              action={
                <Link to="/courses">
                  <Button variant="outline" size="sm">
                    Voir tout
                  </Button>
                </Link>
              }
            />
            {courses && courses.length > 0 ? (
              <div className="grid-auto">
                {courses.slice(0, 4).map((course) => (
                  <CourseCard key={course.id} course={course} isAdmin={isAdminUser} isProfessor={isProfessorUser} />
                ))}
              </div>
            ) : (
              <div className="muted-center">
                <div>Aucun cours disponible.</div>
                <div style={{ marginTop: 10 }}>
                  <Link to="/courses">Voir les cours</Link>
                </div>
              </div>
            )}
          </Card>

          {isAdminUser && (
            <>
              <Card>
                <CardHeader
                  title="Vue système"
                  action={
                    <Link to="/reports">
                      <Button variant="outline" size="sm">
                        Voir les rapports
                      </Button>
                    </Link>
                  }
                />
                <div className="grid-2" style={{ marginBottom: 0 }}>
                  <div>
                    <div className="item-title" style={{ fontSize: 14 }}>
                      Statistiques académiques
                    </div>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <div className="item-row">
                        <div className="item-subtitle" style={{ marginTop: 0 }}>
                          Total départements
                        </div>
                        <div style={{ fontWeight: 800 }}>{stats?.departments ?? 0}</div>
                      </div>
                      <div className="item-row">
                        <div className="item-subtitle" style={{ marginTop: 0 }}>
                          Programmes
                        </div>
                        <div style={{ fontWeight: 800 }}>{stats?.programs ?? 0}</div>
                      </div>
                      <div className="item-row">
                        <div className="item-subtitle" style={{ marginTop: 0 }}>
                          Étudiants
                        </div>
                        <div style={{ fontWeight: 800 }}>{stats?.students ?? 0}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="item-title" style={{ fontSize: 14 }}>
                      État du système
                    </div>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <div className="item-row">
                        <div className="item-subtitle" style={{ marginTop: 0 }}>
                          Santé système
                        </div>
                        <Badge variant="success">OK</Badge>
                      </div>
                      <div className="item-row">
                        <div className="item-subtitle" style={{ marginTop: 0 }}>
                          Demandes en attente
                        </div>
                        <div style={{ fontWeight: 800 }}>{stats?.pending_requests ?? 0}</div>
                      </div>
                      <div className="item-row">
                        <div className="item-subtitle" style={{ marginTop: 0 }}>
                          Personnel
                        </div>
                        <div style={{ fontWeight: 800 }}>{stats?.professors ?? 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Activité récente" />
                {recentActivity.length === 0 ? (
                  <div className="muted-center">Aucune activité récente.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recentActivity.slice(0, 5).map((a, idx) => (
                      <ActivityItem key={idx} color={a.color} title={a.text} time={a.time} icon={a.icon} />
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          <Card>
            <CardHeader
              title="Emploi du temps"
              action={
                <Link to="/schedule">
                  <Button variant="outline" size="sm">
                    Voir
                  </Button>
                </Link>
              }
            />
            {schedule && schedule.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {schedule.slice(0, 5).map((session) => (
                  <ScheduleItem key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="muted-center">Aucune séance planifiée.</div>
            )}
          </Card>

          {isStudentUser && (
            <Card>
              <CardHeader
                title="Notes"
                action={
                  <Link to="/grades">
                    <Button variant="outline" size="sm">
                      Voir tout
                    </Button>
                  </Link>
                }
              />
              {grades && grades.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {grades.slice(0, 5).map((grade) => (
                    <GradeItem key={grade.id} grade={grade} />
                  ))}
                </div>
              ) : (
                <div className="muted-center">Aucune note disponible.</div>
              )}
            </Card>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <Card>
            <CardHeader
              title="Annonces"
              action={
                <Link to="/announcements">
                  <Button variant="outline" size="sm">
                    Voir tout
                  </Button>
                </Link>
              }
            />
            {announcements && announcements.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {announcements.slice(0, 3).map((announcement) => (
                  <AnnouncementItem key={announcement.id} announcement={announcement} />
                ))}
              </div>
            ) : (
              <div className="muted-center">Aucune annonce pour le moment.</div>
            )}
          </Card>

          <Card>
            <CardHeader title="Liens rapides" />
            <div style={{ display: "grid", gap: 8 }}>
              <QuickLink to="/documents" icon={<DocumentIcon />} label="Documents" />
              <QuickLink to="/assignments" icon={<AssignmentIcon />} label="Devoirs" />
              <QuickLink to="/attendance" icon={<AttendanceIcon />} label="Absences" />
              <QuickLink to="/profile" icon={<ProfileIcon />} label="Mon profil" />
              {isStudentUser && (
                <>
                  <QuickLink to="/student-dossier" icon={<DocumentIcon />} label="Dossier scolaire" />
                  <QuickLink to="/tuitions" icon={<PaymentIcon />} label="Frais & paiements" />
                  <QuickLink to="/scholarships" icon={<ScholarshipIcon />} label="Bourses" />
                </>
              )}
              {isProfessorUser && (
                <>
                  <QuickLink to="/students" icon={<StudentIcon />} label="Mes étudiants" />
                  <QuickLink to="/grades" icon={<GradeIcon />} label="Notes" />
                </>
              )}
              {isAdminUser && (
                <>
                  <QuickLink to="/reports" icon={<ReportIcon />} label="Rapports" />
                  <QuickLink to="/settings" icon={<SettingsIcon />} label="Paramètres" />
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
      <div className="stat-value">{value || 0}</div>
      <div className="stat-label">{title}</div>
    </div>
  );
}

function CourseCard({ course, isAdmin = false, isProfessor = false }) {
  return (
    <div className="ui-card compact">
      <div className="item-row">
        <div>
          <div className="item-title" style={{ fontSize: 14 }}>
            {course.name || "Cours"}
          </div>
          <div className="item-subtitle" style={{ marginTop: 4 }}>
            {course.code || "-"}
          </div>
        </div>
      </div>
      {course.credits && (
        <div style={{ marginTop: 10 }}>
          <Badge variant="info">{course.credits} crédits</Badge>
        </div>
      )}
      {isAdmin && course.professor && (
        <div className="item-subtitle" style={{ marginTop: 8 }}>
          Professeur : {course.professor}
        </div>
      )}
      {(isAdmin || isProfessor) && course.students && (
        <div className="item-subtitle" style={{ marginTop: 6 }}>
          Étudiants : {course.students}
        </div>
      )}
    </div>
  );
}

function ScheduleItem({ session }) {
  return (
    <div className="ui-card compact">
      <div className="item-row">
        <div>
          <div className="item-title" style={{ fontSize: 14 }}>
            {session.course?.name || "Classe"}
          </div>
          <div className="item-subtitle" style={{ marginTop: 4 }}>
            {session.room?.name || "—"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 900 }}>
            {session.start_time ? String(session.start_time).substring(0, 5) : "-"}
          </div>
          <div className="item-subtitle" style={{ marginTop: 4 }}>
            {session.day_of_week || (session.date ? formatDate(session.date) : "-")}
          </div>
        </div>
      </div>
    </div>
  );
}

function GradeItem({ grade }) {
  const value = Number(grade.value ?? grade.grade ?? 0);
  const maxValue = Number(grade.max_value ?? grade.max_score ?? 100);
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  let variant = "error";
  if (percentage >= 90) variant = "success";
  else if (percentage >= 80) variant = "info";
  else if (percentage >= 70) variant = "warning";

  return (
    <div className="ui-card compact">
      <div className="item-row">
        <div>
          <div className="item-title" style={{ fontSize: 14 }}>
            {grade.course?.name || "Cours"}
          </div>
          <div className="item-subtitle" style={{ marginTop: 4 }}>
            {grade.type || "Évaluation"}
          </div>
        </div>
        <Badge variant={variant}>
          {value}/{maxValue}
        </Badge>
      </div>
    </div>
  );
}

function AnnouncementItem({ announcement }) {
  return (
    <div className="ui-card compact">
      <div className="item-title" style={{ fontSize: 14 }}>
        {announcement.title || "Annonce"}
      </div>
      <div className="item-subtitle" style={{ marginTop: 6 }}>
        {announcement.content || ""}
      </div>
      <div className="item-subtitle" style={{ marginTop: 10 }}>
        {formatDate(announcement.published_at || announcement.created_at)}
      </div>
    </div>
  );
}

function QuickLink({ to, icon, label }) {
  return (
    <Link to={to} className="ui-card compact" style={{ textDecoration: "none" }}>
      <div className="item-row" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>{icon}</span>
          <span style={{ fontWeight: 800, color: "var(--ui-text)" }}>{label}</span>
        </div>
        <span style={{ color: "var(--ui-muted)", fontWeight: 900 }}>›</span>
      </div>
    </Link>
  );
}

function ActivityItem({ color, title, time, icon }) {
  const dotBg =
    {
      blue: "#3b82f6",
      green: "#10b981",
      orange: "#f97316",
      purple: "#8b5cf6",
      pink: "#ec4899",
      teal: "#14b8a6",
    }[color] || "#3b82f6";

  return (
    <div className="ui-card compact">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: dotBg,
            marginTop: 6,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>
            {icon ? `${icon} ` : ""}
            {title}
          </div>
          <div className="item-subtitle" style={{ marginTop: 4 }}>
            {time}
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function ProfessorIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function GradeIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function AssignmentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function ScholarshipIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("fr-FR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
