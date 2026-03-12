import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation(['auth']);
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"code" | "password">("code");

  // Get email from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [location]);

  // Handle resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError(t('auth:resetPassword.verifyCode.errorInvalidCode'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        // Code verified, move to password step
        setStep("password");
      } else {
        setError(data.error || t('auth:resetPassword.verifyCode.errorCodeFailed'));
      }
    } catch (error) {
      setError(t('auth:resetPassword.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError(t('auth:resetPassword.createPassword.errorPasswordMatch'));
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      setError(t('auth:resetPassword.createPassword.errorPasswordLength'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        
        // Auto-login after password reset
        try {
          const loginResponse = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: newPassword }),
          });

          if (loginResponse.ok) {
            // Login successful, redirect to dashboard
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 2000);
          } else {
            // Login failed, redirect to auth page
            setTimeout(() => {
              window.location.href = "/auth";
            }, 2000);
          }
        } catch (error) {
          // Error during login, redirect to auth page
          setTimeout(() => {
            window.location.href = "/auth";
          }, 2000);
        }
      } else {
        setError(data.error || t('auth:resetPassword.createPassword.errorResetFailed'));
      }
    } catch (error) {
      setError(t('auth:resetPassword.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendTimer(60);
      } else {
        const data = await response.json();
        setError(data.error || t('auth:forgotPassword.error'));
      }
    } catch (error) {
      setError(t('auth:resetPassword.networkError'));
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
                    {t('auth:resetPassword.success.title')}
                  </h3>
                  <p className="text-gray-600">
                    {t('auth:resetPassword.success.message')}
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('auth:resetPassword.success.redirecting')}</span>
                  </div>
                </motion.div>
              ) : step === "code" ? (
                <motion.div
                  key="code"
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

                  {/* Logo Section - Code Step */}
                  <div className="flex flex-col items-center mb-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="w-16 h-16 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-2xl flex items-center justify-center mb-4"
                    >
                      <Shield className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {t('auth:resetPassword.verifyCode.title')}
                    </h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-600 text-sm text-center"
                    >
                      {t('auth:resetPassword.verifyCode.subtitle')}
                      <br />
                      <span className="font-medium text-gray-900">{email}</span>
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

                  {/* Code Form */}
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="code" className="text-sm font-medium text-gray-700 block text-center">
                        {t('auth:resetPassword.verifyCode.code')}
                      </label>
                      <Input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder={t('auth:resetPassword.verifyCode.codePlaceholder')}
                        className="h-16 rounded-xl bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20 text-center text-3xl font-mono tracking-[0.5em] font-semibold"
                        maxLength={6}
                        required
                        disabled={isLoading}
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        {t('auth:resetPassword.verifyCode.codeExpires')}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || code.length !== 6}
                      className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF] hover:opacity-90 text-white rounded-xl font-semibold transition-all"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        t('auth:resetPassword.verifyCode.verifyButton')
                      )}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isLoading || resendTimer > 0}
                        className="text-sm text-[#26A8FF] hover:text-[#0CC5BA] transition-colors font-medium disabled:opacity-50"
                      >
                        {resendTimer > 0 
                          ? `${t('auth:resetPassword.verifyCode.resendCode')} (${resendTimer}s)` 
                          : t('auth:resetPassword.verifyCode.resendCode')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="password"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Logo Section - Password Step */}
                  <div className="flex flex-col items-center mb-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="w-16 h-16 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-2xl flex items-center justify-center mb-4"
                    >
                      <Lock className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {t('auth:resetPassword.createPassword.title')}
                    </h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-600 text-sm text-center"
                    >
                      {t('auth:resetPassword.createPassword.subtitle')}
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

                  {/* Password Form */}
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {email && (
                      <div className="bg-[#26A8FF]/5 border border-[#26A8FF]/20 rounded-xl p-4 mb-2">
                        <p className="text-sm text-gray-700 text-center">
                          <span className="font-medium">{t('auth:resetPassword.createPassword.resettingFor')}</span>
                          <br />
                          <span className="text-gray-900">{email}</span>
                        </p>
                      </div>
                    )}

                    {/* Password Field */}
                    <div className="space-y-1.5">
                      <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                        {t('auth:resetPassword.createPassword.newPassword')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-12 rounded-xl w-full pl-10 pr-12 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                          placeholder={t('auth:resetPassword.createPassword.passwordPlaceholder')}
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {t('auth:resetPassword.createPassword.passwordRequirement')}
                      </p>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-1.5">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        {t('auth:resetPassword.createPassword.confirmPassword')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-12 rounded-xl w-full pl-10 pr-12 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                          placeholder={t('auth:resetPassword.createPassword.passwordPlaceholder')}
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || !newPassword || !confirmPassword}
                      className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF] hover:opacity-90 text-white rounded-xl font-semibold transition-all mt-2"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        t('auth:resetPassword.createPassword.resetButton')
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
          {t('auth:resetPassword.needHelp')}{" "}
          <a
            href="mailto:support@nutriai.pl"
            className="text-[#26A8FF] hover:text-[#0CC5BA] font-medium"
          >
            {t('auth:resetPassword.contactSupport')}
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
