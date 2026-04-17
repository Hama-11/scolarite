<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    private function canonicalRoleName(): string
    {
        $rawRole = strtolower((string) optional($this->role)->name);
        $aliases = array_merge([
            'administrator' => 'admin',
            'professor' => 'enseignant',
            'student' => 'etudiant',
        ], (array) config('rbac.aliases', []));
        return $aliases[$rawRole] ?? $rawRole;
    }

    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'email_verified_at',
        'verification_token',
        'settings',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'settings' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Always encrypt password when setting
     */
    public function setPasswordAttribute($value)
    {
        if (empty($value)) {
            return;
        }

        // Keep compatibility with already-hashed values.
        $info = password_get_info($value);
        $this->attributes['password'] = $info['algo'] ? $value : Hash::make($value);
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function professor()
    {
        return $this->hasOne(Professor::class);
    }

    /**
     * Check if user has a specific role
     */
    public function hasRole($role)
    {
        if (!$this->role && !$this->canonicalRoleName()) {
            return false;
        }

        $current = $this->canonicalRoleName();

        if (is_array($role)) {
            $allowed = array_map(function ($item) {
                $name = strtolower((string) $item);
                $aliases = array_merge([
                    'administrator' => 'admin',
                    'professor' => 'enseignant',
                    'student' => 'etudiant',
                ], (array) config('rbac.aliases', []));
                return $aliases[$name] ?? $name;
            }, $role);
            return in_array($current, $allowed, true);
        }

        $expected = strtolower((string) $role);
        $aliases = array_merge([
            'administrator' => 'admin',
            'professor' => 'enseignant',
            'student' => 'etudiant',
        ], (array) config('rbac.aliases', []));
        $expected = $aliases[$expected] ?? $expected;

        return $current === $expected;
    }

    /**
     * Check if user is an administrator
     */
    public function isAdministrator()
    {
        return $this->hasRole('admin');
    }

    /**
     * Check if user is a professor/teacher
     */
    public function isProfessor()
    {
        return $this->hasRole(['enseignant', 'professor']);
    }

    /**
     * Check if user is a student
     */
    public function isStudent()
    {
        return $this->hasRole(['etudiant', 'student']);
    }
}
