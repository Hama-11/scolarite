<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ModernizationService
{
    public function submitEnrollment(array $data): array
    {
        $student = Student::findOrFail($data['student_id']);
        $course = Course::findOrFail($data['course_id']);

        $checks = $this->computeEnrollmentChecks($student->id, $course, $data['enrollment_window_id'] ?? null);
        $status = ($checks['window_ok'] && $checks['capacity_ok'] && $checks['prerequisites_ok'])
            ? 'pending_approval'
            : 'submitted';

        $id = DB::table('enrollment_requests')->insertGetId([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'academic_year_id' => $data['academic_year_id'] ?? null,
            'enrollment_window_id' => $data['enrollment_window_id'] ?? null,
            'status' => $status,
            'auto_checks' => json_encode($checks),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'id' => $id,
            'status' => $status,
            'checks' => $checks,
        ];
    }

    public function optimizeSchedule(?int $semesterId = null): array
    {
        $query = DB::table('schedules')
            ->select('schedules.*', 'courses.semester_id')
            ->leftJoin('courses', 'courses.id', '=', 'schedules.course_id');

        if ($semesterId) {
            $query->where('courses.semester_id', $semesterId);
        }

        $rows = $query->get();

        $rowsByDay = collect($rows)->groupBy('day_of_week');
        $conflicts = [];

        foreach ($rowsByDay as $day => $dayRows) {
            $dayList = $dayRows->values();
            $count = $dayList->count();
            for ($i = 0; $i < $count; $i++) {
                for ($j = $i + 1; $j < $count; $j++) {
                    $a = $dayList[$i];
                    $b = $dayList[$j];
                    if (!$this->timeOverlaps((string) $a->start_time, (string) $a->end_time, (string) $b->start_time, (string) $b->end_time)) {
                        continue;
                    }

                    if ($a->room_id && $b->room_id && (int) $a->room_id === (int) $b->room_id) {
                        $conflicts[] = $this->buildConflict($day, $a, $b, 'room');
                    }
                    if ($a->professor_id && $b->professor_id && (int) $a->professor_id === (int) $b->professor_id) {
                        $conflicts[] = $this->buildConflict($day, $a, $b, 'professor');
                    }
                }
            }
        }

        $conflictCollection = collect($conflicts);
        $roomConflicts = $conflictCollection->where('type', 'room')->count();
        $profConflicts = $conflictCollection->where('type', 'professor')->count();
        $totalConflicts = $conflictCollection->count();

        $proposals = $conflictCollection->map(function (array $conflict) use ($rowsByDay) {
            return array_merge($conflict, [
                'suggested_actions' => $this->suggestActions($conflict, $rowsByDay->get($conflict['day'], collect())),
            ]);
        })->values();

        $baselineScore = 100;
        $penalty = ($roomConflicts * 8) + ($profConflicts * 6);
        $score = max(0, $baselineScore - $penalty);

        return [
            'status' => 'generated',
            'score' => $score,
            'summary' => [
                'total_conflicts' => $totalConflicts,
                'room_conflicts' => $roomConflicts,
                'professor_conflicts' => $profConflicts,
                'semester_id' => $semesterId,
            ],
            'proposals' => $proposals,
            'message' => $totalConflicts === 0
                ? 'No scheduling conflicts detected.'
                : 'Optimization proposal generated with concrete conflict resolution options.',
        ];
    }

    private function computeEnrollmentChecks(int $studentId, Course $course, ?int $windowId): array
    {
        $today = Carbon::today()->toDateString();
        $windowOk = DB::table('enrollment_windows')
            ->when($windowId, function ($q) use ($windowId) {
                return $q->where('id', $windowId);
            })
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->exists();

        $capacity = DB::table('groups')->where('status', 'active')->avg('max_students');
        $currentCount = DB::table('course_enrollments')->where('course_id', $course->id)->count();
        $capacityOk = $capacity ? $currentCount < (int) round($capacity) : true;

        $prereqOk = true;
        if (!empty($course->prerequisites)) {
            $codes = array_filter(array_map('trim', explode(',', (string) $course->prerequisites)));
            if ($codes) {
                $done = DB::table('course_enrollments as ce')
                    ->join('courses as c', 'c.id', '=', 'ce.course_id')
                    ->where('ce.student_id', $studentId)
                    ->where('ce.status', 'completed')
                    ->whereIn('c.code', $codes)
                    ->count();
                $prereqOk = $done >= count($codes);
            }
        }

        return [
            'window_ok' => $windowOk,
            'capacity_ok' => $capacityOk,
            'prerequisites_ok' => $prereqOk,
        ];
    }

    private function timeOverlaps(string $startA, string $endA, string $startB, string $endB): bool
    {
        return $startA < $endB && $endA > $startB;
    }

    private function buildConflict(string $day, object $a, object $b, string $type): array
    {
        return [
            'day' => $day,
            'type' => $type,
            'schedule_a' => [
                'id' => (int) $a->id,
                'course_id' => (int) $a->course_id,
                'room_id' => $a->room_id ? (int) $a->room_id : null,
                'professor_id' => $a->professor_id ? (int) $a->professor_id : null,
                'start_time' => (string) $a->start_time,
                'end_time' => (string) $a->end_time,
            ],
            'schedule_b' => [
                'id' => (int) $b->id,
                'course_id' => (int) $b->course_id,
                'room_id' => $b->room_id ? (int) $b->room_id : null,
                'professor_id' => $b->professor_id ? (int) $b->professor_id : null,
                'start_time' => (string) $b->start_time,
                'end_time' => (string) $b->end_time,
            ],
        ];
    }

    private function suggestActions(array $conflict, Collection $daySchedules): array
    {
        $a = $conflict['schedule_a'];
        $b = $conflict['schedule_b'];
        $actions = [];

        $actions[] = [
            'action' => 'shift_schedule',
            'target_schedule_id' => $b['id'],
            'candidate_start_time' => $a['end_time'],
            'candidate_end_time' => $this->addDuration($a['end_time'], $b['start_time'], $b['end_time']),
            'reason' => 'Move second slot right after first slot to avoid overlap.',
        ];

        $usedRoomIds = $daySchedules->pluck('room_id')->filter()->map(static function ($x) {
            return (int) $x;
        })->unique()->values()->all();
        $availableRoom = DB::table('rooms')->whereNotIn('id', $usedRoomIds)->value('id');
        if ($availableRoom) {
            $actions[] = [
                'action' => 'change_room',
                'target_schedule_id' => $b['id'],
                'candidate_room_id' => (int) $availableRoom,
                'reason' => 'Switch room to an available room for the same slot.',
            ];
        }

        return $actions;
    }

    private function addDuration(string $start, string $originalStart, string $originalEnd): string
    {
        $durationMinutes = ((int) substr($originalEnd, 0, 2) * 60 + (int) substr($originalEnd, 3, 2))
            - ((int) substr($originalStart, 0, 2) * 60 + (int) substr($originalStart, 3, 2));

        $newStartMinutes = ((int) substr($start, 0, 2) * 60 + (int) substr($start, 3, 2));
        $newEnd = $newStartMinutes + max(30, $durationMinutes);
        $h = str_pad((string) (int) floor($newEnd / 60), 2, '0', STR_PAD_LEFT);
        $m = str_pad((string) ($newEnd % 60), 2, '0', STR_PAD_LEFT);
        return $h . ':' . $m;
    }
}

