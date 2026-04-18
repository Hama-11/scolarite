import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, CardHeader, Badge, Button, Spinner, Modal, Textarea, Input, Select, Alert } from '../components/ui';
import { announcementService, courseService } from '../services/api';
import '../components/dashboard.css';

export default function Announcements() {
  const { isAdmin, isProfessor, isStudent } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    is_published: true,
    course_id: '',
    group_id: ''
  });

  const canCreate = isAdmin() || isProfessor();

  useEffect(() => {
    fetchAnnouncements();
    fetchCourses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedCourse]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = isStudent()
        ? await announcementService.getMyAnnouncements()
        : await announcementService.getAll({ per_page: 100, course_id: selectedCourse || undefined });
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      const filtered = selectedCourse
        ? list.filter((a) => String(a.course_id || a.course?.id || '') === String(selectedCourse))
        : list;
      setAnnouncements(filtered);
    } catch (err) {
      console.error("Erreur chargement annonces:", err);
      setError("Impossible de charger les annonces");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      let response;
      if (isAdmin()) {
        response = await courseService.getAll({ per_page: 200 });
      } else if (isProfessor()) {
        response = await courseService.getProfessorCourses();
      } else {
        response = await courseService.getMyCourses();
      }
      const payload = response.data;
      setCourses(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch {
      setCourses([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      
      const data = {
        ...formData,
        course_id: formData.course_id || null,
        group_id: formData.group_id || null
      };
      
      await announcementService.create(data);
      setShowModal(false);
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        is_published: true,
        course_id: '',
        group_id: ''
      });
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de creation de l annonce");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    try {
      await announcementService.delete(id);
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de suppression de l annonce");
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'gray',
      normal: 'blue',
      high: 'orange',
      urgent: 'red'
    };
    return colors[priority] || 'blue';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AppLayout title="Annonces">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Annonces">
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>Annonces</h2>
            <p>Consultez les dernières annonces de vos professeurs et administrateurs.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              options={[{ value: '', label: 'Tous les cours' }, ...courses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` }))]}
            />
            {canCreate && (
              <Button onClick={() => setShowModal(true)}>
                + Nouvelle annonce
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {announcements.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune annonce pour le moment.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <div className="item-row" style={{ marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="header-actions" style={{ marginBottom: 8, gap: 8 }}>
                    <h3 className="item-title">{announcement.title}</h3>
                    <Badge variant={getPriorityColor(announcement.priority)}>
                      {announcement.priority}
                    </Badge>
                  </div>
                  <p className="item-subtitle">
                    Par {announcement.author?.name || 'Auteur inconnu'} 
                    {announcement.course && ` - ${announcement.course.name}`}
                    {' • '}
                    {formatDate(announcement.published_at)}
                  </p>
                </div>
                {canCreate && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(announcement.id)}
                    style={{ color: 'var(--danger)' }}
                  >
                    🗑️
                  </Button>
                )}
              </div>
              <div className="item-content">
                {announcement.content}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)}
          title="Nouvelle annonce"
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                label="Titre"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Titre de l'annonce"
              />
              
              <Textarea
                label="Contenu"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                placeholder="Contenu de l'annonce..."
                rows={5}
              />
              
              <Select
                label="Priorité"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                options={[
                  { value: 'low', label: 'Basse' },
                  { value: 'normal', label: 'Normale' },
                  { value: 'high', label: 'Haute' },
                  { value: 'urgent', label: 'Urgente' }
                ]}
              />

              <Select
                label="Cours ciblé"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                options={[
                  { value: '', label: 'Annonce globale' },
                  ...courses.map((course) => ({
                    value: String(course.id),
                    label: `${course.name} (${course.code})`,
                  })),
                ]}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                />
                <label htmlFor="is_published">Publier immédiatement</label>
              </div>
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
                {submitting ? 'Envoi...' : 'Publier'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}
