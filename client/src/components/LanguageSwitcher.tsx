import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { AVAILABLE_LANGUAGES, isRTL } from '../i18n/config';

interface LanguageSwitcherProps {
  variant?: 'button' | 'menu';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'button', className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    localStorage.setItem('nutriai_language', languageCode);
    
    // Update HTML direction for RTL languages
    const htmlElement = document.documentElement;
    if (isRTL(languageCode)) {
      htmlElement.setAttribute('dir', 'rtl');
      htmlElement.setAttribute('lang', languageCode);
    } else {
      htmlElement.setAttribute('dir', 'ltr');
      htmlElement.setAttribute('lang', languageCode);
    }
    
    setIsOpen(false);
  };

  const currentLanguage = AVAILABLE_LANGUAGES.find(lang => lang.code === i18n.language) || AVAILABLE_LANGUAGES[0];

  if (variant === 'button') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all shadow-sm"
        >
          <Globe className="w-5 h-5 text-[var(--color-primary)]" />
          <span className="text-2xl">{currentLanguage.flag}</span>
          <span className="font-medium text-gray-700">{currentLanguage.nativeName}</span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 min-w-[240px]"
              >
                {AVAILABLE_LANGUAGES.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => changeLanguage(language.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                      i18n.language === language.code ? 'bg-[var(--color-primary)]/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{language.flag}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{language.nativeName}</div>
                        <div className="text-sm text-gray-500">{language.name}</div>
                      </div>
                    </div>
                    {i18n.language === language.code && (
                      <Check className="w-5 h-5 text-[var(--color-primary)]" />
                    )}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Menu variant - inline menu for settings pages
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Language
      </label>
      <div className="grid grid-cols-1 gap-2">
        {AVAILABLE_LANGUAGES.map((language) => (
          <button
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              i18n.language === language.code
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{language.flag}</span>
              <div className="text-left">
                <div className="font-semibold text-gray-900">{language.nativeName}</div>
                <div className="text-sm text-gray-500">{language.name}</div>
              </div>
            </div>
            {i18n.language === language.code && (
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
