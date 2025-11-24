import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, Utensils, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['common']);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Section with Logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <img 
            src="/logo.png" 
            alt="NutriAI" 
            className="h-32 w-auto object-contain"
          />
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-bold text-[#102A42] mb-3"
        >
          {t('common:landing.appName')}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-gray-600 mb-12 text-center max-w-sm"
        >
          {t('common:landing.tagline')}
        </motion.p>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-3 gap-4 mb-12 w-full max-w-md"
        >
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl">
            <div className="w-12 h-12 bg-[#75C5C1]/10 rounded-full flex items-center justify-center mb-2">
              <Camera className="w-6 h-6 text-[#75C5C1]" />
            </div>
            <span className="text-xs text-gray-600 font-medium">{t('common:landing.features.aiScan')}</span>
          </div>
          
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl">
            <div className="w-12 h-12 bg-[#C51A1B]/10 rounded-full flex items-center justify-center mb-2">
              <Utensils className="w-6 h-6 text-[#C51A1B]" />
            </div>
            <span className="text-xs text-gray-600 font-medium">{t('common:landing.features.mealPlans')}</span>
          </div>
          
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl">
            <div className="w-12 h-12 bg-[#102A42]/10 rounded-full flex items-center justify-center mb-2">
              <TrendingUp className="w-6 h-6 text-[#102A42]" />
            </div>
            <span className="text-xs text-gray-600 font-medium">{t('common:landing.features.track')}</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA Section */}
      <div className="px-6 pb-8 pt-4 border-t border-gray-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-3 w-full max-w-md mx-auto"
        >
          <Button
            onClick={() => setLocation("/auth?tab=signup")}
            size="lg"
            className="w-full bg-[#C51A1B] hover:bg-[#a01516] text-white py-6 text-base font-semibold rounded-xl shadow-sm transition-all"
          >
            {t('common:landing.getStarted')}
          </Button>
          
          <Button
            onClick={() => setLocation("/auth?tab=login")}
            size="lg"
            variant="outline"
            className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-6 text-base font-semibold rounded-xl transition-all"
          >
            {t('common:landing.signIn')}
          </Button>

          <p className="text-center text-xs text-gray-500 pt-2">
            {t('common:landing.termsNotice')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}