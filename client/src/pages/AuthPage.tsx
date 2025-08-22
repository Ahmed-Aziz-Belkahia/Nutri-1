import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Mail,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
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

  useEffect(() => {
    document.body.classList.add('auth-page');
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        setError("Passwords don't match");
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      const mutation = isLogin ? loginMutation : registerMutation;
      const result = await mutation.mutateAsync({ 
        email: formData.email, 
        password: formData.password 
      });

      if (result.ok) {
        setLocation("/onboarding");
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.response?.data?.error || "An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
      {/* Glassmorphic Background Elements */}
      <div className="absolute top-20 left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-300/20 to-blue-300/20 filter blur-3xl" />
      <div className="absolute bottom-20 right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-300/15 to-purple-300/15 filter blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-purple-200/10 to-pink-200/10 filter blur-3xl" />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Glassmorphic Card */}
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border border-white/20">
            {/* Logo/Title Section */}
            <div className="text-center mb-10">
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3"
              >
                NutriAI
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600 text-sm"
              >
                {isLogin ? "Welcome back! Please sign in to continue" : "Create your account to get started"}
              </motion.p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200"
                >
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 ml-1">
                  Email
                </label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-14 rounded-2xl w-full bg-white/50 backdrop-blur-sm border border-gray-200 pl-12 pr-4 transition-all focus:bg-white/70 focus:border-purple-400 focus:shadow-lg focus:shadow-purple-100/25"
                    placeholder="your@email.com"
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="h-14 rounded-2xl w-full bg-white/50 backdrop-blur-sm border border-gray-200 pl-12 pr-12 transition-all focus:bg-white/70 focus:border-purple-400 focus:shadow-lg focus:shadow-purple-100/25"
                    placeholder="••••••••"
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                      className="text-xs text-gray-500 hover:text-purple-600 transition-colors"
                    >
                      Forgot password?
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
                    className="space-y-2"
                  >
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 ml-1">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-14 rounded-2xl w-full bg-white/50 backdrop-blur-sm border border-gray-200 pl-12 pr-12 transition-all focus:bg-white/70 focus:border-purple-400 focus:shadow-lg focus:shadow-purple-100/25"
                        placeholder="••••••••"
                        required
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-medium text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-200/30 mt-8"
              >
                {loginMutation.isPending || registerMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-500">or</span>
              </div>
            </div>

            {/* Toggle Auth Mode */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
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
                  className="font-medium text-transparent bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-gray-500 mt-8"
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}