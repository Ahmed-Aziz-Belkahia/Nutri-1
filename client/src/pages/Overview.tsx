import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/hooks/use-user";

import { useState } from "react";
import { motion } from "framer-motion";
import WeekCalendar from "@/components/WeekCalendar";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Utensils,
  Activity,
  Scale,
  Apple,
  Pizza,
  Cookie,
  Coffee,
  Flame,
  Star
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Overview() {
  const { user } = useUser();
  const { t } = useTranslation(['common']);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const quickAddItems = [
    { icon: <Apple className="w-4 h-4" />, label: t('common:overview.quickAdd.items.fruit') },
    { icon: <Utensils className="w-4 h-4" />, label: t('common:overview.quickAdd.items.meal') },
    { icon: <Pizza className="w-4 h-4" />, label: t('common:overview.quickAdd.items.fastFood') },
    { icon: <Cookie className="w-4 h-4" />, label: t('common:overview.quickAdd.items.snack') },
    { icon: <Coffee className="w-4 h-4" />, label: t('common:overview.quickAdd.items.drink') },
  ];

  // Level and XP functionality removed

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background - completely white, no patterns */}
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/70 backdrop-blur-md shadow-sm border-b border-[#0CC5BA]/10">
        <div className="w-full max-w-[500px] mx-auto px-4 pt-4 pb-2">
          {/* User Profile */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0CC5BA] to-[#0C9CCC] flex items-center justify-center shadow-lg shadow-[#0CC5BA]/20 relative overflow-hidden"
              >
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-xl">
                    {user?.email?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
                {/* Level Badge removed */}
              </motion.div>
              <div>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-gray-500"
                >
                  {t('common:overview.welcomeBack')}
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent"
                >
                  {user?.email?.split('@')[0] || t('common:overview.userPlaceholder')}
                </motion.h2>
              </div>
            </div>
          </div>

          {/* XP Progress section removed */}

          {/* Calendar */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 bg-white/40 backdrop-blur-sm rounded-[24px] p-4 shadow-lg shadow-[#0CC5BA]/5 hover:shadow-[#0CC5BA]/10 hover:bg-white/50 transition-all duration-300"
          >
            <WeekCalendar onSelectDate={setSelectedDate} />
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.03, y: -3 }}
              className="p-4 rounded-3xl bg-gradient-to-br from-white/80 to-white/60 shadow-lg shadow-[#0CC5BA]/5 border border-[#0CC5BA]/10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 flex items-center justify-center mb-2 border border-[#0CC5BA]/20 shadow-[0_0_15px_rgba(12,197,186,0.1)]">
                  <Flame className="w-6 h-6 text-[#0CC5BA]" strokeWidth={2} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{t('common:overview.stats.calories')}</p>
                <p className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">1,463</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03, y: -3 }}
              className="p-4 rounded-3xl bg-gradient-to-br from-white/80 to-white/60 shadow-lg shadow-[#0CC5BA]/5 border border-[#0CC5BA]/10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 flex items-center justify-center mb-2 border border-[#0CC5BA]/20 shadow-[0_0_15px_rgba(12,197,186,0.1)]">
                  <Activity className="w-6 h-6 text-[#0CC5BA]" strokeWidth={2} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{t('common:overview.stats.protein')}</p>
                <p className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">82g</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.03, y: -3 }}
              className="p-4 rounded-3xl bg-gradient-to-br from-white/80 to-white/60 shadow-lg shadow-[#0CC5BA]/5 border border-[#0CC5BA]/10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 flex items-center justify-center mb-2 border border-[#0CC5BA]/20 shadow-[0_0_15px_rgba(12,197,186,0.1)]">
                  <Scale className="w-6 h-6 text-[#0CC5BA]" strokeWidth={2} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{t('common:overview.stats.weight')}</p>
                <p className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">75kg</p>
              </div>
            </motion.div>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative mb-4"
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0CC5BA]">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder={t('common:overview.searchPlaceholder')}
              className="w-full h-14 pl-12 pr-4 rounded-[24px] bg-white/80 backdrop-blur-sm border border-[#0CC5BA]/10 text-base shadow-lg shadow-[#0CC5BA]/5 focus:ring-[#0CC5BA]/20 focus:border-[#0CC5BA]/30 focus:shadow-[#0CC5BA]/10 transition-all duration-300"
            />
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[500px] mx-auto px-4 pt-4 pb-24 z-10 relative">
        {/* Quick Add Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 bg-white/40 backdrop-blur-sm rounded-[24px] p-6 shadow-lg shadow-[#0CC5BA]/5 hover:shadow-[#0CC5BA]/10 hover:bg-white/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">{t('common:overview.quickAdd.title')}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#0CC5BA] hover:text-[#0CC5BA]/80 hover:bg-[#0CC5BA]/5 group text-base rounded-full"
            >
              {t('common:overview.quickAdd.viewAll')}
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {quickAddItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.08, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-3 p-3 rounded-3xl bg-gradient-to-br from-white/80 to-white/60 shadow-lg shadow-[#0CC5BA]/5 border border-[#0CC5BA]/10 hover:shadow-[#0CC5BA]/15 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 flex items-center justify-center border border-[#0CC5BA]/20 shadow-[0_0_15px_rgba(12,197,186,0.1)]">
                  <div className="w-5 h-5 text-[#0CC5BA]">
                    {item.icon}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Today's Log */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8 bg-white/40 backdrop-blur-sm rounded-[24px] p-6 shadow-lg shadow-[#0CC5BA]/5 hover:shadow-[#0CC5BA]/10 hover:bg-white/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">{t('common:overview.todaysLog.title')}</h3>
            <Link href="/enhanced-add-food">
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white hover:from-[#0E95A7]/90 hover:to-[#1E6F7D]/90 rounded-full shadow-lg shadow-[#0E95A7]/20"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('common:overview.todaysLog.addFood')}
              </Button>
            </Link>
          </div>

          {/* No meals placeholder */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-white/80 to-white/60 rounded-3xl p-8 text-center border border-[#0CC5BA]/10 shadow-lg shadow-[#0CC5BA]/5"
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, 0] }}
                transition={{ 
                  delay: 0.8,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 flex items-center justify-center border border-[#0CC5BA]/20 shadow-[0_0_15px_rgba(12,197,186,0.1)]"
              >
                <Utensils className="w-10 h-10 text-[#0CC5BA]" />
              </motion.div>
              <div>
                <h4 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent mb-2">{t('common:overview.todaysLog.noMealsTitle')}</h4>
                <p className="text-base text-gray-500">
                  {t('common:overview.todaysLog.noMealsDesc')}
                </p>
              </div>
              <Link href="/enhanced-add-food">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white hover:from-[#0E95A7]/90 hover:to-[#1E6F7D]/90 rounded-full shadow-lg shadow-[#0E95A7]/20 px-8"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('common:overview.todaysLog.startLogging')}
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </motion.section>
      </div>

      <Link href="/enhanced-add-food">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white shadow-lg shadow-[#0E95A7]/20 flex items-center justify-center hover:from-[#0E95A7]/90 hover:to-[#1E6F7D]/90 transition-all"
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      </Link>
    </div>
  );
}