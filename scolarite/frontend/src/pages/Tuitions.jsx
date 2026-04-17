import { useState, useEffect, useCallback } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "../components/dashboard.css";

export default function Tuitions() {
  const { isStudent, isAdmin } = useAuth();
  const [tuitions, setTuitions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tuitions");

  const fetchData = useCallback(async () => {
    try {
      if (isStudent()) {
        const [tuitionRes, paymentRes] = await Promise.all([
          api.get("/my/tuitions"),
          api.get("/my/payments"),
        ]);
        setTuitions(tuitionRes.data.data || tuitionRes.data || []);
        setPayments(paymentRes.data.data || paymentRes.data || []);
      } else if (isAdmin()) {
        const [tuitionRes, paymentRes] = await Promise.all([
          api.get("/tuitions"),
          api.get("/payments"),
        ]);
        setTuitions(tuitionRes.data.data || tuitionRes.data || []);
        setPayments(paymentRes.data.data || paymentRes.data || []);
      }
    } catch (err) {
      console.error("Error fetching tuition data:", err);
    } finally {
      setLoading(false);
    }
  }, [isStudent, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "payé":
      case "completed":
        return "green";
      case "pending":
      case "en attente":
        return "orange";
      case "overdue":
      case "en retard":
        return "red";
      default:
        return "gray";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <AppLayout title="Frais de scolarité">
        <div className="text-center py-8">Chargement...</div>
      </AppLayout>
    );
  }

  // Calculate totals
  const totalTuitions = tuitions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingBalance = totalTuitions - totalPaid;

  return (
    <AppLayout title="Frais de scolarité et paiements">
      <div className="page-header">
        <h2>Frais de scolarité</h2>
        <p>Gérez vos frais de scolarité et consultez l'historique des paiements.</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total des frais</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>
            {formatCurrency(totalTuitions)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Montant payé</div>
          <div className="stat-value" style={{ color: "var(--secondary)" }}>
            {formatCurrency(totalPaid)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Solde restant</div>
          <div className="stat-value" style={{ color: remainingBalance > 0 ? "var(--accent)" : "var(--secondary)" }}>
            {formatCurrency(remainingBalance)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={() => setActiveTab("tuitions")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: activeTab === "tuitions" ? "var(--primary)" : "transparent",
              color: activeTab === "tuitions" ? "white" : "var(--text)",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
            }}
          >
            Frais de scolarité
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: activeTab === "payments" ? "var(--primary)" : "transparent",
              color: activeTab === "payments" ? "white" : "var(--text)",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
            }}
          >
            Historique des paiements
          </button>
        </div>

        {activeTab === "tuitions" && (
          <div className="card">
            <div className="card-header">
              <h3>Frais de scolarité</h3>
            </div>
            <div className="card-body">
              {tuitions.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                  Aucun frais de scolarité enregistré
                </p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Montant</th>
                      <th>Date d'échéance</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tuitions.map((tuition) => (
                      <tr key={tuition.id}>
                        <td>{tuition.description || tuition.title || `Frais ${tuition.semester || ""}`}</td>
                        <td>{formatCurrency(tuition.amount)}</td>
                        <td>{formatDate(tuition.due_date)}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: getStatusColor(tuition.status),
                              color: "white",
                            }}
                          >
                            {tuition.status === "paid" ? "Payé" : tuition.status === "pending" ? "En attente" : "En retard"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="card">
            <div className="card-header">
              <h3>Historique des paiements</h3>
            </div>
            <div className="card-body">
              {payments.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                  Aucun paiement enregistré
                </p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Méthode</th>
                      <th>Référence</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date || payment.created_at)}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.method || payment.payment_method || "-"}</td>
                        <td>{payment.reference || payment.transaction_id || "-"}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: payment.status === "completed" ? "green" : "orange",
                              color: "white",
                            }}
                          >
                            {payment.status === "completed" ? "Complété" : payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}