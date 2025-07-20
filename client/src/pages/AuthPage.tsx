import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  ArrowLeft, 
  Lock, 
  Mail, 
  User, 
  LogIn, 
  UserPlus,
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
    // Add body class to prevent scrolling
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
        setError("Hasła nie są identyczne");
        return;
      }

      if (formData.password.length < 6) {
        setError("Hasło musi mieć co najmniej 6 znaków");
        return;
      }

      const mutation = isLogin ? loginMutation : registerMutation;
      const result = await mutation.mutateAsync({ 
        email: formData.email, 
        password: formData.password 
      });

      if (result.ok) {
        // For new registrations, always go to onboarding
        setLocation("/onboarding");
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.response?.data?.error || "Wystąpił nieoczekiwany błąd");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f0f4f9] flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-4"
      >
        <div className="bg-white rounded-2xl overflow-hidden shadow-md w-full">
          {/* Auth Header */}
          <div className="p-6 bg-[#0CC5BA] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-full p-3">
                {isLogin ? <LogIn className="w-6 h-6 text-[#0CC5BA]" /> : <UserPlus className="w-6 h-6 text-[#0CC5BA]" />}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold">
                  {isLogin ? "Witamy ponownie" : "Utwórz konto"}
                </h2>
                <p className="text-white/80 text-sm">
                  {isLogin ? "Zaloguj się, aby kontynuować" : "Dołącz do NutriAI już dziś"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-red-500 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="text-xs font-medium text-gray-500 mb-1 ml-1 block">
                  E-mail
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-12 rounded-lg w-full bg-gray-50 border border-gray-200 pl-10"
                    placeholder="your@email.com"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-medium text-gray-500 mb-1 ml-1 block">
                  Hasło
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="h-12 rounded-lg w-full bg-gray-50 border border-gray-200 pl-10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? 
                      <EyeOff className="h-5 w-5" /> : 
                      <Eye className="h-5 w-5" />
                    }
                  </button>
                </div>
                {isLogin && (
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setLocation("/forgot-password")}
                      className="text-xs text-gray-500 hover:text-[#0CC5BA]"
                    >
                      Zapomniałeś hasła?
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label htmlFor="confirmPassword" className="text-xs font-medium text-gray-500 mb-1 ml-1 block">
                      Potwierdź hasło
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-12 rounded-lg w-full bg-gray-50 border border-gray-200 pl-10 pr-10"
                        placeholder="••••••••"
                        required
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
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

              <Button 
                type="submit"
                disabled={loginMutation.isPending || registerMutation.isPending}
                className="w-full h-12 bg-[#0CC5BA] hover:bg-[#0AA5A0] text-white rounded-lg transition-colors mt-2"
              >
                {loginMutation.isPending || registerMutation.isPending ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center">
                    {isLogin ? <LogIn className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    <span>{isLogin ? "ZALOGUJ SIĘ" : "ZAREJESTRUJ SIĘ"}</span>
                  </div>
                )}
              </Button>
            </form>
          </div>

          {/* Switch between login/register */}
          <div className="p-4 border-t border-gray-100 text-center">
            {isLogin ? (
              <div className="text-sm text-gray-600">
                Nie masz konta? <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError(null);
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                    setFormData({ email: '', password: '', confirmPassword: '' });
                  }}
                  className="text-[#0CC5BA] font-medium hover:underline"
                >
                  Zarejestruj się
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Masz już konto? <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                    setFormData({ email: '', password: '', confirmPassword: '' });
                  }}
                  className="text-[#0CC5BA] font-medium hover:underline"
                >
                  Zaloguj się
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}