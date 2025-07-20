import { useState } from 'react';
import { useLocation } from 'wouter';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      
      if (response.data.success) {
        setIsSuccess(true);
        toast({
          title: 'Recovery email sent',
          description: 'If an account exists with this email, you will receive a recovery link shortly.',
        });
      } else {
        // We handle this differently since we don't want to reveal if the email exists
        setIsSuccess(true);
        toast({
          title: 'Recovery email sent',
          description: 'If an account exists with this email, you will receive a recovery link shortly.',
        });
      }
    } catch (error: any) {
      console.error('Password reset request error:', error);
      // Even on error, we don't want to reveal if the email exists
      setIsSuccess(true);
      toast({
        title: 'Recovery email sent',
        description: 'If an account exists with this email, you will receive a recovery link shortly.',
      });
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
              <h1 className="text-white text-2xl font-bold mt-2">Forgot Password</h1>
              <p className="text-white/80 mt-2">We'll send you a link to reset your password</p>
            </div>
          </div>
          
          <div className="p-6">
            {isSuccess ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  If an account exists with the email <strong>{email}</strong>, we've sent instructions to reset your password.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90"
                >
                  Return to Login
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
                      <Mail className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Error</div>
                      <div className="text-sm opacity-90">{error}</div>
                    </div>
                  </motion.div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-lg"
                      placeholder="Enter your email address"
                      required
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
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <span>Send Recovery Link</span>
                    )}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                      Remembered your password?{' '}
                      <a 
                        onClick={() => navigate('/login')} 
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        Sign in
                      </a>
                    </p>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}