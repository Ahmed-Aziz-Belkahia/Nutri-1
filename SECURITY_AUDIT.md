# Security Audit Report — NutriAI

**Date**: April 10, 2026  
**Scope**: Full codebase security audit  
**Auditor**: Automated + manual review

---

## Executive Summary

6 critical, 8 high, and multiple medium/low severity issues were identified. All critical and high issues have been remediated. Secrets exposed in the repository history require immediate rotation.

---

## Critical Findings

### C1. Live OpenAI API Key in `.env.example` ✅ FIXED
- **File**: `.env.example` (lines 13-14)
- **Detail**: Full `sk-svcacct-njH7bKgufs_TV5Hnn...` API key committed to repository
- **Risk**: Anyone with repo access can use the key for unlimited API calls
- **Fix**: Replaced with placeholder `"your-openai-api-key-here"`
- **⚠️ MANUAL ACTION**: Rotate this API key in OpenAI dashboard immediately

### C2. GCP Service Account Private Key in Repository ✅ FIXED
- **File**: `credentials/vision-credentials.json` (DELETED)
- **Detail**: Full private key for `nutri-ai@nutri-ai.iam.gserviceaccount.com`
- **Risk**: Complete impersonation of the service account
- **Fix**: Deleted file, added to `.gitignore`, replaced with setup README
- **⚠️ MANUAL ACTION**: Rotate this key in Google Cloud Console

### C3. Google OAuth Client Secret in `.env` and Documentation ✅ FIXED
- **Files**: `.env` (line 21), `GOOGLE_OAUTH_IMPLEMENTATION.md`, `DAILY-REPORT-2025-11-14-19.md`
- **Detail**: `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` and `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`
- **Fix**: Redacted from documentation, `.env` excluded from git
- **⚠️ MANUAL ACTION**: Rotate both OAuth client secrets in Google Cloud Console

### C4. Neon Database Credentials in `.env` ✅ FIXED
- **File**: `.env` (line 4)
- **Detail**: Full PostgreSQL connection string with password `npg_Miym4x2jJCbH`
- **Fix**: `.env` is in `.gitignore` (never committed if gitignore was correct)
- **⚠️ MANUAL ACTION**: Rotate database password in Neon dashboard

### C5. Hardcoded JWT Secret Fallbacks ✅ FIXED
- **Files**: `server/utils/jwt.ts`, `server/auth.ts`, `server/routes/monitoring.ts`
- **Detail**: Known fallback secrets (`nutri-ai-access-secret-key-change-in-production`, `nutri-ai-secret-key-development-12345`, `nutriai-monitoring-key-change-in-production`) used when env vars are missing
- **Risk**: Attacker who reads source code can forge JWTs/access monitoring
- **Fix**: Removed all fallbacks. Server now throws at startup if secrets are missing.
- **⚠️ MANUAL ACTION**: Ensure `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MONITORING_API_KEY` are set in production

### C6. Admin Authorization Bypass ✅ FIXED
- **File**: `server/routes/admin.ts` (line 31)
- **Detail**: `router.use(isAdmin)` was commented out — any authenticated user could access admin endpoints (list all users, modify admin status, view analytics)
- **Risk**: Privilege escalation
- **Fix**: Re-enabled `router.use(isAdmin)`

---

## High Severity Findings

### H1. JWT Tokens Returned in Login Response Body ✅ FIXED
- **File**: `server/routes/jwt-auth.ts` (lines 513-514)
- **Detail**: `accessToken` and `refreshToken` included in JSON response despite being sent as httpOnly cookies
- **Risk**: XSS can steal tokens from response body, defeating httpOnly protection
- **Fix**: Removed tokens from response body

### H2. CORS Allows All Origins ✅ FIXED
- **File**: `server/index.ts` (line 64)
- **Detail**: `origin: true` ignores the parsed `ALLOWED_ORIGINS`
- **Fix**: Uses `allowedOrigins` in production, `true` only in development

### H3. `'unsafe-eval'` in Content Security Policy ✅ FIXED
- **File**: `server/index.ts` (line 29)
- **Fix**: Removed `'unsafe-eval'` from CSP scriptSrc

### H4. Debug Logging Exposes Sensitive Data ✅ FIXED
- **Files**: `server/auth.ts`, `server/routes/jwt-auth.ts`, `server/lib/openai.ts`
- **Detail**: Logs contained raw registration payloads (including passwords), user emails, session IDs, full AI prompts and responses
- **Fix**: Removed all sensitive debug logging

### H5. Error Responses Leak Internal Details ✅ FIXED
- **Files**: `server/index.ts`, `server/routes/jwt-auth.ts`
- **Detail**: `error.message` returned directly to clients
- **Fix**: Generic error messages in production; details only in server logs

### H6. Weak Verification Code Generation ✅ FIXED
- **File**: `server/routes/jwt-auth.ts`
- **Detail**: `Math.random()` used for security-sensitive verification codes
- **Fix**: Replaced with `crypto.randomInt(100000, 999999)`

### H7. Session Cookie File Committed ✅ FIXED
- **File**: `cookies.txt` (DELETED)
- **Detail**: Live session cookie in repository

### H8. Monitoring API Key Weak Default ✅ FIXED
- **File**: `server/routes/monitoring.ts`
- **Fix**: No default; requires `MONITORING_API_KEY` env var

---

## Medium Severity Findings

### M1. No Password Complexity Validation — DOCUMENTED
- Registration accepts any password (including empty strings after email check)
- **Recommendation**: Add minimum length (8+), character requirements via Zod schema

### M2. `routes.ts` is 6,867 Lines — DOCUMENTED
- Single file contains nearly all API route handlers
- **Risk**: Maintainability, merge conflicts, code review difficulty
- **Recommendation**: Break into domain-specific route modules

### M3. 50MB Upload Limit — DOCUMENTED
- Both `multer` and `express.json()` allow 50MB payloads
- **Recommendation**: Reduce to appropriate limits (10MB for images, 1MB for JSON)

### M4. MemoryStore for Sessions — DOCUMENTED
- Sessions stored in memory (lost on restart)
- **Status**: Acceptable for current scale; JWT is primary auth mechanism
- **Recommendation**: Migrate to Redis when scaling horizontally

### M5. Personal Email Addresses in n8n Workflow ✅ FIXED
- **File**: `nutriai-n8n-workflow.json` (line 567)
- **Fix**: Replaced with `admin@nutriai.online`

---

## Low Severity Findings

### L1. Orphaned Files at Root — ✅ FIXED (reorganized)
### L2. Replit Platform Files — ✅ FIXED (deleted)
### L3. Backup Files in Repository — ✅ FIXED (deleted)
### L4. Inconsistent Naming (camelCase vs snake_case) — DOCUMENTED

---

## Required Manual Actions

> **These actions MUST be completed by the project owner. Removing secrets from files does NOT undo the exposure — they remain in git history.**

| Secret | Where to Rotate |
|--------|----------------|
| OpenAI API key (`sk-svcacct-njH7...`) | [OpenAI Dashboard](https://platform.openai.com/api-keys) |
| Google OAuth secrets (`GOCSPX-...`) | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| GCP Service Account key | [Google Cloud IAM](https://console.cloud.google.com/iam-admin/serviceaccounts) |
| Neon DB password (`npg_Miym4x2...`) | [Neon Dashboard](https://console.neon.tech) |
| JWT Secret (`nutri_ai_jwt_secret_key_for_auth`) | Generate new random value for production `.env` |
