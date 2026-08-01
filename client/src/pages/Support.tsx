import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * Public support page.
 *
 * App Store Connect requires a Support URL, and App Review opens it in a plain
 * browser with no account. So this route sits outside the auth gate in
 * App.tsx and must render fully for a signed-out visitor — no data fetching,
 * no redirects.
 */

const SUPPORT_EMAIL = "support@nutriai.pl";

export default function Support() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(["common"]);

  const faqs = [
    {
      q: t("common:support.faq.scan.q", "How does scanning a meal work?"),
      a: t(
        "common:support.faq.scan.a",
        "Take a photo of your food and NutriAI estimates the calories and macronutrients from the image. The result is an estimate, not a measurement — open the meal in your log to correct anything that looks wrong."
      )
    },
    {
      q: t("common:support.faq.accuracy.q", "The numbers look wrong. Can I fix them?"),
      a: t(
        "common:support.faq.accuracy.a",
        "Yes. Every scanned meal stays editable. Tap it in your food log and adjust the name, portion, calories or macros. Your daily totals update immediately."
      )
    },
    {
      q: t("common:support.faq.targets.q", "Where do my daily targets come from?"),
      a: t(
        "common:support.faq.targets.a",
        "They are calculated from the height, weight, age, activity level and goal pace you entered during setup, using the Mifflin-St Jeor equation. Targets are never set below your basal metabolic rate, so if you pick a very fast pace we ease it to keep the plan safe."
      )
    },
    {
      q: t("common:support.faq.recipes.q", "What is the ingredient scan for?"),
      a: t(
        "common:support.faq.recipes.a",
        "Photograph what you have — in your fridge, on the counter — and NutriAI suggests recipes you can cook from those ingredients, with a step-by-step cooking mode."
      )
    },
    {
      q: t("common:support.faq.password.q", "I forgot my password."),
      a: t(
        "common:support.faq.password.a",
        "Use \"Forgot password\" on the sign-in screen. We email you a reset link. If it does not arrive within a few minutes, check your spam folder, then write to us."
      )
    },
    {
      q: t("common:support.faq.delete.q", "How do I delete my account?"),
      a: t(
        "common:support.faq.delete.a",
        "Open Settings, then Delete account. This permanently removes your profile, food log, photos and recipes. It cannot be undone. You can also email us and we will do it for you."
      )
    },
    {
      q: t("common:support.faq.apple.q", "Sign in with Apple is not working."),
      a: t(
        "common:support.faq.apple.a",
        "If you hid your email address when you first signed in, Apple sends us a private relay address rather than your real one. That is fine and everything works normally. If sign-in fails outright, email us with the message you saw."
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5">
      <header className="sticky top-0 backdrop-blur-xl bg-white/80 border-b border-white/20 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="-ml-2 p-2 rounded-xl hover:bg-white/40 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-medium ml-2 bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
              {t("common:support.title", "Support")}
            </h1>
          </div>
        </div>
      </header>

      <div className="w-full py-8 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Contact first — it is the reason people open this page. */}
          <section className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-sm">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
              {t("common:support.contact.title", "Get in touch")}
            </h2>
            <p className="text-gray-600 mb-4">
              {t(
                "common:support.contact.blurb",
                "Questions, bugs, billing, or anything about your account — email us and a human replies, usually within two business days."
              )}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0CC5BA] to-blue-500 px-5 py-3 font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {SUPPORT_EMAIL}
            </a>
          </section>

          <section className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {t("common:support.faq.title", "Common questions")}
            </h2>
            <dl className="space-y-5">
              {faqs.map((item) => (
                <div key={item.q}>
                  <dt className="font-semibold text-gray-800">{item.q}</dt>
                  <dd className="mt-1 text-gray-600 leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Guideline 1.4.1 — the same statement the app makes in-product. */}
          <section className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {t("common:support.health.title", "A note on health information")}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {t(
                "common:support.health.body",
                "NutriAI provides estimates to help you track what you eat. It is not a medical device and does not give medical advice. Talk to a doctor or registered dietitian before making significant changes to your diet, particularly if you have a health condition, take medication, are pregnant or breastfeeding, or are under 18. If you are struggling with an eating disorder, please seek help from a qualified professional rather than a calorie tracker."
              )}
            </p>
          </section>

          <section className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {t("common:support.privacy.title", "Your data")}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {t(
                "common:support.privacy.body",
                "Meal photos are sent to our AI provider purely to produce the estimate, and are not used to advertise to you. Full detail is in the privacy policy."
              )}
            </p>
            <button
              onClick={() => setLocation("/privacy")}
              className="mt-3 font-medium text-[#0CC5BA] underline underline-offset-4 hover:opacity-80"
            >
              {t("common:support.privacy.link", "Read the privacy policy")}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
