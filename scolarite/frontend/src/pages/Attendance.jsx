import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, Badge, Spinner, Alert, Button, Modal, Select, Input, Textarea } from '../components/ui';
import { attendanceService, studentManagementService, courseService, scheduleService } from '../services/api';
import '../components/dashboard.css';

export default function Attendance() {
  const { isAdmin, isProfessor } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [bulkStatuses, setBulkStatuses] = useState({});
  const [formData, setFormData] = useState({
    schedule_id: '',
    student_id: '',
    course_id: '',
    date: '',
    status: 'present',
    notes: '',
  });
  const canManage = isAdmin() || isProfessor();

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const response = canManage
        ? await attendanceService.getAll({ per_page: 100 })
        : await attendanceService.getMyAttendance();
      const data = canManage ? (response.data?.data || []) : (response.data.attendances || []);
      setAttendances(data);
      
      if (canManage) {
        const present = data.filter((a) => a.status === 'present').length;
        const absent = data.filter((a) => a.status === 'absent').length;
        setStats({
          present,
          absent,
          total: data.length,
          rate: data.length ? ((present / data.length) * 100) : 0,
        });
      } else {
        const stats = response.data.statistics || {};
        setStats({
          present: stats.present || 0,
          absent: stats.absent || 0,
          total: stats.total || 0,
          rate: stats.attendance_rate || 0
        });
      }
    } catch (err) {
      console.error("Erreur chargement absences:", err);
      setError("Impossible de charger les absences");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  const fetchStudents = useCallback(async () => {
    try {
      const response = await studentManagementService.getAll({ per_page: 200 });
      const payload = response.data;
      setStudents(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch {
      setStudents([]);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const response = await courseService.getAll({ per_page: 200 });
      const payload = response.data;
      setCourses(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch {
      setCourses([]);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await scheduleService.getAll({ per_page: 200 });
      const payload = response.data;
      setSchedules(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch {
      setSchedules([]);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    if (canManage) {
      fetchStudents();
      fetchCourses();
      fetchSchedules();
    }
  }, [fetchAttendance, fetchStudents, fetchCourses, fetchSchedules, canManage]);

  useEffect(() => {
    async function loadStudentsFromSession() {
      if (!formData.schedule_id) {
        setSessionStudents([]);
        setBulkStatuses({});
        return;
      }
      try {
        const res = await attendanceService.getStudentsBySchedule(formData.schedule_id);
        const list = res?.data?.data || [];
        setSessionStudents(list);
        const defaults = {};
        list.forEach((s) => { defaults[s.id] = 'present'; });
        setBulkStatuses(defaults);
      } catch {
        setSessionStudents([]);
        setBulkStatuses({});
      }
    }
    loadStudentsFromSession();
  }, [formData.schedule_id]);

  const handleCreateAttendance = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      if (formData.schedule_id && sessionStudents.length > 0) {
        const attendances = sessionStudents.map((student) => ({
          student_id: student.id,
          status: bulkStatuses[student.id] || 'present',
          notes: '',
        }));
        await attendanceService.createBulk({
          schedule_id: Number(formData.schedule_id),
          date: formData.date,
          attendances,
        });
      } else {
        await attendanceService.create({
          student_id: Number(formData.student_id),
          course_id: Number(formData.course_id),
          date: formData.date,
          status: formData.status,
          notes: formData.notes,
        });
      }
      setShowModal(false);
      setFormData({ schedule_id: '', student_id: '', course_id: '', date: '', status: 'present', notes: '' });
      setSessionStudents([]);
      setBulkStatuses({});
      fetchAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de l enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <AppLayout title="Absences">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Absences">
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>Absences</h2>
            <p>{canManage ? "Gérer les absences des étudiants." : "Suivez votre présence aux séances."}</p>
          </div>
          {canManage && <Button onClick={() => setShowModal(true)}>Ajouter absence</Button>}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.present}</div>
          <div className="stat-label">Présences</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.absent}</div>
          <div className="stat-label">Absences</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total séances</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.total > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
            {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
          </div>
          <div className="stat-label">Taux de présence</div>
        </div>
      </div>

      {attendances.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune absence enregistrée pour le moment.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Cours</th>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Étudiant</th>
                <th style={{ textAlign: 'center', padding: '12px 8px' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((attendance) => (
                <tr key={attendance.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 8px' }}>{formatDate(attendance.date || attendance.created_at)}</td>
                  <td style={{ padding: '12px 8px' }}>{attendance.course?.name || '-'}</td>
                  <td style={{ padding: '12px 8px' }}>{attendance.student?.user?.name || '-'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <Badge variant={attendance.status === 'present' ? 'green' : 'red'}>
                      {attendance.status === 'present' ? 'Présent' : 'Absent'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Ajouter présence/absence">
        <form onSubmit={handleCreateAttendance}>
          <div className="space-y-4">
            <Select
              label="Seance (optionnel)"
              value={formData.schedule_id}
              onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value, course_id: '' })}
            >
              <option value="">Selectionner une seance</option>
              {schedules.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.course?.name || 'Cours'} - {session.day_of_week} {session.start_time?.slice(0, 5)}-{session.end_time?.slice(0, 5)}
                </option>
              ))}
            </Select>

            {formData.schedule_id && sessionStudents.length > 0 ? (
              <div className="ui-card compact">
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Etudiants de la seance (auto)</div>
                <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflow: 'auto' }}>
                  {sessionStudents.map((student) => (
                    <div key={student.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 8, alignItems: 'center' }}>
                      <div>{student?.user?.name || `Etudiant #${student.id}`}</div>
                      <Select
                        value={bulkStatuses[student.id] || 'present'}
                        onChange={(e) => setBulkStatuses((prev) => ({ ...prev, [student.id]: e.target.value }))}
                      >
                        <option value="present">Présent</option>
                        <option value="absent">Absent</option>
                        <option value="late">Retard</option>
                        <option value="excused">Excusé</option>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
            <Select
              label="Étudiant"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              required
            >
              <option value="">Sélectionner</option>
              {students.map((student) => (
                  <option key={student.id} value={student.id}>{student?.user?.name || `Etudiant #${student.id}`}</option>
              ))}
            </Select>
            <Select
              label="Cours"
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              required
            >
              <option value="">Sélectionner</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Select
              label="Statut"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="present">Présent</option>
              <option value="absent">Absent</option>
              <option value="late">Retard</option>
              <option value="excused">Excusé</option>
            </Select>
            <Textarea
              label="Remarques"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
              </>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
