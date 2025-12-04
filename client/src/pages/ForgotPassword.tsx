import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation(['auth']);
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to reset password page with email parameter
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
      } else {
        console.error('[ForgotPassword] Error:', data.error);
        setError(data.error || t('auth:forgotPassword.error'));
      }
    } catch (error) {
      setError(t('auth:forgotPassword.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px]"
      >
        <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF]" />
          
          <div className="p-6">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {t('auth:forgotPassword.success')}
                  </h3>
                  <p className="text-gray-600">
                    {t('auth:forgotPassword.successMessage')}
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('auth:forgotPassword.redirecting')}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => setLocation("/auth")}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">{t('auth:forgotPassword.backToLogin')}</span>
                  </button>

                  {/* Logo Section */}
                  <div className="flex flex-col items-center mb-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="w-16 h-16 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-2xl flex items-center justify-center mb-4"
                    >
                      <Mail className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {t('auth:forgotPassword.title')}
                    </h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-600 text-sm text-center"
                    >
                      {t('auth:forgotPassword.subtitle')}
                    </motion.p>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-gray-700">
                        {t('auth:forgotPassword.email')}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t('auth:forgotPassword.emailPlaceholder')}
                          className="h-12 rounded-xl w-full pl-10 pr-4 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF] hover:opacity-90 text-white rounded-xl font-semibold transition-all mt-2"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        t('auth:forgotPassword.sendButton')
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-gray-500 mt-6"
        >
          {t('auth:forgotPassword.needHelp')}{" "}
          <a
            href="mailto:support@nutriai.pl"
            className="text-[#26A8FF] hover:text-[#0CC5BA] font-medium"
          >
            {t('auth:forgotPassword.contactSupport')}
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
