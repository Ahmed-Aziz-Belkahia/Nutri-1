# App Store Connect — fill-in sheet

Everything App Store Connect asks for, with the answer already worked out.
Copy these in. Where a value depends on something only you can decide it is
marked **YOU**.

The App Privacy answers in §3 **must** match `ios/App/App/PrivacyInfo.xcprivacy`
in the repo. If they disagree, that is a rejection. They are consistent as
written below — change both or neither.

---

## 1. App information

| Field | Value |
|---|---|
| **Name** (30 char max) | `NutriAI` |
| **Subtitle** (30 char max) | `Scan meals, cook what you have` (30) |
| **Bundle ID** | `online.nutriai.app` |
| **SKU** | `nutriai-ios-001` |
| **Primary category** | Health & Fitness |
| **Secondary category** | Food & Drink |
| **Content rights** | Does not contain, show, or access third-party content |
| **Age rating** | 4+ (see §4 — answer every question "None") |

### Privacy Policy URL — required
```
https://app.nutriai.online/privacy
```
This route is public (no login) and the policy now names OpenAI as a
sub-processor and states the retention/deletion rule. **Verify it loads in a
private browser window before submitting** — a URL that 404s or requires login
is an instant rejection.

### Support URL — required, **YOU**
Apple requires a working page where a user can get help. A privacy policy does
not count. Cheapest acceptable options:
- A `/support` page on `app.nutriai.online` with an email address and a short FAQ
- A public Notion page
- Even a plain `mailto:` landing page

### Marketing URL — optional, leave blank if you have no site.

---

## 2. Version information

### Promotional text (170 char, changeable without review)
```
Point your camera at any meal for instant calories and macros. Or scan what is
in your fridge and get recipes you can actually cook tonight.
```

### Description (4000 char max)
```
NutriAI turns your camera into a nutrition tracker and a recipe engine.

SCAN YOUR MEAL
Take a photo of anything you are about to eat. NutriAI identifies the food and
estimates calories, protein, carbs and fat in seconds. No searching a database,
no weighing, no guessing portion sizes from a list.

COOK WHAT YOU ALREADY HAVE
Point the camera at your fridge, your counter, or a bag of shopping. NutriAI
reads the ingredients, lets you correct anything it got wrong, then generates
recipes built around what you actually own. Step-by-step cooking mode walks you
through each one.

TRACK WITHOUT THE CHORE
Your meals log themselves as you scan them. See your day at a glance: calories
and macros against the goals set during a short onboarding.

BUILT FOR REAL KITCHENS
- Works with home-cooked food, not just packaged items with barcodes
- Edit anything the AI gets wrong, so your log stays accurate
- Save the recipes you like and come back to them
- Sign in with Apple, or use an email address

NutriAI provides nutritional estimates for general informational purposes. It
is not medical advice and is not a substitute for consulting a qualified health
professional. Always talk to your doctor before making significant changes to
your diet.
```

> The closing disclaimer is deliberate. Nutrition and weight-loss apps get
> extra scrutiny under Guideline 1.4.1; having it in the listing and in the app
> is cheap insurance.

### Keywords (100 char max, comma separated, no spaces after commas)
```
calorie,macro,food scanner,nutrition,recipe,fridge,meal,diet,tracker,ai,protein,cooking,healthy
```
(94 characters.) Do not repeat words already in the app name or subtitle —
Apple indexes those separately, so repeating them wastes the budget.

### What's New in This Version
```
First release.
```

---

## 3. App Privacy — must match PrivacyInfo.xcprivacy

Answer "Yes, we collect data from this app", then declare exactly these four
types. For **every** one: **Linked to the user = Yes**, **Used for tracking =
No**, purpose = **App Functionality** only.

| Data type | Where it is in the app |
|---|---|
| **Contact Info → Email Address** | Account identity |
| **User Content → Photos or Videos** | Meal and ingredient photos sent for analysis |
| **Health & Fitness → Health** | Weight, height, age, activity level, calorie goals from onboarding |
| **User Content → Other User Content** | Saved recipes and food-log entries |

Do **not** tick: Location, Contacts, Browsing History, Search History,
Identifiers, Purchases, Financial Info, Sensitive Info, Diagnostics, Usage Data.

**Tracking:** answer **No** to "Do you or your third-party partners use data
for tracking purposes?" There is no IDFA, no ad SDK and no analytics SDK in the
build.

> Health & Fitness surprises people because the app does not use HealthKit.
> Apple's definition covers the *data*, not the framework — onboarding collects
> weight and height, so it must be declared.

---

## 4. Age rating questionnaire

Answer **None** to every question. The app has no violence, no sexual content,
no profanity, no gambling, no contests, no unrestricted web access, no
user-generated content shared between users.

Two that trip people up:
- **Medical/Treatment Information** → answer **None**. NutriAI gives
  nutritional estimates, not treatment or diagnosis. If you later add anything
  that reads as medical guidance, revisit this.
- **Unrestricted Web Access** → **None**. The WebView only loads the bundled
  app; external links open in the system browser.

Result should be **4+**.

---

## 5. Screenshots — **YOU**, needs a device

Required sizes (Apple accepts these two and scales the rest):

| Display | Resolution | Devices |
|---|---|---|
| 6.7" | 1290 × 2796 | iPhone 15/16 Pro Max |
| 6.5" | 1242 × 2688 | iPhone 11 Pro Max / XS Max |

Minimum 3, maximum 10 each. Suggested five, in this order — lead with the
thing that makes someone download:

1. **Meal scan result** — a photo with calories and macros on screen
2. **Ingredient scan → recipe results** — the "cook what you have" hook
3. **Recipe detail / cooking mode**
4. **Dashboard** — the day's macros and logged meals
5. **Onboarding goal screen**

Take them on a real device with the status bar clean (full battery, full
signal). In the Simulator: `Cmd+S` saves a correctly sized screenshot.

Avoid: placeholder or lorem-ipsum data, an empty state as the first shot, or
any screenshot showing content the app does not actually produce.

---

## 6. App Review Information

| Field | Value |
|---|---|
| **Sign-in required** | Yes |
| **Demo account** | **YOU** — create a real one and put credentials here |
| **Contact** | **YOU** — your name, phone, email |

Create the demo account **with meals and recipes already in it**. A reviewer
who logs into an empty app and cannot tell what it does is a common cause of a
4.2 rejection.

### Notes for the reviewer — paste this
```
NutriAI analyses photographs of food using an AI vision model to estimate
nutrition, and generates recipes from photographed ingredients.

To test the two main features:

1. MEAL SCANNING — Tap the camera button on the dashboard. Photograph any food
   (or use the photo library). The app returns an estimated calorie and macro
   breakdown, which is then saved to the day's food log.

2. INGREDIENT SCANNING — Open the Recipes tab and tap "Scan ingredients".
   Photograph several food items. The app lists what it detected, lets you
   correct the list, then generates recipes using those ingredients.

Both features require a network connection and take a few seconds to return.

The demo account is pre-populated with logged meals and saved recipes so the
features are visible immediately.

Sign in with Apple is supported on the sign-in screen.

The app provides nutritional estimates for informational purposes only and
presents a disclaimer to that effect. It does not provide medical advice,
diagnosis or treatment.
```

---

## 7. Pricing and availability

| Field | Value |
|---|---|
| **Price** | Free |
| **In-app purchases** | None — Stripe was removed; there is no monetisation |
| **Availability** | All territories, unless you have a reason to restrict |

Because there is no IAP and nothing is sold, Guideline 3.1.1 does not apply.
If you add subscriptions later, that becomes a whole additional review surface.

---

## 8. Before you hit Submit

- [ ] Privacy Policy URL loads in a private window, no login
- [ ] Support URL loads
- [ ] Demo account works **and has data in it**
- [ ] Screenshots uploaded for both required sizes
- [ ] App Privacy answers match `PrivacyInfo.xcprivacy` (§3)
- [ ] Build uploaded and processed in TestFlight
- [ ] You installed from TestFlight and ran both features on a real device
- [ ] Sign in with Apple tested on a real device
- [ ] Export compliance: answer **No** to "uses non-exempt encryption"
      (HTTPS only counts as exempt)

Expect 24–48 hours for first review. A rejection is normal and usually
specific — read the exact guideline number they cite and respond in Resolution
Center rather than resubmitting blind.
