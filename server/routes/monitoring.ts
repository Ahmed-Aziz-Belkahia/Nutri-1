import { Router, Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import { db } from '@db';
import { sql } from 'drizzle-orm';

const router = Router();

// API Key authentication for monitoring endpoints — MUST be set via environment variable
const MONITORING_API_KEY = process.env.MONITORING_API_KEY;

if (!MONITORING_API_KEY) {
  console.warn('[Monitoring] WARNING: MONITORING_API_KEY not set. Monitoring endpoints will reject all requests.');
}

function checkApiKey(req: Request, res: Response, next: Function) {
  const apiKey = req.query.key as string || req.headers['x-api-key'] as string;
  if (apiKey !== MONITORING_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }
  next();
}

// Helper to get process info
function getProcessInfo(processName: string): { status: string; pid?: number; cpu_percent?: number; memory_percent?: number; memory_mb?: number; uptime_hours?: number } {
  try {
    // Try to get PM2 process info
    const pm2Output = execSync(`pm2 jlist 2>/dev/null || echo "[]"`, { encoding: 'utf-8' });
    const pm2Processes = JSON.parse(pm2Output);
    
    const proc = pm2Processes.find((p: any) => p.name === processName || p.name.includes(processName));
    if (proc && proc.pm2_env.status === 'online') {
      const uptimeMs = Date.now() - proc.pm2_env.pm_uptime;
      return {
        status: 'running',
        pid: proc.pid,
        cpu_percent: proc.monit?.cpu || 0,
        memory_percent: ((proc.monit?.memory || 0) / os.totalmem()) * 100,
        memory_mb: (proc.monit?.memory || 0) / (1024 * 1024),
        uptime_hours: uptimeMs / (1000 * 60 * 60)
      };
    }
  } catch (e) {
    // PM2 not available or error
  }
  
  return { status: 'unknown' };
}

// Helper to check service status
function checkServiceStatus(serviceName: string): { status: string; metadata?: any } {
  try {
    if (process.platform === 'linux') {
      const result = execSync(`systemctl is-active ${serviceName} 2>/dev/null || echo "inactive"`, { encoding: 'utf-8' }).trim();
      return { status: result === 'active' ? 'running' : 'stopped' };
    }
  } catch (e) {
    return { status: 'unknown' };
  }
  return { status: 'unknown' };
}

// ==========================================
// ENDPOINT 1: System Status (Overall Health)
// ==========================================
router.get('/status', checkApiKey, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    let dbStatus = 'running';
    try {
      db.get(sql`SELECT 1 as test`);
    } catch (e) {
      dbStatus = 'error';
    }
    
    // Get PM2 app status
    const appStatus = getProcessInfo('nutriapp');
    
    // Calculate health score
    let healthScore = 100;
    const issues: string[] = [];
    
    if (dbStatus !== 'running') {
      healthScore -= 40;
      issues.push('database_error');
    }
    if (appStatus.status !== 'running') {
      healthScore -= 30;
      issues.push('app_not_running');
    }
    
    // Check memory
    const memUsed = os.totalmem() - os.freemem();
    const memPercent = (memUsed / os.totalmem()) * 100;
    if (memPercent > 90) {
      healthScore -= 20;
      issues.push('high_memory');
    }
    
    // Check CPU load
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    if (loadAvg > cpuCount * 2) {
      healthScore -= 15;
      issues.push('high_load');
    }
    
    // Determine overall health
    let overallHealth = 'healthy';
    if (healthScore < 70) overallHealth = 'critical';
    else if (healthScore < 85) overallHealth = 'degraded';
    
    res.json({
      health_score: Math.max(0, healthScore),
      overall_health: overallHealth,
      services: {
        nutriapp: { status: appStatus.status, metadata: { pid: appStatus.pid } },
        database: { status: dbStatus, metadata: null },
        lsws: checkServiceStatus('lsws'),
        redis: checkServiceStatus('redis-server')
      },
      immediate_issues: issues,
      response_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system status', details: String(error) });
  }
});

// ==========================================
// ENDPOINT 2: Services Health (Per-Service Details)
// ==========================================
router.get('/services', checkApiKey, async (req: Request, res: Response) => {
  try {
    const services: any[] = [];
    
    // Get PM2 processes
    try {
      const pm2Output = execSync(`pm2 jlist 2>/dev/null || echo "[]"`, { encoding: 'utf-8' });
      const pm2Processes = JSON.parse(pm2Output);
      
      for (const proc of pm2Processes) {
        const uptimeMs = proc.pm2_env.status === 'online' ? (Date.now() - proc.pm2_env.pm_uptime) : 0;
        services.push({
          service: proc.name,
          status: proc.pm2_env.status === 'online' ? 'running' : 'stopped',
          pid: proc.pid || null,
          cpu_percent: proc.monit?.cpu || 0,
          memory_percent: ((proc.monit?.memory || 0) / os.totalmem()) * 100,
          memory_mb: (proc.monit?.memory || 0) / (1024 * 1024),
          uptime_hours: uptimeMs / (1000 * 60 * 60),
          restarts: proc.pm2_env.restart_time || 0,
          type: 'pm2'
        });
      }
    } catch (e) {
      // PM2 not available
    }
    
    // Check system services
    const systemServices = ['lsws', 'redis-server'];
    for (const svc of systemServices) {
      const status = checkServiceStatus(svc);
      services.push({
        service: svc,
        status: status.status,
        type: 'systemd'
      });
    }
    
    res.json({
      services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get services health', details: String(error) });
  }
});

// ==========================================
// ENDPOINT 3: VPS Resources (Server Metrics)
// ==========================================
router.get('/vps', checkApiKey, async (req: Request, res: Response) => {
  try {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Get disk usage
    let diskInfo = { percent: 0, used: 0, total: 0, free: 0 };
    try {
      if (process.platform === 'linux') {
        const dfOutput = execSync("df -B1 / | tail -1", { encoding: 'utf-8' });
        const parts = dfOutput.trim().split(/\s+/);
        if (parts.length >= 4) {
          diskInfo = {
            total: parseInt(parts[1]) || 0,
            used: parseInt(parts[2]) || 0,
            free: parseInt(parts[3]) || 0,
            percent: parseInt(parts[4]) || 0
          };
        }
      }
    } catch (e) {
      // Disk info not available
    }
    
    // Get network info
    let networkInfo = { bytes_sent: 0, bytes_recv: 0, errors_in: 0, errors_out: 0 };
    try {
      if (process.platform === 'linux') {
        const netOutput = execSync("cat /proc/net/dev | grep -E 'eth0|ens' | head -1", { encoding: 'utf-8' });
        const parts = netOutput.trim().split(/\s+/);
        if (parts.length >= 11) {
          networkInfo = {
            bytes_recv: parseInt(parts[1]) || 0,
            bytes_sent: parseInt(parts[9]) || 0,
            errors_in: parseInt(parts[3]) || 0,
            errors_out: parseInt(parts[11]) || 0
          };
        }
      }
    } catch (e) {
      // Network info not available
    }
    
    // Get process and connection counts
    let processCount = 0;
    let connectionCount = 0;
    try {
      if (process.platform === 'linux') {
        processCount = parseInt(execSync("ps aux | wc -l", { encoding: 'utf-8' }).trim()) || 0;
        connectionCount = parseInt(execSync("ss -s | grep 'estab' | head -1 | awk '{print $4}' | tr -d ','", { encoding: 'utf-8' }).trim()) || 0;
      }
    } catch (e) {
      // Process/connection info not available
    }
    
    // Calculate CPU percent (rough estimate from load average)
    const cpuPercent = Math.min(100, (loadAvg[0] / cpus.length) * 100);
    
    res.json({
      data: {
        cpu: {
          percent: Math.round(cpuPercent * 10) / 10,
          load_1m: loadAvg[0],
          load_5m: loadAvg[1],
          load_15m: loadAvg[2],
          core_count: cpus.length
        },
        memory: {
          percent: Math.round((usedMem / totalMem) * 1000) / 10,
          used: usedMem,
          total: totalMem,
          available: freeMem
        },
        disk: diskInfo,
        network: networkInfo,
        system: {
          process_count: processCount,
          connection_count: connectionCount,
          uptime_hours: os.uptime() / 3600,
          platform: process.platform,
          node_version: process.version
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get VPS health', details: String(error) });
  }
});

// ==========================================
// ENDPOINT 4: Error Logs (PM2 Logs Analysis)
// ==========================================
router.get('/errors', checkApiKey, async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 1;
    const errors: any[] = [];
    let errorCount = 0;
    
    // Read PM2 error logs
    const logPaths = [
      '/root/.pm2/logs/nutriapp-error-0.log',
      '/root/.pm2/logs/nutriapp-error-1.log',
      '/root/.pm2/logs/nutriapp-error.log'
    ];
    
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    for (const logPath of logPaths) {
      try {
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf-8');
          const lines = logContent.split('\n').slice(-500); // Last 500 lines
          
          for (const line of lines) {
            if (line.includes('Error') || line.includes('error') || line.includes('❌')) {
              errorCount++;
              if (errors.length < 20) {
                errors.push({
                  level: line.includes('CRITICAL') ? 'CRITICAL' : 'ERROR',
                  message: line.substring(0, 300),
                  source: logPath.split('/').pop(),
                  timestamp: new Date().toISOString() // Approximate
                });
              }
            }
          }
        }
      } catch (e) {
        // Log file not accessible
      }
    }
    
    // Detect patterns
    const patterns: Record<string, number> = {};
    for (const err of errors) {
      // Extract error type
      const match = err.message.match(/Error[:\s]+([^\n:]+)/i);
      const errorType = match ? match[1].substring(0, 50) : 'Unknown';
      patterns[errorType] = (patterns[errorType] || 0) + 1;
    }
    
    res.json({
      count: errorCount,
      timeframe_hours: hours,
      errors,
      patterns,
      has_critical: errors.some(e => e.level === 'CRITICAL'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get error logs', details: String(error) });
  }
});

// ==========================================
// ENDPOINT 5: Attack Stats (Security Monitoring)
// ==========================================
router.get('/attacks', checkApiKey, async (req: Request, res: Response) => {
  try {
    let blockedRequests = 0;
    let attackerEmails: Record<string, number> = {};
    
    // Read PM2 output logs for 429 responses and registration attempts
    const logPaths = [
      '/root/.pm2/logs/nutriapp-out-0.log',
      '/root/.pm2/logs/nutriapp-out-1.log',
      '/root/.pm2/logs/nutriapp-out.log'
    ];
    
    for (const logPath of logPaths) {
      try {
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf-8');
          const lines = logContent.split('\n');
          
          for (const line of lines) {
            // Count 429 blocked requests
            if (line.includes('POST /api/auth/register 429')) {
              blockedRequests++;
            }
            // Count registration attempts by email
            const emailMatch = line.match(/Registration request: ([^\s]+@[^\s]+)/);
            if (emailMatch) {
              const email = emailMatch[1];
              attackerEmails[email] = (attackerEmails[email] || 0) + 1;
            }
          }
        }
      } catch (e) {
        // Log file not accessible
      }
    }
    
    // Sort attackers by count
    const topAttackers = Object.entries(attackerEmails)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, attempts: count }));
    
    const totalAttacks = Object.values(attackerEmails).reduce((a, b) => a + b, 0);
    
    res.json({
      blocked_requests_429: blockedRequests,
      total_registration_attempts: totalAttacks,
      top_attackers: topAttackers,
      is_under_attack: blockedRequests > 100 || totalAttacks > 1000,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get attack stats', details: String(error) });
  }
});

// ==========================================
// ENDPOINT 6: Health Check (Simple Ping)
// ==========================================
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
