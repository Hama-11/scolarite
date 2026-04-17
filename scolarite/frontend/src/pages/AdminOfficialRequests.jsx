import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Button, Input, Select, Badge, Alert, Spinner } from "../components/ui";
import { adminLifecycleService } from "../services/api";
import "../components/dashboard.css";

export default function AdminOfficialRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminLifecycleService.getOfficialDocumentRequests({ per_page: 50 });
      setRows(res.data?.data ?? res.data ?? []);
    } catch (e) {
      setError(e.response?.data?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchRow(id, payload) {
    setBusy(true);
    setError("");
    try {
      await adminLifecycleService.updateOfficialDocumentRequest(id, payload);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Demandes de documents">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Demandes de documents">
      <div className="page-header">
        <h2>Demandes administratives (étudiants)</h2>
        <p>Suivi des demandes d’attestations, relevés, etc.</p>
      </div>
      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}

      <Card>
        <CardHeader title="Liste" />
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">#</th>
                <th className="p-2">Étudiant</th>
                <th className="p-2">Type</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(rows) ? rows : []).map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.id}</td>
                  <td className="p-2">{r.student?.user?.name || r.student?.name || "—"}</td>
                  <td className="p-2">{r.document_type}</td>
                  <td className="p-2">
                    <Badge variant={r.status === "ready" ? "success" : r.status === "rejected" ? "error" : "warning"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <RowActions key={`${r.id}-${r.status}-${r.price}`} row={r} disabled={busy} onPatch={patchRow} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="text-gray-500 p-4">Aucune demande.</p> : null}
        </div>
      </Card>
    </AppLayout>
  );
}

function RowActions({ row, disabled, onPatch }) {
  const [status, setStatus] = useState(row.status);
  const [price, setPrice] = useState(row.price ?? "");
  return (
    <div className="flex flex-col gap-1 min-w-[200px]">
      <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={disabled}>
        <option value="pending">pending</option>
        <option value="processing">processing</option>
        <option value="ready">ready</option>
        <option value="rejected">rejected</option>
      </Select>
      <Input type="number" step="0.01" placeholder="Prix" value={price} onChange={(e) => setPrice(e.target.value)} disabled={disabled} />
      <Button size="sm" loading={disabled} onClick={() => onPatch(row.id, { status, price: price === "" ? null : Number(price) })}>
        Mettre à jour
      </Button>
    </div>
  );
}
