<?php

use App\Models\Course;
use App\Models\CourseEnrollment;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('course.{courseId}', function ($user, $courseId) {
    if ($user->isAdministrator()) {
        return true;
    }

    $isProfessorOnCourse = Course::where('id', $courseId)
        ->whereHas('professor.user', function ($q) use ($user) {
            $q->where('id', $user->id);
        })
        ->exists();

    if ($isProfessorOnCourse) {
        return true;
    }

    $studentId = optional($user->student)->id;
    if (!$studentId) {
        return false;
    }

    return CourseEnrollment::where('student_id', $studentId)
        ->where('course_id', $courseId)
        ->where('status', 'active')
        ->exists();
});
