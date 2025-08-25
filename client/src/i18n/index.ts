import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en/translation.json';
import enMealPlanningQuiz from './locales/en/mealPlanningQuiz.json';
import plTranslation from './locales/pl/translation.json';
import plMealPlanningQuiz from './locales/pl/mealPlanningQuiz.json';

// Log the detected language
console.log('Detected user language:', 'en');

// Initialize i18next with English as default
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
        mealPlanningQuiz: enMealPlanningQuiz
      },
      pl: {
        translation: plTranslation,
        mealPlanningQuiz: plMealPlanningQuiz
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    }
  });

// Log which language was actually selected
console.log('i18next initialized with language:', i18n.language);

export default i18n;