import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRTL } from '../i18n/config';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Initialize language from localStorage or browser
    const savedLanguage = localStorage.getItem('nutriai_language');
    const initialLanguage = savedLanguage || i18n.language || 'en';
    
    // Set the language and RTL direction
    i18n.changeLanguage(initialLanguage).then(() => {
      const htmlElement = document.documentElement;
      
      // Set language attribute
      htmlElement.setAttribute('lang', initialLanguage);
      
      // Set direction for RTL languages
      if (isRTL(initialLanguage)) {
        htmlElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
      } else {
        htmlElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl');
      }
      
      console.log(`Language initialized: ${initialLanguage}, RTL: ${isRTL(initialLanguage)}`);
    }).catch(err => {
      console.error('Error setting language:', err);
    });
  }, []);

  // Handle language changes
  useEffect(() => {
    const htmlElement = document.documentElement;
    
    // Update direction when language changes
    if (isRTL(i18n.language)) {
      htmlElement.setAttribute('dir', 'rtl');
      document.body.classList.add('rtl');
    } else {
      htmlElement.setAttribute('dir', 'ltr');
      document.body.classList.remove('rtl');
    }
    
    htmlElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  return <>{children}</>;
}