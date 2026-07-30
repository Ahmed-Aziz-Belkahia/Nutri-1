# NutriAI — iOS Launch Handbook

What is left to do to take this to TestFlight and the App Store, plus the
reference material worth having on hand while you do it.

**Current branch:** `main` (the MVP work is merged and pushed)
**State:** typecheck 0 errors · `vite build` passes · 15/15 smoke tests pass

---

## 1. Before the Mac session

### 1.1 HTTPS / ATS — satisfied, but watch the expiry

`app.nutriai.online` serves a valid Let's Encrypt cert over TLS 1.3, which
clears App Transport Security. Nothing to issue.

⚠️ **The cert expires 4 October 2026.** Let's Encrypt is 90-day; if certbot's
renewal timer is not active, every installed app breaks at once on that date.
App Transport Security fails closed and gives no useful error on device, so it
presents as a total app outage with no clue why. Confirm on the VPS:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

Your production deploy also needs `VITE_API_BASE_URL` set in its own
environment.

---

## 2. The Mac session

You cannot build iOS from Windows. Everything below needs macOS + Xcode.
Capacitor 8 uses Swift Package Manager, so **there is no CocoaPods step** —
no `pod install`.

```bash
git checkout main
npm install
npm run ios:sync     # vite build && cap sync ios
npm run ios:open     # opens Xcode
```

`VITE_API_BASE_URL` is read at **build time**, not runtime. It comes from `.env`
in the repo, so the checkout has it — but if you ever change it, re-run
`ios:sync`. The app logs a loud error if it is missing rather than failing
silently, because that is miserable to debug from inside a WebView.

### 2.1 Enable Sign in with Apple on the App ID — do this first

Apple Developer portal → Certificates, Identifiers & Profiles → your App ID →
enable **Sign in with Apple**.

The entitlement must be on *both* the App ID and the entitlements file.
Mismatch = provisioning failure at signing time, so do this before you build.

### 2.2 Signing & Capabilities

- Set your **Team**. This is the only signing step.
- Bundle identifier is already `online.nutriai.app` in both
  `capacitor.config.ts` and the Xcode project — consistent, nothing to change.

⚠️ **The bundle ID is effectively permanent** once the app exists in App Store
Connect. Change it now or never — and if you do change it, update
`capacitor.config.ts` and `APPLE_BUNDLE_ID` (§3.3) to match, or Apple sign-in
breaks.

### 2.3 Test these specifically

Run on a **real device**, not just the simulator — the camera and Apple sign-in
do not meaningfully work in the simulator.

1. **Sign in with Apple.** Untested on hardware. The smoke test proves forged
   tokens are *rejected*; it cannot prove a real one is *accepted*, because
   that needs Apple's sheet on a real device. **Most likely thing to need
   adjustment.**
2. **Camera** on `/add-food` and `/scan-recipe` — should open the native iOS
   camera UI, not an in-page video feed.
3. **Session persistence** — force-quit and reopen; you should stay logged in.
4. **Safe areas** — no content under the notch or home indicator.
5. **Keyboard** — the capture button and bottom nav should not get pushed
   offscreen.

Onboarding through to the plan screen has been walked end to end in a browser
and asks for no login, so if that flow misbehaves on device it is the native
shell, not the flow.

### 2.4 App icon and splash — nothing to do

AppIcon and the light/dark splash are already installed in
`ios/App/App/Assets.xcassets/` and survive `npx cap sync ios`. There is no icon
step in Xcode and no asset catalog work to do.

If you ever replace the artwork, the only thing that matters for deployment:
the 1024×1024 icon must have **no alpha channel** (`3 channels`), or the App
Store rejects it automatically at upload. Source art lives in `assets/`;
re-run `npx @capacitor/assets generate --ios --assetPath assets` after changing
it.

---

## 3. Architecture: what changed for iOS

Reference, not a checklist — this is why the code looks the way it does.

The app is a React SPA in a Capacitor WKWebView. Web assets are **bundled** and
served from `capacitor://localhost`. `server.url` is deliberately **unset** —
pointing the shell at the live site is the classic Guideline 4.2 rejection.

That local origin broke two things the web app assumed:

### 3.1 Relative API calls

`fetch('/api/…')` resolves against the local bundle, not your server. There are
~55 such call sites.

`client/src/lib/nativeApi.ts` installs a single interceptor that rewrites
relative URLs to `VITE_API_BASE_URL`. It patches **both `window.fetch` and
axios** — axios uses XHR and would otherwise bypass a fetch-only patch, which
would have silently broken the login path specifically.

No-op on web. Browser behaviour is unchanged.

### 3.2 Auth cookies do not work

Session cookies are `httpOnly` + `SameSite=Lax`: unreadable from JS *and* not
sent cross-site. **Auth would simply not have worked.**

The server already accepted `Authorization: Bearer`, so only issuance changed.
Tokens are returned in the response body **only when the `X-Client-Platform`
header is present**, so browsers keep cookie-only responses and no token is
ever exposed to web JS. The native app stores them in `@capacitor/preferences`.

### 3.3 Sign in with Apple

`server/routes/apple-auth.ts` verifies the identity token against Apple's JWKS.
Identity is read **only from the verified payload**, never from the request
body.

Three Apple behaviours handled deliberately:

- Matches on **`sub`**, not email — the only field Apple sends on every sign-in.
- **Links to an existing email account** rather than creating a duplicate.
- Handles **no email** (Apple only sends it on first authorization) with an
  actionable error.

Audience is `APPLE_BUNDLE_ID` (defaults to `online.nutriai.app`).

### 3.4 Camera

`client/src/lib/camera.ts`. Native uses `@capacitor/camera`; web keeps
`react-webcam`. Native skips the permission/loading dance entirely — nothing
fires `onUserMedia`, so the old spinner would hang forever.

---

## 4. Commands

```bash
npm run dev            # dev server on :5000
npm run check          # tsc --noEmit (currently 0 errors)
npm run test:smoke     # 15 end-to-end tests, ~15s
npm run db:reset       # rebuild local.db from schema (backs up first)
npm run ios:sync       # vite build && cap sync ios
npm run ios:open       # open Xcode
```

**Use `npm run db:reset`, not `npm run db:push`.** `drizzle-kit push --force`
still prompts interactively for create-vs-rename decisions and **cannot run
headless** — it will hang CI or a non-TTY shell.

### The smoke suite

`tests/smoke.test.js`, built on `node:test` (no new dependencies). Runs the real
server against a throwaway DB on port 5099 with SMTP pointed at a closed port,
so it never touches `local.db` or sends mail.

Each regression test was verified by reverting its fix and confirming the test
fails. Two honest caveats recorded in the file:

- The **macros test does not catch writing macros as strings.** SQLite's `real`
  column affinity coerces `"420"` → `420.0`.
- The **date test uses a sanity window, not `isNaN`.** The bug produced a valid
  date around the year 58,000, not `Invalid Date`.

---

## 5. App Store requirements — what is outstanding

Icons, splash, permission strings, portrait lock, account deletion, the privacy
manifest, entitlements wiring, CORS, privacy policy content and URL, and the
listing copy are all done. What is left:

| Requirement | Status |
|---|---|
| Sign in with Apple | ⚠️ Implemented — needs App ID enabled (§2.1) |
| App Privacy answers | ⚠️ Written out in `APP-STORE-CONNECT.md` §3 — paste them in |
| Support URL | ❌ **YOU** — Apple requires a working help page |
| Screenshots | ❌ **YOU** — needs a device; 6.7" and 6.5" |
| Demo account for review | ❌ **YOU** — must be pre-populated with data |

### 5.1 App Privacy answers must match the manifest

**The exact answers to enter are in `APP-STORE-CONNECT.md` §3.**

`PrivacyInfo.xcprivacy` declares: email address, photos, health & fitness, and
user content — all linked to the user, none used for tracking. **Your App Store
Connect answers must say the same thing.** If they disagree, that is a
rejection.

### 5.2 Guideline 4.2 — the main risk

Apple rejects apps that are "a website bundled as an app." A WebView shell is
the textbook case. What is already working in your favour:

- Native camera via the real plugin, not `getUserMedia`
- Haptics on capture
- Native status bar, splash, keyboard handling
- Sign in with Apple
- Assets bundled locally, not a remote URL

If rejected anyway, the usual remedy is more native surface: push
notifications, widgets, or offline support.

### 5.3 Guideline 1.4.1 — health content

**Unresolved, and worth attention before submission.** Onboarding collects
weight goals and a "weight loss speed." Apple scrutinises weight-loss apps and
is wary of anything encouraging unhealthy loss rates. AI-generated nutrition
advice also needs a visible disclaimer.

This is a content decision, not a code one. Suggested: cap the selectable loss
rate at a medically ordinary figure, and add a short disclaimer that the app
provides estimates and is not medical advice.

---

## 6. Known issues and risks

### 6.1 SQLite on a single VPS, no backups

`local.db` is one file on one machine, with no backup story. Fine for an MVP;
a disaster the first time the disk dies with real users on it. Either automate
backups (cheap — it is one file) or move to Postgres. **Do it while the DB is
empty.**

### 6.2 Repo weight

`.git` is ~560 MB. `attached_assets/` is 430 MB across 1,687 tracked files —
a scratch dump that includes files unrelated to this project.
`client/public/videos/` is another 395 MB (untracked).

Deleting the folder does not shrink history; that needs `git filter-repo`.
Should be its own commit, never mixed with code changes.

### 6.3 Left in deliberately

- `scripts/database/*` — legacy Postgres scripts, dead against SQLite. This is
  why `pg` survived the dependency cull.
- `setup.js` runs on `postinstall` and generates `DEPLOYMENT.md`, `deploy.sh`,
  `ecosystem.config.js`. Harmless, but do not commit those artifacts.

---

## 7. What the MVP is

**Kept:** email auth (register, verify, forgot/reset password) · Sign in with
Apple · meal scanning (photo → gpt-4o → macros → food log) · ingredient scan →
recipe generation · recipe browse/detail/create · cooking mode · onboarding ·
settings/profile · a dashboard reduced to macros + today's meals.

**Removed:** meal plans, shopping lists, progress photos, weight logs, water
tracking, body-fat analysis, badges, streaks, notifications, AI coach, vision
board, admin dashboard, barcode scanning, marketplace, 4 of 5 languages.

22 pages, 26 components, 30 API endpoints, 9 DB tables.

---

## 8. Suggested order from here

1. Mac session — Team, App ID, build, test on device (§2)
2. Fix whatever Apple sign-in needs after real-device testing
3. Health-content review (§5.3) and the disclaimer
4. Support URL, screenshots, App Privacy answers (§5)
5. TestFlight → internal testing
6. Backups or Postgres before real users (§6.1)
7. Repo weight cleanup (§6.2) — any time, isolated commit
8. The UI overhaul

On the UI overhaul: decide what the app *is* in one sentence first. Right now
it is "scan meals" and "cook from your fridge" — two features that barely share
a screen. If the fridge flow is the hook, the dashboard may not deserve to be
the home screen at all. That is a product call worth making before a single
component gets styled.
