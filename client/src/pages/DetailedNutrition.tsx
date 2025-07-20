import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFoodLog } from "../hooks/use-food-log";
import { useUserProfile } from "../hooks/use-user-profile";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  ChevronLeft, 
  Coffee, 
  Utensils, 
  Pizza, 
  Apple, 
  Calendar 
} from "lucide-react";
import { format, parse } from 'date-fns';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
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

export default function DetailedNutrition() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  
  const getInitialDate = () => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const dateParam = params.get('date');
    if (dateParam) {
      const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return new Date();
  };

  const [selectedDate] = useState<Date>(getInitialDate());
  const { foodLogs, isLoadingLogs } = useFoodLog(selectedDate);
  const { data: profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoadingLogs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0CC5BA] border-t-transparent rounded-full animate-spin" />
      </div>
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

  // Meal-specific nutrient breakdown
  const mealsBreakdown = [
    {
      name: "Breakfast",
      icon: <Coffee className="h-5 w-5" />,
      calories: 450,
      protein: 30,
      carbs: 45,
      fat: 15
    },
    {
      name: "Lunch",
      icon: <Utensils className="h-5 w-5" />,
      calories: 650,
      protein: 40,
      carbs: 65,
      fat: 25
    },
    {
      name: "Dinner",
      icon: <Pizza className="h-5 w-5" />,
      calories: 550,
      protein: 35,
      carbs: 55,
      fat: 20
    },
    {
      name: "Snacks",
      icon: <Apple className="h-5 w-5" />,
      calories: 250,
      protein: 10,
      carbs: 30,
      fat: 10
    }
  ];

  // Micronutrients data
  const micronutrients = [
    { name: "Vitamin A", current: 750, goal: 900, unit: "μg" },
    { name: "Vitamin C", current: 65, goal: 90, unit: "mg" },
    { name: "Vitamin D", current: 12, goal: 20, unit: "μg" },
    { name: "Calcium", current: 950, goal: 1200, unit: "mg" },
    { name: "Iron", current: 9, goal: 18, unit: "mg" },
    { name: "Potassium", current: 3100, goal: 4700, unit: "mg" }
  ];

  // Nutrient timing
  const nutrientTiming = [
    { time: "6-9 AM", calories: 450, protein: 30, carbs: 45, fat: 15 },
    { time: "9-12 PM", calories: 300, protein: 15, carbs: 35, fat: 10 },
    { time: "12-3 PM", calories: 650, protein: 40, carbs: 65, fat: 25 },
    { time: "3-6 PM", calories: 250, protein: 15, carbs: 25, fat: 10 },
    { time: "6-9 PM", calories: 550, protein: 35, carbs: 55, fat: 20 },
    { time: "9-12 AM", calories: 200, protein: 10, carbs: 20, fat: 8 }
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 mb-2">
        <div className="max-w-[500px] mx-auto flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/dashboard')}
            className="mr-2"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">
            Detailed Nutrition
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Calendar className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[500px] mx-auto p-4 pb-24 relative z-1">
        {/* Tab Navigation */}
        <div className="flex items-center bg-white rounded-xl p-1 mb-6 shadow-sm">
          {['overview', 'meals', 'micronutrients', 'timing'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-gradient-to-br from-[#0CC5BA] to-blue-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Main Nutrition Card */}
            <motion.div variants={itemVariants}>
              <Card className="p-5 rounded-3xl border-none overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#e6f7f6] flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#0CC5BA]" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-gray-800">
                        {formatNumber(todayTotals.calories)}
                      </div>
                      <div className="text-sm text-gray-500">
                        of {formatNumber(calorieGoal)} goal
                      </div>
                    </div>
                  </div>
                  
                  {/* Circular Progress */}
                  <div className="relative w-16 h-16">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="#E6F7F6"
                        strokeWidth="4"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="#0CC5BA"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.PI * 56}`}
                        strokeDashoffset={`${Math.PI * 56 * (1 - caloriePercentage / 100)}`}
                        transform="rotate(-90 32 32)"
                      />
                      <text
                        x="32" 
                        y="36"
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="bold"
                        fill="#0CC5BA"
                      >{caloriePercentage}%</text>
                    </svg>
                  </div>
                </div>

                {/* Macro Nutrients Section */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Carbs */}
                  <div>
                    <div className="w-full h-1.5 bg-[#E6F7F6] rounded-full mb-1">
                      <div 
                        className="h-full rounded-full bg-[#0CC5BA]"
                        style={{ width: `${Math.min((todayTotals.carbs / carbsGoal) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-medium text-center">
                      {formatNumber(todayTotals.carbs)}g
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Carbs
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                      Goal: {formatNumber(carbsGoal)}g
                    </div>
                  </div>

                  {/* Protein */}
                  <div>
                    <div className="w-full h-1.5 bg-[#E6F7F6] rounded-full mb-1">
                      <div 
                        className="h-full rounded-full bg-[#0CC5BA]"
                        style={{ width: `${Math.min((todayTotals.protein / proteinGoal) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-medium text-center">
                      {formatNumber(todayTotals.protein)}g
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Protein
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                      Goal: {formatNumber(proteinGoal)}g
                    </div>
                  </div>

                  {/* Fat */}
                  <div>
                    <div className="w-full h-1.5 bg-[#E6F7F6] rounded-full mb-1">
                      <div 
                        className="h-full rounded-full bg-[#0CC5BA]"
                        style={{ width: `${Math.min((todayTotals.fat / fatGoal) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-medium text-center">
                      {formatNumber(todayTotals.fat)}g
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Fat
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                      Goal: {formatNumber(fatGoal)}g
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Daily Insights Card */}
            <motion.div variants={itemVariants}>
              <Card className="p-5 rounded-3xl border-none overflow-hidden bg-white shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Insights</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                    <div className="font-medium text-green-700">Good job! Protein goal reached.</div>
                    <div className="text-green-700">✓</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
                    <div className="font-medium text-amber-700">Fat is getting close to limit.</div>
                    <div className="text-amber-700">!</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                    <div className="font-medium text-blue-700">You're 250 calories under budget.</div>
                    <div className="text-blue-700">i</div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Calorie Trends Card */}
            <motion.div variants={itemVariants}>
              <Card className="p-5 rounded-3xl border-none overflow-hidden bg-white shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Calorie Trends</h3>
                <div className="h-40">
                  <div className="flex h-full items-end justify-between">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                      const height = [70, 90, 60, 75, 85, 80, 65][i];
                      const isToday = i === new Date().getDay();
                      return (
                        <div key={day} className="flex flex-col items-center flex-1">
                          <div 
                            className={`w-full mx-1 rounded-t-lg ${
                              isToday 
                                ? 'bg-gradient-to-t from-[#0CC5BA] to-blue-500' 
                                : 'bg-gray-200'
                            }`} 
                            style={{ height: `${height}%` }}
                          />
                          <div className={`text-xs mt-2 ${isToday ? 'font-bold text-[#0CC5BA]' : 'text-gray-500'}`}>{day}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Meals Tab */}
        {activeTab === 'meals' && (
          <motion.div
            key="meals"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <div className="text-lg font-bold text-gray-800 mb-2">Nutrition by Meal</div>
            
            {mealsBreakdown.map((meal, index) => (
              <motion.div 
                key={meal.name}
                variants={itemVariants}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 rounded-3xl border-none bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center text-[#0CC5BA]">
                      {meal.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{meal.name}</h3>
                      <span className="text-sm text-gray-500">{meal.calories} kcal</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <div className="text-sm text-gray-500">Carbs</div>
                      <div className="font-medium text-gray-800">{meal.carbs}g</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Protein</div>
                      <div className="font-medium text-gray-800">{meal.protein}g</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Fat</div>
                      <div className="font-medium text-gray-800">{meal.fat}g</div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full rounded-full overflow-hidden bg-gray-100">
                    <div className="h-full flex">
                      <div 
                        className="h-full bg-blue-400" 
                        style={{ width: `${(meal.carbs * 4 / meal.calories) * 100}%` }} 
                      />
                      <div 
                        className="h-full bg-purple-400" 
                        style={{ width: `${(meal.protein * 4 / meal.calories) * 100}%` }} 
                      />
                      <div 
                        className="h-full bg-amber-400" 
                        style={{ width: `${(meal.fat * 9 / meal.calories) * 100}%` }} 
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Micronutrients Tab */}
        {activeTab === 'micronutrients' && (
          <motion.div
            key="micronutrients"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <div className="text-lg font-bold text-gray-800 mb-2">Micronutrients</div>
            
            <motion.div variants={itemVariants}>
              <Card className="p-5 rounded-3xl border-none bg-white shadow-sm">
                <h3 className="text-base font-medium text-gray-800 mb-4">Essential Nutrients</h3>
                <div className="space-y-4">
                  {micronutrients.map((nutrient, index) => {
                    const percentage = Math.min(Math.round((nutrient.current / nutrient.goal) * 100), 100);
                    return (
                      <div key={nutrient.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{nutrient.name}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-medium text-gray-800">
                              {nutrient.current}{nutrient.unit}
                            </span>
                            <span className="text-xs text-gray-400">
                              / {nutrient.goal}{nutrient.unit}
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2 bg-gray-100 [&>[data-progress]]:bg-green-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 rounded-3xl border-none bg-white shadow-sm">
                <h3 className="text-base font-medium text-gray-800 mb-4">Additional Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">Water</div>
                    <div className="text-lg font-medium text-blue-700">1.8 / 2.5 L</div>
                    <div className="mt-1 h-1.5 w-full rounded-full overflow-hidden bg-blue-100">
                      <div className="h-full bg-blue-500" style={{ width: '72%' }} />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm text-gray-600">Fiber</div>
                    <div className="text-lg font-medium text-purple-700">22 / 30 g</div>
                    <div className="mt-1 h-1.5 w-full rounded-full overflow-hidden bg-purple-100">
                      <div className="h-full bg-purple-500" style={{ width: '73%' }} />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600">Sugar</div>
                    <div className="text-lg font-medium text-green-700">18 / 25 g</div>
                    <div className="mt-1 h-1.5 w-full rounded-full overflow-hidden bg-green-100">
                      <div className="h-full bg-green-500" style={{ width: '72%' }} />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-sm text-gray-600">Sodium</div>
                    <div className="text-lg font-medium text-amber-700">1.8 / 2.3 g</div>
                    <div className="mt-1 h-1.5 w-full rounded-full overflow-hidden bg-amber-100">
                      <div className="h-full bg-amber-500" style={{ width: '78%' }} />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Timing Tab */}
        {activeTab === 'timing' && (
          <motion.div
            key="timing"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <div className="text-lg font-bold text-gray-800 mb-2">Nutrient Timing</div>
            
            <motion.div variants={itemVariants}>
              <Card className="p-5 rounded-3xl border-none bg-white shadow-sm">
                <h3 className="text-base font-medium text-gray-800 mb-4">Calorie Distribution Over Day</h3>
                <div className="h-48">
                  <div className="flex h-full items-end justify-between">
                    {nutrientTiming.map((timeslot, i) => {
                      const height = (timeslot.calories / 650) * 100; // 650 is max calories in a timeslot
                      return (
                        <div key={timeslot.time} className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full mx-1 rounded-t-lg bg-gradient-to-t from-[#0CC5BA]/70 to-blue-500/70" 
                            style={{ height: `${height}%` }}
                          />
                          <div className="text-xs mt-2 text-gray-500 whitespace-nowrap">{timeslot.time}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 rounded-3xl border-none bg-white shadow-sm">
                <h3 className="text-base font-medium text-gray-800 mb-4">Nutrient Timing Details</h3>
                <div className="space-y-4">
                  {nutrientTiming.map((timeslot) => (
                    <div key={timeslot.time} className="p-3 border border-gray-100 rounded-xl hover:border-[#0CC5BA]/30 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{timeslot.time}</span>
                        <span className="text-sm text-gray-500">{timeslot.calories} kcal</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Carbs</div>
                          <div className="font-medium text-gray-700">{timeslot.carbs}g</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Protein</div>
                          <div className="font-medium text-gray-700">{timeslot.protein}g</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Fat</div>
                          <div className="font-medium text-gray-700">{timeslot.fat}g</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Switch to Simple View Button */}
            <motion.div variants={itemVariants} className="mt-8 mb-4 flex justify-center">
              <Button 
                className="bg-[#0CC5BA] hover:bg-[#0CC5BA]/90 text-white rounded-full px-6 py-2"
                onClick={() => setLocation("/simple-nutrition?date=" + format(selectedDate, 'yyyy-MM-dd'))}
              >
                Switch to Simple View
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}