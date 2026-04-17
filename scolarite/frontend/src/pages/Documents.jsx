import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { Card, Button, Spinner, Alert, Badge } from '../components/ui';
import { documentService } from '../services/api';
import '../components/dashboard.css';

export default function Documents() {
  const { isStudent } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = isStudent()
        ? await documentService.getMyDocuments()
        : await documentService.getAll({ per_page: 100 });
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setDocuments(list);
    } catch (err) {
      console.error("Erreur chargement documents:", err);
      setError("Impossible de charger les documents");
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
      link.setAttribute('download', doc.file_name || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading document:', err);
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
      <AppLayout title="Documents">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Documents">
      <div className="page-header">
        <h2>Documents</h2>
        <p>Accédez à vos documents et ressources.</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun document disponible pour le moment.</p>
          </div>
        </Card>
      ) : (
        <div className="grid-container">
          {documents.map((doc) => (
            <Card key={doc.id} className="document-card">
              <div className="document-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="document-title">{doc.title || doc.name}</h3>
              <p className="document-description">{doc.description || 'Document'}</p>
              <div className="document-meta">
                <span className="text-sm text-gray-500">{formatDate(doc.created_at)}</span>
                {doc.type && <Badge variant="blue">{doc.type}</Badge>}
              </div>
              <Button 
                variant="primary" 
                onClick={() => handleDownload(doc)}
                className="mt-3"
              >
                Télécharger
              </Button>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
