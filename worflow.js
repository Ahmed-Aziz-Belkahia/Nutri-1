{
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "seconds"
            }
          ]
        }
      },
      "id": "cb0873ec-171c-44b7-b3ef-6d74b2f22db8",
      "name": "Every 30s - Critical",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [
        176,
        -144
      ],
      "typeVersion": 1
    },
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 2
            }
          ]
        }
      },
      "id": "8dc033d0-cce1-4a49-b6ca-677ef359346c",
      "name": "Every 2min - Health",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [
        176,
        64
      ],
      "typeVersion": 1
    },
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes"
            }
          ]
        }
      },
      "id": "166ca789-c109-42cc-8a08-18857dff1877",
      "name": "Every 5min - Business",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [
        176,
        256
      ],
      "typeVersion": 1
    },
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 10
            }
          ]
        }
      },
      "id": "abcd1919-0ee7-4486-a977-72febfb1b468",
      "name": "Every 10min - Logs",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [
        176,
        464
      ],
      "typeVersion": 1
    },
    {
      "parameters": {
        "url": "https://app.aminedesign.net/api/monitoring/status/?key=dev-monitoring-key-change-in-production",
        "options": {
          "timeout": 10000
        }
      },
      "id": "19965d26-5496-42ad-8121-df3ad808c75f",
      "name": "Fetch Status",
      "type": "n8n-nodes-base.httpRequest",
      "position": [
        384,
        -144
      ],
      "typeVersion": 4
    },
    {
      "parameters": {
        "url": "https://app.aminedesign.net/api/monitoring/services/?key=dev-monitoring-key-change-in-production",
        "options": {
          "timeout": 10000
        }
      },
      "id": "6b5a8671-7d82-4c4e-868a-53c4667fdfec",
      "name": "Fetch Services",
      "type": "n8n-nodes-base.httpRequest",
      "position": [
        384,
        64
      ],
      "typeVersion": 4
    },
    {
      "parameters": {
        "url": "https://app.aminedesign.net/api/vps/current/?key=dev-monitoring-key-change-in-production",
        "options": {
          "timeout": 10000
        }
      },
      "id": "9b4f4c3f-c1bf-4598-ac70-6f5ff9e24555",
      "name": "Fetch VPS Health",
      "type": "n8n-nodes-base.httpRequest",
      "position": [
        384,
        256
      ],
      "typeVersion": 4
    },
    {
      "parameters": {
        "url": "https://app.aminedesign.net/api/monitoring/errors/?key=dev-monitoring-key-change-in-production&hours=1&level=ERROR",
        "options": {
          "timeout": 10000
        }
      },
      "id": "3c5a0601-78e9-471c-b114-6d1f55ecc82f",
      "name": "Fetch Errors",
      "type": "n8n-nodes-base.httpRequest",
      "position": [
        384,
        464
      ],
      "typeVersion": 4
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\n\n// Handle API errors\nif (input.error || input.statusCode >= 400) {\n  return [{ json: {\n    timestamp: new Date().toISOString(),\n    source: 'critical_monitor',\n    api_error: true,\n    error_message: input.error || `HTTP ${input.statusCode}`,\n    health_score: 0,\n    immediate_issues: ['api_unreachable']\n  }}];\n}\n\nconst data = input;\n\n// Build concise context for AI\nconst context = {\n  timestamp: new Date().toISOString(),\n  source: 'critical_monitor',\n  health_score: data.health_score || 0,\n  overall_health: data.overall_health || 'unknown',\n  services_summary: {},\n  error_summary: {\n    count: data.error_count_last_hour || 0,\n    has_critical: data.has_critical_errors || false\n  }\n};\n\n// Summarize services\nif (data.services) {\n  for (const [name, info] of Object.entries(data.services)) {\n    context.services_summary[name] = {\n      status: info.status,\n      issues: info.status !== 'running' ? ['DOWN'] : []\n    };\n    if (info.metadata) {\n      if (info.metadata.connections > 50) context.services_summary[name].issues.push('high_connections');\n      if (info.metadata.slow_queries > 0) context.services_summary[name].issues.push('slow_queries');\n    }\n  }\n}\n\n// Detect immediate issues\ncontext.immediate_issues = [];\nif (data.health_score < 80) context.immediate_issues.push('low_health_score');\nif (data.has_critical_errors) context.immediate_issues.push('critical_errors');\nfor (const [name, info] of Object.entries(context.services_summary)) {\n  if (info.status !== 'running') context.immediate_issues.push(`${name}_down`);\n}\n\nreturn [{ json: context }];"
      },
      "id": "97dd2664-8953-41a5-b3ef-6aacc9b2dded",
      "name": "Prep Critical Context",
      "type": "n8n-nodes-base.code",
      "position": [
        576,
        -144
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\n\n// Handle API errors\nif (input.error || input.statusCode >= 400) {\n  return [{ json: {\n    timestamp: new Date().toISOString(),\n    source: 'services_monitor',\n    api_error: true,\n    error_message: input.error || `HTTP ${input.statusCode}`,\n    services: [],\n    issues: [{ service: 'api', type: 'unreachable', severity: 'critical' }]\n  }}];\n}\n\nconst data = input;\nconst context = {\n  timestamp: new Date().toISOString(),\n  source: 'services_monitor',\n  services: [],\n  issues: [],\n  warnings: []\n};\n\nconst services = data.services || [];\n\nfor (const svc of services) {\n  const svcInfo = {\n    name: svc.service,\n    status: svc.status,\n    cpu_percent: svc.cpu_percent || 0,\n    memory_percent: svc.memory_percent || 0,\n    uptime_hours: svc.uptime_hours || 0,\n    pid: svc.pid\n  };\n  \n  context.services.push(svcInfo);\n  \n  // Detect issues\n  if (svc.status !== 'running') {\n    context.issues.push({ service: svc.service, type: 'down', severity: 'critical' });\n  }\n  if (svc.cpu_percent > 80) {\n    context.warnings.push({ service: svc.service, type: 'high_cpu', value: svc.cpu_percent });\n  }\n  if (svc.memory_percent > 85) {\n    context.warnings.push({ service: svc.service, type: 'high_memory', value: svc.memory_percent });\n  }\n  if (svc.uptime_hours < 0.1 && svc.status === 'running') {\n    context.warnings.push({ service: svc.service, type: 'recent_restart', uptime_hours: svc.uptime_hours });\n  }\n}\n\nreturn [{ json: context }];"
      },
      "id": "320788b5-7c75-4f6a-a68d-efab0ddf9907",
      "name": "Prep Services Context",
      "type": "n8n-nodes-base.code",
      "position": [
        576,
        64
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\n\n// Handle API errors\nif (input.error || input.statusCode >= 400) {\n  return [{ json: {\n    timestamp: new Date().toISOString(),\n    source: 'vps_monitor',\n    api_error: true,\n    error_message: input.error || `HTTP ${input.statusCode}`,\n    issues: [{ type: 'api_unreachable', severity: 'critical' }]\n  }}];\n}\n\nconst data = input;\nconst d = data.data || data;\n\nconst context = {\n  timestamp: new Date().toISOString(),\n  source: 'vps_monitor',\n  cpu: {\n    percent: d.cpu?.percent || 0,\n    load_1m: d.cpu?.load_1m || 0,\n    load_5m: d.cpu?.load_5m || 0,\n    load_15m: d.cpu?.load_15m || 0,\n    cores: d.cpu?.core_count || 2\n  },\n  memory: {\n    percent: d.memory?.percent || 0,\n    used_gb: ((d.memory?.used || 0) / 1073741824).toFixed(2),\n    total_gb: ((d.memory?.total || 0) / 1073741824).toFixed(2)\n  },\n  disk: {\n    percent: d.disk?.percent || 0,\n    used_gb: ((d.disk?.used || 0) / 1073741824).toFixed(2),\n    total_gb: ((d.disk?.total || 0) / 1073741824).toFixed(2),\n    write_speed_mb: ((d.disk?.write_speed || 0) / 1048576).toFixed(2)\n  },\n  network: {\n    speed_up_kb: ((d.network?.speed_up || 0) / 1024).toFixed(2),\n    speed_down_kb: ((d.network?.speed_down || 0) / 1024).toFixed(2),\n    errors: (d.network?.errors_in || 0) + (d.network?.errors_out || 0)\n  },\n  system: {\n    process_count: d.system?.process_count || 0,\n    connection_count: d.system?.connection_count || 0\n  },\n  issues: [],\n  warnings: []\n};\n\n// Detect issues\nif (context.cpu.percent > 90) context.issues.push({ type: 'cpu_critical', value: context.cpu.percent });\nelse if (context.cpu.percent > 70) context.warnings.push({ type: 'cpu_high', value: context.cpu.percent });\n\nif (context.memory.percent > 90) context.issues.push({ type: 'memory_critical', value: context.memory.percent });\nelse if (context.memory.percent > 80) context.warnings.push({ type: 'memory_high', value: context.memory.percent });\n\nif (context.disk.percent > 90) context.issues.push({ type: 'disk_critical', value: context.disk.percent });\nelse if (context.disk.percent > 80) context.warnings.push({ type: 'disk_high', value: context.disk.percent });\n\nif (context.cpu.load_1m > context.cpu.cores * 2) context.warnings.push({ type: 'high_load', value: context.cpu.load_1m });\nif (context.network.errors > 0) context.warnings.push({ type: 'network_errors', value: context.network.errors });\n\nreturn [{ json: context }];"
      },
      "id": "59e46d95-34ae-4dca-9c2d-21085bfcaf65",
      "name": "Prep VPS Context",
      "type": "n8n-nodes-base.code",
      "position": [
        576,
        256
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\n\n// Handle API errors\nif (input.error || input.statusCode >= 400) {\n  return [{ json: {\n    timestamp: new Date().toISOString(),\n    source: 'error_monitor',\n    api_error: true,\n    error_message: input.error || `HTTP ${input.statusCode}`,\n    error_count: 0,\n    issues: [{ type: 'api_unreachable', severity: 'critical' }]\n  }}];\n}\n\nconst data = input;\nconst context = {\n  timestamp: new Date().toISOString(),\n  source: 'error_monitor',\n  error_count: data.count || 0,\n  timeframe_hours: data.timeframe_hours || 1,\n  level_filter: data.level_filter || 'ERROR',\n  errors: [],\n  patterns: {},\n  issues: [],\n  warnings: []\n};\n\nconst errors = data.errors || [];\n\n// Group errors by source\nfor (const err of errors) {\n  const source = err.logger_name || 'unknown';\n  if (!context.patterns[source]) context.patterns[source] = 0;\n  context.patterns[source]++;\n  \n  // Keep sample of each error\n  if (context.errors.length < 10) {\n    context.errors.push({\n      level: err.level,\n      source: source,\n      message: (err.message || '').substring(0, 200),\n      timestamp: err.timestamp\n    });\n  }\n}\n\n// Detect patterns\nfor (const [source, count] of Object.entries(context.patterns)) {\n  if (count >= 5) {\n    context.issues.push({ type: 'error_spike', source, count, severity: 'high' });\n  } else if (count >= 3) {\n    context.warnings.push({ type: 'error_pattern', source, count });\n  }\n}\n\nif (context.error_count > 10) {\n  context.issues.push({ type: 'high_error_rate', count: context.error_count, severity: 'high' });\n} else if (context.error_count > 5) {\n  context.warnings.push({ type: 'elevated_errors', count: context.error_count });\n}\n\nreturn [{ json: context }];"
      },
      "id": "6c746c62-506a-4cd1-98f1-d5e14166f03f",
      "name": "Prep Errors Context",
      "type": "n8n-nodes-base.code",
      "position": [
        576,
        464
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "modelId": {
          "__rl": true,
          "value": "gpt-4o-mini",
          "mode": "list",
          "cachedResultName": "GPT-4O-MINI"
        },
        "messages": {
          "values": [
            {
              "content": "You are a critical infrastructure monitoring agent for TTG (The Trading Guild) platform. Your job is to detect IMMEDIATE threats requiring urgent action.\n\nANALYZE for:\n- Service outages (any service not running = CRITICAL)\n- Health score below 70 = CRITICAL, below 85 = WARNING\n- Critical errors in last hour = CRITICAL\n- Database/Redis connection issues = CRITICAL\n- Multiple services degraded = WARNING\n\nRESPOND with JSON only:\n{\n  \"severity\": \"critical|warning|normal\",\n  \"status_summary\": \"One sentence summary\",\n  \"issues\": [\"issue1\", \"issue2\"],\n  \"degraded_services\": [\"service1\"],\n  \"recommended_actions\": [\"action1\", \"action2\"]\n}\n\nBe concise. Only flag critical/warning if there's a REAL problem. Normal operations = severity:normal.",
              "role": "system"
            },
            {
              "content": "={{ JSON.stringify($json) }}"
            }
          ]
        },
        "options": {
          "maxTokens": 400,
          "temperature": 0.1
        }
      },
      "id": "28af600b-6d19-4fd1-b551-c2ddc4f7104d",
      "name": "AI Critical Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [
        784,
        -144
      ],
      "typeVersion": 1,
      "credentials": {
        "openAiApi": {
          "id": "neKtztxvAHfMrrAy",
          "name": "OpenAi account"
        }
      }
    },
    {
      "parameters": {
        "modelId": {
          "__rl": true,
          "value": "gpt-4o-mini",
          "mode": "list",
          "cachedResultName": "GPT-4O-MINI"
        },
        "messages": {
          "values": [
            {
              "content": "You are a service health monitoring agent for TTG platform. Monitor individual service performance and resource usage.\n\nANALYZE for:\n- Service down/not running = CRITICAL\n- CPU > 90% for any service = CRITICAL\n- CPU > 75% = WARNING\n- Memory > 90% = CRITICAL  \n- Memory > 80% = WARNING\n- Recent restart (uptime < 5 min) = WARNING (possible crash loop)\n- Multiple services with high resource usage = WARNING\n\nServices to watch: lsws (web server), lsphp, mysql, redis, daphne (websockets)\n\nRESPOND with JSON only:\n{\n  \"severity\": \"critical|warning|normal\",\n  \"status_summary\": \"One sentence about overall service health\",\n  \"issues\": [\"specific issue descriptions\"],\n  \"degraded_services\": [\"service names with problems\"],\n  \"resource_alerts\": [\"CPU: service at X%\", \"Memory: service at X%\"],\n  \"recommended_actions\": [\"restart X\", \"investigate Y\"]\n}\n\nOnly report problems. Healthy services = severity:normal with brief summary.",
              "role": "system"
            },
            {
              "content": "={{ JSON.stringify($json) }}"
            }
          ]
        },
        "options": {
          "maxTokens": 400,
          "temperature": 0.1
        }
      },
      "id": "8a7e7ea8-bc6a-4fd7-b56c-dc097f9651f6",
      "name": "AI Services Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [
        784,
        64
      ],
      "typeVersion": 1,
      "credentials": {
        "openAiApi": {
          "id": "neKtztxvAHfMrrAy",
          "name": "OpenAi account"
        }
      }
    },
    {
      "parameters": {
        "modelId": {
          "__rl": true,
          "value": "gpt-4o-mini",
          "mode": "list",
          "cachedResultName": "GPT-4O-MINI"
        },
        "messages": {
          "values": [
            {
              "content": "You are a VPS resource monitoring agent for TTG platform running on a 2-core VPS.\n\nANALYZE for:\n- CPU > 95% = CRITICAL (server overload)\n- CPU > 80% = WARNING\n- Memory > 95% = CRITICAL (OOM risk)\n- Memory > 85% = WARNING\n- Disk > 95% = CRITICAL (disk full imminent)\n- Disk > 85% = WARNING\n- Load average > 4 (2x cores) = CRITICAL\n- Load average > 2.5 = WARNING\n- Network errors > 0 = WARNING\n- High connection count (> 500) = WARNING\n\nRESPOND with JSON only:\n{\n  \"severity\": \"critical|warning|normal\",\n  \"status_summary\": \"Brief VPS health summary\",\n  \"issues\": [\"specific problems found\"],\n  \"resource_alerts\": [\"CPU at X%\", \"Memory at X%\", \"Disk at X%\"],\n  \"recommended_actions\": [\"clear logs\", \"restart service\", \"add swap\"],\n  \"optimization_tips\": [\"optional tips if warning level\"]\n}\n\nHealthy VPS with normal metrics = severity:normal.",
              "role": "system"
            },
            {
              "content": "={{ JSON.stringify($json) }}"
            }
          ]
        },
        "options": {
          "maxTokens": 400,
          "temperature": 0.1
        }
      },
      "id": "d284819e-3957-4a9a-93a3-be4a8bdb620b",
      "name": "AI VPS Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [
        784,
        256
      ],
      "typeVersion": 1,
      "credentials": {
        "openAiApi": {
          "id": "neKtztxvAHfMrrAy",
          "name": "OpenAi account"
        }
      }
    },
    {
      "parameters": {
        "modelId": {
          "__rl": true,
          "value": "gpt-4o-mini",
          "mode": "list",
          "cachedResultName": "GPT-4O-MINI"
        },
        "messages": {
          "values": [
            {
              "content": "You are an error log analysis agent for TTG platform (Django/React app).\n\nANALYZE for:\n- Error spike (>10 errors/hour) = CRITICAL\n- Error spike (>5 errors/hour) = WARNING\n- Repeated errors from same source = WARNING (pattern detected)\n- Security-related errors (auth, permission, CSRF) = CRITICAL\n- Database errors = CRITICAL\n- Payment/Stripe errors = CRITICAL\n- 500 errors = WARNING\n- Timeout errors = WARNING\n\nLook for PATTERNS:\n- Same error repeating = likely bug or attack\n- Errors from specific endpoint = code issue\n- Auth errors = possible brute force\n- Database errors = connection/query issues\n\nRESPOND with JSON only:\n{\n  \"severity\": \"critical|warning|normal\",\n  \"status_summary\": \"Error situation summary\",\n  \"issues\": [\"specific error descriptions\"],\n  \"error_patterns\": [\"pattern: X errors from Y\"],\n  \"security_concerns\": [\"if any auth/security issues\"],\n  \"recommended_actions\": [\"check logs for X\", \"fix endpoint Y\"]\n}\n\nNo errors or minimal errors = severity:normal.",
              "role": "system"
            },
            {
              "content": "={{ JSON.stringify($json) }}"
            }
          ]
        },
        "options": {
          "maxTokens": 400,
          "temperature": 0.1
        }
      },
      "id": "0cb2ff61-e525-49e8-b8a2-0899e4fece0a",
      "name": "AI Errors Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [
        784,
        464
      ],
      "typeVersion": 1,
      "credentials": {
        "openAiApi": {
          "id": "neKtztxvAHfMrrAy",
          "name": "OpenAi account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nlet text = input.text || input.message?.content || input.content || '';\nif (typeof text === 'object') text = JSON.stringify(text);\n\nlet parsed;\ntry {\n  const codeBlockMatch = text.match(/```(?:json)?\\s*([\\s\\S]*?)```/);\n  if (codeBlockMatch) {\n    parsed = JSON.parse(codeBlockMatch[1].trim());\n  } else {\n    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);\n    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { severity: 'normal', status_summary: 'No issues detected' };\n  }\n} catch (e) {\n  parsed = { severity: 'normal', status_summary: 'Parse OK - ' + text.substring(0, 80), parse_error: e.message };\n}\n\nparsed.severity = parsed.severity || 'normal';\nparsed.status_summary = parsed.status_summary || 'Status check complete';\nparsed.issues = parsed.issues || [];\nparsed.recommended_actions = parsed.recommended_actions || [];\nparsed.agent = 'critical';\nparsed.timestamp = new Date().toISOString();\n\nreturn [{ json: parsed }];"
      },
      "id": "858a0852-f93a-4ca5-9f6c-f3c6cee2c041",
      "name": "Parse Critical Response",
      "type": "n8n-nodes-base.code",
      "position": [
        1184,
        -144
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nlet text = input.text || input.message?.content || input.content || '';\nif (typeof text === 'object') text = JSON.stringify(text);\n\nlet parsed;\ntry {\n  const codeBlockMatch = text.match(/```(?:json)?\\s*([\\s\\S]*?)```/);\n  if (codeBlockMatch) {\n    parsed = JSON.parse(codeBlockMatch[1].trim());\n  } else {\n    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);\n    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { severity: 'normal', status_summary: 'Services OK' };\n  }\n} catch (e) {\n  parsed = { severity: 'normal', status_summary: 'Parse OK - ' + text.substring(0, 80), parse_error: e.message };\n}\n\nparsed.severity = parsed.severity || 'normal';\nparsed.status_summary = parsed.status_summary || 'Services check complete';\nparsed.degraded_services = parsed.degraded_services || [];\nparsed.resource_alerts = parsed.resource_alerts || [];\nparsed.agent = 'services';\nparsed.timestamp = new Date().toISOString();\n\nreturn [{ json: parsed }];"
      },
      "id": "b3de683a-e791-4b6f-a39f-96f2bb5865f0",
      "name": "Parse Services Response",
      "type": "n8n-nodes-base.code",
      "position": [
        1184,
        64
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nlet text = input.text || input.message?.content || input.content || '';\nif (typeof text === 'object') text = JSON.stringify(text);\n\nlet parsed;\ntry {\n  const codeBlockMatch = text.match(/```(?:json)?\\s*([\\s\\S]*?)```/);\n  if (codeBlockMatch) {\n    parsed = JSON.parse(codeBlockMatch[1].trim());\n  } else {\n    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);\n    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { severity: 'normal', status_summary: 'VPS healthy' };\n  }\n} catch (e) {\n  parsed = { severity: 'normal', status_summary: 'Parse OK - ' + text.substring(0, 80), parse_error: e.message };\n}\n\nparsed.severity = parsed.severity || 'normal';\nparsed.status_summary = parsed.status_summary || 'VPS check complete';\nparsed.resource_alerts = parsed.resource_alerts || [];\nparsed.optimization_tips = parsed.optimization_tips || [];\nparsed.agent = 'vps';\nparsed.timestamp = new Date().toISOString();\n\nreturn [{ json: parsed }];"
      },
      "id": "fadbbfbc-be13-437a-bd34-b3399d0ffca4",
      "name": "Parse VPS Response",
      "type": "n8n-nodes-base.code",
      "position": [
        1184,
        256
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nlet text = input.text || input.message?.content || input.content || '';\nif (typeof text === 'object') text = JSON.stringify(text);\n\nlet parsed;\ntry {\n  const codeBlockMatch = text.match(/```(?:json)?\\s*([\\s\\S]*?)```/);\n  if (codeBlockMatch) {\n    parsed = JSON.parse(codeBlockMatch[1].trim());\n  } else {\n    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);\n    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { severity: 'normal', status_summary: 'No errors detected' };\n  }\n} catch (e) {\n  parsed = { severity: 'normal', status_summary: 'Parse OK - ' + text.substring(0, 80), parse_error: e.message };\n}\n\nparsed.severity = parsed.severity || 'normal';\nparsed.status_summary = parsed.status_summary || 'Error check complete';\nparsed.error_patterns = parsed.error_patterns || [];\nparsed.security_concerns = parsed.security_concerns || [];\nparsed.agent = 'errors';\nparsed.timestamp = new Date().toISOString();\n\nreturn [{ json: parsed }];"
      },
      "id": "6ce0ed62-4891-436a-af01-1363723cdbca",
      "name": "Parse Errors Response",
      "type": "n8n-nodes-base.code",
      "position": [
        1184,
        464
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 1
          },
          "conditions": [
            {
              "leftValue": "={{ $json.severity }}",
              "rightValue": "critical",
              "operator": {
                "type": "string",
                "operation": "equals"
              },
              "id": "902ea183-ddf4-4139-8423-597b71c5ecff"
            },
            {
              "leftValue": "={{ $json.severity }}",
              "rightValue": "warning",
              "operator": {
                "type": "string",
                "operation": "equals"
              },
              "id": "3f0c3551-44d2-4190-8def-e8de4542e7db"
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "504e5e7e-16e4-4ccd-805e-38ef362aadb0",
      "name": "Needs Action?",
      "type": "n8n-nodes-base.if",
      "position": [
        1392,
        160
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "jsCode": "const data = $input.first().json;\n\nconst severityEmoji = {\n  critical: '🚨',\n  warning: '⚠️',\n  normal: '✅'\n};\n\nconst agentNames = {\n  critical: 'Critical Monitor',\n  services: 'Service Health',\n  vps: 'VPS Resources',\n  errors: 'Error Analysis'\n};\n\nconst emoji = severityEmoji[data.severity] || '📢';\nconst agentName = agentNames[data.agent] || data.agent;\n\n// Build HTML email\nlet html = `<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">`;\nhtml += `<div style=\"background: ${data.severity === 'critical' ? '#dc3545' : '#ffc107'}; color: ${data.severity === 'critical' ? 'white' : 'black'}; padding: 20px; border-radius: 8px 8px 0 0;\">`;\nhtml += `<h1 style=\"margin: 0;\">${emoji} TTG ${data.severity.toUpperCase()} Alert</h1>`;\nhtml += `</div>`;\nhtml += `<div style=\"background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none;\">`;\nhtml += `<p><strong>Source:</strong> ${agentName}</p>`;\nhtml += `<p><strong>Summary:</strong> ${data.status_summary || 'No summary'}</p>`;\n\nif (data.issues?.length > 0) {\n  html += `<h3>Issues:</h3><ul>${data.issues.map(i => `<li>${i}</li>`).join('')}</ul>`;\n}\nif (data.degraded_services?.length > 0) {\n  html += `<p><strong>Degraded Services:</strong> ${data.degraded_services.join(', ')}</p>`;\n}\nif (data.resource_alerts?.length > 0) {\n  html += `<p><strong>Resource Alerts:</strong> ${data.resource_alerts.join(', ')}</p>`;\n}\nif (data.error_patterns?.length > 0) {\n  html += `<p><strong>Error Patterns:</strong> ${data.error_patterns.join(', ')}</p>`;\n}\nif (data.security_concerns?.length > 0) {\n  html += `<p style=\"color: #dc3545;\"><strong>Security Concerns:</strong> ${data.security_concerns.join(', ')}</p>`;\n}\nif (data.recommended_actions?.length > 0) {\n  html += `<h3>Recommended Actions:</h3><ul>${data.recommended_actions.map(a => `<li>→ ${a}</li>`).join('')}</ul>`;\n}\nif (data.optimization_tips?.length > 0) {\n  html += `<h3>Optimization Tips:</h3><ul>${data.optimization_tips.map(t => `<li>💡 ${t}</li>`).join('')}</ul>`;\n}\n\nhtml += `<hr style=\"border: none; border-top: 1px solid #dee2e6; margin: 20px 0;\">`;\nhtml += `<p style=\"color: #6c757d; font-size: 12px;\">Timestamp: ${data.timestamp}</p>`;\nhtml += `</div></div>`;\n\nconst subject = `${emoji} [TTG ${data.severity.toUpperCase()}] ${agentName}: ${data.status_summary?.substring(0, 50) || 'Alert'}`;\n\nreturn [{\n  json: {\n    subject: subject,\n    html: html,\n    text: `TTG ${data.severity.toUpperCase()} Alert\\n\\nSource: ${agentName}\\nSummary: ${data.status_summary}\\n\\nTimestamp: ${data.timestamp}`,\n    severity: data.severity,\n    agent: data.agent\n  }\n}];"
      },
      "id": "620ff192-fcea-49ac-8c69-2fb3800a90e6",
      "name": "Format Email Alert",
      "type": "n8n-nodes-base.code",
      "position": [
        1584,
        64
      ],
      "typeVersion": 2
    },
    {
      "parameters": {
        "fromEmail": "support@nutriai.pl",
        "toEmail": "=ahmadazizbelkahia@gmail.com",
        "subject": "={{ $json.subject }}",
        "html": "={{ $json.html }}",
        "options": {}
      },
      "id": "c6e7e9ee-795a-413d-99bb-e6a1ab46465b",
      "name": "Send Email Alert",
      "type": "n8n-nodes-base.emailSend",
      "position": [
        1792,
        64
      ],
      "typeVersion": 2.1,
      "webhookId": "0476e6a8-9f11-4988-85db-db003e13227b",
      "credentials": {
        "smtp": {
          "id": "2S2KM6SC0YKtSNaC",
          "name": "SMTP account"
        }
      }
    },
    {
      "parameters": {},
      "id": "98d274bb-a397-4ee7-9310-bd908b441d15",
      "name": "Log Normal Status",
      "type": "n8n-nodes-base.noOp",
      "position": [
        1584,
        256
      ],
      "typeVersion": 1
    }
  ],
  "connections": {
    "Every 30s - Critical": {
      "main": [
        [
          {
            "node": "Fetch Status",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Every 2min - Health": {
      "main": [
        [
          {
            "node": "Fetch Services",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Every 5min - Business": {
      "main": [
        [
          {
            "node": "Fetch VPS Health",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Every 10min - Logs": {
      "main": [
        [
          {
            "node": "Fetch Errors",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch Status": {
      "main": [
        [
          {
            "node": "Prep Critical Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch Services": {
      "main": [
        [
          {
            "node": "Prep Services Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch VPS Health": {
      "main": [
        [
          {
            "node": "Prep VPS Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch Errors": {
      "main": [
        [
          {
            "node": "Prep Errors Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prep Critical Context": {
      "main": [
        [
          {
            "node": "AI Critical Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prep Services Context": {
      "main": [
        [
          {
            "node": "AI Services Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prep VPS Context": {
      "main": [
        [
          {
            "node": "AI VPS Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prep Errors Context": {
      "main": [
        [
          {
            "node": "AI Errors Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Critical Agent": {
      "main": [
        [
          {
            "node": "Parse Critical Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Services Agent": {
      "main": [
        [
          {
            "node": "Parse Services Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI VPS Agent": {
      "main": [
        [
          {
            "node": "Parse VPS Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Errors Agent": {
      "main": [
        [
          {
            "node": "Parse Errors Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Critical Response": {
      "main": [
        [
          {
            "node": "Needs Action?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Services Response": {
      "main": [
        [
          {
            "node": "Needs Action?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse VPS Response": {
      "main": [
        [
          {
            "node": "Needs Action?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Errors Response": {
      "main": [
        [
          {
            "node": "Needs Action?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Needs Action?": {
      "main": [
        [
          {
            "node": "Format Email Alert",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Log Normal Status",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Format Email Alert": {
      "main": [
        [
          {
            "node": "Send Email Alert",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "56f22e2b25718de207d89e68e68e14fe45493958afaa14c6b42a9149c070bfba"
  }
}