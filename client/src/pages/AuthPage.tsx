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

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Function to submit pending onboarding data
  const submitPendingOnboardingData = async () => {
    const pendingData = sessionStorage.getItem('pendingOnboardingData');
    if (!pendingData) return false;

    try {
      const data = JSON.parse(pendingData);
      const formDataToSend = new FormData();
      
      // Map weightGoal to goalType format expected by utility
      const goalType = data.weightGoal === 'loss' ? 'lose' : 
                       data.weightGoal === 'gain' ? 'gain' : 'maintain';
      
      // Use shared calculation utilities
      const dailyCalories = calculateDailyCalories(
        data.age,
        data.weight,
        data.height,
        data.activityLevel,
        goalType,
        data.gender === 'male'
      );
      const macros = calculateMacros(dailyCalories, goalType);
      
      const profileData = {
        age: data.age,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        goalWeight: data.goalWeight,
        weightGoal: data.weightGoal,
        activityLevel: data.activityLevel,
        calorieGoal: dailyCalories,
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatGoal: macros.fat,
        dietaryRestrictions: [],
        allergies: [],
        mealBudget: "medium",
        experienceLevel: "beginner",
        preferredLanguage: "pl",
        energyPattern: "morning",
        flavorPreference: "savory",
        firstVictory: "energy",
        motivationLevel: "medium",
        nutritionGoals: []
      };
      
      formDataToSend.append('profile', JSON.stringify(profileData));
      
      const response = await fetch('/api/complete-onboarding', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
      });
      
      if (response.ok) {
        sessionStorage.removeItem('pendingOnboardingData');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error submitting onboarding data:', error);
      return false;
    }
  };

  // Fallback for mobile handoff: monitor localStorage for externally injected sessions
  useEffect(() => {
    const checkSession = () => {
      if (localStorage.getItem("nutriai_session_active") === "true") {
        console.log("[AuthPage] Detected session in storage, navigating...");
        setLocation('/dashboard'); // Navigation strategy in case polling is stuck
      }
    };
    
    // Check every second while the page is open
    const interval = setInterval(checkSession, 1000);
    window.addEventListener('storage', checkSession);
    
    // Immediate check when returning to the app from the system browser
    window.addEventListener('focus', checkSession);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkSession();
    });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkSession);
      window.removeEventListener('focus', checkSession);
      window.removeEventListener('visibilitychange', checkSession);
    };
  }, [setLocation]);

  // Clean up Google polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  /**
   * Google Sign-In handler.
   * Fetches the OAuth URL from the backend and opens it in the system browser.
   * The system browser (not the WebView) handles Google's auth, then redirects
   * to /auth/google/success. We poll /api/auth/google/status to detect completion.
   */
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);

    try {
      const res = await fetch('/api/auth/google?platform=mobile&return_url=true');
      const data = await res.json();

      if (!data.success || !data.authUrl) {
        throw new Error('Failed to get Google auth URL');
      }

      // Open in system browser — this bypasses the WebView Google block
      window.open(data.authUrl, '_blank');

      // Poll /api/auth/google/status every 2s to detect when session is set
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // 2 minutes maximum

      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch('/api/auth/google/status', { credentials: 'include' });
          const status = await statusRes.json();

          if (status.authenticated) {
            clearInterval(pollRef.current!);
            // Session is live — navigate to success page to load the user
            setLocation('/auth/google/success');
          } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(pollRef.current!);
            setIsGoogleLoading(false);
            setGoogleError('Sign-in timed out. Please try again.');
          }
        } catch {
          // Ignore network errors during polling
        }
      }, 2000);
    } catch (err) {
      console.error('[AuthPage] Google sign-in error:', err);
      setIsGoogleLoading(false);
      setGoogleError('Failed to start Google sign-in. Please try again.');
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
          // Check for pending onboarding data and submit it
          const hasPendingData = sessionStorage.getItem('pendingOnboardingData');
          if (hasPendingData) {
            await submitPendingOnboardingData();
            setLocation("/dashboard");
          } else {
            setLocation("/onboarding");
          }
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
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 tracking-wider">{t('auth:common.orContinueWith')}</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full h-12 flex items-center justify-center gap-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all font-medium text-slate-700 text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.36c-.22-.66-.35-1.36-.35-2.36s.13-1.7.35-2.36V6.8H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 5.2l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.66 2.84c.87-2.6 3.3-4.47 6.16-4.47z" fill="#EA4335"/>
                </svg>
              )}
              {isGoogleLoading ? 'Opening Google...' : `Continue with Google`}
            </button>

            {googleError && (
              <p className="text-xs text-red-500 text-center mt-2">{googleError}</p>
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