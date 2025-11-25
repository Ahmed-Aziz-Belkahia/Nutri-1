import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MealPlanProps {
  meals: {
    type: string;
    name: string;
    nutritionInfo: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    isCompleted: boolean;
    imageUrl?: string;
  }[];
}

export default function TodayMealPlan({ meals }: MealPlanProps) {
  const { t } = useTranslation(['common']);
  const [completedMeals, setCompletedMeals] = useState<number>(0);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const totalCarbs = meals.reduce((acc, meal) => acc + meal.nutritionInfo.carbs, 0);
  const totalProtein = meals.reduce((acc, meal) => acc + meal.nutritionInfo.protein, 0);
  const totalFat = meals.reduce((acc, meal) => acc + meal.nutritionInfo.fat, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9f9f9] to-[#f0f4ff] relative overflow-hidden">
      {/* Abstract background pattern */}
      <div className="absolute inset-0 opacity-5" style={{ 
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      }}></div>
      
      {/* Colorful abstract shapes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-600/5 filter blur-3xl -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 filter blur-3xl translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/5 filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-pink-500/5 filter blur-3xl" />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-black bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent tracking-tight mb-2">
            {t('common:todayMealPlan.title')}
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            {t('common:todayMealPlan.description')}
          </p>
        </motion.div>

        {/* Macro circles with improved styling */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center gap-4 lg:gap-16 mb-12"
        >
          <div className="flex flex-col items-center">
            <div className="w-[110px] h-[110px] lg:w-[130px] lg:h-[130px] rounded-full bg-gradient-to-br from-[#0CC5BA]/10 to-[#0CC5BA]/5 border-2 border-[#0CC5BA]/30 shadow-lg flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
              <div className="text-center relative z-10">
                <div className="text-2xl font-bold text-[#0CC5BA]">{totalCarbs}g</div>
                <div className="text-sm text-gray-700 font-medium">{t('common:enhancedDashboard.carbs')}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[110px] h-[110px] lg:w-[130px] lg:h-[130px] rounded-full bg-gradient-to-br from-[#3B82F6]/10 to-[#3B82F6]/5 border-2 border-[#3B82F6]/30 shadow-lg flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
              <div className="text-center relative z-10">
                <div className="text-2xl font-bold text-[#3B82F6]">{totalProtein}g</div>
                <div className="text-sm text-gray-700 font-medium">{t('common:enhancedDashboard.protein')}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[110px] h-[110px] lg:w-[130px] lg:h-[130px] rounded-full bg-gradient-to-br from-[#F59E0B]/10 to-[#F59E0B]/5 border-2 border-[#F59E0B]/30 shadow-lg flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
              <div className="text-center relative z-10">
                <div className="text-2xl font-bold text-[#F59E0B]">{totalFat}g</div>
                <div className="text-sm text-gray-700 font-medium">{t('common:enhancedDashboard.fat')}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Today's Plan Section */}
        <div className="space-y-6">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-2xl font-bold text-gray-900 flex items-center gap-2"
          >
            <div className="h-6 w-1.5 bg-gradient-to-b from-[#0CC5BA] to-[#0C9CCC] rounded-full" />
            {t('common:todayMealPlan.todaysMealPlan')}
          </motion.h2>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {meals.map((meal, index) => (
              <motion.div 
                key={index} 
                variants={item}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
              >
                <div className="p-0.5 bg-gradient-to-r from-[#0CC5BA] via-[#3B82F6] to-[#8B5CF6]">
                  <div className="bg-white rounded-t-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-[#0CC5BA]" />
                        </div>
                        <span className="font-bold text-gray-800">{meal.type}</span>
                      </div>
                      {meal.isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 font-medium">{t('common:todayMealPlan.completed')}</span>
                          <div className="bg-green-100 rounded-full p-1.5">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="bg-white border-[#0CC5BA] text-[#0CC5BA] hover:bg-[#0CC5BA]/10 hover:text-[#0CC5BA]"
                          onClick={() => setCompletedMeals(prev => prev + 1)}
                        >
                          {t('common:todayMealPlan.markAsEaten')}
                        </Button>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{meal.name}</h3>

                    {/* Meal nutrition cards */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center shadow-sm">
                        <div className="font-semibold text-lg text-gray-900">{meal.nutritionInfo.calories}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">{t('common:todayMealPlan.kcal')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center shadow-sm">
                        <div className="font-semibold text-lg text-[#3B82F6]">{meal.nutritionInfo.protein}g</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">{t('common:enhancedDashboard.protein')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center shadow-sm">
                        <div className="font-semibold text-lg text-[#0CC5BA]">{meal.nutritionInfo.carbs}g</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">{t('common:enhancedDashboard.carbs')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center shadow-sm">
                        <div className="font-semibold text-lg text-[#F59E0B]">{meal.nutritionInfo.fat}g</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">{t('common:enhancedDashboard.fat')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}