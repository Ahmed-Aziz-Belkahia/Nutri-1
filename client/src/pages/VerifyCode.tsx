import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function VerifyCode() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Get email from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      // If no email, redirect back to forgot password
      setLocation("/forgot-password");
    }
  }, [location, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      // Verify the code by making a request
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        // Code is valid, proceed to password creation
        setLocation(`/create-new-password?email=${encodeURIComponent(email)}&code=${code}`);
      } else {
        setError(data.error || "Invalid or expired code");
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
        setError(""); // Clear any errors
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
            {/* Logo Section */}
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="h-16 rounded-xl border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20 text-center text-3xl font-mono tracking-[0.5em] font-semibold"
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

              {/* Resend Code Button */}
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

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setLocation("/forgot-password")}
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to email entry
              </button>
            </form>
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
