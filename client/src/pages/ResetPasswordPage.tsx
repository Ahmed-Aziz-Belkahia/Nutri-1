import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`/api/auth/reset-password/${token}`, { password });
      
      if (response.data.success) {
        setIsSuccess(true);
        toast({
          title: 'Password reset successful',
          description: 'Your password has been successfully reset. You can now log in with your new password.',
        });
        
        // Redirect to login page after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-blue-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 relative overflow-hidden rounded-t-xl"
            style={{
              background: 'linear-gradient(225deg, #0CC5BA, #3B82F6)'
            }}
          >
            <div className="absolute top-6 left-6">
              <Button 
                onClick={() => navigate('/login')} 
                size="icon" 
                variant="ghost" 
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="pt-8 pb-4 text-center">
              <h1 className="text-white text-2xl font-bold mt-2">Reset Your Password</h1>
              <p className="text-white/80 mt-2">Enter your new password below</p>
            </div>
          </div>
          
          <div className="p-6">
            {isSuccess ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Password Reset Successful</h2>
                <p className="text-gray-600 mb-6">
                  Your password has been successfully reset. You will be redirected to the login page shortly.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-start gap-3"
                  >
                    <div className="bg-red-100 rounded-full p-1 mt-0.5">
                      <Lock className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Password reset failed</div>
                      <div className="text-sm opacity-90">{error}</div>
                    </div>
                  </motion.div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-lg"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-lg"
                      placeholder="Confirm your password"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}