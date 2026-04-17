import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, CardHeader, Badge, Button, Spinner, Input, Select, Modal, Textarea, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, Pagination, EmptyState, Alert, Tabs } from '../components/ui';
import { scheduleService, courseService } from '../services/api';

const DAYS_OF_WEEK = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function Schedule() {
  const { isAdmin, isProfessor, isStudent } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [courses, setCourses] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [formData, setFormData] = useState({
    course_id: '',
    room_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    semester: '',
    academic_year_id: '',
  });

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (isStudent()) {
        response = await scheduleService.getMySchedule();
        setSchedules(response.data?.data || response.data || []);
      } else {
        response = await scheduleService.getAll({ page, per_page: 20 });
        setSchedules(response.data.data || []);
        setTotalPages(response.data.last_page || 1);
      }
    } catch (err) {
      console.error("Erreur chargement emploi du temps:", err);
      setError("Impossible de charger l emploi du temps");
    } finally {
      setLoading(false);
    }
  }, [isStudent, page]);

  const fetchCourses = useCallback(async () => {
    try {
      const response = await courseService.getAll({ per_page: 100 });
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    if (isAdmin() || isProfessor()) {
      fetchCourses();
    }
  }, [fetchSchedules, fetchCourses, isAdmin, isProfessor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingSchedule) {
        await scheduleService.update(editingSchedule.id, formData);
      } else {
        await scheduleService.create(formData);
      }
      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
      fetchSchedules();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de l enregistrement");
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      course_id: schedule.course_id || '',
      room_id: schedule.room_id || '',
      day_of_week: schedule.day_of_week || '',
      start_time: schedule.start_time || '',
      end_time: schedule.end_time || '',
      semester: schedule.semester || '',
      academic_year_id: schedule.academic_year_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet element ?")) return;
    try {
      await scheduleService.delete(id);
      fetchSchedules();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      room_id: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      semester: '',
      academic_year_id: '',
    });
  };

  const openNewModal = () => {
    setEditingSchedule(null);
    resetForm();
    setShowModal(true);
  };

  // Group schedules by day for calendar view
  const schedulesByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = schedules.filter((s) => {
      const value = (s.day_of_week || '').toLowerCase();
      return value === day.toLowerCase();
    })
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {});

  if (loading && schedules.length === 0) {
    return (
      <AppLayout title="Emploi du temps">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Emploi du temps">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Emploi du temps</h2>
          <p>{isStudent() ? "Votre planning de cours" : "Gerez les plannings de cours"}</p>
        </div>
        <div className="flex space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Liste
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'calendar' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Calendrier
              </button>
            </div>
            {isAdmin() && (
              <Button onClick={openNewModal}>
                Ajouter
              </Button>
            )}
          </div>
      </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Schedule View */}
        {viewMode === 'list' ? (
          <Card>
            <CardHeader title="Tous les emplois du temps" />
            
            {schedules.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Cours</TableHeader>
                        <TableHeader>Jour</TableHeader>
                        <TableHeader>Horaire</TableHeader>
                        <TableHeader>Salle</TableHeader>
                        <TableHeader>Semestre</TableHeader>
                        {(isAdmin() || isProfessor()) && <TableHeader>Actions</TableHeader>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            {schedule.course?.name || "-"}
                          </TableCell>
                          <TableCell>{schedule.day_of_week || '-'}</TableCell>
                          <TableCell>
                            {schedule.start_time?.substring(0, 5)} - {schedule.end_time?.substring(0, 5)}
                          </TableCell>
                          <TableCell>{schedule.room?.name || "-"}</TableCell>
                          <TableCell>{schedule.semester || '-'}</TableCell>
                          {isAdmin() && (
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  Modifier
                                </Button>
                                <Button 
                                  variant="danger" 
                                  size="sm"
                                  onClick={() => handleDelete(schedule.id)}
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {totalPages > 1 && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                )}
              </>
            ) : (
              <EmptyState
                title="Aucun emploi du temps"
                description="Commencez par creer un horaire"
                action={
                  isAdmin() && <Button onClick={openNewModal}>Ajouter</Button>
                }
              />
            )}
          </Card>
        ) : (
          // Calendar View
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-4 text-center pb-2 border-b">
                  {day}
                </h3>
                <div className="space-y-2">
                  {schedulesByDay[day].length > 0 ? (
                    schedulesByDay[day].map((schedule) => (
                      <div 
                        key={schedule.id} 
                        className="p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500"
                      >
                        <p className="font-medium text-sm text-blue-900">
                          {schedule.course?.name || "Cours"}
                        </p>
                        <p className="text-xs text-blue-700">
                          {schedule.start_time?.substring(0, 5)} - {schedule.end_time?.substring(0, 5)}
                        </p>
                        <p className="text-xs text-blue-600">
                          {schedule.room?.name || "-"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun cours</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingSchedule ? "Modifier l horaire" : "Ajouter un horaire"}
          size="lg"
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Select
                id="course_id"
                label="Cours"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                required
              >
                <option value="">Selectionner un cours</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </Select>
              
              <Select
                id="day_of_week"
                label="Jour de la semaine"
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                required
              >
                <option value="">Selectionner un jour</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </Select>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="start_time"
                  label="Heure de debut"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
                <Input
                  id="end_time"
                  label="Heure de fin"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
              
              <Input
                id="room_id"
                label="ID salle"
                type="number"
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
              />
              
              <Input
                id="semester"
                label="Semestre"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                placeholder="Ex: S1 2026"
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingSchedule ? "Mettre a jour" : "Creer"}
              </Button>
            </div>
          </form>
        </Modal>
    </AppLayout>
  );
}
