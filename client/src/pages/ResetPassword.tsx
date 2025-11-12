import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code");
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
        setError(data.error || "Invalid or expired code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
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
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      setError("Network error. Please try again.");
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
        alert("New code sent to your email!");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to resend code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl p-8 rounded-xl">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Password Reset Successfully!
                  </h3>
                  <p className="text-gray-600">
                    Logging you in...
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirecting to dashboard...</span>
                  </div>
                </motion.div>
              ) : step === "code" ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Logo Section - Code Step */}
                  <div className="flex flex-col items-center mb-8">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-full flex items-center justify-center mb-6"
                    >
                      <Shield className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Verify Your Code
                    </h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-600 text-sm text-center"
                    >
                      Enter the 6-digit code sent to
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
                        className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Code Form */}
                  <form onSubmit={handleVerifyCode} className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="code" className="text-sm font-medium text-gray-700 block text-center">
                        Verification Code
                      </label>
                      <Input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="h-16 rounded-xl bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20 text-center text-3xl font-mono tracking-[0.5em] font-semibold"
                        maxLength={6}
                        required
                        disabled={isLoading}
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Code expires in 15 minutes
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || code.length !== 6}
                      className="w-full h-12 bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] hover:from-[#0BB5AA] hover:to-[#1E96EE] text-white rounded-xl font-semibold transition-all shadow-lg"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Verify Code"
                      )}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="text-sm text-[#26A8FF] hover:text-[#0CC5BA] transition-colors font-medium disabled:opacity-50"
                      >
                        Didn't receive the code? Resend
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
                  <div className="flex flex-col items-center mb-8">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-full flex items-center justify-center mb-6"
                    >
                      <Lock className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Create New Password
                    </h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-600 text-sm text-center"
                    >
                      Enter a new password for your account
                    </motion.p>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Password Form */}
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {email && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-blue-900 text-center">
                          <span className="font-medium">Resetting password for:</span>
                          <br />
                          {email}
                        </p>
                      </div>
                    )}

                    {/* Password Field */}
                    <div className="space-y-1.5">
                      <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-12 rounded-xl w-full pl-10 pr-12 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                          placeholder="••••••••"
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
                        Must be at least 6 characters
                      </p>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-1.5">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-12 rounded-xl w-full pl-10 pr-12 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                          placeholder="••••••••"
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
                      className="w-full h-12 bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] hover:from-[#0BB5AA] hover:to-[#1E96EE] text-white rounded-xl font-semibold transition-all shadow-lg mt-6"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs text-gray-600 mt-6"
          >
            Need help?{" "}
            <a
              href="mailto:support@nutriai.pl"
              className="text-[#26A8FF] hover:text-[#0CC5BA] font-medium"
            >
              Contact Support
            </a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
