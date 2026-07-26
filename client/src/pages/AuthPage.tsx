import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { calculateDailyCalories, calculateMacros } from "@/lib/nutrition";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { signInWithApple, isAppleSignInAvailable } from "@/lib/appleAuth";
import { useTranslation } from "react-i18next";

export default function AuthPage() {
  const { t } = useTranslation(['auth']);
  const searchParams = useSearch();
  const tabParam = new URLSearchParams(searchParams).get('tab');
  const [isLogin, setIsLogin] = useState(tabParam === 'login');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);

  const { loginMutation, registerMutation } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  /**
   * Sign in with Apple. Native-only: Apple's sheet is presented by the plugin,
   * and the resulting identity token is verified server-side before we accept
   * any identity from it.
   */
  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    setAppleError(null);

    try {
      const result = await signInWithApple();
      if (!result) return; // user dismissed the Apple sheet
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      setLocation('/');
    } catch (err) {
      console.error('[AuthPage] Apple sign-in error:', err);
      setAppleError(err instanceof Error ? err.message : 'Apple sign-in failed. Please try again.');
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        setError(t('auth:register.passwordMismatch'));
        return;
      }

      if (formData.password.length < 6) {
        setError(t('auth:register.passwordTooShort'));
        return;
      }

      const mutation = isLogin ? loginMutation : registerMutation;
      const result = await mutation.mutateAsync({ 
        email: formData.email, 
        password: formData.password 
      });

      if (result.ok) {
        if (!isLogin && result.requiresVerification) {
          // Redirect to email verification page with email parameter
          setLocation(`/verify-email?email=${encodeURIComponent(formData.email)}`);
        } else {
          // Back to onboarding: the draft restores the user to the save step,
          // where the profile is submitted now that an account exists.
          setLocation("/onboarding");
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.response?.data?.error || t('auth:common.unexpectedError'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px]"
      >
        <Card className="bg-white border border-slate-200/60 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800" />
          
          <div className="p-6">
            {/* Back to landing */}
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t('auth:common.backToHome', 'Back to Home')}</span>
            </button>

            {/* Logo Section */}
            <div className="flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="mb-4"
              >
                <img src="/logo.png" alt="NutriAI" className="h-16 w-auto object-contain" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-slate-900 mb-1"
              >
                {isLogin ? t('auth:login.title', 'Welcome Back') : t('auth:register.title', 'Create Account')}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-slate-500 text-sm text-center"
              >
                {isLogin ? t('auth:login.subtitle') : t('auth:register.subtitle')}
              </motion.p>
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  {isLogin ? t('auth:login.email') : t('auth:register.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-12 rounded-xl w-full pl-10 pr-4 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:bg-white transition-colors"
                    placeholder={isLogin ? t('auth:login.emailPlaceholder') : t('auth:register.emailPlaceholder')}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  {isLogin ? t('auth:login.password') : t('auth:register.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="h-12 rounded-xl w-full pl-10 pr-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:bg-white transition-colors"
                    placeholder={isLogin ? t('auth:login.passwordPlaceholder') : t('auth:register.passwordPlaceholder')}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? 
                      <EyeOff className="h-5 w-5" /> : 
                      <Eye className="h-5 w-5" />
                    }
                  </button>
                </div>
                
                {/* Forgot Password Link */}
                {isLogin && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setLocation("/forgot-password")}
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors font-medium underline-offset-2 hover:underline"
                    >
                      {t('auth:login.forgotPassword')}
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                      {t('auth:register.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-12 rounded-xl w-full pl-10 pr-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:bg-white transition-colors"
                        placeholder={t('auth:register.confirmPasswordPlaceholder')}
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? 
                          <EyeOff className="h-5 w-5" /> : 
                          <Eye className="h-5 w-5" />
                        }
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={loginMutation.isPending || registerMutation.isPending}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all mt-6 shadow-sm"
              >
                {loginMutation.isPending || registerMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span>{isLogin ? t('auth:login.loginButton') : t('auth:register.registerButton')}</span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6 hidden">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 tracking-wider">{t('auth:common.orContinueWith')}</span>
              </div>
            </div>

            {/* Sign in with Apple — native only. Apple's Human Interface
                Guidelines require their official mark and wording, and 4.8
                requires it be offered at least as prominently as any other
                third-party sign-in. It is the only social option here. */}
            {isAppleSignInAvailable() && (
              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={isAppleLoading}
                className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-black text-white font-medium text-[17px] transition-all active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAppleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <svg viewBox="0 0 384 512" aria-hidden="true" className="h-[19px] w-[19px] fill-white">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                  </svg>
                )}
                {isAppleLoading ? 'Signing in…' : 'Sign in with Apple'}
              </button>
            )}

            {appleError && (
              <p className="text-xs text-red-500 text-center mt-2">{appleError}</p>
            )}

            {/* Toggle Auth Mode */}
            <div className="text-center">
              <p className="text-sm text-slate-500">
                {isLogin ? t('auth:login.noAccount') : t('auth:register.haveAccount')}
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                    setFormData({ email: '', password: '', confirmPassword: '' });
                  }}
                  className="font-semibold text-slate-900 hover:text-slate-600 transition-colors underline-offset-2 hover:underline"
                >
                  {isLogin ? t('auth:login.signUp') : t('auth:register.signIn')}
                </button>
              </p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-slate-400 mt-6"
        >
          {t('auth:common.termsAndPrivacy')}
        </motion.p>
      </motion.div>
    </div>
  );
}