import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function DebugLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation(['common']);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Make the login request
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Important for cookies
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setResponse(data);
      toast({
        title: t('common:debugLogin.loginSuccess'),
        description: t('common:debugLogin.loginSuccessDesc')
      });

      // Check authentication status
      checkAuthStatus();
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: t('common:debugLogin.loginFailed'),
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/user', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setResponse({
          auth: false,
          message: data.error || 'Not authenticated',
          status: response.status
        });
      } else {
        setResponse({
          auth: true,
          user: data,
          status: response.status
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const checkCookies = () => {
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    setResponse({
      cookies: cookies.length === 0 ? 'No cookies found' : cookies
    });
  };

  return (
    <div className="min-h-screen p-6 flex flex-col">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg w-full">
        <h1 className="text-2xl font-bold mb-6">{t('common:debugLogin.title')}</h1>
        
        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common:debugLogin.emailLabel')}</label>
            <Input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('common:debugLogin.emailPlaceholder')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common:debugLogin.passwordLabel')}</label>
            <Input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('common:debugLogin.passwordPlaceholder')}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t('common:debugLogin.loggingIn') : t('common:debugLogin.loginButton')}
          </Button>
        </form>
        
        <div className="flex space-x-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={checkAuthStatus}
            className="flex-1"
          >
            {t('common:debugLogin.checkAuthStatus')}
          </Button>
          
          <Button 
            type="button" 
            variant="outline"
            onClick={checkCookies}
            className="flex-1"
          >
            {t('common:debugLogin.checkCookies')}
          </Button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
            {error}
          </div>
        )}
        
        {response && (
          <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded">
            <h3 className="font-bold mb-2">{t('common:debugLogin.responseTitle')}</h3>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}