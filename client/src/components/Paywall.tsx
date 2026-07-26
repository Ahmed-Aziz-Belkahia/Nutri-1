/**
 * Subscription paywall, shown at the end of onboarding once an account exists.
 *
 * ⚠️ PURCHASING IS NOT WIRED YET. `subscribe()` and `restore()` in
 * `client/src/lib/purchases.ts` are stubs. Real purchases need StoreKit 2 or
 * RevenueCat plus products configured in App Store Connect, and cannot be
 * tested from this machine — see IOS-LAUNCH.md.
 *
 * The layout below is not decoration: App Review rejects subscription screens
 * that omit any of these, so they are here from the start.
 *
 *   - price and billing period, on the screen itself, not behind a link
 *   - what happens when the free trial ends
 *   - explicit auto-renewal wording
 *   - a Restore Purchases control (Guideline 3.1.1)
 *   - links to Terms of Use and the Privacy Policy
 */

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { PRODUCT, subscribe, restorePurchases } from '@/lib/purchases';

interface PaywallProps {
  onSubscribed: () => void;
  onRestored: () => void;
  /** Called when the user declines. */
  onDismiss: () => void;
}

const BENEFITS = [
  'Unlimited meal scans',
  'Instant calories and macros from a photo',
  'Recipes from whatever is in your fridge',
  'Your personalised daily targets'
];

export default function Paywall({ onSubscribed, onRestored, onDismiss }: PaywallProps) {
  const [busy, setBusy] = useState<'subscribe' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'subscribe' | 'restore') => {
    setBusy(kind);
    setError(null);
    try {
      const ok = kind === 'subscribe' ? await subscribe() : await restorePurchases();
      if (ok) {
        kind === 'subscribe' ? onSubscribed() : onRestored();
      } else if (kind === 'restore') {
        setError('No previous purchase found on this Apple ID.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white px-6 pt-safe-or-6 pb-8">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <h1 className="text-[28px] leading-tight font-bold text-[#1E293B] mb-2">
          Start your {PRODUCT.trialDays}-day free trial
        </h1>
        <p className="text-[#64748B] text-[15px] mb-8">
          Your plan is ready. Try everything free, cancel any time.
        </p>

        <ul className="space-y-3 mb-8">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0CC5BA]/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-[#0CC5BA]" strokeWidth={3} />
              </span>
              <span className="text-[#1E293B] text-[15px]">{b}</span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto w-full space-y-3">
        <button
          type="button"
          onClick={() => run('subscribe')}
          disabled={busy !== null}
          className="w-full h-14 rounded-2xl bg-[#26A8FF] text-white font-semibold text-[17px] flex items-center justify-center active:opacity-80 disabled:opacity-60"
        >
          {busy === 'subscribe' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Start free trial'}
        </button>

        {/* Required disclosure — must be visible, not behind a link. */}
        <p className="text-[11px] leading-relaxed text-[#94A3B8] text-center">
          {PRODUCT.trialDays} days free, then {PRODUCT.displayPrice} per {PRODUCT.period}.
          Renews automatically unless cancelled at least 24 hours before the period ends.
          Manage or cancel in your Apple ID settings.
        </p>

        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => run('restore')}
            disabled={busy !== null}
            className="text-[12px] text-[#64748B] underline disabled:opacity-60"
          >
            {busy === 'restore' ? 'Restoring…' : 'Restore Purchases'}
          </button>
          <a href="/privacy" className="text-[12px] text-[#64748B] underline">Privacy Policy</a>
          <a href={PRODUCT.termsUrl} className="text-[12px] text-[#64748B] underline">Terms of Use</a>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          disabled={busy !== null}
          className="w-full h-10 text-[13px] text-[#94A3B8] disabled:opacity-60"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
