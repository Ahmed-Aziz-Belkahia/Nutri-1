# NutriAI — iOS Launch Handbook

Everything you need to know to take this from the current state to TestFlight
and the App Store. Written to be read top to bottom once, then used as a
reference.

**Current branch:** `mvp-strip` (13 commits, unmerged into `main`)
**State:** typecheck 0 errors · `vite build` passes · 15/15 smoke tests pass

---

## 1. Do these first (blocking, in order)

### 1.1 Rotate the leaked credentials — highest priority

`.env` is committed to git history across five commits with **live** values:

| Secret | Notes |
|---|---|
| `OPENAI_API_KEY` | Live service key |
| `GOOGLE_CLIENT_SECRET` / `GOOGLE_CLIENT_ID` | Now unused (Google auth removed) but still leaked |
| `JWT_SECRET` | Weak — literal `nutri_` prefix, 32 chars |
| `JWT_REFRESH_SECRET`, `SESSION_SECRET` | |
| `SMTP_PASS` | |

Rotate every one at the provider, then:

```bash
git rm --cached .env
```

`.gitignore` already lists `.env`, but the file was committed *before* that
rule, so it is still tracked. Removing it from history needs `git filter-repo`.
**Nothing else on this list matters if the OpenAI key gets drained.**

Rotating `JWT_SECRET` invalidates every existing session — fine now, disruptive
after launch. Do it before you have users.

### 1.2 `VITE_API_BASE_URL` — already set ✅

Set in `.env` to `https://app.nutriai.online`. It is read at **build time**,
not runtime, so rebuild after changing it. The app logs a loud error if it is
missing rather than failing silently, because that is miserable to debug from
inside a WebView.

Your production deploy needs the same value in its own environment.

### 1.3 The API must be HTTPS with a valid certificate

App Transport Security blocks cleartext. A self-signed or expired cert means
every request fails on device with no useful error.

---

## 2. The Mac session

You cannot build iOS from Windows. Everything below needs macOS + Xcode.
Capacitor 8 uses Swift Package Manager, so **there is no CocoaPods step** —
no `pod install`.

```bash
git checkout mvp-strip
npm install
npm run ios:sync     # vite build && cap sync ios
npm run ios:open     # opens Xcode
```

### 2.1 Xcode file registration — already done ✅

`PrivacyInfo.xcprivacy` and `App.entitlements` are now registered in
`project.pbxproj`: the manifest is in the Resources build phase, and
`CODE_SIGN_ENTITLEMENTS` points at the entitlements file in both build
configurations. Verified structurally valid and confirmed to survive
`npx cap sync ios`.

Nothing to do — but if Xcode ever complains the project is corrupt, a backup of
the pre-edit file is the parent of commit `docs: app store connect sheet`.

### 2.2 Enable Sign in with Apple on the App ID

Apple Developer portal → Certificates, Identifiers & Profiles → your App ID →
enable **Sign in with Apple**.

The entitlement must be on *both* the App ID and the entitlements file.
Mismatch = provisioning failure at signing time.

### 2.3 Signing & Capabilities

- Set your **Team**. (This is the only signing step left.)
- Bundle identifier is already `online.nutriai.app` in both
  `capacitor.config.ts` and the Xcode project — consistent, nothing to change.

⚠️ **The bundle ID is effectively permanent** once the app exists in App Store
Connect. It is reverse-DNS of the domain you control. The old Android one
(`com.belkahiaahmad.restexpress`) was not suitable. Change it now or never —
and if you do change it, update `capacitor.config.ts` and `APPLE_BUNDLE_ID`
(§4.3) to match, or Apple sign-in breaks.

### 2.4 Test these specifically

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

---

## 3. App icon and splash

### 3.1 What was made

A **camera viewfinder framing a leaf**, white on the teal→blue brand gradient
(`#0CC5BA` → `#26A8FF`). Chosen because it states what the app does rather than
being a generic wellness leaf, and because the bracket silhouette stays
readable at 60px — the size it is actually seen at on a home screen.

Already generated and installed into `ios/App/App/Assets.xcassets/` (13 files:
AppIcon plus light and dark splash at every scale). **This is done — nothing to
do in Xcode for icons.**

### 3.2 Regenerating or switching concepts

```bash
node scripts/generate-app-assets.js                       # default: scan
ICON_CONCEPT=leaf node scripts/generate-app-assets.js     # plain leaf + AI spark
ICON_CONCEPT=bowl node scripts/generate-app-assets.js     # bowl + leaf
npx @capacitor/assets generate --ios --assetPath assets
```

Source artwork lives in `assets/` (`icon.png` 1024², `splash.png` /
`splash-dark.png` 2732²). The script renders SVG and flattens to PNG via sharp.

### 3.3 Three rules that cause rejections

Baked into the script — keep them if you replace the artwork:

1. **No alpha channel.** 1024×1024 flattened onto an opaque colour. An alpha
   channel is an automatic rejection at upload. Verify: `3 channels`.
2. **No baked rounded corners.** iOS applies its own mask; a pre-rounded icon
   looks visibly double-rounded on device.
3. **Splash mark stays centred and small.** iOS crops a square source hard
   across device aspect ratios — anything near the edge is lost.

### 3.4 Replacing with a designer's work

The generated icon is shippable but geometric-competent rather than crafted.
If you commission one:

- **Fiverr / Upwork** — $50–300, a few days. Fine for an MVP.
- **Dribbble / Behance**, hire directly — $300–1500, better originality.
- **Figma yourself** — export 1024×1024.

Whichever route: hand them §3.3 or you will get a file that fails at upload.
Then drop it at `assets/icon.png` and re-run the generate command — everything
downstream stays automated.

### 3.5 Known gotcha

`@capacitor/assets` bundles its own nested `sharp`. If it errors with a missing
binary, it is because the outer install used `--ignore-scripts`:

```bash
cd node_modules/@capacitor/assets && npm install --ignore-scripts=false sharp
```

---

## 4. Architecture: what changed for iOS

The app is a React SPA in a Capacitor WKWebView. Web assets are **bundled** and
served from `capacitor://localhost`. `server.url` is deliberately **unset** —
pointing the shell at the live site is the classic Guideline 4.2 rejection.

That local origin broke two things the web app assumed:

### 4.1 Relative API calls

`fetch('/api/…')` resolves against the local bundle, not your server. There are
~55 such call sites.

**Fix:** `client/src/lib/nativeApi.ts` installs a single interceptor that
rewrites relative URLs to `VITE_API_BASE_URL`. It patches **both `window.fetch`
and axios** — axios uses XHR and would otherwise bypass a fetch-only patch,
which would have silently broken the login path specifically.

No-op on web. Browser behaviour is unchanged.

### 4.2 Auth cookies do not work

Session cookies are `httpOnly` + `SameSite=Lax`: unreadable from JS *and* not
sent cross-site. **Auth would simply not have worked.**

**Fix:** the server already accepted `Authorization: Bearer`, so only issuance
changed. Tokens are returned in the response body **only when the
`X-Client-Platform` header is present**, so browsers keep cookie-only responses
and no token is ever exposed to web JS. The native app stores them in
`@capacitor/preferences`.

### 4.3 Sign in with Apple

`server/routes/apple-auth.ts` verifies the identity token against Apple's JWKS.
Identity is read **only from the verified payload**, never from the request
body.

Three Apple behaviours handled deliberately:

- Matches on **`sub`**, not email — the only field Apple sends on every sign-in.
- **Links to an existing email account** rather than creating a duplicate.
- Handles **no email** (Apple only sends it on first authorization) with an
  actionable error.

Audience is `APPLE_BUNDLE_ID` (defaults to `online.nutriai.app`).

### 4.4 Camera

`client/src/lib/camera.ts`. Native uses `@capacitor/camera`; web keeps
`react-webcam`. Native skips the permission/loading dance entirely — nothing
fires `onUserMedia`, so the old spinner would hang forever.

---

## 5. Commands

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
  column affinity coerces `"420"` → `420.0`. That bug was a type error SQLite
  masked, not a live runtime bug.
- The **date test uses a sanity window, not `isNaN`.** The bug produced a valid
  date around the year 58,000, not `Invalid Date`.

---

## 6. App Store requirements

| Requirement | Status |
|---|---|
| App icon, all sizes | ✅ Generated and installed |
| Splash, light + dark | ✅ Generated and installed |
| Camera/photo permission strings | ✅ In `Info.plist` |
| Portrait lock | ✅ |
| **5.1.1(v)** In-app account deletion | ✅ Endpoint + UI in `ProfileNew` |
| **4.8** Sign in with Apple | ✅ Implemented — needs App ID enabled (§2.2) |
| HTTPS / ATS | ⚠️ Depends on your server (§1.3) |
| Privacy manifest registered in target | ✅ Done in `project.pbxproj` |
| Entitlements wired to build config | ✅ `CODE_SIGN_ENTITLEMENTS` set |
| CORS allows `capacitor://localhost` | ✅ Hardcoded, not env-dependent |
| Privacy policy content | ✅ Names OpenAI, states retention + deletion |
| Privacy policy URL | ✅ `https://app.nutriai.online/privacy` (public route) |
| App Privacy answers | ⚠️ Written out in `APP-STORE-CONNECT.md` §3 — paste them in |
| Listing copy, keywords, review notes | ✅ Written in `APP-STORE-CONNECT.md` |
| Support URL | ❌ **YOU** — Apple requires a working help page |
| Screenshots | ❌ **YOU** — needs a device; 6.7" and 6.5" |
| Demo account for review | ❌ **YOU** — must be pre-populated with data |

### 6.1 App Privacy answers must match the manifest

**The exact answers to enter are in `APP-STORE-CONNECT.md` §3.**


`PrivacyInfo.xcprivacy` declares: email address, photos, health & fitness, and
user content — all linked to the user, none used for tracking. **Your App Store
Connect answers must say the same thing.** If they disagree, that is a
rejection.

### 6.2 Guideline 4.2 — the main risk

Apple rejects apps that are "a website bundled as an app." A WebView shell is
the textbook case. What is already working in your favour:

- Native camera via the real plugin, not `getUserMedia`
- Haptics on capture
- Native status bar, splash, keyboard handling
- Sign in with Apple
- Assets bundled locally, not a remote URL

If rejected anyway, the usual remedy is more native surface: push
notifications, widgets, or offline support.

### 6.3 Guideline 1.4.1 — health content

**Unresolved, and worth attention before submission.** Onboarding collects
weight goals and a "weight loss speed." Apple scrutinises weight-loss apps and
is wary of anything encouraging unhealthy loss rates. AI-generated nutrition
advice also needs a visible disclaimer.

This is a content decision, not a code one. Suggested: cap the selectable loss
rate at a medically ordinary figure, and add a short disclaimer that the app
provides estimates and is not medical advice.

---

## 7. Known issues and risks

### 7.1 SQLite on a single VPS, no backups

`local.db` is one file on one machine, with no backup story. Fine for an MVP;
a disaster the first time the disk dies with real users on it. Either automate
backups (cheap — it is one file) or move to Postgres. **Do it while the DB is
empty.**

### 7.2 Repo weight

`.git` is ~560 MB. `attached_assets/` is 430 MB across 1,687 tracked files —
a scratch dump that includes vape-product mockups unrelated to this project.
`client/public/videos/` is another 395 MB (untracked).

Deleting the folder does not shrink history; that needs `git filter-repo`.
Should be its own commit, never mixed with code changes.

### 7.3 Pre-existing bugs that were fixed

Worth knowing they existed, since they suggest where else to look:

- **Registration was completely broken** — `require()` in an ESM module threw
  on every signup.
- **The AI token quota enforced nothing** — an unconditional `return next()`
  bypass meant OpenAI spend was uncapped per user.
- **Login failed within a second of email verification** — identical JWTs
  collided on a UNIQUE index. Fixed with a random `jti`.
- **Scanned meals showed a year-58,000 date** on the Recipes screen.
- **Ingredient quantities did not render** for scanned meals (`amount` vs
  `quantity`).

### 7.4 Left in deliberately

- `scripts/database/*` — legacy Postgres scripts, dead against SQLite. This is
  why `pg` survived the dependency cull.
- `setup.js` runs on `postinstall` and generates `DEPLOYMENT.md`, `deploy.sh`,
  `ecosystem.config.js`. Harmless, but do not commit those artifacts.

---

## 8. What the MVP is now

**Kept:** email auth (register, verify, forgot/reset password) · Sign in with
Apple · meal scanning (photo → gpt-4o → macros → food log) · ingredient scan →
recipe generation · recipe browse/detail/create · cooking mode · onboarding ·
settings/profile · a dashboard reduced to macros + today's meals.

**Removed:** meal plans, shopping lists, progress photos, weight logs, water
tracking, body-fat analysis, badges, streaks, notifications, AI coach, vision
board, admin dashboard, barcode scanning, marketplace, 4 of 5 languages.

| | Before | After |
|---|---|---|
| Pages | 65 | 22 |
| Components | 122 | 26 |
| `server/routes.ts` | 6,853 lines | ~2,100 |
| API endpoints | 119 | 30 |
| DB tables | 21 | 9 |
| npm packages | 133 | ~110 |

Net: **333 files changed, ~92,600 deletions.**

---

## 9. Suggested order from here

1. Rotate secrets (§1.1)
2. Mac session — build, register the two files, test on device (§2)
3. Fix whatever Apple sign-in needs after real-device testing
4. Health-content review (§6.3) and the disclaimer
5. Support + privacy policy URLs, screenshots, App Privacy answers (§6)
6. TestFlight → internal testing
7. Backups or Postgres before real users (§7.1)
8. Repo weight cleanup (§7.2) — any time, isolated commit
9. The UI overhaul

On the UI overhaul: decide what the app *is* in one sentence first. Right now
it is "scan meals" and "cook from your fridge" — two features that barely share
a screen. If the fridge flow is the hook, the dashboard may not deserve to be
the home screen at all. That is a product call worth making before a single
component gets styled.
