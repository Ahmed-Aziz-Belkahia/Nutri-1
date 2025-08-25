import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../hooks/use-auth';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Always force English language
    i18n.changeLanguage('en').then(() => {
      console.log('Language set to English');
      document.documentElement.lang = 'en';
    }).catch(err => {
      console.error('Error setting English language:', err);
    });
  }, [i18n]);

  // For debugging - log current language on each render
  console.log('Current i18n language:', i18n.language);

  return <>{children}</>;
}