import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function VerifyEmail() {
  const { t } = useTranslation(['auth']);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email in URL, redirect to auth page
      setLocation('/auth');
    }
  }, [setLocation]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last character
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    
    setCode(newCode);
    
    // Focus the last filled input or the first empty one
    const lastFilledIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError(t('auth:verifyEmail.errorAllDigits'));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('auth:verifyEmail.errorVerification'));
        setIsVerifying(false);
        return;
      }

      setIsVerified(true);
      
      // Invalidate user query to trigger re-fetch and auto-login
      queryClient.invalidateQueries({ queryKey: ["user"] });
      
      toast({
        title: t('auth:verifyEmail.success.toastTitle'),
        description: t('auth:verifyEmail.success.toastDescription'),
      });

      // Wait 2 seconds before redirecting to onboarding
      setTimeout(() => {
        setLocation('/onboarding');
      }, 2000);

    } catch (error) {
      console.error('Verification error:', error);
      setError(t('auth:verifyEmail.errorUnexpected'));
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/resend-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('auth:verifyEmail.errorResend'));
        setIsResending(false);
        return;
      }

      toast({
        title: t('auth:verifyEmail.resendSuccess.toastTitle'),
        description: t('auth:verifyEmail.resendSuccess.toastDescription'),
      });

      // Clear the code inputs
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

    } catch (error) {
      console.error('Resend error:', error);
      setError(t('auth:verifyEmail.errorResendFailed'));
    } finally {
      setIsResending(false);
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
            {/* Back Button */}
            <button
              onClick={() => setLocation('/auth')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t('auth:verifyEmail.backToSignIn')}</span>
            </button>

            {/* Success State */}
            <AnimatePresence mode="wait">
              {isVerified ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="mx-auto w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-2xl flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth:verifyEmail.success.title')}</h2>
                  <p className="text-gray-600">{t('auth:verifyEmail.success.message')}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Logo Section */}
                  <div className="flex flex-col items-center mb-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="mb-4"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-2xl flex items-center justify-center">
                        <Mail className="h-8 w-8 text-white" />
                      </div>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth:verifyEmail.title')}</h1>
                    <p className="text-gray-600 text-sm text-center">
                      {t('auth:verifyEmail.subtitle')}<br />
                      <strong className="text-gray-900">{email}</strong>
                    </p>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Code Inputs */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 mb-3 block">
                      {t('auth:verifyEmail.codeLabel')}
                    </label>
                    <div className="flex gap-2 justify-center">
                      {code.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20 outline-none transition-all bg-white"
                          disabled={isVerifying}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerify}
                    disabled={isVerifying || code.some((d) => !d)}
                    className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF] hover:opacity-90 text-white rounded-xl font-semibold transition-all mb-4"
                  >
                    {isVerifying ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span>{t('auth:verifyEmail.verifyButton')}</span>
                    )}
                  </Button>

                  {/* Resend Code */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      {t('auth:verifyEmail.didntReceive')}
                    </p>
                    <button
                      onClick={handleResendCode}
                      disabled={isResending}
                      className="text-sm font-semibold text-[#26A8FF] hover:text-[#0CC5BA] transition-colors disabled:opacity-50"
                    >
                      {isResending ? t('auth:verifyEmail.sending') : t('auth:verifyEmail.resendCode')}
                    </button>
                  </div>
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
          {t('auth:verifyEmail.codeExpires')}
        </motion.p>
      </motion.div>
    </div>
  );
}
