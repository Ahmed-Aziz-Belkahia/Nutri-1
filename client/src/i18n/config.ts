import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enProfile from './locales/en/profile.json';
import enMeals from './locales/en/meals.json';
import enOnboarding from './locales/en/onboarding.json';
import enRecipes from './locales/en/recipes.json';
import enAnalytics from './locales/en/analytics.json';

import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arDashboard from './locales/ar/dashboard.json';
import arProfile from './locales/ar/profile.json';
import arMeals from './locales/ar/meals.json';
import arOnboarding from './locales/ar/onboarding.json';
import arRecipes from './locales/ar/recipes.json';
import arAnalytics from './locales/ar/analytics.json';

import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frDashboard from './locales/fr/dashboard.json';
import frProfile from './locales/fr/profile.json';
import frMeals from './locales/fr/meals.json';
import frOnboarding from './locales/fr/onboarding.json';
import frRecipes from './locales/fr/recipes.json';
import frAnalytics from './locales/fr/analytics.json';

import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esDashboard from './locales/es/dashboard.json';
import esProfile from './locales/es/profile.json';
import esMeals from './locales/es/meals.json';
import esOnboarding from './locales/es/onboarding.json';
import esRecipes from './locales/es/recipes.json';
import esAnalytics from './locales/es/analytics.json';

// Define resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    profile: enProfile,
    meals: enMeals,
    onboarding: enOnboarding,
    recipes: enRecipes,
    analytics: enAnalytics,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    dashboard: arDashboard,
    profile: arProfile,
    meals: arMeals,
    onboarding: arOnboarding,
    recipes: arRecipes,
    analytics: arAnalytics,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    dashboard: frDashboard,
    profile: frProfile,
    meals: frMeals,
    onboarding: frOnboarding,
    recipes: frRecipes,
    analytics: frAnalytics,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    dashboard: esDashboard,
    profile: esProfile,
    meals: esMeals,
    onboarding: esOnboarding,
    recipes: esRecipes,
    analytics: esAnalytics,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'profile', 'meals', 'onboarding', 'recipes', 'analytics'],
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nutriai_language',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;

// Helper to get RTL languages
export const RTL_LANGUAGES = ['ar'];

// Helper to check if language is RTL
export const isRTL = (language: string): boolean => {
  return RTL_LANGUAGES.includes(language);
};

// Available languages
export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];
