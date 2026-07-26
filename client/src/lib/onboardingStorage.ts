/**
 * Draft persistence for onboarding answers.
 *
 * Onboarding asks ~18 questions before the user has an account. Previously all
 * of it lived in React state, so killing the app at question 16 lost
 * everything. That was survivable when auth came first — the user was already
 * registered. Now that auth sits at the end, losing the draft would mean
 * losing the user, so persistence is load-bearing rather than a nicety.
 *
 * Writes go to localStorage synchronously. Capacitor's Preferences API is
 * async and would race the rapid step-to-step writes; localStorage is backed
 * by WKWebView's own store and survives app restarts, which is all this needs.
 * The draft is small (a few hundred bytes) and is cleared on completion.
 */

const DRAFT_KEY = 'nutriai_onboarding_draft';
const DRAFT_VERSION = 2;

export interface OnboardingDraft {
  version: number;
  /** Index into the step list the user was last looking at. */
  stepId: string | null;
  answers: Record<string, unknown>;
  /** Set once the plan has been computed, so we can resume at the results. */
  planReady: boolean;
  updatedAt: number;
}

const empty = (): OnboardingDraft => ({
  version: DRAFT_VERSION,
  stepId: null,
  answers: {},
  planReady: false,
  updatedAt: Date.now()
});

export function loadDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraft;
    // A draft written by an older question set can't be resumed coherently —
    // the step ids it references may no longer exist. Drop it rather than
    // resuming into a broken state.
    if (parsed.version !== DRAFT_VERSION) {
      clearDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(patch: Partial<Omit<OnboardingDraft, 'version' | 'updatedAt'>>): void {
  try {
    const current = loadDraft() ?? empty();
    const next: OnboardingDraft = {
      ...current,
      ...patch,
      answers: { ...current.answers, ...(patch.answers ?? {}) },
      version: DRAFT_VERSION,
      updatedAt: Date.now()
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* private mode or quota — onboarding still works, it just cannot resume */
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to do */
  }
}

export function hasResumableDraft(): boolean {
  const d = loadDraft();
  return !!d && (d.planReady || Object.keys(d.answers).length > 0);
}
