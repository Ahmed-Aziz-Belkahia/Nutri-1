import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import plTranslation from './locales/pl/translation.json';
import plMealPlanningQuiz from './locales/pl/mealPlanningQuiz.json';

// Log the detected language
console.log('Detected user language:', 'pl');

// Initialize i18next with Polish only
i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: {
        translation: plTranslation,
        mealPlanningQuiz: plMealPlanningQuiz
      }
    },
    lng: 'pl',
    fallbackLng: 'pl',
    interpolation: {
      escapeValue: false, // React already escapes values
    }
  });

// Log which language was actually selected
console.log('i18next initialized with language:', i18n.language);

export default i18n;