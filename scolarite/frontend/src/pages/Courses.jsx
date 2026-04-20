import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, CardHeader, Badge, Button, Spinner, Input, Select, Modal, Textarea, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, Pagination, EmptyState, Alert } from '../components/ui';
import { courseService, adminService } from '../services/api';

export default function Courses() {
  const { isAdmin, isProfessor } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    credits: '',
    program_id: '',
    semester: '1',
    evaluation_type: 'mixed',
  });

  useEffect(() => {
    let mounted = true;
    async function loadPrograms() {
      if (!isAdmin()) return;
      try {
        const res = await adminService.getPrograms({ per_page: 200 });
        const payload = res?.data;
        const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        if (mounted) setPrograms(rows);
      } catch {
        if (mounted) setPrograms([]);
      }
    }
    loadPrograms();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await courseService.getAll({ 
        page, 
        search: debouncedSearch,
        per_page: 10,
      });
      setCourses(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (err) {
      console.error("Erreur chargement cours:", err);
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;
      if (status === 429) {
        setError("Trop de requêtes en peu de temps. Attendez quelques secondes puis réessayez.");
      } else {
        setError(serverMessage || "Impossible de charger les cours");
      }
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingCourse) {
        await courseService.update(editingCourse.id, formData);
      } else {
        await courseService.create(formData);
      }
      setShowModal(false);
      setEditingCourse(null);
      setFormData({ name: '', code: '', description: '', credits: '', program_id: '', semester: '1', evaluation_type: 'mixed' });
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de l enregistrement du cours");
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name || '',
      code: course.code || '',
      description: course.description || '',
      credits: course.credits || '',
      program_id: course.program_id || '',
      semester: String(course.semester || 1),
      evaluation_type: course.evaluation_type || 'mixed',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce cours ?")) return;
    try {
      await courseService.delete(id);
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de suppression du cours");
    }
  };

  const openNewModal = () => {
    setEditingCourse(null);
    setFormData({ name: '', code: '', description: '', credits: '', program_id: '', semester: '1', evaluation_type: 'mixed' });
    setShowModal(true);
  };

  if (loading && courses.length === 0) {
    return (
      <AppLayout title="Cours">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Cours">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Cours</h2>
          <p>Gerez vos cours et les inscriptions depuis cet espace.</p>
        </div>
        {isAdmin() && (
          <Button onClick={openNewModal}>
            Ajouter un cours
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

        {/* Search */}
        <Card className="mb-6">
          <div className="flex gap-4">
            <Input
              placeholder="Rechercher un cours..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        {/* Course List */}
        <Card>
          <CardHeader 
            title={`Tous les cours (${courses.length})`}
          />
          
          {courses.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Code</TableHeader>
                      <TableHeader>Nom</TableHeader>
                      <TableHeader>Credits</TableHeader>
                      <TableHeader>Programme</TableHeader>
                      <TableHeader>Statut</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.code}</TableCell>
                        <TableCell>{course.name}</TableCell>
                        <TableCell>{course.credits}</TableCell>
                        <TableCell>{course.program?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={course.is_active ? 'success' : 'default'}>
                            {course.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Link to={`/courses/${course.id}`}>
                              <Button variant="outline" size="sm">Voir</Button>
                            </Link>
                            {(isAdmin() || isProfessor()) && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEdit(course)}
                                >
                                  Modifier
                                </Button>
                                {isAdmin() && (
                                  <Button 
                                    variant="danger" 
                                    size="sm"
                                    onClick={() => handleDelete(course.id)}
                                  >
                                    Supprimer
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
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
              title="Aucun cours trouve"
              description="Commencez par creer votre premier cours"
              action={
                (isAdmin() || isProfessor()) && (
                  <Button onClick={openNewModal}>Ajouter un cours</Button>
                )
              }
            />
          )}
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingCourse ? "Modifier le cours" : "Ajouter un cours"}
          size="lg"
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                id="name"
                label="Nom du cours"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                id="code"
                label="Code du cours"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <Textarea
                id="description"
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <Input
                id="credits"
                label="Credits"
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                required
              />
              <Select
                id="program_id"
                label="Programme"
                value={String(formData.program_id || "")}
                onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                required
              >
                <option value="">— Sélectionner —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </Select>
              <Select
                id="semester"
                label="Semestre"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              >
                <option value="1">Semestre 1</option>
                <option value="2">Semestre 2</option>
              </Select>
              <Select
                id="evaluation_type"
                label="Type d evaluation"
                value={formData.evaluation_type}
                onChange={(e) => setFormData({ ...formData, evaluation_type: e.target.value })}
              >
                <option value="exam">Examen</option>
                <option value="cc">CC</option>
                <option value="mixed">Mixte</option>
              </Select>
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
                {editingCourse ? "Mettre a jour" : "Creer"}
              </Button>
            </div>
          </form>
        </Modal>
    </AppLayout>
  );
}
