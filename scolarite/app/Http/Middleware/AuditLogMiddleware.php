<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuditLogMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $response;
        }

        try {
            $route = $request->route();
            $routeName = $route ? ($route->getName() ?: $route->uri()) : $request->path();

            $resourceType = Str::before($request->path(), '/');
            if ($resourceType === '' || $resourceType === 'api') {
                $resourceType = Str::before(Str::after($request->path(), 'api/'), '/');
            }

            $routeParameters = $route ? $route->parameters() : [];

            AuditLog::create([
                'user_id' => optional($request->user())->id,
                'action' => strtolower($request->method()) . ':' . $routeName,
                'resource_type' => $resourceType ?: 'system',
                'resource_id' => $this->extractResourceId($routeParameters),
                'metadata' => [
                    'path' => $request->path(),
                    'method' => $request->method(),
                    'status' => $response->getStatusCode(),
                ],
                'ip_address' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 255, ''),
            ]);
        } catch (\Throwable $e) {
            // Never block the request lifecycle for logging failure.
        }

        return $response;
    }

    protected function extractResourceId(array $parameters): ?int
    {
        foreach ($parameters as $value) {
            if (is_numeric($value)) {
                return (int) $value;
            }
            if (is_object($value) && method_exists($value, 'getKey')) {
                return (int) $value->getKey();
            }
        }

        return null;
    }
}
