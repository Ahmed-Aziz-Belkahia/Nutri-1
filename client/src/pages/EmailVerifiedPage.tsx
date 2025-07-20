import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmailVerifiedPage() {
  const { token } = useParams();
  const [, navigate] = useLocation();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // If we came from the verification link with a token
        if (token) {
          const response = await axios.get(`/api/auth/verify-email/${token}`);
          
          if (response.data.success) {
            setStatus('success');
            setMessage('Your email has been successfully verified!');
          } else {
            setStatus('error');
            setMessage(response.data.message || 'Failed to verify email');
          }
        } else {
          // If we navigated to this page directly without a token
          setStatus('success');
          setMessage('Your email has been successfully verified!');
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || 'The verification link is invalid or has expired');
      }
    };
    
    verifyEmail();
  }, [token]);
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-blue-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8">
          {status === 'loading' ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verifying your email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </div>
          ) : status === 'success' ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-8">
                Your email has been successfully verified. Thank you for completing this step.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90 h-12"
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/profile')}
                  className="w-full h-12"
                >
                  View Profile
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-8">
                {message || 'The verification link is invalid or has expired.'}
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90 h-12"
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/settings')}
                  className="w-full h-12"
                >
                  Resend Verification Email
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}