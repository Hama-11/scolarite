import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, CardHeader, Badge, Button, Spinner, Input, Select, Modal, Textarea, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, Pagination, EmptyState, Alert, Tabs } from '../components/ui';
import { gradeService, courseService, studentManagementService } from '../services/api';

export default function Grades() {
  const { isAdmin, isProfessor, isStudent } = useAuth();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    value: '',
    max_value: '100',
    type: 'exam',
    semester: '',
    academic_year: '',
    comments: '',
  });
  const [importData, setImportData] = useState({
    course_id: '',
    type: 'exam',
    date: '',
    max_value: '20',
    file: null,
  });
  const [importResult, setImportResult] = useState(null);

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (isStudent()) {
        response = await gradeService.getMyGrades();
        const gradesData = response.data?.data || response.data || [];
        setGrades(gradesData);
        calculateStats(gradesData);
      } else {
        response = await gradeService.getAll({ page, per_page: 20 });
        setGrades(response.data.data || []);
        setTotalPages(response.data.last_page || 1);
      }
    } catch (err) {
      console.error("Erreur chargement notes:", err);
      setError("Impossible de charger les notes");
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

  const fetchStudents = useCallback(async () => {
    try {
      const response = await studentManagementService.getAll({ per_page: 200 });
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setStudents(list);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
    if (isAdmin() || isProfessor()) {
      fetchCourses();
      fetchStudents();
    }
  }, [fetchGrades, fetchCourses, fetchStudents, isAdmin, isProfessor]);

  const calculateStats = (gradesData) => {
    if (!gradesData.length) {
      setStats(null);
      return;
    }
    
    const total = gradesData.length;
    const sum = gradesData.reduce((acc, g) => {
      const value = Number(g.value ?? g.grade ?? 0);
      const maxValue = Number(g.max_value ?? 20);
      if (!maxValue) return acc;
      return acc + (value / maxValue * 100);
    }, 0);
    const average = total > 0 ? sum / total : 0;
    
    const byType = gradesData.reduce((acc, g) => {
      acc[g.type] = (acc[g.type] || 0) + 1;
      return acc;
    }, {});

    setStats({
      total,
      average: average.toFixed(2),
      byType,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const gradeData = {
        ...formData,
        value: parseFloat(formData.value),
        max_value: parseFloat(formData.max_value),
      };
      
      if (editingGrade) {
        await gradeService.update(editingGrade.id, gradeData);
      } else {
        await gradeService.create(gradeData);
      }
      setShowModal(false);
      setEditingGrade(null);
      resetForm();
      fetchGrades();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de l enregistrement de la note");
    }
  };

  const handleEdit = (grade) => {
    const currentValue = grade.value ?? grade.grade ?? '';
    const currentMaxValue = grade.max_value ?? 20;
    setEditingGrade(grade);
    setFormData({
      student_id: grade.student_id || '',
      course_id: grade.course_id || '',
      value: currentValue?.toString() || '',
      max_value: currentMaxValue?.toString() || '20',
      type: grade.type || 'exam',
      semester: grade.semester || '',
      academic_year: grade.academic_year || '',
      comments: grade.comments || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette note ?")) return;
    try {
      await gradeService.delete(id);
      fetchGrades();
    } catch (err) {
      setError(err.response?.data?.message || "Echec de suppression de la note");
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      course_id: '',
      value: '',
      max_value: '100',
      type: 'exam',
      semester: '',
      academic_year: '',
      comments: '',
    });
  };

  const openNewModal = () => {
    setEditingGrade(null);
    resetForm();
    setShowModal(true);
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (!importData.file) {
        setError("Veuillez choisir un fichier CSV.");
        return;
      }

      const form = new FormData();
      form.append("course_id", importData.course_id);
      form.append("type", importData.type);
      form.append("date", importData.date);
      form.append("max_value", importData.max_value);
      form.append("file", importData.file);

      const res = await gradeService.importCsv(form);
      const d = res?.data || {};
      setShowImportModal(false);
      setImportData({ course_id: '', type: 'exam', date: '', max_value: '20', file: null });
      setImportResult({
        created: d.created || 0,
        updated: d.updated || 0,
        skipped: d.skipped || 0,
        errors: Array.isArray(d.errors) ? d.errors : [],
      });
      fetchGrades();
      setError(`Import termine - Crees: ${d.created || 0}, Mis a jour: ${d.updated || 0}, Ignores: ${d.skipped || 0}`);
    } catch (err) {
      setError(err.response?.data?.message || "Echec import CSV");
    }
  };

  const downloadCsvTemplate = () => {
    const content = [
      "matricule,value,max_value,comments",
      "MAT-000001,15,20,Bonne progression",
      "MAT-000002,12,20,Doit renforcer la partie TP",
    ].join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template-import-notes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyCsvFormat = async () => {
    const format = "Colonnes acceptees: student_id ou matricule ou email, value (ou grade), max_value (optionnel), comments (optionnel)";
    try {
      await navigator.clipboard.writeText(format);
      setError("Format CSV copie dans le presse-papiers.");
    } catch {
      setError("Impossible de copier automatiquement. Format: " + format);
    }
  };

  const getGradeColor = (value, maxValue) => {
    const percentage = (value / maxValue) * 100;
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    if (percentage >= 60) return 'default';
    return 'error';
  };

  const getGradeLabel = (value, maxValue) => {
    const percentage = (value / maxValue) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  if (loading && grades.length === 0) {
    return (
      <AppLayout title="Notes">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Notes">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Notes</h2>
          <p>{isStudent() ? "Consultez vos notes et vos performances" : "Gerez les notes des etudiants"}</p>
        </div>
        {(isAdmin() || isProfessor()) && (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              Import CSV
            </Button>
            <Button onClick={openNewModal}>
              Ajouter une note
            </Button>
          </div>
        )}
      </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {importResult && (
          <Card className="mb-6">
            <CardHeader title="Resultat import CSV" />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge variant="success">Crees: {importResult.created}</Badge>
                <Badge variant="info">Mis a jour: {importResult.updated}</Badge>
                <Badge variant={importResult.skipped > 0 ? "warning" : "default"}>Ignores: {importResult.skipped}</Badge>
              </div>
              {importResult.errors.length > 0 ? (
                <div className="ui-card compact" style={{ maxHeight: 180, overflow: "auto" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Erreurs par ligne</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {importResult.errors.map((item, idx) => (
                      <li key={`${item}-${idx}`} style={{ marginBottom: 4 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Aucune erreur detectee pendant l import.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Statistics (for students) */}
        {isStudent() && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-500">Total notes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-500">Moyenne</p>
                <p className="text-3xl font-bold text-gray-900">{stats.average}%</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-500">Mention</p>
                <p className="text-3xl font-bold text-gray-900">
                  {getGradeLabel(parseFloat(stats.average), 100)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-500">Types d evaluation</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Object.keys(stats.byType).join(', ')}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Grades List */}
        <Card>
          <CardHeader title={`${isStudent() ? "Mes notes" : "Toutes les notes"}`} />
          
          {grades.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      {isProfessor() && <TableHeader>Student</TableHeader>}
                      <TableHeader>Cours</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Note</TableHeader>
                      <TableHeader>Pourcentage</TableHeader>
                      <TableHeader>Date</TableHeader>
                      {(isAdmin() || isProfessor()) && <TableHeader>Actions</TableHeader>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grades.map((grade) => (
                      <TableRow key={grade.id}>
                        {isProfessor() && (
                          <TableCell>
                            {grade.student?.user?.name || "-"}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {grade.course?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {grade.type || "Examen"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getGradeColor(Number(grade.value ?? grade.grade ?? 0), Number(grade.max_value ?? 20))}>
                            {Number(grade.value ?? grade.grade ?? 0)}/{Number(grade.max_value ?? 20)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {((((Number(grade.value ?? grade.grade ?? 0)) / Number(grade.max_value ?? 20)) * 100) || 0).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          {grade.created_at ? new Date(grade.created_at).toLocaleDateString() : '-'}
                        </TableCell>
                        {(isAdmin() || isProfessor()) && (
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEdit(grade)}
                              >
                                Modifier
                              </Button>
                              {isAdmin() && (
                                <Button 
                                  variant="danger" 
                                  size="sm"
                                  onClick={() => handleDelete(grade.id)}
                                >
                                  Supprimer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {!isStudent() && totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <EmptyState
              title="Aucune note trouvee"
              description={isStudent() 
                ? "Aucune note enregistree pour le moment." 
                : "Commencez par ajouter des notes"
              }
              action={
                (isAdmin() || isProfessor()) && <Button onClick={openNewModal}>Ajouter une note</Button>
              }
            />
          )}
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingGrade ? "Modifier la note" : "Ajouter une note"}
          size="lg"
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Select
                id="student_id"
                label="Étudiant"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                required
              >
                <option value="">Sélectionner un étudiant</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student?.user?.name || `Etudiant #${student.id}`}
                  </option>
                ))}
              </Select>
              
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
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="value"
                  label="Valeur de la note"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
                <Input
                  id="max_value"
                  label="Note maximale"
                  type="number"
                  step="0.01"
                  value={formData.max_value}
                  onChange={(e) => setFormData({ ...formData, max_value: e.target.value })}
                  required
                />
              </div>
              
              <Select
                id="type"
                label="Type d evaluation"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="exam">Examen</option>
                <option value="quiz">Quiz</option>
                <option value="homework">Devoir</option>
                <option value="project">Projet</option>
                <option value="participation">Participation</option>
                <option value="midterm">Partiel</option>
                <option value="final">Final</option>
              </Select>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="semester"
                  label="Semestre"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  placeholder="Ex: S1 2026"
                />
                <Input
                  id="academic_year"
                  label="Annee universitaire"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  placeholder="Ex: 2026-2027"
                />
              </div>
              
              <Textarea
                id="comments"
                label="Commentaires"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={2}
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
                {editingGrade ? "Mettre a jour" : "Creer"}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Importer des notes par CSV"
          size="lg"
        >
          <form onSubmit={handleImportCsv}>
            <div className="space-y-4">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Telecharge un modele CSV avant import.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="button" variant="outline" size="sm" onClick={copyCsvFormat}>
                    Copier format attendu
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={downloadCsvTemplate}>
                    Telecharger template CSV
                  </Button>
                </div>
              </div>

              <Select
                id="import_course_id"
                label="Cours"
                value={importData.course_id}
                onChange={(e) => setImportData({ ...importData, course_id: e.target.value })}
                required
              >
                <option value="">Selectionner un cours</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="import_type"
                  label="Type d evaluation"
                  value={importData.type}
                  onChange={(e) => setImportData({ ...importData, type: e.target.value })}
                >
                  <option value="exam">Examen</option>
                  <option value="ds">DS</option>
                  <option value="tp">TP</option>
                  <option value="project">Projet</option>
                  <option value="participation">Participation</option>
                  <option value="final">Final</option>
                </Select>
                <Input
                  id="import_date"
                  label="Date"
                  type="date"
                  value={importData.date}
                  onChange={(e) => setImportData({ ...importData, date: e.target.value })}
                  required
                />
              </div>

              <Input
                id="import_max"
                label="Note max par defaut"
                type="number"
                step="0.01"
                value={importData.max_value}
                onChange={(e) => setImportData({ ...importData, max_value: e.target.value })}
              />

              <div>
                <label htmlFor="import_file" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Fichier CSV
                </label>
                <input
                  id="import_file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setImportData({ ...importData, file: e.target.files?.[0] || null })}
                  required
                />
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                  Colonnes attendues: student_id ou matricule ou email, puis value (ou grade), optionnel: max_value, comments.
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={() => setShowImportModal(false)}>
                Annuler
              </Button>
              <Button type="submit">Importer</Button>
            </div>
          </form>
        </Modal>
    </AppLayout>
  );
}
