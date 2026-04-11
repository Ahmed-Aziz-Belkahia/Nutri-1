# NutriAI Monitoring System - Complete Technical Specification

> **Purpose**: This document contains EVERY detail needed to set up the NutriAI monitoring system. It includes all API endpoints, data structures, AI prompts, environment variables, and N8N workflow logic.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Infrastructure Details](#2-infrastructure-details)
3. [Environment Variables](#3-environment-variables)
4. [Express Backend API Endpoints](#4-express-backend-api-endpoints)
5. [N8N Workflow Nodes](#5-n8n-workflow-nodes)
6. [AI Agent Prompts](#6-ai-agent-prompts)
7. [Data Structures](#7-data-structures)
8. [Email Alert Formatting](#8-email-alert-formatting)
9. [Deployment Steps](#9-deployment-steps)

---

## 1. System Overview

### What This System Does
A 5-agent AI monitoring system that:
1. Fetches health data from the NutriAI Express backend via REST APIs
2. Processes data through specialized AI agents (GPT-4o-mini)
3. Sends email alerts when issues are detected (critical/warning severity)
4. **Special Feature**: Monitors ongoing spam/DDoS attacks on registration endpoint

### Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│                         N8N WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │ Schedule     │───▶│ HTTP Request │───▶│ Code Node    │           │
│  │ Trigger      │    │ (Fetch API)  │    │ (Prep Data)  │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│         │                                        │                   │
│         │                                        ▼                   │
│         │                               ┌──────────────┐            │
│         │                               │ OpenAI Node  │            │
│         │                               │ (AI Agent)   │            │
│         │                               └──────────────┘            │
│         │                                        │                   │
│         │                                        ▼                   │
│         │                               ┌──────────────┐            │
│         │                               │ Code Node    │            │
│         │                               │ (Parse JSON) │            │
│         │                               └──────────────┘            │
│         │                                        │                   │
│         │                                        ▼                   │
│         │                               ┌──────────────┐            │
│         │                               │ IF Node      │            │
│         │                               │ (severity?)  │            │
│         │                               └──────────────┘            │
│         │                                    │     │                 │
│         │                            Yes ◀───┘     └───▶ No          │
│         │                                    │           │           │
│         │                                    ▼           ▼           │
│         │                            ┌────────────┐ ┌──────────┐    │
│         │                            │Format Email│ │ NoOp     │    │
│         │                            └────────────┘ │ (Log)    │    │
│         │                                    │      └──────────┘    │
│         │                                    ▼                       │
│  x5     │                            ┌────────────┐                  │
│  agents │                            │Send Email  │                  │
│         │                            │ (SMTP)     │                  │
│         │                            └────────────┘                  │
│         │                                                            │
└─────────┴────────────────────────────────────────────────────────────┘
```

### 5 Monitoring Agents

| Agent Name | Trigger Interval | What It Monitors |
|------------|------------------|------------------|
| **Critical Monitor** | Every 30 seconds | Overall health score, service outages, database errors |
| **Services Health** | Every 2 minutes | PM2 processes, service CPU/memory, restart detection |
| **VPS Resources** | Every 5 minutes | Server CPU, memory, disk, network, load average |
| **Error Analysis** | Every 10 minutes | PM2 error logs, error patterns, error spikes |
| **Attack Monitor** | Every 5 minutes | Spam attacks, blocked requests, attacker emails |

---

## 2. Infrastructure Details

### VPS Server
- **IP**: `72.61.182.248`
- **OS**: Linux (Debian/Ubuntu)
- **User**: `root`
- **Application Path**: `/usr/local/lsws/Example/html/NutriApp`

### Required Services on VPS
| Service | Purpose | Port |
|---------|---------|------|
| **lsws** (LiteSpeed) | Web server / Reverse proxy | 80, 443 |
| **nutriapp** (PM2) | Node.js Express application | 5000 |
| **SQLite** | Database | File-based |
| **redis-server** (optional) | Cache | 6379 |

### N8N Instance
- **URL**: `https://n8n.nutriai.online/` (or set up new)
- **Port**: `5678`

### NutriAI Application
- **URL**: `https://nutriai.online`
- **Framework**: Express.js + Vite + React
- **Database**: SQLite (Drizzle ORM)
- **Process Manager**: PM2

---

## 3. Environment Variables

### Add to NutriAI .env file
```bash
# Monitoring API Key
MONITORING_API_KEY=nutriai-monitoring-key-change-in-production
```

### N8N Docker Container Environment Variables

Located in `/opt/n8n/docker-compose.yml`:

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    container_name: n8n
    restart: unless-stopped
    ports:
      - 5678:5678
    environment:
      # N8N Configuration
      - N8N_HOST=n8n.nutriai.online
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.nutriai.online/
      - N8N_ENCRYPTION_KEY=change-this-to-a-secure-key
      - GENERIC_TIMEZONE=Europe/Warsaw
      - TZ=Europe/Warsaw
      
      # Alert recipient email
      - ALERT_EMAIL=ahmadazizbelkahia@gmail.com
      
      # OpenAI API Key for AI agents
      - OPENAI_API_KEY=sk-proj-xxx...xxx
    volumes:
      - n8n_data:/home/node/.n8n
    user: root

volumes:
  n8n_data:
```

---

## 4. Express Backend API Endpoints

All endpoints are defined in `server/routes/monitoring.ts`.

### Authentication
All endpoints use API key authentication via query parameter:
```
?key=nutriai-monitoring-key-change-in-production
```

---

### Endpoint 1: System Status
**URL**: `GET /api/monitoring/status?key={api_key}`

**Purpose**: Overall system health and quick status check

**Response Structure**:
```json
{
  "health_score": 95,
  "overall_health": "healthy",
  "services": {
    "nutriapp": { "status": "running", "metadata": { "pid": 12345 } },
    "database": { "status": "running", "metadata": null },
    "lsws": { "status": "running" },
    "redis": { "status": "running" }
  },
  "immediate_issues": [],
  "response_time_ms": 15,
  "timestamp": "2026-01-05T12:00:00Z"
}
```

**Health Score Calculation**:
- Database error: -40 points
- App not running: -30 points
- Memory > 90%: -20 points
- Load > 2x cores: -15 points

---

### Endpoint 2: Services Health
**URL**: `GET /api/monitoring/services?key={api_key}`

**Purpose**: Detailed per-service resource usage from PM2

**Response Structure**:
```json
{
  "services": [
    {
      "service": "nutriapp",
      "status": "running",
      "pid": 12345,
      "cpu_percent": 2.5,
      "memory_percent": 3.2,
      "memory_mb": 128.5,
      "uptime_hours": 168.5,
      "restarts": 5,
      "type": "pm2"
    },
    {
      "service": "lsws",
      "status": "running",
      "type": "systemd"
    }
  ],
  "timestamp": "2026-01-05T12:00:00Z"
}
```

---

### Endpoint 3: VPS Resources
**URL**: `GET /api/monitoring/vps?key={api_key}`

**Purpose**: Server resource metrics

**Response Structure**:
```json
{
  "data": {
    "cpu": {
      "percent": 25.5,
      "load_1m": 0.85,
      "load_5m": 0.72,
      "load_15m": 0.65,
      "core_count": 2
    },
    "memory": {
      "percent": 65.2,
      "used": 2684354560,
      "total": 4118855680,
      "available": 1434501120
    },
    "disk": {
      "percent": 45,
      "used": 19327352832,
      "total": 42207518720,
      "free": 22880165888
    },
    "network": {
      "bytes_sent": 1073741824,
      "bytes_recv": 2147483648,
      "errors_in": 0,
      "errors_out": 0
    },
    "system": {
      "process_count": 156,
      "connection_count": 245,
      "uptime_hours": 720.5,
      "platform": "linux",
      "node_version": "v20.10.0"
    }
  },
  "timestamp": "2026-01-05T12:00:00Z"
}
```

---

### Endpoint 4: Error Logs
**URL**: `GET /api/monitoring/errors?key={api_key}&hours=1`

**Purpose**: Recent application errors from PM2 logs

**Query Parameters**:
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `key` | Yes | - | API authentication key |
| `hours` | No | 1 | Hours to look back |

**Response Structure**:
```json
{
  "count": 15,
  "timeframe_hours": 1,
  "errors": [
    {
      "level": "ERROR",
      "message": "❌ Error sending email to daren@alphv.com: Message failed",
      "source": "nutriapp-error-1.log",
      "timestamp": "2026-01-05T11:55:00Z"
    }
  ],
  "patterns": {
    "Error sending email": 10,
    "Ratelimit exceeded": 5
  },
  "has_critical": false,
  "timestamp": "2026-01-05T12:00:00Z"
}
```

---

### Endpoint 5: Attack Statistics
**URL**: `GET /api/monitoring/attacks?key={api_key}`

**Purpose**: Track ongoing spam/DDoS attacks on registration endpoint

**Response Structure**:
```json
{
  "blocked_requests_429": 40479,
  "total_registration_attempts": 552109,
  "top_attackers": [
    { "email": "daren@alphv.com", "attempts": 293421 },
    { "email": "me@azbahri.my", "attempts": 217136 },
    { "email": "binhong@binhong.me", "attempts": 41552 }
  ],
  "is_under_attack": true,
  "timestamp": "2026-01-05T12:00:00Z"
}
```

---

### Endpoint 6: Health Check (Simple Ping)
**URL**: `GET /api/monitoring/health`

**Purpose**: Simple health check (no auth required)

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-05T12:00:00Z"
}
```

---

## 5. N8N Workflow Nodes

### Node Summary (30 nodes total)

| Node # | Name | Type | Purpose |
|--------|------|------|---------|
| 1 | Every 30s - Critical | scheduleTrigger | Critical monitoring |
| 2 | Every 2min - Services | scheduleTrigger | Service health |
| 3 | Every 5min - VPS | scheduleTrigger | VPS resources |
| 4 | Every 10min - Errors | scheduleTrigger | Error logs |
| 5 | Every 5min - Attacks | scheduleTrigger | Attack monitoring |
| 6-10 | Fetch * | httpRequest | API calls |
| 11-15 | Prep * Context | code | Prepare AI context |
| 16-20 | AI * Agent | openAi | AI analysis |
| 21-25 | Parse * Response | code | Parse AI output |
| 26 | Needs Action? | if | Route by severity |
| 27 | Format Email Alert | code | Build email |
| 28 | Send Email Alert | emailSend | SMTP send |
| 29 | Log Normal Status | noOp | No action needed |

---

### Node Details

#### Schedule Triggers
```javascript
// Every 30s - Critical
{ "interval": [{ "field": "seconds", "secondsInterval": 30 }] }

// Every 2min - Services
{ "interval": [{ "field": "minutes", "minutesInterval": 2 }] }

// Every 5min - VPS & Attacks
{ "interval": [{ "field": "minutes", "minutesInterval": 5 }] }

// Every 10min - Errors
{ "interval": [{ "field": "minutes", "minutesInterval": 10 }] }
```

#### HTTP Request Nodes
```javascript
// Fetch Status
{
  "url": "https://nutriai.online/api/monitoring/status?key=nutriai-monitoring-key-change-in-production",
  "options": { "timeout": 10000 }
}

// Fetch Services
{
  "url": "https://nutriai.online/api/monitoring/services?key=nutriai-monitoring-key-change-in-production"
}

// Fetch VPS
{
  "url": "https://nutriai.online/api/monitoring/vps?key=nutriai-monitoring-key-change-in-production"
}

// Fetch Errors
{
  "url": "https://nutriai.online/api/monitoring/errors?key=nutriai-monitoring-key-change-in-production&hours=1"
}

// Fetch Attacks
{
  "url": "https://nutriai.online/api/monitoring/attacks?key=nutriai-monitoring-key-change-in-production"
}
```

---

#### Prep Critical Context (Code Node)
```javascript
const input = $input.first().json;

if (input.error || input.statusCode >= 400) {
  return [{ json: {
    timestamp: new Date().toISOString(),
    source: 'critical_monitor',
    api_error: true,
    health_score: 0,
    immediate_issues: ['api_unreachable']
  }}];
}

const context = {
  timestamp: new Date().toISOString(),
  source: 'critical_monitor',
  health_score: input.health_score || 0,
  overall_health: input.overall_health || 'unknown',
  services: input.services || {},
  immediate_issues: input.immediate_issues || [],
  response_time_ms: input.response_time_ms || 0
};

return [{ json: context }];
```

---

#### Prep Services Context (Code Node)
```javascript
const input = $input.first().json;

if (input.error || input.statusCode >= 400) {
  return [{ json: {
    timestamp: new Date().toISOString(),
    source: 'services_monitor',
    api_error: true,
    issues: [{ service: 'api', type: 'unreachable', severity: 'critical' }]
  }}];
}

const context = {
  timestamp: new Date().toISOString(),
  source: 'services_monitor',
  services: input.services || [],
  issues: [],
  warnings: []
};

for (const svc of context.services) {
  if (svc.status !== 'running') {
    context.issues.push({ service: svc.service, type: 'down', severity: 'critical' });
  }
  if (svc.cpu_percent > 80) {
    context.warnings.push({ service: svc.service, type: 'high_cpu', value: svc.cpu_percent });
  }
  if (svc.memory_percent > 85) {
    context.warnings.push({ service: svc.service, type: 'high_memory', value: svc.memory_percent });
  }
  if (svc.uptime_hours < 0.1 && svc.status === 'running') {
    context.warnings.push({ service: svc.service, type: 'recent_restart', restarts: svc.restarts });
  }
}

return [{ json: context }];
```

---

#### Prep VPS Context (Code Node)
```javascript
const input = $input.first().json;

if (input.error || input.statusCode >= 400) {
  return [{ json: {
    timestamp: new Date().toISOString(),
    source: 'vps_monitor',
    api_error: true,
    issues: [{ type: 'api_unreachable', severity: 'critical' }]
  }}];
}

const d = input.data || input;

const context = {
  timestamp: new Date().toISOString(),
  source: 'vps_monitor',
  cpu: d.cpu || {},
  memory: {
    percent: d.memory?.percent || 0,
    used_gb: ((d.memory?.used || 0) / 1073741824).toFixed(2),
    total_gb: ((d.memory?.total || 0) / 1073741824).toFixed(2)
  },
  disk: {
    percent: d.disk?.percent || 0,
    used_gb: ((d.disk?.used || 0) / 1073741824).toFixed(2),
    total_gb: ((d.disk?.total || 0) / 1073741824).toFixed(2)
  },
  network: d.network || {},
  system: d.system || {},
  issues: [],
  warnings: []
};

// Detect issues
if (context.cpu.percent > 90) context.issues.push({ type: 'cpu_critical', value: context.cpu.percent });
else if (context.cpu.percent > 70) context.warnings.push({ type: 'cpu_high', value: context.cpu.percent });

if (context.memory.percent > 90) context.issues.push({ type: 'memory_critical', value: context.memory.percent });
else if (context.memory.percent > 80) context.warnings.push({ type: 'memory_high', value: context.memory.percent });

if (context.disk.percent > 90) context.issues.push({ type: 'disk_critical', value: context.disk.percent });
else if (context.disk.percent > 80) context.warnings.push({ type: 'disk_high', value: context.disk.percent });

return [{ json: context }];
```

---

#### Prep Errors Context (Code Node)
```javascript
const input = $input.first().json;

if (input.error || input.statusCode >= 400) {
  return [{ json: {
    timestamp: new Date().toISOString(),
    source: 'error_monitor',
    api_error: true,
    issues: [{ type: 'api_unreachable', severity: 'critical' }]
  }}];
}

const context = {
  timestamp: new Date().toISOString(),
  source: 'error_monitor',
  error_count: input.count || 0,
  timeframe_hours: input.timeframe_hours || 1,
  errors: (input.errors || []).slice(0, 10),
  patterns: input.patterns || {},
  has_critical: input.has_critical || false,
  issues: [],
  warnings: []
};

// Detect patterns
if (context.error_count > 50) {
  context.issues.push({ type: 'error_spike', count: context.error_count, severity: 'critical' });
} else if (context.error_count > 20) {
  context.warnings.push({ type: 'elevated_errors', count: context.error_count });
}

return [{ json: context }];
```

---

#### Prep Attacks Context (Code Node)
```javascript
const input = $input.first().json;

if (input.error || input.statusCode >= 400) {
  return [{ json: {
    timestamp: new Date().toISOString(),
    source: 'attack_monitor',
    api_error: true,
    issues: [{ type: 'api_unreachable', severity: 'critical' }]
  }}];
}

const context = {
  timestamp: new Date().toISOString(),
  source: 'attack_monitor',
  blocked_requests: input.blocked_requests_429 || 0,
  total_attacks: input.total_registration_attempts || 0,
  top_attackers: input.top_attackers || [],
  is_under_attack: input.is_under_attack || false,
  issues: [],
  warnings: []
};

// Check for ongoing attack
if (context.is_under_attack) {
  context.warnings.push({ 
    type: 'active_attack', 
    blocked: context.blocked_requests,
    total: context.total_attacks 
  });
}

// Check for known malicious actors
const knownMalicious = ['alphv.com', 'blackcat'];
for (const attacker of context.top_attackers) {
  if (knownMalicious.some(m => attacker.email.toLowerCase().includes(m))) {
    context.issues.push({ 
      type: 'ransomware_actor', 
      email: attacker.email, 
      attempts: attacker.attempts 
    });
  }
}

return [{ json: context }];
```

---

#### Parse Response Nodes (Code - same for all 5)
```javascript
const input = $input.first().json;
let text = input.text || input.message?.content || input.content || '';
if (typeof text === 'object') text = JSON.stringify(text);

let parsed;
try {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    parsed = JSON.parse(codeBlockMatch[1].trim());
  } else {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { severity: 'normal', status_summary: 'No issues detected' };
  }
} catch (e) {
  parsed = { severity: 'normal', status_summary: 'Parse OK - ' + text.substring(0, 80) };
}

parsed.severity = parsed.severity || 'normal';
parsed.status_summary = parsed.status_summary || 'Status check complete';
parsed.issues = parsed.issues || [];
parsed.recommended_actions = parsed.recommended_actions || [];
parsed.agent = 'critical';  // Change per agent: 'critical', 'services', 'vps', 'errors', 'attacks'
parsed.timestamp = new Date().toISOString();

return [{ json: parsed }];
```

---

#### Needs Action? (IF Node)
```javascript
{
  "conditions": {
    "options": { "combinator": "or" },
    "conditions": [
      { "leftValue": "={{ $json.severity }}", "rightValue": "critical", "operator": { "type": "string", "operation": "equals" } },
      { "leftValue": "={{ $json.severity }}", "rightValue": "warning", "operator": { "type": "string", "operation": "equals" } }
    ]
  }
}
```

---

#### Format Email Alert (Code Node)
```javascript
const data = $input.first().json;

const severityEmoji = { critical: '🚨', warning: '⚠️', normal: '✅' };
const agentNames = {
  critical: 'Critical Monitor',
  services: 'Service Health',
  vps: 'VPS Resources',
  errors: 'Error Analysis',
  attacks: 'Attack Monitor'
};

const emoji = severityEmoji[data.severity] || '📢';
const agentName = agentNames[data.agent] || data.agent;
const bgColor = data.severity === 'critical' ? '#dc3545' : '#ffc107';
const textColor = data.severity === 'critical' ? 'white' : 'black';

let html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
html += `<div style="background: ${bgColor}; color: ${textColor}; padding: 20px; border-radius: 8px 8px 0 0;">`;
html += `<h1 style="margin: 0;">${emoji} NutriAI ${data.severity.toUpperCase()} Alert</h1>`;
html += `</div>`;
html += `<div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none;">`;
html += `<p><strong>Source:</strong> ${agentName}</p>`;
html += `<p><strong>Summary:</strong> ${data.status_summary || 'No summary'}</p>`;

if (data.issues?.length > 0) {
  html += `<h3>Issues:</h3><ul>${data.issues.map(i => `<li>${typeof i === 'string' ? i : JSON.stringify(i)}</li>`).join('')}</ul>`;
}
if (data.top_attackers?.length > 0) {
  html += `<h3>Top Attackers:</h3><ul>${data.top_attackers.map(a => `<li>${a.email}: ${a.attempts} attempts</li>`).join('')}</ul>`;
}
if (data.recommended_actions?.length > 0) {
  html += `<h3>Recommended Actions:</h3><ul>${data.recommended_actions.map(a => `<li>→ ${a}</li>`).join('')}</ul>`;
}

html += `<hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">`;
html += `<p style="color: #6c757d; font-size: 12px;">Timestamp: ${data.timestamp}</p>`;
html += `</div></div>`;

const subject = `${emoji} [NutriAI ${data.severity.toUpperCase()}] ${agentName}: ${(data.status_summary || 'Alert').substring(0, 50)}`;

return [{ json: { subject, html, severity: data.severity, agent: data.agent } }];
```

---

#### Send Email Alert (Email Send Node)
```json
{
  "type": "n8n-nodes-base.emailSend",
  "parameters": {
    "fromEmail": "support@nutriai.pl",
    "toEmail": "={{ $env.ALERT_EMAIL }}",
    "subject": "={{ $json.subject }}",
    "html": "={{ $json.html }}"
  },
  "credentials": {
    "smtp": {
      "id": "xxx",
      "name": "Hostinger SMTP"
    }
  }
}
```

**SMTP Credentials**:
| Field | Value |
|-------|-------|
| Host | smtp.hostinger.com |
| Port | 465 |
| User | support@nutriai.pl |
| Password | (your SMTP password) |
| SSL | true |

---

## 6. AI Agent Prompts

### Critical Monitor Agent
```
You are a critical infrastructure monitoring agent for NutriAI (nutrition tracking app). Your job is to detect IMMEDIATE threats requiring urgent action.

ANALYZE for:
- Service outages (nutriapp not running = CRITICAL)
- Health score below 70 = CRITICAL, below 85 = WARNING
- Database connection errors = CRITICAL
- API unreachable = CRITICAL
- High response time (>5000ms) = WARNING

RESPOND with JSON only:
{
  "severity": "critical|warning|normal",
  "status_summary": "One sentence summary",
  "issues": ["issue1", "issue2"],
  "recommended_actions": ["action1", "action2"]
}

Be concise. Only flag critical/warning if there's a REAL problem.
```

---

### Services Health Agent
```
You are a service health monitoring agent for NutriAI. Monitor PM2 processes and system services.

ANALYZE for:
- Service down/not running = CRITICAL
- CPU > 90% for any service = CRITICAL
- CPU > 75% = WARNING
- Memory > 90% = CRITICAL
- Memory > 80% = WARNING
- Recent restart (uptime < 5 min) with multiple restarts = WARNING (crash loop)
- High restart count = WARNING

Services: nutriapp (main app), lsws (web server), redis-server (cache)

RESPOND with JSON only:
{
  "severity": "critical|warning|normal",
  "status_summary": "Service health summary",
  "issues": ["specific issues"],
  "degraded_services": ["service names"],
  "recommended_actions": ["actions"]
}
```

---

### VPS Resources Agent
```
You are a VPS resource monitoring agent for NutriAI running on a 2-core VPS.

ANALYZE for:
- CPU > 95% = CRITICAL (server overload)
- CPU > 80% = WARNING
- Memory > 95% = CRITICAL (OOM risk)
- Memory > 85% = WARNING
- Disk > 95% = CRITICAL (disk full imminent)
- Disk > 85% = WARNING
- Load average > 4 (2x cores) = CRITICAL
- Load average > 2.5 = WARNING
- Network errors > 0 = WARNING

RESPOND with JSON only:
{
  "severity": "critical|warning|normal",
  "status_summary": "VPS health summary",
  "issues": ["specific problems"],
  "resource_alerts": ["CPU at X%", "Memory at X%"],
  "recommended_actions": ["actions"]
}
```

---

### Error Analysis Agent
```
You are an error log analysis agent for NutriAI (Node.js/Express app).

ANALYZE for:
- Error spike (>50 errors/hour) = CRITICAL
- Error spike (>20 errors/hour) = WARNING
- Repeated errors from same source = WARNING (pattern detected)
- Database errors = CRITICAL
- Authentication errors = WARNING
- Email sending errors = WARNING (may indicate rate limiting)
- "Ratelimit exceeded" = INFO (expected during attacks)

Look for PATTERNS in error messages.

RESPOND with JSON only:
{
  "severity": "critical|warning|normal",
  "status_summary": "Error situation summary",
  "issues": ["specific error descriptions"],
  "error_patterns": ["pattern: X errors from Y"],
  "recommended_actions": ["actions"]
}
```

---

### Attack Monitor Agent
```
You are a security monitoring agent for NutriAI tracking spam/DDoS attacks.

CONTEXT: NutriAI is under ongoing attack from automated bots hitting the registration endpoint. Known attackers include:
- daren@alphv.com (ALPHV/BlackCat ransomware group domain)
- Various spam bots

ANALYZE for:
- Known ransomware group domains = WARNING (flag for awareness)
- Active attack (is_under_attack: true) = INFO (rate limiting is working)
- New attacker with >1000 attempts = WARNING
- Attack volume increasing significantly = WARNING

RESPOND with JSON only:
{
  "severity": "critical|warning|normal",
  "status_summary": "Attack status summary",
  "issues": ["specific concerns"],
  "top_attackers": [{"email": "...", "attempts": N}],
  "recommended_actions": ["actions if needed"]
}

Note: If rate limiting is blocking attacks successfully, severity should be "normal" unless there are new concerns.
```

---

### OpenAI Node Configuration
```json
{
  "modelId": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "... system prompt ..." },
    { "role": "user", "content": "={{ JSON.stringify($json) }}" }
  ],
  "options": {
    "maxTokens": 400,
    "temperature": 0.1
  }
}
```

---

## 7. Data Structures

### AI Agent Output (Expected JSON)
```json
{
  "severity": "critical|warning|normal",
  "status_summary": "Brief description",
  "issues": ["list", "of", "issues"],
  "recommended_actions": ["action1", "action2"]
}
```

### Severity Levels
| Severity | Meaning | Email? |
|----------|---------|--------|
| `critical` | Immediate action required | ✅ Yes |
| `warning` | Attention needed soon | ✅ Yes |
| `normal` | All systems healthy | ❌ No |

---

## 8. Email Alert Formatting

### Email Subject Format
```
{emoji} [NutriAI {SEVERITY}] {Agent Name}: {summary}
```

**Examples**:
- `🚨 [NutriAI CRITICAL] Critical Monitor: Database connection failed`
- `⚠️ [NutriAI WARNING] VPS Resources: Memory at 87%`
- `⚠️ [NutriAI WARNING] Attack Monitor: Ransomware group domain detected`

### Severity Colors
| Severity | Background | Text Color |
|----------|------------|------------|
| Critical | `#dc3545` | white |
| Warning | `#ffc107` | black |

---

## 9. Deployment Steps

### Step 1: Deploy Monitoring Routes

1. **The routes are already created** in `server/routes/monitoring.ts`

2. **Add to .env**:
   ```bash
   MONITORING_API_KEY=nutriai-monitoring-key-change-in-production
   ```

3. **Build and deploy**:
   ```bash
   npm run build
   pm2 restart nutriapp
   ```

4. **Test endpoints**:
   ```bash
   curl "https://nutriai.online/api/monitoring/health"
   curl "https://nutriai.online/api/monitoring/status?key=nutriai-monitoring-key-change-in-production"
   curl "https://nutriai.online/api/monitoring/services?key=nutriai-monitoring-key-change-in-production"
   curl "https://nutriai.online/api/monitoring/vps?key=nutriai-monitoring-key-change-in-production"
   curl "https://nutriai.online/api/monitoring/errors?key=nutriai-monitoring-key-change-in-production"
   curl "https://nutriai.online/api/monitoring/attacks?key=nutriai-monitoring-key-change-in-production"
   ```

---

### Step 2: Set Up N8N

1. **SSH to VPS** (or use existing N8N instance):
   ```bash
   ssh root@72.61.182.248
   mkdir -p /opt/n8n
   cd /opt/n8n
   ```

2. **Create docker-compose.yml** (see Section 3)

3. **Start N8N**:
   ```bash
   docker compose up -d
   ```

4. **Access N8N UI** and create:
   - SMTP Credential (Hostinger)
   - OpenAI Credential

5. **Create workflow** using the nodes defined in Section 5

6. **Activate workflow**

---

### Step 3: Testing

1. **Manually trigger each schedule node** in N8N
2. **Follow through the workflow** step by step
3. **Verify emails** are sent for warning/critical

---

## Appendix: Threshold Reference

### Critical Thresholds (Immediate Alert)
| Metric | Threshold |
|--------|-----------|
| Health Score | < 70 |
| CPU Usage | > 95% (VPS), > 90% (service) |
| Memory Usage | > 95% (VPS), > 90% (service) |
| Disk Usage | > 95% |
| Load Average | > 4 (2x cores) |
| Errors/Hour | > 50 |
| Service Status | Not "running" |
| Database | Connection error |

### Warning Thresholds
| Metric | Threshold |
|--------|-----------|
| Health Score | < 85 |
| CPU Usage | > 80% (VPS), > 75% (service) |
| Memory Usage | > 85% (VPS), > 80% (service) |
| Disk Usage | > 85% |
| Load Average | > 2.5 |
| Errors/Hour | > 20 |
| Service Uptime | < 5 minutes with multiple restarts |
| Network Errors | > 0 |

---

*Document Version: 1.0*  
*Last Updated: January 5, 2026*  
*System: NutriAI Monitoring v1*
