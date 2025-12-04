import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, Utensils, Camera, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['common']);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px]"
      >
        <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF]" />
          
          <div className="p-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center mb-6"
            >
              <img 
                src="/logo.png" 
                alt="NutriAI" 
                className="h-24 w-auto object-contain"
              />
            </motion.div>

            {/* App Name */}
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-3xl font-bold text-gray-900 text-center mb-2"
            >
              {t('common:landing.appName')}
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-gray-600 text-center mb-8"
            >
              {t('common:landing.tagline')}
            </motion.p>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-3 gap-3 mb-8"
            >
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-[#0CC5BA]/10 rounded-xl flex items-center justify-center mb-3">
                  <Camera className="w-6 h-6 text-[#0CC5BA]" />
                </div>
                <span className="text-xs text-gray-600 font-medium">{t('common:landing.features.aiScan')}</span>
              </div>
              
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-[#26A8FF]/10 rounded-xl flex items-center justify-center mb-3">
                  <Utensils className="w-6 h-6 text-[#26A8FF]" />
                </div>
                <span className="text-xs text-gray-600 font-medium">{t('common:landing.features.mealPlans')}</span>
              </div>
              
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
                <span className="text-xs text-gray-600 font-medium">{t('common:landing.features.track')}</span>
              </div>
            </motion.div>

            {/* AI Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center justify-center gap-2 mb-8 px-4 py-2 bg-gradient-to-r from-[#0CC5BA]/5 to-[#26A8FF]/5 rounded-full border border-[#0CC5BA]/10"
            >
              <Sparkles className="w-4 h-4 text-[#26A8FF]" />
              <span className="text-sm text-gray-600">Powered by AI</span>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="space-y-3"
            >
              <Button
                onClick={() => setLocation("/auth?tab=signup")}
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-[#26A8FF] hover:opacity-90 text-white text-base font-semibold rounded-xl shadow-sm transition-all"
              >
                {t('common:landing.getStarted')}
              </Button>
              
              <Button
                onClick={() => setLocation("/auth?tab=login")}
                size="lg"
                variant="outline"
                className="w-full h-14 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 text-base font-semibold rounded-xl transition-all"
              >
                {t('common:landing.signIn')}
              </Button>
            </motion.div>

            {/* Terms */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-xs text-gray-500 mt-6"
            >
              {t('common:landing.termsNotice')}
            </motion.p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}