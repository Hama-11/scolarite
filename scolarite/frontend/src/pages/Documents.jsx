import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Alert, Badge, Button, Card, Input, Select, Spinner, Textarea } from '../components/ui';
import { courseService, documentService, scheduleService } from '../services/api';
import '../components/dashboard.css';

export default function Documents() {
  const { isStudent, isProfessor, isAdmin } = useAuth();
  const canManage = isProfessor() || isAdmin();
  const [documents, setDocuments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ course_id: '', type: '', date_from: '', date_to: '' });
  const [form, setForm] = useState({
    title: '',
    course_id: '',
    schedule_id: '',
    type: 'course_material',
    description: '',
    is_public: true,
    file: null,
  });

  const typeOptions = [
    { value: 'course_material', label: 'Support de cours' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'exam', label: 'Examen' },
    { value: 'solution', label: 'Correction' },
    { value: 'other', label: 'Autre' },
  ];

  useEffect(() => {
    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDocuments();
  }, [filters.course_id, filters.type, filters.date_from, filters.date_to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.course_id) {
      setSchedules([]);
      return;
    }
    loadSchedules(form.course_id);
  }, [form.course_id]);

  const bootstrap = async () => {
    try {
      const res = canManage ? await courseService.getProfessorCourses() : await courseService.getMyCourses();
      const payload = res?.data;
      setCourses(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch {
      setCourses([]);
    }
  };

  const loadSchedules = async (courseId) => {
    try {
      const res = await scheduleService.getByCourse(courseId);
      const payload = res?.data;
      setSchedules(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch {
      setSchedules([]);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        per_page: 100,
        course_id: filters.course_id || undefined,
        type: filters.type || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      };
      const response = isStudent() ? await documentService.getMyDocuments(params) : await documentService.getAll(params);
      const payload = response.data;
      setDocuments(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      setError('Impossible de charger les supports');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentService.download(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${doc.title || 'support'}.${doc.file_type || 'file'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Erreur lors du téléchargement');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      course_id: '',
      schedule_id: '',
      type: 'course_material',
      description: '',
      is_public: true,
      file: null,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editingId && !form.file) {
        setError('Veuillez sélectionner un fichier.');
        return;
      }
      setUploading(true);
      setError(null);
      const data = new FormData();
      data.append('title', form.title);
      data.append('type', form.type);
      data.append('description', form.description || '');
      data.append('is_public', form.is_public ? '1' : '0');
      if (form.course_id) data.append('course_id', form.course_id);
      if (form.schedule_id) data.append('schedule_id', form.schedule_id);
      if (form.file) data.append('file', form.file);

      if (editingId) {
        data.append('_method', 'PUT');
        await documentService.update(editingId, data);
      } else {
        await documentService.create(data);
      }
      resetForm();
      fetchDocuments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de l’enregistrement du support');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (doc) => {
    setEditingId(doc.id);
    setForm({
      title: doc.title || '',
      course_id: String(doc.course_id || ''),
      schedule_id: String(doc.schedule_id || ''),
      type: doc.type || 'course_material',
      description: doc.description || '',
      is_public: Boolean(doc.is_public),
      file: null,
    });
  };

  const removeDocument = async (id) => {
    if (!window.confirm('Supprimer ce support ?')) return;
    try {
      await documentService.delete(id);
      fetchDocuments();
    } catch {
      setError('Suppression impossible');
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const scheduleOptions = useMemo(() => schedules.map((s) => ({
    value: String(s.id),
    label: `${s.day_of_week || '?'} ${String(s.start_time || '').slice(0, 5)}-${String(s.end_time || '').slice(0, 5)}`,
  })), [schedules]);

  if (loading) {
    return <AppLayout title="Supports de cours"><div className="flex items-center justify-center py-8"><Spinner size="lg" /></div></AppLayout>;
  }

  return (
    <AppLayout title="Supports de cours">
      <div className="page-header">
        <h2>Supports de cours</h2>
        <p>Upload enseignant et consultation filtrée des fichiers pour les étudiants.</p>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {canManage && (
        <Card className="mb-4">
          <form onSubmit={onSubmit} className="grid-form">
            <Input label="Titre" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <Select
              label="Matière"
              value={form.course_id}
              onChange={(e) => setForm((p) => ({ ...p, course_id: e.target.value, schedule_id: '' }))}
              options={[{ value: '', label: 'Toutes' }, ...courses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` }))]}
            />
            <Select
              label="Séance (optionnel)"
              value={form.schedule_id}
              onChange={(e) => setForm((p) => ({ ...p, schedule_id: e.target.value }))}
              options={[{ value: '', label: 'Aucune séance' }, ...scheduleOptions]}
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              options={typeOptions}
            />
            <Input
              label="Fichier"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 28 }}>
              <input type="checkbox" checked={form.is_public} onChange={(e) => setForm((p) => ({ ...p, is_public: e.target.checked }))} />
              <span>Visible public</span>
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Description du support"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" disabled={uploading}>{uploading ? 'Envoi...' : (editingId ? 'Mettre à jour' : 'Publier')}</Button>
              {editingId ? <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button> : null}
            </div>
          </form>
          <p className="item-subtitle" style={{ marginTop: 8 }}>
            Limites: 20 MB max, formats autorisés: PDF, DOC/DOCX, PPT/PPTX, ZIP/RAR, TXT, XLS/XLSX, JPG/PNG.
          </p>
        </Card>
      )}

      <Card className="mb-4">
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Select
            label="Filtre matière"
            value={filters.course_id}
            onChange={(e) => setFilters((p) => ({ ...p, course_id: e.target.value }))}
            options={[{ value: '', label: 'Toutes' }, ...courses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` }))]}
          />
          <Select
            label="Type"
            value={filters.type}
            onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
            options={[{ value: '', label: 'Tous' }, ...typeOptions]}
          />
          <Input label="Du" type="date" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} />
          <Input label="Au" type="date" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} />
        </div>
      </Card>

      {documents.length === 0 ? (
        <Card><div className="text-center py-12"><p className="text-gray-500">Aucun support trouvé.</p></div></Card>
      ) : (
        <div className="grid-container">
          {documents.map((doc) => (
            <Card key={doc.id} className="document-card">
              <h3 className="document-title">{doc.title}</h3>
              <p className="document-description">{doc.description || 'Sans description'}</p>
              <div className="document-meta">
                <span className="text-sm text-gray-500">{formatDate(doc.created_at)}</span>
                <Badge variant="blue">{doc.type}</Badge>
              </div>
              <div className="item-subtitle" style={{ marginTop: 8 }}>
                {doc.course ? `Matière: ${doc.course.name}` : 'Matière: globale'}
                {doc.schedule ? ` • Séance #${doc.schedule.id}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button variant="primary" onClick={() => handleDownload(doc)}>Télécharger</Button>
                {canManage ? <Button variant="outline" onClick={() => startEdit(doc)}>Modifier</Button> : null}
                {canManage ? <Button variant="ghost" onClick={() => removeDocument(doc.id)}>Supprimer</Button> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
