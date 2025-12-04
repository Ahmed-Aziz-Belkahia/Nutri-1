import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { AVAILABLE_LANGUAGES, isRTL } from '../i18n/config';

// Map language codes to flag emojis
const FLAG_EMOJIS: Record<string, string> = {
  en: '🇬🇧',
  ar: '🇸🇦',
  fr: '🇫🇷',
  es: '🇪🇸',
  pl: '🇵🇱',
};

export function OnboardingLanguageSelector() {
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
  const currentFlagEmoji = FLAG_EMOJIS[currentLanguage.code] || '🌐';

  return (
    <div className="relative z-50">
      {/* Compact language button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:border-[#26A8FF]/50 hover:bg-white transition-all shadow-sm"
      >
        <span className="text-xl">{currentFlagEmoji}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
            >
              <div className="flex gap-1 p-2">
                {AVAILABLE_LANGUAGES.map((language) => {
                  const flagEmoji = FLAG_EMOJIS[language.code] || '🌐';
                  return (
                    <button
                      key={language.code}
                      onClick={() => changeLanguage(language.code)}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors ${
                        i18n.language === language.code ? 'bg-[#26A8FF]/10 ring-2 ring-[#26A8FF]' : ''
                      }`}
                      title={language.nativeName}
                    >
                      <span className="text-2xl">{flagEmoji}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
