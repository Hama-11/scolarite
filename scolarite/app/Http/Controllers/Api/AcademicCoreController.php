<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicModule;
use App\Models\CourseEnrollment;
use App\Models\ExamAllocation;
use App\Models\ExamReport;
use App\Models\ExamSession;
use App\Models\Faculty;
use App\Models\Group;
use App\Models\GroupAssignment;
use App\Models\Level;
use App\Models\Schedule;
use App\Models\ScheduleConflict;
use App\Models\Semester;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AcademicCoreController extends Controller
{
    public function hierarchy()
    {
        $data = Faculty::with([
            'departments.programs.modules.semester.level',
        ])->get();

        return response()->json(['data' => $data]);
    }

    public function faculties(Request $request)
    {
        if ($request->isMethod('get')) {
            return response()->json(Faculty::query()->paginate((int) $request->get('per_page', 20)));
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:faculties,code',
            'description' => 'nullable|string',
        ]);

        return response()->json(Faculty::create($validated), 201);
    }

    public function updateFaculty(Request $request, Faculty $faculty)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:faculties,code,' . $faculty->id,
            'description' => 'nullable|string',
        ]);
        $faculty->update($validated);
        return response()->json($faculty);
    }

    public function levels(Request $request)
    {
        if ($request->isMethod('get')) {
            return response()->json(Level::query()->orderBy('order_index')->get());
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'order_index' => 'nullable|integer|min:1|max:20',
        ]);
        $validated['order_index'] = $validated['order_index'] ?? 1;
        return response()->json(Level::create($validated), 201);
    }

    public function semesters(Request $request)
    {
        if ($request->isMethod('get')) {
            $query = Semester::with('level');
            if ($request->filled('level_id')) {
                $query->where('level_id', $request->integer('level_id'));
            }
            return response()->json($query->orderBy('number')->get());
        }

        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'name' => 'required|string|max:100',
            'number' => 'required|integer|min:1|max:12',
        ]);
        return response()->json(Semester::create($validated), 201);
    }

    public function modules(Request $request)
    {
        if ($request->isMethod('get')) {
            $query = AcademicModule::with(['program.department', 'semester.level', 'prerequisites:id,code,name']);
            if ($request->filled('program_id')) {
                $query->where('program_id', $request->integer('program_id'));
            }
            if ($request->filled('semester_id')) {
                $query->where('semester_id', $request->integer('semester_id'));
            }
            return response()->json($query->paginate((int) $request->get('per_page', 20)));
        }

        $validated = $request->validate([
            'program_id' => 'required|exists:programs,id',
            'semester_id' => 'required|exists:semesters,id',
            'code' => 'required|string|max:50|unique:modules,code',
            'name' => 'required|string|max:255',
            'credits' => 'required|integer|min:0|max:60',
            'coefficient' => 'nullable|numeric|min:0|max:99.99',
            'evaluation_type' => 'required|in:cc,tp,examen,mixte',
            'prerequisite_ids' => 'nullable|array',
            'prerequisite_ids.*' => 'integer|exists:modules,id',
        ]);

        $prereqIds = $validated['prerequisite_ids'] ?? [];
        unset($validated['prerequisite_ids']);
        $validated['coefficient'] = $validated['coefficient'] ?? 1;

        return DB::transaction(function () use ($validated, $prereqIds) {
            $module = AcademicModule::create($validated);
            if (!empty($prereqIds)) {
                $module->prerequisites()->sync($prereqIds);
            }
            return response()->json(
                $module->load(['program.department', 'semester.level', 'prerequisites:id,code,name']),
                201
            );
        });
    }

    public function updateModule(Request $request, AcademicModule $module)
    {
        $validated = $request->validate([
            'program_id' => 'sometimes|exists:programs,id',
            'semester_id' => 'sometimes|exists:semesters,id',
            'code' => 'sometimes|string|max:50|unique:modules,code,' . $module->id,
            'name' => 'sometimes|string|max:255',
            'credits' => 'sometimes|integer|min:0|max:60',
            'coefficient' => 'nullable|numeric|min:0|max:99.99',
            'evaluation_type' => 'sometimes|in:cc,tp,examen,mixte',
            'prerequisite_ids' => 'nullable|array',
            'prerequisite_ids.*' => 'integer|exists:modules,id',
        ]);

        return DB::transaction(function () use ($validated, $module) {
            $prereqIds = $validated['prerequisite_ids'] ?? null;
            unset($validated['prerequisite_ids']);
            $module->update($validated);
            if (is_array($prereqIds)) {
                $module->prerequisites()->sync($prereqIds);
            }
            return response()->json($module->load(['program.department', 'semester.level', 'prerequisites:id,code,name']));
        });
    }

    public function autoGenerateGroupAssignments(Request $request)
    {
        $validated = $request->validate([
            'group_ids' => 'required|array|min:1',
            'group_ids.*' => 'required|integer|exists:groups,id',
        ]);

        $groups = Group::with('rules')->whereIn('id', $validated['group_ids'])->get();
        $assigned = 0;

        DB::transaction(function () use ($groups, &$assigned) {
            foreach ($groups as $group) {
                $query = Student::query();
                foreach ($group->rules as $rule) {
                    if ($rule->rule_key === 'classe') {
                        $query->where('classe', $rule->rule_value);
                    }
                    if ($rule->rule_key === 'name_contains') {
                        $query->where('name', 'like', '%' . $rule->rule_value . '%');
                    }
                }

                $students = $query->limit((int) $group->max_students)->get();
                foreach ($students as $student) {
                    GroupAssignment::updateOrCreate(
                        ['group_id' => $group->id, 'student_id' => $student->id],
                        ['reason' => 'auto_rule_assignment']
                    );
                    $student->update(['classe' => (string) $group->id]);
                    $assigned++;
                }
            }
        });

        return response()->json(['message' => 'Affectation automatique terminee', 'assigned_count' => $assigned]);
    }

    public function detectScheduleConflicts(Request $request)
    {
        $schedules = Schedule::with(['room', 'group', 'professor'])->get();
        $conflicts = [];

        DB::transaction(function () use ($schedules, &$conflicts) {
            ScheduleConflict::query()->where('status', 'detected')->delete();

            $count = $schedules->count();
            for ($i = 0; $i < $count; $i++) {
                for ($j = $i + 1; $j < $count; $j++) {
                    $a = $schedules[$i];
                    $b = $schedules[$j];

                    if ($a->day_of_week !== $b->day_of_week) {
                        continue;
                    }
                    if ($a->end_time <= $b->start_time || $b->end_time <= $a->start_time) {
                        continue;
                    }

                    $type = null;
                    if ($a->room_id && $a->room_id === $b->room_id) {
                        $type = 'room';
                    } elseif ($a->professor_id === $b->professor_id) {
                        $type = 'professor';
                    } elseif ($a->group_id && $a->group_id === $b->group_id) {
                        $type = 'group';
                    }

                    if ($type) {
                        $details = sprintf(
                            'Collision entre planning #%d et #%d (%s %s-%s)',
                            $a->id,
                            $b->id,
                            $a->day_of_week,
                            $a->start_time,
                            $a->end_time
                        );
                        $conflicts[] = ScheduleConflict::create([
                            'schedule_id' => $a->id,
                            'conflict_type' => $type,
                            'details' => $details,
                            'status' => 'detected',
                        ]);
                    }
                }
            }
        });

        return response()->json([
            'count' => count($conflicts),
            'data' => $conflicts,
        ]);
    }

    public function exportScheduleIcs(Request $request)
    {
        $request->validate([
            'group_id' => 'nullable|exists:groups,id',
            'professor_id' => 'nullable|exists:professors,id',
        ]);

        $query = Schedule::with(['course', 'room']);
        if ($request->filled('group_id')) {
            $query->where('group_id', $request->integer('group_id'));
        }
        if ($request->filled('professor_id')) {
            $query->where('professor_id', $request->integer('professor_id'));
        }
        $items = $query->get();

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Scolarite//Academic Schedule//FR',
            'CALSCALE:GREGORIAN',
        ];

        foreach ($items as $item) {
            $date = Carbon::parse($item->start_date)->format('Ymd');
            $start = Carbon::parse($item->start_date . ' ' . $item->start_time)->format('Ymd\THis');
            $end = Carbon::parse($item->start_date . ' ' . $item->end_time)->format('Ymd\THis');
            $summary = ($item->course->code ?? 'COURS') . ' - ' . ($item->course->name ?? 'Cours');
            $location = $item->room->name ?? 'Salle non definie';

            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:schedule-' . $item->id . '@scolarite.local';
            $lines[] = 'DTSTAMP:' . $date . 'T000000';
            $lines[] = 'DTSTART:' . $start;
            $lines[] = 'DTEND:' . $end;
            $lines[] = 'SUMMARY:' . $summary;
            $lines[] = 'LOCATION:' . $location;
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';
        $ics = implode("\r\n", $lines) . "\r\n";

        return response($ics, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="emploi-du-temps.ics"',
        ]);
    }

    public function examSessions(Request $request)
    {
        if ($request->isMethod('get')) {
            $query = ExamSession::with(['course.program', 'allocations.room', 'allocations.invigilator.professor']);
            if ($request->filled('session_kind')) {
                $query->where('session_kind', $request->string('session_kind'));
            }
            if ($request->filled('status')) {
                $query->where('status', $request->string('status'));
            }
            return response()->json($query->paginate((int) $request->get('per_page', 20)));
        }

        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'session_kind' => 'required|in:normale,rattrapage',
            'exam_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'status' => 'nullable|in:draft,submitted,in_review,approved,rejected,archived',
        ]);
        $validated['status'] = $validated['status'] ?? 'draft';
        return response()->json(ExamSession::create($validated), 201);
    }

    public function allocateExam(Request $request, ExamSession $examSession)
    {
        $validated = $request->validate([
            'room_id' => 'nullable|exists:rooms,id',
            'invigilator_id' => 'nullable|exists:invigilators,id',
            'expected_students' => 'nullable|integer|min:0',
        ]);
        $validated['expected_students'] = $validated['expected_students'] ?? 0;
        $allocation = ExamAllocation::create(array_merge($validated, ['exam_session_id' => $examSession->id]));
        return response()->json($allocation, 201);
    }

    public function generateExamReport(ExamSession $examSession)
    {
        $allocationCount = $examSession->allocations()->count();
        $enrolled = CourseEnrollment::where('course_id', $examSession->course_id)->count();
        $summary = sprintf(
            'PV auto session #%d | type=%s | allocations=%d | inscrits=%d',
            $examSession->id,
            $examSession->session_kind,
            $allocationCount,
            $enrolled
        );

        $report = ExamReport::create([
            'exam_session_id' => $examSession->id,
            'summary' => $summary,
            'generated_by' => (string) optional(auth()->user())->email,
            'generated_at' => now(),
        ]);

        return response()->json([
            'message' => 'PV genere automatiquement',
            'data' => $report,
        ]);
    }
}
