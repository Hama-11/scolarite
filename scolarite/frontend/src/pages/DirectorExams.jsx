import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { academicCoreService, adminService, courseService } from "../services/api";
import { Alert, Badge, Button, Card, CardHeader, Input, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui";

export default function DirectorExams() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const [courses, setCourses] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [courseId, setCourseId] = useState("");
  const [sessionKind, setSessionKind] = useState("normale");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");

  const [allocRoomId, setAllocRoomId] = useState("");
  const [allocExpected, setAllocExpected] = useState("0");
  const [allocSessionId, setAllocSessionId] = useState("");

  const roomById = useMemo(() => {
    const m = new Map();
    rooms.forEach((r) => m.set(String(r.id), r));
    return m;
  }, [rooms]);

  const courseById = useMemo(() => {
    const m = new Map();
    courses.forEach((c) => m.set(String(c.id), c));
    return m;
  }, [courses]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionsRes, coursesRes, roomsRes] = await Promise.all([
        academicCoreService.getExamSessions({ per_page: 25 }),
        courseService.getAll({ per_page: 200 }),
        adminService.getRooms({ per_page: 200 }),
      ]);
      const sp = sessionsRes?.data;
      setItems(Array.isArray(sp?.data) ? sp.data : []);
      const cp = coursesRes?.data;
      setCourses(Array.isArray(cp?.data) ? cp.data : []);
      const rp = roomsRes?.data;
      setRooms(Array.isArray(rp?.data) ? rp.data : Array.isArray(rp) ? rp : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les examens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createSession() {
    setError("");
    try {
      if (!courseId) {
        setError("Veuillez sélectionner un cours.");
        return;
      }
      await academicCoreService.createExamSession({
        course_id: Number(courseId),
        session_kind: sessionKind,
        exam_date: examDate,
        start_time: startTime,
        end_time: endTime,
      });
      setExamDate("");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Création session impossible.");
    }
  }

  async function allocateRoom() {
    setError("");
    try {
      if (!allocSessionId) {
        setError("Veuillez sélectionner une session.");
        return;
      }
      await academicCoreService.allocateExam(Number(allocSessionId), {
        room_id: allocRoomId ? Number(allocRoomId) : null,
        expected_students: Number(allocExpected || 0),
      });
      setAllocRoomId("");
      setAllocExpected("0");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Affectation impossible.");
    }
  }

  async function generatePv(sessionId) {
    setError("");
    try {
      await academicCoreService.generateExamReport(sessionId);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Génération PV impossible.");
    }
  }

  return (
    <AppLayout title="Examens">
      <div className="page-header header-row">
        <div>
          <h2>Gestion des examens</h2>
          <p>Planifier sessions (normale/rattrapage), affecter salles, générer PV.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={load}>Actualiser</Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="Planifier une session" subtitle="Créer une session d'examen" />
          <div className="p-4">
            <Select label="Cours" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </Select>
            <Select label="Type de session" value={sessionKind} onChange={(e) => setSessionKind(e.target.value)}>
              <option value="normale">Principale</option>
              <option value="rattrapage">Rattrapage</option>
            </Select>
            <Input label="Date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Début" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input label="Fin" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <Button onClick={createSession} className="w-full">Créer</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Affecter salle" subtitle="Affecter une salle à une session" />
          <div className="p-4">
            <Select label="Session" value={allocSessionId} onChange={(e) => setAllocSessionId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {items.map((s) => {
                const c = s?.course || courseById.get(String(s.course_id));
                return (
                  <option key={s.id} value={s.id}>
                    #{s.id} — {c?.code || `course#${s.course_id}`} — {s.session_kind} — {s.exam_date}
                  </option>
                );
              })}
            </Select>
            <Select label="Salle (optionnel)" value={allocRoomId} onChange={(e) => setAllocRoomId(e.target.value)}>
              <option value="">Aucune</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>
              ))}
            </Select>
            <Input label="Effectif attendu" type="number" value={allocExpected} onChange={(e) => setAllocExpected(e.target.value)} />
            <Button onClick={allocateRoom} className="w-full">Affecter</Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sessions d'examen" subtitle="Liste + PV" />
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : items.length === 0 ? (
            <div className="muted-center">Aucune session.</div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>#</TableHeader>
                  <TableHeader>Cours</TableHeader>
                  <TableHeader>Session</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Heure</TableHeader>
                  <TableHeader>Statut</TableHeader>
                  <TableHeader>Allocations</TableHeader>
                  <TableHeader>PV</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((s) => {
                  const c = s?.course || courseById.get(String(s.course_id));
                  const alloc = Array.isArray(s?.allocations) ? s.allocations : [];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">#{s.id}</TableCell>
                      <TableCell>{c?.code ? `${c.code} — ${c.name}` : `#${s.course_id}`}</TableCell>
                      <TableCell>{s.session_kind}</TableCell>
                      <TableCell>{s.exam_date}</TableCell>
                      <TableCell>{s.start_time} - {s.end_time}</TableCell>
                      <TableCell><Badge variant="info">{s.status}</Badge></TableCell>
                      <TableCell>
                        {alloc.length === 0 ? "—" : alloc.map((a) => {
                          const r = a?.room || roomById.get(String(a.room_id));
                          return (
                            <div key={a.id}>
                              {r ? `${r.name}` : (a.room_id ? `salle#${a.room_id}` : "—")} ({a.expected_students})
                            </div>
                          );
                        })}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="secondary" onClick={() => generatePv(s.id)}>Générer PV</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}

