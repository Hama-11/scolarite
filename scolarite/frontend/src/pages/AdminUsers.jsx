import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { adminService } from "../services/api";
import { Alert, Button, Card, CardHeader, Input, Modal, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui";

const ROLE_OPTIONS = [
  { id: "etudiant", label: "Étudiant" },
  { id: "enseignant", label: "Enseignant" },
  { id: "directeur_etudes", label: "Directeur des études" },
  { id: "admin", label: "Administrateur système" },
];

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role_name: "etudiant",
  });

  const roleIdFromName = useMemo(() => {
    const map = {
      etudiant: 1,
      enseignant: 2,
      admin: 3,
      directeur_etudes: 4,
    };
    return map[form.role_name] || 1;
  }, [form.role_name]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.getUsers({ per_page: 50, search });
      const payload = res?.data;
      setUsers(Array.isArray(payload?.data) ? payload.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", password_confirmation: "", role_name: "etudiant" });
    setShow(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      password: "",
      password_confirmation: "",
      role_name: u?.role?.name || "etudiant",
    });
    setShow(true);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role_id: roleIdFromName };
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await adminService.updateUser(editing.id, payload);
      } else {
        await adminService.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.password_confirmation,
          role_id: roleIdFromName,
        });
      }
      setShow(false);
      await load();
    } catch (e2) {
      const errs = e2?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(" ") : e2?.response?.data?.message || "Enregistrement impossible.");
    }
  }

  async function removeUser(u) {
    if (!window.confirm(`Supprimer ${u.email} ?`)) return;
    setError("");
    try {
      await adminService.deleteUser(u.id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Suppression impossible.");
    }
  }

  async function resetPassword(u) {
    if (!window.confirm(`Réinitialiser le mot de passe de ${u.email} ?`)) return;
    setError("");
    try {
      const res = await adminService.resetUserPassword(u.id);
      const pwd = res?.data?.temporary_password;
      alert(`Mot de passe temporaire: ${pwd}`);
    } catch (e) {
      setError(e?.response?.data?.message || "Reset impossible.");
    }
  }

  if (loading) {
    return (
      <AppLayout title="Utilisateurs">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Utilisateurs (Admin système)">
      <div className="page-header header-row">
        <div>
          <h2>Gestion des utilisateurs</h2>
          <p>Créer, modifier, supprimer, réinitialiser les accès.</p>
        </div>
        <div className="header-actions">
          <Button onClick={openCreate}>Nouvel utilisateur</Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="mb-4">
        <div className="p-4">
          <Input placeholder="Recherche nom/email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card>
        <CardHeader title={`Utilisateurs (${users.length})`} />
        <div className="p-4 overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Nom</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Rôle</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u?.role?.display_name || u?.role?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Modifier</Button>
                      <Button size="sm" variant="secondary" onClick={() => resetPassword(u)}>Reset MDP</Button>
                      <Button size="sm" variant="danger" onClick={() => removeUser(u)}>Supprimer</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Modal isOpen={show} onClose={() => setShow(false)} title={editing ? "Modifier utilisateur" : "Créer utilisateur"} size="lg">
        <form onSubmit={save} className="space-y-4">
          <Input label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Select label="Rôle" value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </Select>
          <Input label="Mot de passe (optionnel en édition)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} />
          <Input label="Confirmer mot de passe" type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} minLength={8} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShow(false)}>Annuler</Button>
            <Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}

