# 🚨 ATTACK EVIDENCE REPORT - NutriAI Server

**Date:** December 29, 2025  
**Status:** ONGOING ATTACK

---

## ATTACK SUMMARY

| Metric | Value |
|--------|-------|
| **Total Registration Attacks** | **552,109+ attempts** |
| **Blocked Requests (429)** | 40,479+ |
| **SMTP Rate Limit Errors** | 664,493 errors |
| **Attack Frequency** | ~1 request per second (continuous) |
| **Attack Status** | **ONGOING (still running right now)** |

---

## TOP ATTACKERS

| Email | Attempts | Notes |
|-------|----------|-------|
| `daren@alphv.com` | **293,421** | 🔴 **ALPHV/BlackCat ransomware group domain** |
| `me@azbahri.my` | **217,136** | Malaysian domain |
| `binhong@binhong.me` | **41,552** | Personal domain |

---

## ATTACK PATTERN - DDoS-Style Spam Registration

Logs show continuous automated requests **every single second**:

```
3:15:19 PM [express] POST /api/auth/register 429 in 0ms
3:15:20 PM [express] POST /api/auth/register 429 in 0ms
3:15:21 PM [express] POST /api/auth/register 429 in 1ms
3:15:22 PM [express] POST /api/auth/register 429 in 0ms
3:15:23 PM [express] POST /api/auth/register 429 in 1ms
... (continues 24/7)
```

---

## SMTP ERRORS FROM ATTACK OVERLOAD

The attack volume caused our email provider (Hostinger) to rate-limit us:

```
❌ Error sending email to daren@alphv.com: Message failed: 
   451 4.7.1 Ratelimit "hostinger_out_ratelimit" exceeded

Error: Message failed: 451 4.7.1 Ratelimit "hostinger_out_ratelimit" exceeded
    at SMTPConnection._formatError
    code: 'EMESSAGE',
    responseCode: 451,
    command: 'DATA'
```

---

## ADDITIONAL MALICIOUS PROBING

Besides the spam attack, the server is also getting probed for vulnerabilities:

```bash
# Vulnerability scanners:
"CensysInspect/1.1" → GET /login (security scanning)
"zgrab/0.x" → GET /login (penetration testing tool)
"l9scan/2.0" → GET /login.action (leakix.net scanner)
"cisco-sma-exposure-check" → Looking for Cisco exploits

# WordPress attacks:
GET /wp-login.php → Trying to find WordPress admin panels
GET /wp-includes/SimplePie/wp-login.php → Scanning for backdoors

# VPN exploit attempts:
GET /remote/login → FortiGate VPN exploit scanning
GET /global-protect/login.esp → Palo Alto VPN scanning
GET /Citrix/XenApp/auth/login.aspx → Citrix exploit scanning

# Admin panel hunting:
GET //admin/login.asp
GET /jasperserver/login.html
GET /jasperserver-pro/login.html
```

---

## ABOUT ALPHV/BlackCat

The domain `alphv.com` is associated with the **ALPHV/BlackCat ransomware group** - one of the most notorious ransomware operations that:

- Has targeted hospitals, schools, and critical infrastructure
- Collected over $300 million in ransom payments
- Was subject to FBI seizure in December 2023
- The group later "exit scammed" and rebranded

---

## MITIGATION DEPLOYED

Implemented rate limiting that blocks attackers after 3 attempts per 15 minutes:

```typescript
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  message: { error: "Too many registration attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
```

The attackers are now receiving `429 Too Many Requests` responses continuously - but they're still hammering the server 24/7.

---

## CONCLUSION

We're getting ~550,000+ spam registration attempts, including from a domain associated with a major ransomware gang. The attack is automated and has been running non-stop for days. Rate limiting is now blocking them, but they're persistent.
