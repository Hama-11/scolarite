import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, CardHeader, Badge, Button, Spinner, Modal, Textarea, Input, Alert, Select } from '../components/ui';
import { assignmentService, courseService } from '../services/api';
import '../components/dashboard.css';

export default function Assignments() {
  const { isAdmin, isProfessor, isStudent } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: '',
    max_grade: 20,
    instructions: ''
  });
  const [courses, setCourses] = useState([]);

  const canCreate = isAdmin() || isProfessor();
  const canSubmit = isStudent();

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = canCreate
        ? await assignmentService.getAll({ per_page: 50 })
        : await assignmentService.getMyAssignments();
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setAssignments(list);
    } catch (err) {
      console.error("Erreur chargement devoirs:", err);
      setError("Impossible de charger les devoirs");
    } finally {
      setLoading(false);
    }
  }, [canCreate]);

  const fetchCourses = useCallback(async () => {
    try {
      const response = await courseService.getAll({ per_page: 200 });
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setCourses(list);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    if (canCreate) {
      fetchCourses();
    }
  }, [fetchAssignments, fetchCourses, canCreate]);

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    
    try {
      setSubmitting(true);
      await assignmentService.submit(selectedAssignment.id, {
        content: submissionText
      });
      setSelectedAssignment(null);
      setSubmissionText('');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await assignmentService.create({
        course_id: Number(formData.course_id),
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date,
        max_score: Number(formData.max_grade),
        type: 'homework',
        instructions: formData.instructions,
      });
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        course_id: '',
        due_date: '',
        max_grade: 20,
        instructions: ''
      });
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de creation du devoir");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce devoir ?")) return;
    try {
      await assignmentService.delete(id);
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de suppression du devoir");
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
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
      <AppLayout title="Devoirs">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Devoirs">
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>Devoirs</h2>
            <p> Consultez et soumettez vos devoirs.</p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowModal(true)}>
              + Nouveau devoir
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {assignments.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun devoir enregistré pour le moment.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <div className="item-row" style={{ marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <h3 className="item-title" style={{ marginBottom: 8 }}>{assignment.title}</h3>
                  <p className="item-subtitle" style={{ marginBottom: 8 }}>
                    {assignment.course?.name || 'Cours non spécifié'}
                  </p>
                  <div className="header-actions" style={{ gap: 8 }}>
                    <Badge variant={isOverdue(assignment.due_date) && !assignment.submission ? 'red' : 'blue'}>
                      {isOverdue(assignment.due_date) ? 'En retard' : 'À faire'}
                    </Badge>
                    <Badge variant="gray">
                      Echeance: {formatDate(assignment.due_date)}
                    </Badge>
                    <Badge variant="gray">
                      Max: {assignment.max_score} pts
                    </Badge>
                  </div>
                </div>
                {canCreate && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(assignment.id)}
                    style={{ color: 'var(--danger)' }}
                  >
                    🗑️
                  </Button>
                )}
              </div>
              
              {assignment.description && (
                <p className="item-subtitle" style={{ marginBottom: 12 }}>
                  {assignment.description}
                </p>
              )}

              {assignment.instructions && (
                <div style={{ marginBottom: 12, padding: 12, background: 'var(--surface2)', borderRadius: 10, border: "1px solid var(--border)" }}>
                  <strong>Instructions:</strong>
                  <p style={{ marginTop: 4 }}>{assignment.instructions}</p>
                </div>
              )}

              {canSubmit && (
                <div style={{ marginTop: 12 }}>
                  {(assignment.submissions && assignment.submissions.length > 0) ? (
                    <div style={{ padding: 12, background: 'var(--success)', color: '#fff', borderRadius: 10 }}>
                      ✅ Soumis le {formatDate(assignment.submissions[0].submitted_at)}
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedAssignment(assignment)}
                      disabled={isOverdue(assignment.due_date)}
                    >
                      {isOverdue(assignment.due_date) ? 'Délai dépassé' : 'Soumettre'}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)}
          title="Nouveau devoir"
        >
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <Input
                label="Titre"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Titre du devoir"
              />
              
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du devoir..."
                rows={3}
              />

              <Select
                label="Cours"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                required
              >
                <option value="">Sélectionner un cours</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </Select>

              <Textarea
                label="Instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Instructions détaillées..."
                rows={3}
              />

              <Input
                label="Date limite"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />

              <Input
                label="Note maximale"
                type="number"
                value={formData.max_grade}
                onChange={(e) => setFormData({ ...formData, max_grade: e.target.value })}
                required
                min="1"
                max="100"
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Submit Assignment Modal */}
      {selectedAssignment && (
        <Modal
          isOpen={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          title={`Soumettre: ${selectedAssignment.title}`}
        >
          <form onSubmit={handleSubmitAssignment}>
            <Textarea
              label="Votre réponse"
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              required
              placeholder="Entrez votre réponse ou travail..."
              rows={6}
            />

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedAssignment(null)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Envoi...' : 'Soumettre'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}
