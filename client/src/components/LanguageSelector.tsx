import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface LanguageSelectorProps {
  onLanguageSelected?: (language: string) => void;
  showTitle?: boolean;
}

export function LanguageSelector({ onLanguageSelected, showTitle = true }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    // Always set to English
    setSelectedLanguage('en');
    i18n.changeLanguage('en');
  }, [i18n]);

  useEffect(() => {
    if (onLanguageSelected) {
      onLanguageSelected('en');
    }
  }, [onLanguageSelected]);

  return (
    <div className="w-full flex flex-col items-center">
      {showTitle && (
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Język aplikacji</h3>
      )}
      
      <div className="flex justify-center w-full max-w-xs">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <div
            className="w-32 h-32 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden bg-red-50 border-2 border-red-500 shadow-xl shadow-red-500/20"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-md"
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
            
            <div className="flex flex-col items-center justify-center h-full">
              <img 
                src="/poland-flag.svg" 
                alt="Poland Flag" 
                className="w-12 h-12 mb-2 object-cover rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNDAwIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMCAwaDY0MHY0MDBIMHoiLz48cGF0aCBmaWxsPSIjZGMxNDNjIiBkPSJNMCAyMDBoNjQwdjIwMEgweiIvPjwvc3ZnPg==";
                }}
              />
              <div className="font-medium text-lg text-red-600">
                Polski
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}