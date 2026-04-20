# Security Policy

## Supported Versions

Only the latest `main` branch is supported for security fixes.

## Reporting a Vulnerability

- Contact the maintainers privately before public disclosure.
- Provide reproduction steps, impact, and affected endpoints/modules.
- Expected initial acknowledgment: 72 hours.

## Security by Design Controls

- Mandatory authenticated access for sensitive APIs.
- Role/permission middleware for authorization.
- Audit logging for state-changing operations.
- Dependency checks via CI (`composer audit`, `npm audit`).
