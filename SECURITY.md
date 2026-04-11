# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:
- Email: security@nutriai.online
- Do not open public issues for security vulnerabilities

## Security Features

### Authentication
- **JWT-based authentication** with access tokens (1-day expiry) and refresh tokens (365-day, revocable)
- **httpOnly cookies** for all token storage — immune to XSS attacks
- **Password hashing** using scrypt with 16-byte random salts and timing-safe comparison
- **Google OAuth 2.0** integration with automatic account merging
- **Email verification** required before account activation (6-digit codes via SendGrid)
- **Password reset** via time-limited verification codes

### Rate Limiting
- Registration: 3 attempts per email per 15 minutes
- Login: 10 attempts per IP per 15 minutes
- Password reset: 3 attempts per email per hour
- Verification codes: 5 attempts per email per 15 minutes
- Code resend: 2 attempts per email per 5 minutes

### Transport & Headers
- **Helmet.js** security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** restricted to configured origins in production
- **HTTPS** enforced in production with secure cookie flags

### Authorization
- Role-based access control (user/admin)
- Admin routes protected by `isAdmin` middleware
- All data endpoints scoped to authenticated user's own data
- Monitoring endpoints protected by API key

### Input Validation
- **Zod** schema validation for request bodies
- File upload validation (MIME type, size limits)
- Image processing through Sharp (strips metadata, resizes)

### Data Protection
- Passwords never returned in API responses
- Sensitive fields excluded from user serialization
- API responses scoped to requesting user's data
- Token usage and costs tracked per-user

### Monitoring & Incident Response
- Automated monitoring with AI-powered anomaly detection
- Attack detection on registration endpoints
- Real-time email alerts for critical/warning conditions
- Rate limiting blocks sustained abuse automatically

## Environment Variables

All secrets (JWT keys, API keys, OAuth credentials) are loaded from environment variables. The application will refuse to start if critical secrets are missing. See `.env.example` for the complete list.

## Known Assumptions

- SQLite is used in development; production uses PostgreSQL with SSL
- Sessions use in-memory storage (MemoryStore) — suitable for single-instance deployments
- File uploads are stored on the local filesystem (not S3/CDN)
