import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Zap, Target, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useFoodLog } from "../hooks/use-food-log";
import { useUserProfile } from "../hooks/use-user-profile";
import { TodaysMealPlans } from "@/components/TodaysMealPlans";
import { format } from 'date-fns';
import { useLocation } from "wouter";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Helper function to format numbers
const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return "0";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toFixed(0);
};

export default function EnhancedDashboard() {
  const { t } = useTranslation(['common']);
  const [selectedDate] = useState<Date>(new Date());
  const { foodLogs, isLoadingLogs } = useFoodLog(selectedDate);
  const { data: profile } = useUserProfile();
  const [, setLocation] = useLocation();

  if (isLoadingLogs) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="w-8 h-8 border-4 border-[#0CC5BA] border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }

  // Calculate totals from food logs
  const todayTotals = {
    calories: foodLogs.reduce((sum, log) => sum + (typeof log.calories === 'string' ? parseFloat(log.calories) : log.calories), 0),
    protein: foodLogs.reduce((sum, log) => sum + (typeof log.protein === 'string' ? parseFloat(log.protein) : log.protein), 0),
    carbs: foodLogs.reduce((sum, log) => sum + (typeof log.carbs === 'string' ? parseFloat(log.carbs) : log.carbs), 0),
    fat: foodLogs.reduce((sum, log) => sum + (typeof log.fat === 'string' ? parseFloat(log.fat) : log.fat), 0)
  };

  // Get goals from profile
  const calorieGoal = profile?.calorieGoal || 2000;
  const proteinGoal = profile?.proteinGoal || 150;
  const carbsGoal = profile?.carbsGoal || 200;
  const fatGoal = profile?.fatGoal || 67;

  // Calculate percentages
  const caloriePercentage = Math.min(Math.round((todayTotals.calories / calorieGoal) * 100), 100);
  const proteinPercentage = Math.min(Math.round((todayTotals.protein / proteinGoal) * 100), 100);
  const carbsPercentage = Math.min(Math.round((todayTotals.carbs / carbsGoal) * 100), 100);
  const fatPercentage = Math.min(Math.round((todayTotals.fat / fatGoal) * 100), 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 relative overflow-hidden p-4">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full" style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%230CC5BA\' fill-opacity=\'0.3\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
        }} />
      </div>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 max-w-[500px] mx-auto z-10 relative pb-20"
      >
        <motion.div 
          variants={itemVariants}
          className="mb-8 mt-4"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('common:enhancedDashboard.dailyProgress')}</h1>
          <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </motion.div>

        {/* Nutrition Progress Card */}
        <motion.div 
          variants={itemVariants}
          className="mb-8"
        >
          <Card 
            className="p-5 rounded-[24px] bg-white shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
            onClick={() => setLocation("/detailed-nutrition?date=" + format(selectedDate, 'yyyy-MM-dd'))}
          >
            {/* Main Calorie Section */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center shadow-sm">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">{t('common:enhancedDashboard.calorieIntake')}</h3>
                </div>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                    {formatNumber(todayTotals.calories)}
                  </div>
                  <div className="text-sm text-gray-500 ml-2">
                    {t('common:enhancedDashboard.ofGoal', { goal: formatNumber(calorieGoal) })}
                  </div>
                </div>
              </div>
              
              {/* Circular Progress */}
              <div className="relative" style={{ width: "100px", height: "100px" }}>
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth="6"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - caloriePercentage / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="drop-shadow-[0_0_8px_rgba(12,197,186,0.3)]"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0CC5BA" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-800"
                >
                  {caloriePercentage}%
                </motion.div>
              </div>
            </div>

            {/* Macro Nutrients Bars */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {/* Carbs Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('common:enhancedDashboard.carbs')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-medium text-gray-800">
                      {formatNumber(todayTotals.carbs)}g
                    </span>
                    <span className="text-xs text-gray-400">
                      / {formatNumber(carbsGoal)}g
                    </span>
                  </div>
                </div>
                <Progress 
                  value={carbsPercentage} 
                  className="h-2 bg-blue-100 [&>[data-progress]]:bg-blue-500"
                />
              </div>
              
              {/* Protein Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('common:enhancedDashboard.protein')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-medium text-gray-800">
                      {formatNumber(todayTotals.protein)}g
                    </span>
                    <span className="text-xs text-gray-400">
                      / {formatNumber(proteinGoal)}g
                    </span>
                  </div>
                </div>
                <Progress 
                  value={proteinPercentage} 
                  className="h-2 bg-purple-100 [&>[data-progress]]:bg-purple-500"
                />
              </div>
              
              {/* Fat Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('common:enhancedDashboard.fat')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-medium text-gray-800">
                      {formatNumber(todayTotals.fat)}g
                    </span>
                    <span className="text-xs text-gray-400">
                      / {formatNumber(fatGoal)}g
                    </span>
                  </div>
                </div>
                <Progress 
                  value={fatPercentage} 
                  className="h-2 bg-amber-100 [&>[data-progress]]:bg-amber-500"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Activity Stats Card - New Feature */}
        <motion.div 
          variants={itemVariants}
          className="mb-8"
        >
          <Card className="p-5 rounded-[24px] bg-white shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t('common:enhancedDashboard.activityStats')}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">{t('common:enhancedDashboard.stepsToday')}</div>
                <div className="text-2xl font-bold text-gray-800">7,842</div>
                <div className="text-xs text-green-500 mt-1">{t('common:enhancedDashboard.fromYesterday', { percent: 12 })}</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">{t('common:enhancedDashboard.activeMinutes')}</div>
                <div className="text-2xl font-bold text-gray-800">42</div>
                <div className="text-xs text-gray-400 mt-1">{t('common:enhancedDashboard.goalMinutes', { minutes: 60 })}</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Today's Meals */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">{t('common:enhancedDashboard.todaysMealPlan')}</h3>
            <div className="text-sm text-blue-500 font-medium">{t('common:enhancedDashboard.viewAll')}</div>
          </div>
          <TodaysMealPlans />
        </motion.div>

        {/* Weekly Goal Progress - New Feature */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 rounded-[24px] bg-white shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t('common:enhancedDashboard.weeklyGoalProgress')}</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('common:enhancedDashboard.weightLoss')}</span>
                  <div className="text-sm font-medium text-gray-800">0.5 kg / 1.0 kg</div>
                </div>
                <Progress value={50} className="h-2 bg-orange-100 [&>[data-progress]]:bg-orange-500" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('common:enhancedDashboard.workoutConsistency')}</span>
                  <div className="text-sm font-medium text-gray-800">{t('common:enhancedDashboard.workoutDays', { done: 4, total: 5 })}</div>
                </div>
                <Progress value={80} className="h-2 bg-green-100 [&>[data-progress]]:bg-green-500" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('common:enhancedDashboard.waterIntake')}</span>
                  <div className="text-sm font-medium text-gray-800">2.1L / 2.5L</div>
                </div>
                <Progress value={84} className="h-2 bg-blue-100 [&>[data-progress]]:bg-blue-500" />
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}