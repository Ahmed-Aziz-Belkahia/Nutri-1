# NutriAI — iOS Release Handoff

**For:** the founder — you have the Mac and the Apple Developer account
**Everything here needs one of those two things.** Everything that didn't has
already been done.

The app is code-complete for the MVP: typecheck clean, production build passes,
16/16 smoke tests pass. What's left is the parts of shipping that can only
happen on macOS or inside Apple's portals.

**Rough time:** half a day of hands-on work, then 24–48 hours of Apple review.

Two companion documents, both in the repo:
- `APP-STORE-CONNECT.md` — the exact text to paste into every App Store Connect
  field. Written out already; don't compose anything from scratch.
- `IOS-LAUNCH.md` — architecture and why the code looks the way it does. Read
  only if something breaks.

---

## Step 0 — Read this before doing anything

We plan to retire the old NutriAI app and ship this as a brand-new one. **One
fact governs the whole plan: an App Store bundle ID can never be reused.** Once
a bundle ID has shipped an app, it is permanently bound to that app record —
removing the app from sale does not release it.

So, first thing, before you touch anything else:

**App Store Connect → the old app → App Information → find the Bundle ID.**

| What you see | What to do |
|---|---|
| `online.nutriai.app` | **Stop and message Ahmad.** The repo is currently configured with this exact ID and it will need changing in three places before you can build. Ten-minute fix on his side. |
| Anything else | You're clear. Continue to Step 1. |

### One thing worth deciding first

Shipping this as an **update to the existing app record** rather than a new app
is genuinely lower-risk, and it is worth ten seconds of thought before you
commit to the new-app route:

- You keep your ratings and reviews. New app = they reset to zero.
- Existing users update normally. With a new app they get no upgrade path — the
  old app keeps working but never updates, and they must find and install the
  new one by hand.
- Sign in with Apple keeps working. **This is the sharp edge:** Apple's user
  identifier is scoped per app, so a new bundle ID hands us a different
  identifier for the same person, and the server won't recognise returning
  users. Most would be recovered by email matching, but anyone who used **Hide
  My Email** gets a new relay address too and is unrecoverable.
- You skip Guideline 4.3 (duplicate apps) entirely.

Apple has no rule requiring visual or functional continuity between versions, so
a total rewrite shipped as an update is completely routine.

**Starting fresh is still the right call if** the old app's ratings are bad
enough to be worth escaping, it's effectively a different product now, or it's
on an account you no longer control. Your call — the rest of this document
covers the new-app route, and if you'd rather ship as an update, skip Step 1 and
Step 3 and everything else stands.

---

## Step 1 — Retire the old app

**You cannot delete a released app.** App Store Connect only offers deletion for
records that never had an approved version. For anything that has been on sale,
the option is *Remove from Sale*, and the record stays in your account forever.

1. App Store Connect → **My Apps** → the old app
2. **Pricing and Availability**
3. Set availability to **Remove from Sale** (or deselect all countries/regions)
4. Save

What this does: the app vanishes from search and its store page within a few
hours. **Existing installs keep working** — they just never get another update.
No new downloads.

*If the old app genuinely never shipped an approved version*, you'll instead
find **App Information → Delete App**. Use it if it's there; the bundle ID still
isn't recoverable.

**Do this before you submit the new app**, not after. Two near-identical NutriAI
apps live at once is what triggers a Guideline 4.3 duplicate-app rejection.

---

## Step 2 — Set up the Mac

Skip whichever of these you already have.

1. **Xcode** — install from the Mac App Store, then **open it once** and let it
   finish installing components. Do this first; it's the slowest step and it
   runs unattended.
2. **Node.js** — LTS, from nodejs.org or `brew install node`. Verify:
   ```bash
   node -v      # v20 or newer
   ```
3. **Your Apple ID in Xcode** — Xcode → Settings → Accounts → **+** → Apple ID.
   Confirm your team appears.

---

## Step 3 — Create the App ID and enable Sign in with Apple

**Do this before you open the project.** The Sign in with Apple entitlement has
to exist on *both* the App ID and in the app's entitlements file. If it's only
in the file, signing fails with an error that doesn't explain itself.

1. [developer.apple.com](https://developer.apple.com) → **Certificates,
   Identifiers & Profiles** → **Identifiers** → **+**
2. Select **App IDs** → **App**
3. Fill in:
   - **Description:** NutriAI
   - **Bundle ID:** **Explicit**, and enter the new ID *(if you're keeping
     `online.nutriai.app` because the old app used something else, use that)*
4. Under **Capabilities**, tick **Sign in with Apple**
5. **Continue** → **Register**

> **If you're changing the bundle ID:** tell Ahmad the new value before you
> build. It lives in `capacitor.config.ts`, the Xcode project, and the server's
> `APPLE_BUNDLE_ID`, and Apple sign-in breaks silently if they disagree.

> **Optional, but only possible now:** if you want existing Apple sign-in users
> to keep their accounts under a new bundle ID, Apple lets you group App IDs so
> they share one user identifier — on the Sign in with Apple capability, choose
> **Edit** and group the new App ID with the old one as primary. This cannot be
> done after the app ships.

---

## Step 4 — Create the app record in App Store Connect

1. App Store Connect → **My Apps** → **+** → **New App**
2. **Platform:** iOS
3. **Name:** must be unique across the entire App Store. If "NutriAI" is taken
   (possibly by your own old record) try "NutriAI — Calorie Scanner" or similar.
   This is the name shown under the icon.
4. **Primary language:** English
5. **Bundle ID:** pick the App ID you just made in Step 3
6. **SKU:** any internal string, e.g. `nutriai-ios-01`. Never shown publicly.
7. **User Access:** Full Access

Leave the metadata blank for now — Step 9 fills it in.

---

## Step 5 — Get the code and build

```bash
git clone <repo-url>
cd Nutri-1
npm install
npm run ios:sync     # builds the web app and copies it into the iOS project
npm run ios:open     # opens the project in Xcode
```

Notes so nothing surprises you:

- **There is no CocoaPods step.** Capacitor 8 uses Swift Package Manager. If a
  tutorial tells you to run `pod install`, it's out of date. Xcode resolves the
  packages itself the first time it opens the project — that takes a minute or
  two on first launch and looks like it's hanging. It isn't.
- **`npm run ios:sync` must be re-run after any code change.** The app serves a
  *bundled* copy of the web assets; editing files without re-syncing changes
  nothing on the device.
- The server address is baked in at build time from `.env` in the repo. It's
  already correct — just don't be surprised that it isn't a runtime setting.

---

## Step 6 — Signing

In Xcode, select the **App** target in the left sidebar → **Signing &
Capabilities** tab.

1. **Automatically manage signing:** ticked
2. **Team:** select yours
3. **Bundle Identifier:** must exactly match the App ID from Step 3
4. Confirm **Sign in with Apple** appears in the capabilities list. If it
   doesn't: **+ Capability** → Sign in with Apple.

If you get a provisioning error here, it's almost always one of: team not
selected, bundle ID mismatch, or Step 3 not done.

---

## Step 7 — Run it on a real iPhone

Not the simulator. The camera and Apple sign-in don't meaningfully work there,
and those are the two things that most need testing.

1. Plug in your iPhone, unlock it, tap **Trust** on the prompt
2. On the phone: **Settings → Privacy & Security → Developer Mode** → on
   (requires a restart; iOS 16+)
3. In Xcode, pick your phone from the device dropdown in the toolbar
4. Press **⌘R**
5. First launch will refuse to open with an untrusted-developer message. On the
   phone: **Settings → General → VPN & Device Management** → your certificate →
   **Trust**. Then launch it again.

---

## Step 8 — Test these four things

This is the actual purpose of the device build. Everything else has been
verified already; these four cannot be.

| # | Test | What "pass" looks like |
|---|---|---|
| 1 | **Sign in with Apple** | Apple's sheet appears, you authorise, you land in the app signed in |
| 2 | **Camera** on Add Food and Scan Recipe | The *native iOS camera* opens — not a video preview embedded in the page |
| 3 | **Session persistence** | Force-quit the app, reopen it, you're still signed in |
| 4 | **Layout** | No content hidden under the notch or the home indicator; opening the keyboard doesn't push the capture button or bottom nav offscreen |

**Test 1 is the one most likely to fail.** It has never run on hardware. The
server-side verification is tested and correct, and we've proven it *rejects*
forged tokens, but proving it *accepts* a real one needs Apple's sheet on a real
device — which is exactly this step.

**If anything fails, send Ahmad:**
- The exact on-screen error text
- The Xcode console output — **View → Debug Area → Activate Console**, then copy
  everything from the moment you tapped
- A screenshot or screen recording

Also worth doing once, since the reviewer will: **sign in with
`demo@nutriai.online`** and confirm you land on a dashboard with meals already
in it. If that account doesn't exist or is empty, tell Ahmad — it's seeded from
his side.

---

## Step 9 — Screenshots

Apple needs **6.7"** (iPhone 15/16/17 Pro Max) and **6.5"** (iPhone 11 Pro Max /
XS Max) sizes. If you only have one device, the iOS Simulator can produce the
other — Xcode → Open Developer Tool → Simulator, pick the model, **⌘S** saves a
correctly-sized screenshot.

Capture these five, in this order — it's the order that tells the story:

1. The onboarding **plan screen** (calories and macros — the payoff moment)
2. **Scanning a meal** — camera pointed at food
3. The **result**, with the macros filled in
4. The **dashboard** with a day's meals logged
5. **Recipe from photographed ingredients**, or cooking mode

Use the demo account so the app looks populated rather than empty. Avoid a
cluttered status bar and never screenshot a debug overlay.

---

## Step 10 — Archive and upload

1. In the Xcode toolbar, change the destination from your phone to **Any iOS
   Device (arm64)**. Archive is greyed out until you do.
2. **Product → Archive**. Takes a few minutes.
3. The Organizer window opens on completion → **Distribute App** → **App Store
   Connect** → **Upload** → accept the defaults → **Upload**.
4. **Export compliance:** the app uses only standard HTTPS, so answer that it
   uses no non-exempt encryption.
5. Processing takes 5–30 minutes. You get an email. The build won't be
   selectable in App Store Connect until it finishes.

Then **TestFlight → Internal Testing** → add yourself → install from the
TestFlight app and confirm it runs as a real distribution build.

---

## Step 11 — Fill in App Store Connect

**Open `APP-STORE-CONNECT.md` and work down it.** Every field's content is
already written; this is copy-and-paste, not composition.

| Section | Where the content is | Needs you |
|---|---|---|
| App name, subtitle, category | §1 | — |
| Privacy Policy URL | §1 | Verify it loads signed-out |
| Support URL | §1 | Verify it loads signed-out |
| Description, keywords, promo text | §2 | — |
| **App Privacy** answers | §3 | — |
| Age rating questionnaire | §4 | — |
| Screenshots | §5 | ✅ from Step 9 |
| Demo account + reviewer notes | §6 | Add your name, phone, email |
| Pricing | §7 | Confirm free |

Two that reject submissions outright if wrong:

- **The Privacy Policy and Support URLs must load in a private browser window.**
  A 404 or a login wall is an instant rejection. Both are
  `app.nutriai.online/privacy` and `/support`. **The support page only goes live
  once Ahmad redeploys production** — check it before you paste it in.
- **The App Privacy answers must match the privacy manifest in the app**: email
  address, photos, health & fitness, user content — all linked to the user, none
  used for tracking. §3 has the exact answers. If they disagree with the
  manifest, that's a rejection.

---

## Step 12 — Submit

Attach the build, complete every section until the warnings clear, then
**Submit for Review**. Typical turnaround is 24–48 hours.

### What might come back, and what it means

| Guideline | Why it might be cited | Where we stand |
|---|---|---|
| **4.3 — Duplicate** | The old app | Mitigated by removing it from sale first (Step 1) |
| **4.2 — Minimum functionality** | It's a web app in a native shell — the textbook case | Native camera, haptics, native splash/status bar/keyboard, Sign in with Apple, assets bundled locally rather than loaded from a website. If rejected anyway, the usual remedy is more native surface — push notifications or offline support |
| **1.4.1 — Health** | Weight-loss targets and AI nutrition advice | Addressed: targets can never go below BMR or below 1,500/1,200 kcal, the app says so when it eases your pace, and disclaimers appear on the plan screen, on every AI estimate, and on the support page |
| **2.1 — Incomplete** | Reviewer couldn't sign in or saw an empty app | The seeded demo account exists for exactly this |

**If it's rejected:** don't reply to Apple yet. Copy the message from Resolution
Center verbatim — including the guideline number — plus any screenshots they
attached, and send it to Ahmad. Most rejections are one specific fixable thing,
and the reply matters as much as the fix.

---

## What Ahmad still needs to do

So you know what you're waiting on rather than blocked by:

- **Deploy to production.** This is what publishes the `/support` page and lets
  the demo account be seeded on the live server. **Step 11 depends on it** —
  everything up to Step 10 does not, so you can start immediately.
- Any code fixes that come out of Step 8.
- A new bundle ID in the repo, *if* Step 0 turned up a collision.

## What to send back

1. The old app's bundle ID (Step 0) — this unblocks everything
2. The new bundle ID, if it changed
3. Results of the four tests in Step 8, with console output for any failure
4. Whatever Apple says, if it's rejected
