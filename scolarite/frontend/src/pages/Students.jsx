import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, Button, Spinner, Alert, Badge, Input } from '../components/ui';
import { studentManagementService } from '../services/api';
import '../components/dashboard.css';

export default function Students() {
  const { isAdmin, isProfessor } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const canView = isAdmin() || isProfessor();

  useEffect(() => {
    if (canView) {
      fetchStudents();
    }
  }, [canView]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentManagementService.getAll();
      // API returns paginated payload: { data: [...], meta, links, ... }
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setStudents(list);
    } catch (err) {
      console.error("Erreur chargement etudiants:", err);
      setError("Impossible de charger les etudiants");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const name = (student?.user?.name || '').toLowerCase();
    const email = (student?.user?.email || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!canView) {
    return (
      <AppLayout title="Étudiants">
        <Alert variant="error">
          Vous n'avez pas l'autorisation de voir cette page.
        </Alert>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Étudiants">
        <div className="muted-center">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Étudiants">
      <div className="page-header">
        <h2>Gestion des Étudiants</h2>
        <p>Liste complète des étudiants inscrits.</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <div className="flex gap-3">
          <Input
            placeholder="Rechercher un étudiant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 300 }}
          />
        </div>
      </Card>

      {filteredStudents.length === 0 ? (
        <Card>
          <div className="muted-center">Aucun étudiant trouvé.</div>
        </Card>
      ) : (
        <Card>
          <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="ui-th">Nom</th>
                <th className="ui-th">Email</th>
                <th className="ui-th">Téléphone</th>
                <th className="ui-th">Date d'inscription</th>
                <th className="ui-th" style={{ textAlign: 'center' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="ui-tr">
                  <td className="ui-td">{student?.user?.name || '-'}</td>
                  <td className="ui-td">{student?.user?.email || '-'}</td>
                  <td className="ui-td">{student?.user?.phone || '-'}</td>
                  <td className="ui-td">{formatDate(student?.created_at)}</td>
                  <td className="ui-td" style={{ textAlign: 'center' }}>
                    <Badge variant={(student?.status || 'active') === 'active' ? 'green' : 'gray'}>
                      {(student?.status || 'active') === "active" ? "Actif" : (student?.status || "-")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="item-subtitle" style={{ marginTop: 14 }}>
        Total: {filteredStudents.length} étudiant(s)
      </div>
    </AppLayout>
  );
}
