import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Camera, Heart, Zap, ChevronRight,
  Loader2, Flame, Bell, Search, 
  User, Star, Trophy, Target,
  CalendarDays, UtensilsCrossed, Utensils, Clock,
  Scale, Activity, BarChart3
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useFoodLog } from "../hooks/use-food-log";
import { useUser } from "../hooks/use-user";
import { Suspense, lazy } from "react";
import useEmblaCarousel from 'embla-carousel-react';
import MacroChart from "@/components/MacroChart";
import { TodaysMealPlans } from "@/components/TodaysMealPlans";
import { format, parse, isValid } from 'date-fns';
import PullToRefresh from "@/components/PullToRefresh";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
// Dropdown menu removed - profile picture links directly to profile page

import { Progress } from "@/components/ui/progress";
import toast from 'react-hot-toast';
import { useUserProfile } from "@/hooks/use-user-profile";
import { useTranslation } from "react-i18next";
import { usePersistentGuide } from "@/hooks/use-persistent-guide";



// Load scanner component lazily - fix type issue with direct dynamic import
// @ts-ignore - Ignore the type mismatch for the lazy-loaded component
const ScannerUI = lazy(() => import("@/components/ScannerUI"));

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

function getMealTime(date: Date, t: Function): string {
  const hour = date.getHours();
  if (hour < 10) return t('meals.breakfast');
  if (hour < 14) return t('meals.lunch');
  if (hour < 18) return t('meals.snack');
  return t('meals.dinner');
}

function getMealEmoji(mealType: string, t: Function): string {
  switch (mealType) {
    case t('meals.breakfast'): return "🍳";
    case t('meals.lunch'): return "🥗";
    case t('meals.snack'): return "🍎";
    case t('meals.dinner'): return "🍝";
    default: return "🍽️";
  }
}

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toFixed(0);
}

function getUsername(email: string): string {
  return email.split('@')[0];
}

function getDaysRange(t: Function, total: number = 31) { // 15 past, today, 15 future
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - Math.floor(total / 2));
  const dayNames = [
    t('days.sun'), t('days.mon'), t('days.tue'), t('days.wed'),
    t('days.thu'), t('days.fri'), t('days.sat')
  ];
  return Array.from({ length: total }).map((_, idx) => {
    const date = new Date(start);
    date.setDate(start.getDate() + idx);
    return {
      date,
      day: date.getDate(),
      dayName: dayNames[date.getDay()],
      isToday: date.toDateString() === today.toDateString()
    };
  });
}

// Enhanced helper functions
const formatFoodName = (log: any) => {
  // If the meal has a full name, use that directly
  const name = typeof log === 'string' ? log : log.name;
  
  // Check if the name already contains multiple components (with "with" format)
  // This is the case when the full name is already properly formatted
  if (name && name.toLowerCase().includes(' with ')) {
    // Just capitalize the first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  // If the log has components, combine them into a proper name
  if (log.components && Array.isArray(log.components) && log.components.length > 0) {
    if (log.components.length === 1) {
      // If only one component, use its name
      const componentName = log.components[0].name;
      return componentName.charAt(0).toUpperCase() + componentName.slice(1);
    } else {
      // For multiple components, construct a name like "Component1 with Component2 with Component3"
      const componentNames = log.components.map((comp: any) => comp.name);
      return componentNames.join(' with ');
    }
  }
  
  // Fallback to the original name formatting if no components
  const quantity = name.match(/^(\d+)\s*/);
  const foodName = name.replace(/^\d+\s*/, '').trim();
  const baseName = quantity && parseInt(quantity[1]) > 1
    ? foodName.replace(/s$/, '')
    : foodName;
  const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
  return quantity
    ? `${quantity[1]} ${formattedName}${parseInt(quantity[1]) > 1 ? 's' : ''}`
    : formattedName;
};

// Updated calculateTotal function to handle quantity properly
const calculateTotal = (name: string, value: string | number) => {
  // If the value is already a total (e.g. from API), return as is
  if (typeof value === 'string' && !name.match(/^\d+\s*/)) {
    return parseFloat(value);
  }

  const quantity = name.match(/^(\d+)\s*/);
  const baseValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(baseValue)) return 0;

  if (quantity) {
    return baseValue; // Value from API already includes quantity
  } else if (name.trim().endsWith('s')) {
    return baseValue; // Value from API already includes quantity
  }
  return baseValue;
};

// Safely get a display time for a food log even if createdAt is missing
function getLogTime(log: any): string {
  try {
    // Prefer explicit createdAt
    if (log?.createdAt) {
      return format(new Date(log.createdAt), 'HH:mm');
    }
    // Try date field variants
    const candidate = log?.timestamp || log?.date || log?.created_at;
    if (candidate) {
      return format(new Date(candidate), 'HH:mm');
    }
    return '';
  } catch {
    return '';
  }
}

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation(); // Add translation hook
  
  // Function to parse date from URL
  const getDateFromUrl = (url: string): Date => {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const dateParam = params.get('date');
    if (dateParam) {
      const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
  };

  // Initialize state with date from URL
  const [selectedDate, setSelectedDate] = useState<Date>(getDateFromUrl(location));
  
  // Update selectedDate whenever the URL changes
  useEffect(() => {
    const newDate = getDateFromUrl(location);
    setSelectedDate(newDate);
  }, [location]);
  const { foodLogs, isLoadingLogs, logFood, addFood } = useFoodLog(selectedDate);
  const { user } = useUser();
  
  // Debug log for foodLogs
  useEffect(() => {
    console.log('[Dashboard] foodLogs updated:', {
      count: foodLogs?.length,
      logs: foodLogs
    });
  }, [foodLogs]);
  
  // XP functionality removed
  const awardXP = async () => {}; // Empty function as placeholder

  // Pull-to-refresh functionality
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const handleRefresh = usePullToRefresh([
    ["/api/food-logs", dateString],
    ["/api/user"],
    [`/api/meal-plans/${dateString}`]
  ]);

  // State for analyzing meal
  const [analyzingMeal, setAnalyzingMeal] = useState<{
    id: string;
    name: string;
    image: string;
    timestamp: Date;
  } | null>(null);

  // Handle pending food images from localStorage
  useEffect(() => {
    const pendingImage = localStorage.getItem('pendingFoodImage');
    const pendingName = localStorage.getItem('pendingFoodName');
    
    if (pendingImage && pendingName) {
      console.log('[Dashboard] Processing pending food image...');
      
      // Clear the pending data
      localStorage.removeItem('pendingFoodImage');
      localStorage.removeItem('pendingFoodName');
      
      // Create immediate visual placeholder
      const analyzingId = `analyzing-${Date.now()}`;
      setAnalyzingMeal({
        id: analyzingId,
        name: pendingName,
        image: pendingImage,
        timestamp: new Date()
      });
      
      // Start the actual analysis
      addFood({
        name: pendingName,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        image: pendingImage
      }).then(() => {
        // Clear the analyzing state when done
        setAnalyzingMeal(null);
      }).catch((error) => {
        console.error('[Dashboard] Failed to add pending food:', error);
        setAnalyzingMeal(null);
      });
    }
  }, [addFood]);
  const [likedMeals, setLikedMeals] = useState<Set<number>>(new Set());
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  const days = getDaysRange(t, 31);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto scroll selected day into center view
  useEffect(() => {
    const key = selectedDate.toDateString();
    const el = dayRefs.current[key];
    const container = scrollContainerRef.current;
    if (el && container) {
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const target = elCenter - container.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [selectedDate]);
  const { data: profile } = useUserProfile();

  const { isActive: isPersistentGuideActive } = usePersistentGuide();


  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDate = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleLike = (mealId: number) => {
    setLikedMeals(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(mealId)) {
        newLiked.delete(mealId);
      } else {
        newLiked.add(mealId);
      }
      return newLiked;
    });
  };

  const calorieGoal = profile?.caloriesGoal || 2000;

  // handleLogout function removed since profile pic now links directly to profile

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const formattedDate = format(date, 'yyyy-MM-dd');
    // Update URL without causing navigation
    const newUrl = `${window.location.pathname}?date=${formattedDate}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleFoodLog = async (data: any) => {
    try {
      console.log('Logging food:', data);
      await logFood(data);
      console.log('Food logged successfully, awarding XP');

      await new Promise(resolve => setTimeout(resolve, 500));

      await awardXP();
      console.log('XP awarded successfully');

      toast.success(t('toasts.foodLogSuccess'), {
        duration: 3000
      });
    } catch (error) {
      console.error("Failed to log food:", error);
      toast.error(t('toasts.foodLogError'), {
        duration: 3000
      });
    }
  };

  const processScannedFood = async (data: any) => {
    console.log("Scanned food data:", data);
    handleFoodLog(data);
  };

  // Update the handleScannerSuccess function
  const handleScannerSuccess = async (data: any) => {
    try {
      await processScannedFood(data);
      await awardXP();

      // Format ingredients into a list for recipe generation
      const ingredients = data.ingredients.map((ing: any) =>
        `${ing.quantity} ${ing.unit} of ${ing.name}`
      ).join(', ');

      // Call backend to generate recipes based on ingredients
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingredients: data.ingredients,
          prompt: `Generate 3 recipe suggestions that can be made with these ingredients: ${ingredients}. Include difficulty level, prep time, cooking time, primary flavor profile, and cuisine type for each recipe.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }

      const recipeData = await response.json();

      // Prepare data for recipe results page
      const analysisData = {
        ingredients: data.ingredients || [],
        confidence: data.confidence || 0.9,
        suggestions: recipeData.recipes || []
      };

      console.log("Analysis data to encode:", analysisData);

      const encodedData = encodeURIComponent(JSON.stringify(analysisData));
      setLocation(`/recipe-results?data=${encodedData}`);
    } catch (error) {
      console.error("Failed to process scanned food:", error);
      toast.error(t("toasts.scanProcessError"), {
        duration: 3000
      });
    }
  };


  // Don't show full-screen loading - keep UI visible while fetching data

  const username = user?.email ? getUsername(user.email) : 'there';
  const todayTotals = {
    calories: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.calories), 0) || 0,
    protein: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.protein), 0) || 0,
    carbs: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.carbs), 0) || 0,
    fat: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.fat), 0) || 0
  };
  // Calculate the actual percentage (can exceed 100%)
  const actualCaloriePercentage = Math.round((Number(todayTotals.calories || 0) / calorieGoal) * 100);
  // For display, we cap at 100% but keep the actual value for color logic
  const caloriePercentage = Math.min(actualCaloriePercentage, 100);

  // Level functionality removed - used to be based on XP

  // Update the macros array to use profile goals
  const macros = [
    {
      label: t('nutrition.carbs'),
      value: todayTotals.carbs,
      max: profile?.carbsGoal || 250,
      delay: 0
    },
    {
      label: t('nutrition.protein'),
      value: todayTotals.protein,
      max: profile?.proteinGoal || 150,
      delay: 0.2
    },
    {
      label: t('nutrition.fat'),
      value: todayTotals.fat,
      max: profile?.fatGoal || 65,
      delay: 0.4
    }
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-green-50/30 relative overflow-hidden pb-20">
        
        {/* Minimalist background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-100/30 filter blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-green-100/25 filter blur-3xl opacity-50" />
    
      <div className="max-w-md mx-auto relative z-10 pt-6 px-4">
        {/* Minimalist Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-2xl font-bold text-gray-900 mb-1"
              >
                {isToday(selectedDate) ? (
                  <>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</>
                ) : (
                  <>{format(selectedDate, 'MMM d, yyyy')}</>
                )}
              </motion.h1>
              <p className="text-sm text-gray-600">Track your nutrition journey</p>
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="cursor-pointer"
              onClick={() => setLocation('/profile')}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-semibold shadow-sm">
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-sm">{username[0].toUpperCase()}</span>
                )}
              </div>
            </motion.div>
          </div>
        </motion.header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Week Navigation - Glassmorphism Style */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative bg-white/20 backdrop-blur-lg rounded-2xl py-3 px-1 border border-white/30 shadow-sm"
          >
            {/* Gradient edges */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white/70 to-transparent rounded-l-2xl" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white/70 to-transparent rounded-r-2xl" />
            <div
              ref={scrollContainerRef}
              className="flex gap-2 overflow-x-auto px-1 scroll-smooth no-scrollbar"
            >
              {days.map((day, index) => {
                const key = day.date.toDateString();
                return (
                  <motion.div
                    key={key}
                    ref={el => { dayRefs.current[key] = el; }}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.01 }}
                    onClick={() => handleDateChange(day.date)}
                    className={`
                      min-w-[56px] flex flex-col items-center justify-center py-2 px-1 cursor-pointer h-14
                      transition-all duration-200 rounded-xl leading-tight border select-none
                      ${isSelectedDate(day.date)
                        ? 'bg-emerald-500 text-white shadow-md border-emerald-500'
                        : day.isToday
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70 hover:border-emerald-300'
                          : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                      }
                    `}
                  >
                    <span className={`text-[10px] font-medium mb-0.5 ${isSelectedDate(day.date) ? 'text-white' : day.isToday ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {day.dayName}
                    </span>
                    <span className={`text-base font-semibold ${isSelectedDate(day.date) ? 'text-white' : day.isToday ? 'text-emerald-600' : 'text-gray-800'}`}>
                      {day.day}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Calories Card - Compact Glassmorphism */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 border border-white/40 shadow-lg">
              {/* Compact header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Today's Progress</h2>
                <div className="p-1.5 bg-emerald-100/60 rounded-lg">
                  <Flame className="h-3.5 w-3.5 text-emerald-600" />
                </div>
              </div>

              {/* Main content in horizontal layout */}
              <div className="flex items-center gap-4">
                {/* Compact Circular Progress */}
                <div className="relative flex-shrink-0">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#e5e7eb"
                      strokeWidth="6"
                      fill="none"
                      className="opacity-30"
                    />
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="url(#calorieGradient)"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                      animate={{ 
                        strokeDashoffset: 2 * Math.PI * 32 * (1 - Math.min(caloriePercentage / 100, 1))
                      }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      key={todayTotals.calories}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-sm font-bold text-gray-800"
                    >
                      {Math.round(todayTotals.calories)}
                    </motion.span>
                    <span className="text-xs text-gray-600">kcal</span>
                  </div>
                </div>

                {/* Macros - Compact Grid */}
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-bold text-gray-800">{Math.round(todayTotals.protein)}g</div>
                    <div className="text-xs text-gray-600">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-bold text-gray-800">{Math.round(todayTotals.carbs)}g</div>
                    <div className="text-xs text-gray-600">Carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-bold text-gray-800">{Math.round(todayTotals.fat)}g</div>
                    <div className="text-xs text-gray-600">Fat</div>
                  </div>
                </div>
              </div>

              {/* Goal status indicator */}
              <div className="mt-3 text-center">
                <span className="text-xs text-gray-600">
                  {calorieGoal - todayTotals.calories > 0 ? (
                    <>{Math.round(calorieGoal - todayTotals.calories)} kcal remaining</>
                  ) : (
                    <>{Math.round(todayTotals.calories - calorieGoal)} kcal over goal</>
                  )}
                </span>
              </div>
            </div>
          </motion.div>
          
          {/* Today's Meals - Simplified */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/25 backdrop-blur-lg rounded-3xl p-6 border border-white/40 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Today's Meals</h2>
                <div className="p-2 bg-green-100/60 rounded-xl">
                  <Utensils className="h-4 w-4 text-green-600" />
                </div>
              </div>

              {(foodLogs && foodLogs.length > 0) || analyzingMeal ? (
                <div className="space-y-3">
                  {/* Analyzing meal */}
                  {analyzingMeal && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800 text-sm">{analyzingMeal.name}</h3>
                          <p className="text-xs text-blue-600">Analyzing...</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Regular meals */}
                  {foodLogs?.map((log: any, index: number) => {
                    const totalCalories = calculateTotal(log.name, log.calories);
                    
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.1, 0.5) }}
                        onClick={() => setLocation(log.isRecipe ? `/recipes/food-log/${log.id}` : `/meal/${log.id}`)}
                        className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 cursor-pointer hover:bg-white/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                            {log.image ? (
                              <img
                                src={log.image}
                                alt={log.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-800 text-sm truncate">
                              {formatFoodName(log)}
                            </h3>
                            <p className="text-xs text-gray-600">{getLogTime(log)}</p>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-gray-800">{Math.round(totalCalories)}</div>
                            <div className="text-xs text-gray-600">kcal</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100/60 to-gray-200/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Utensils className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-gray-700 font-medium mb-2">No meals yet</h3>
                  <p className="text-sm text-gray-600 mb-4">Start your nutrition journey</p>
                  <Button
                    onClick={() => setLocation('/add-food')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium shadow-sm transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meal
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Meal Plan - Minimalist */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/25 backdrop-blur-lg rounded-3xl p-6 border border-white/40 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Meal Plan</h2>
                <Link href="/meal-planning">
                  <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    View Plan
                  </button>
                </Link>
              </div>
              
              <div className="relative">
                <TodaysMealPlans selectedDate={selectedDate} />
              </div>
            </div>
          </motion.div>
        </motion.main>
      </div>
    </div>
    </PullToRefresh>
  );
}