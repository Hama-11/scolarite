<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CourseMessagePosted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public array $payload;
    public int $courseId;

    public function __construct(Message $message)
    {
        $this->courseId = (int) $message->course_id;
        $this->payload = [
            'id' => (int) $message->id,
            'course_id' => (int) $message->course_id,
            'sender_id' => (int) $message->sender_id,
            'sender' => [
                'id' => (int) optional($message->sender)->id,
                'name' => (string) optional($message->sender)->name,
            ],
            'body' => (string) $message->body,
            'subject' => (string) $message->subject,
            'created_at' => optional($message->created_at)->toISOString(),
        ];
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('course.' . $this->courseId)];
    }

    public function broadcastAs(): string
    {
        return 'course.message.posted';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}

