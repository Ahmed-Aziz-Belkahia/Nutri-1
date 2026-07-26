/**
 * End-to-end smoke test for the MVP surface.
 *
 * Covers the two features the app ships: meal scanning (food logs) and
 * ingredient-scan -> recipe generation, plus the auth flow that gates both.
 * Deliberately hits the real HTTP server and a real SQLite file rather than
 * mocking, because every bug this suite was written to catch lived in the
 * seams between Express, drizzle and the schema — not inside a unit.
 *
 * Uses node:test (built in, Node 20+) so it adds no dependencies.
 *
 *   npm run test:smoke
 *
 * Runs against a throwaway DB (tests/test.db) on port 5099, so it never
 * touches local.db or a running dev server. SMTP is pointed at a dead host;
 * the register path fires email as a swallowed promise, so nothing is sent.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const DB_PATH = path.join(__dirname, 'test.db');
const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}`;

let server;
let cookie = '';

/** fetch wrapper that carries the session cookie and parses JSON. */
async function api(method, urlPath, body) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    // Keep the latest value for each cookie name across the session.
    const jar = new Map(
      cookie.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c])
    );
    for (const c of setCookie) {
      const pair = c.split(';')[0];
      jar.set(pair.split('=')[0], pair);
    }
    cookie = [...jar.values()].join('; ');
  }

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON (e.g. the SPA fallback) — leave null and expose via .text */
  }
  return { status: res.status, json, text, contentType: res.headers.get('content-type') || '' };
}

function db() {
  return new Database(DB_PATH, { readonly: true });
}

before(async () => {
  // Fresh database for this run.
  execFileSync(process.execPath, ['scripts/reset-db.js', '--no-backup'], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_PATH: DB_PATH },
    stdio: 'pipe'
  });

  server = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(PORT),
      DATABASE_PATH: DB_PATH,
      // Point SMTP at a closed port so no real mail leaves the machine.
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1'
    },
    stdio: 'pipe'
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => (serverOutput += d));
  server.stderr.on('data', (d) => (serverOutput += d));

  // Poll until the server answers, rather than sleeping a fixed amount.
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(`Server did not start within 60s.\n\n${serverOutput}`);
    }
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
});

after(async () => {
  if (server && !server.killed) {
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'pipe' });
      } catch {
        server.kill('SIGKILL');
      }
    } else {
      server.kill('SIGKILL');
    }
  }
  // Give the OS a moment to release the file handle before unlinking.
  await new Promise((r) => setTimeout(r, 500));
  for (const suffix of ['', '-shm', '-wal']) {
    const f = DB_PATH + suffix;
    if (fs.existsSync(f)) {
      try {
        fs.rmSync(f);
      } catch {
        /* Windows may still hold the handle; the file is gitignored anyway */
      }
    }
  }
});

const EMAIL = 'smoke@example.test';
const PASSWORD = 'SmokeTest123!';

test('health check responds', async () => {
  const res = await api('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'healthy');
});

test('protected endpoints reject anonymous requests', async () => {
  for (const ep of ['/api/recipes', '/api/food-logs', '/api/user/profile']) {
    const res = await api('GET', ep);
    assert.equal(res.status, 401, `${ep} should be 401 when unauthenticated`);
  }
});

test('deleted feature endpoints are gone from the API', async () => {
  // These fall through to the SPA catch-all, so assert on content type:
  // an HTML response proves no JSON handler is mounted at that path.
  for (const ep of ['/api/meal-plans/all', '/api/shopping-list', '/api/weight-logs', '/api/admin/users']) {
    const res = await api('GET', ep);
    assert.ok(
      !res.contentType.includes('application/json'),
      `${ep} should no longer be served by an API handler (got ${res.contentType})`
    );
  }
});

test('registration creates a pending registration, not a user', async () => {
  const res = await api('POST', '/api/auth/register', {
    email: EMAIL,
    password: PASSWORD,
    username: 'smokeuser'
  });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  assert.equal(res.json.requiresVerification, true);

  const conn = db();
  const pending = conn.prepare('SELECT email FROM pending_registrations WHERE email = ?').get(EMAIL);
  const user = conn.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL);
  conn.close();

  assert.ok(pending, 'pending_registrations row should exist');
  assert.equal(user, undefined, 'user should not exist before verification');
});

test('email verification creates the account', async () => {
  const conn = db();
  const { verification_code: code } = conn
    .prepare('SELECT verification_code FROM pending_registrations WHERE email = ?')
    .get(EMAIL);
  conn.close();

  const res = await api('POST', '/api/auth/verify-email-code', { email: EMAIL, code });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.user.email, EMAIL);
});

test('login works immediately after verification (refresh-token jti regression)', async () => {
  // Two logins back-to-back inside the same second. Before the jti fix these
  // produced byte-identical JWTs and collided on refresh_tokens.token UNIQUE.
  const first = await api('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  assert.equal(first.status, 200, JSON.stringify(first.json));

  const second = await api('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  assert.equal(second.status, 200, JSON.stringify(second.json));

  const conn = db();
  const { c: total } = conn.prepare('SELECT COUNT(*) AS c FROM refresh_tokens').get();
  const { c: distinct } = conn.prepare('SELECT COUNT(DISTINCT token) AS c FROM refresh_tokens').get();
  conn.close();
  assert.equal(total, distinct, 'every issued refresh token must be distinct');
  assert.ok(total >= 3, 'verification + two logins should have issued at least 3 tokens');
});

test('authenticated session resolves the current user', async () => {
  const res = await api('GET', '/api/auth/me');
  assert.equal(res.status, 200);
  assert.equal(res.json.email, EMAIL);
});

test('recipe create / read / delete round-trips', async () => {
  const created = await api('POST', '/api/recipes', {
    name: 'Smoke Omelette',
    ingredients: ['3 eggs', 'butter'],
    instructions: ['Beat eggs', 'Cook gently'],
    calories: 320,
    protein: 22,
    carbs: 2,
    fat: 25
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const id = created.json.id;
  assert.ok(id, 'created recipe should have an id');

  const list = await api('GET', '/api/recipes');
  assert.equal(list.status, 200);
  assert.ok(
    list.json.some((r) => r.id === id),
    'created recipe should appear in the list'
  );

  const one = await api('GET', `/api/recipes/${id}`);
  assert.equal(one.status, 200);
  assert.equal(one.json.name, 'Smoke Omelette');
  assert.deepEqual(one.json.ingredients, ['3 eggs', 'butter']);

  const removed = await api('DELETE', `/api/recipes/${id}`);
  assert.equal(removed.status, 200);
  assert.equal(removed.json.success, true);
});

test('food log persists and reads back with correct macro values', async () => {
  // Note: this does NOT catch writing macros as strings — SQLite's `real`
  // column affinity coerces "420" to 420.0 on insert. It guards the round-trip
  // and would catch the columns being redefined as text.
  const res = await api('POST', '/api/food-logs', {
    name: 'Smoke Meal',
    calories: 420,
    protein: 30,
    carbs: 40,
    fat: 15
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));

  const conn = db();
  const row = conn.prepare('SELECT calories, protein, typeof(calories) AS ty FROM food_logs ORDER BY id DESC LIMIT 1').get();
  conn.close();

  assert.equal(row.ty, 'real', 'calories column must hold a real, not text');
  assert.equal(row.calories, 420);
  assert.equal(row.protein, 30);
});

test('scanned meals surfaced by GET /api/recipes carry a valid date', async () => {
  // Regression: GET /api/recipes folds scanned food logs into the recipe list
  // and did new Date(log.date * 1000) on a timestamp_ms column that drizzle
  // already returns as a Date. Multiplying a Date by 1000 coerces it to epoch
  // millis and still lands inside Date's representable range, so the result
  // parses fine but sits around the year 58,000 — hence the sanity window
  // below rather than a mere isNaN check.
  //
  // /api/recipes folds in logs with is_recipe = 1, and /api/food-logs/scanned
  // (asserted in the next test) needs a non-empty image. Seed both so neither
  // assertion runs over an empty list and passes vacuously.
  const seeded = await api('POST', '/api/food-logs', {
    name: 'Scanned Meal',
    calories: 200,
    protein: 10,
    carbs: 20,
    fat: 5,
    image: 'data:image/png;base64,iVBORw0KGgo=',
    isRecipe: true,
    ingredients: [{ name: 'egg', quantity: 2, unit: 'pcs' }],
    instructions: ['Cook it']
  });
  assert.equal(seeded.status, 200, JSON.stringify(seeded.json));

  const res = await api('GET', '/api/recipes');
  assert.equal(res.status, 200);
  const scanned = res.json.filter((r) => r.source === 'scanned');
  assert.ok(scanned.length > 0, 'seeded scanned meal should appear in /api/recipes');

  const dayMs = 24 * 60 * 60 * 1000;
  for (const item of scanned) {
    assert.ok(item.createdAt != null, 'createdAt must be present');
    const ts = new Date(item.createdAt).getTime();
    assert.ok(!Number.isNaN(ts), `createdAt should parse, got ${item.createdAt}`);
    assert.ok(
      Math.abs(Date.now() - ts) < dayMs,
      `createdAt should be within a day of now, got ${item.createdAt}`
    );
  }
});

test('GET /api/food-logs/scanned returns seeded scanned meals', async () => {
  const res = await api('GET', '/api/food-logs/scanned?limit=10');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json));
  assert.ok(res.json.length > 0, 'the meal seeded above should be returned');
  assert.ok(res.json.every((l) => typeof l.calories === 'number'));
});

test('daily food log list aggregates totals', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api('GET', `/api/food-logs?date=${today}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json.logs));
  assert.equal(typeof res.json.totals.calories, 'number');
});

test('AI token quota is enforced, not bypassed', async () => {
  // Regression: check-token-limit.ts had an unconditional `return next()`,
  // so the quota guarding OpenAI spend enforced nothing.
  const write = new Database(DB_PATH);
  const { id: userId } = write.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL);
  write.prepare('UPDATE user_token_limits SET daily_used = 99999, daily_token_limit = 10000 WHERE user_id = ?').run(userId);
  write.close();

  const blocked = await api('POST', '/api/food-logs', {
    name: 'Should Be Blocked',
    calories: 100,
    protein: 1,
    carbs: 1,
    fat: 1
  });
  assert.equal(blocked.status, 429, 'exhausted quota must return 429');

  const reset = new Database(DB_PATH);
  reset.prepare('UPDATE user_token_limits SET daily_used = 0 WHERE user_id = ?').run(userId);
  reset.close();

  const allowed = await api('POST', '/api/food-logs', {
    name: 'Should Be Allowed',
    calories: 100,
    protein: 1,
    carbs: 1,
    fat: 1
  });
  assert.equal(allowed.status, 200, 'request must succeed once quota resets');
});

test('logout clears the session', async () => {
  const res = await api('POST', '/api/auth/logout');
  assert.ok([200, 204].includes(res.status), `unexpected logout status ${res.status}`);

  cookie = '';
  const after = await api('GET', '/api/auth/me');
  assert.equal(after.status, 401, 'session should be unauthenticated after logout');
});
