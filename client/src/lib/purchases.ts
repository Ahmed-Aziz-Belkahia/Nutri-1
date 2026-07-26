/**
 * In-app purchase boundary.
 *
 * ⚠️ NOT IMPLEMENTED. These are deliberate stubs, isolated in one file so the
 * onboarding flow could be finished and walked end-to-end without blocking on
 * work that cannot be done or tested from a Windows machine.
 *
 * To make this real you need, in order:
 *
 *  1. A subscription product created in App Store Connect, with the id below.
 *  2. Paid Applications Agreement accepted (purchases silently fail without it).
 *  3. A purchase library — `@revenuecat/purchases-capacitor` is the least work;
 *     StoreKit 2 via a small Capacitor plugin is the dependency-free route.
 *  4. Server-side receipt validation before granting entitlement. Trusting the
 *     client here is how apps get their subscriptions bypassed.
 *  5. A sandbox Apple ID to test with — purchases cannot be tested in the
 *     Simulator, and the flow differs from production in ways that matter.
 *
 * Until then `subscribe()` resolves false, so the paywall shows an error rather
 * than silently granting access to a user who has not paid.
 */

export const PRODUCT = {
  id: 'online.nutriai.app.pro.monthly',
  displayPrice: '$9.99',
  period: 'month',
  trialDays: 3,
  termsUrl: 'https://app.nutriai.online/terms'
} as const;

/** Whether the current user has an active entitlement. */
export async function hasActiveSubscription(): Promise<boolean> {
  // Nothing is wired up, so nobody has an entitlement yet. Returning false
  // rather than true keeps the paywall honest; returning true would quietly
  // make the whole screen decorative.
  return false;
}

/** Begin a purchase. Resolves true only once the entitlement is confirmed. */
export async function subscribe(): Promise<boolean> {
  throw new Error(
    'Purchases are not available yet. Tap "Not now" to continue — you can subscribe later from Settings.'
  );
}

/** Restore a previous purchase for this Apple ID. */
export async function restorePurchases(): Promise<boolean> {
  return false;
}
