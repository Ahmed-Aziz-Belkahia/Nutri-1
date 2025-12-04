import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
// Google OAuth temporarily disabled
// import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function AuthPage() {
  const { t } = useTranslation(['auth']);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

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
          setLocation("/onboarding");
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.response?.data?.error || t('auth:common.unexpectedError'));
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
            {/* Back to landing */}
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t('auth:common.backToHome', 'Back to Home')}</span>
            </button>

            {/* Logo Section */}
            <div className="flex flex-col items-center mb-6">
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
                className="text-2xl font-bold text-gray-900 mb-1"
              >
                {isLogin ? t('auth:login.title', 'Welcome Back') : t('auth:register.title', 'Create Account')}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600 text-sm text-center"
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
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {isLogin ? t('auth:login.email') : t('auth:register.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-12 rounded-xl w-full pl-10 pr-4 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                    placeholder={isLogin ? t('auth:login.emailPlaceholder') : t('auth:register.emailPlaceholder')}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  {isLogin ? t('auth:login.password') : t('auth:register.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="h-12 rounded-xl w-full pl-10 pr-12 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                    placeholder={isLogin ? t('auth:login.passwordPlaceholder') : t('auth:register.passwordPlaceholder')}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                      className="text-xs text-[#26A8FF] hover:text-[#0CC5BA] transition-colors font-medium"
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
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      {t('auth:register.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-12 rounded-xl w-full pl-10 pr-12 bg-white border-gray-200 focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20"
                        placeholder={t('auth:register.confirmPasswordPlaceholder')}
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF] hover:opacity-90 text-white rounded-xl font-semibold transition-all mt-6"
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
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">{t('auth:common.orContinueWith')}</span>
              </div>
            </div>

            {/* Google Sign In Button - Temporarily commented out for Android implementation */}
            {/* <GoogleAuthButton mode={isLogin ? 'login' : 'register'} /> */}

            {/* Toggle Auth Mode */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
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
                  className="font-semibold text-[#26A8FF] hover:text-[#0CC5BA] transition-colors"
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
          className="text-center text-xs text-gray-500 mt-6"
        >
          {t('auth:common.termsAndPrivacy')}
        </motion.p>
      </motion.div>
    </div>
  );
}