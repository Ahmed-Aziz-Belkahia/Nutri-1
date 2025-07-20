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
    // Always force Polish language
    i18n.changeLanguage('pl').then(() => {
      console.log('Language set to Polish');
      document.documentElement.lang = 'pl';
    }).catch(err => {
      console.error('Error setting Polish language:', err);
    });
  }, [i18n]);

  // For debugging - log current language on each render
  console.log('Current i18n language:', i18n.language);

  return <>{children}</>;
}