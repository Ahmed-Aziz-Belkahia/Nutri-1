import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Calendar, 
  ShoppingBag, 
  ChevronRight,
  ChevronLeft,
  Utensils,
  Coffee,
  Pizza,
  Circle,
  Check,
} from "lucide-react";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
import { pl } from 'date-fns/locale';
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MealCard } from "@/components/MealCard";

interface Meal {
  id: number;
  name: string;
  mealType: string;
  imageUrl?: string;
  isCompleted?: boolean;
  order?: number;
  recipe: {
    ingredients: string[];
    instructions: string[] | string;
    prepTime: number;
    nutritionInfo: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

interface MealPlan {
  id: number;
  date: string;
  totalCalories: number;
  status: string;
  meals: Meal[];
}

interface MealPlanResponse {
  weekStart: string;
  plans: MealPlan[];
}

export default function MealPlan() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  const [calendarStartDate, setCalendarStartDate] = useState<Date>(() => {
    // Start from current day
    return new Date();
  });
  const { t, i18n } = useTranslation();

  // Fetch today's meal plan
  const { data: todayMealPlanData, isLoading: isTodayLoading, error: todayError } = useQuery<{ hasPlan: boolean; plan?: MealPlan }>({
    queryKey: ["/api/meal-plans/today"],
    queryFn: async () => {
      const response = await fetch("/api/meal-plans/today", {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch meal plan');
      }
      return response.json();
    },
    retry: false
  });
  
  // Fetch all meal plans for the calendar view
  const { data: allMealPlansData, isLoading: isAllPlansLoading, error: allPlansError, refetch: allMealPlansRefetch } = useQuery<MealPlanResponse>({
    queryKey: ["/api/meal-plans/all"],
    queryFn: async () => {
      const response = await fetch("/api/meal-plans/all", {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch all meal plans');
      }
      return response.json();
    },
    retry: false
  });

  // Generate week dates for calendar
  useEffect(() => {
    // Get today's date for the first position
    const today = new Date();
    // Generate dates starting from today, not from calendarStartDate
    const weekDates = Array(7).fill(0).map((_, i) => addDays(today, i));
    setCalendarDates(weekDates);
  }, [calendarStartDate]);
  
  // Set the selected plan based on the selected date
  useEffect(() => {
    if (!allMealPlansData && !todayMealPlanData) {
      return;
    }
    
    const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
    const todayString = format(new Date(), 'yyyy-MM-dd');
    const isSelectedToday = selectedDateString === todayString;
    
    if (isSelectedToday && todayMealPlanData?.hasPlan && todayMealPlanData?.plan) {
      setSelectedPlan(todayMealPlanData.plan);
    } 
    else if (allMealPlansData?.plans && Array.isArray(allMealPlansData.plans)) {
      const plan = allMealPlansData.plans.find((p: MealPlan) => p.date === selectedDateString);
      
      if (plan) {
        setSelectedPlan(plan);
      } 
      else if (allMealPlansData.plans.length > 0) {
        if (!selectedPlan) {
          const firstAvailablePlan = allMealPlansData.plans[0];
          setSelectedDate(parseISO(firstAvailablePlan.date));
          setSelectedPlan(firstAvailablePlan);
        }
      } else {
        setSelectedPlan(null);
      }
    }
  }, [selectedDate, todayMealPlanData, allMealPlansData]);
  
  const isLoading = isTodayLoading || isAllPlansLoading;

  // Generate a meal plan for a date that doesn't have one
  const generateMealPlanMutation = useMutation({
    mutationFn: async (params: { date: string, duration: 'day' | 'week' | 'month', useExistingPreferences?: boolean }) => {
      const response = await fetch('/api/meal-plans/generate-for-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate meal plan');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.generated && data.plan) {
        if (allMealPlansData) {
          allMealPlansRefetch();
          setSelectedPlan(data.plan);
        }
      } else if (data.plan) {
        setSelectedPlan(data.plan);
      }
    },
    onError: (error) => {
      toast({
        title: t('mealPlan.errors.failedGenerate', 'Failed to generate meal plan'),
        description: error instanceof Error ? error.message : t('mealPlan.errors.unexpected', 'An unexpected error occurred'),
        variant: 'destructive',
      });
    }
  });

  // Handle date selection in calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    if (allMealPlansData && Array.isArray(allMealPlansData.plans)) {
      const selectedDateString = format(date, 'yyyy-MM-dd');
      const newPlan = allMealPlansData.plans.find((p: MealPlan) => p.date === selectedDateString);
      
      if (newPlan) {
        setSelectedPlan(newPlan);
      } else {
        const daysDifference = differenceInDays(date, new Date());
        const isDateInPast = daysDifference < 0;
        
        if (isDateInPast) {
          toast({
            title: t('mealPlan.noPlanFound', 'No meal plan found'),
            description: t('mealPlan.noPlanPast', 'No meal plan exists for this date in the past.'),
            variant: 'default',
          });
          return;
        }
        
        toast({
          title: t('mealPlan.generatePlan', 'Generate meal plan?'),
          description: t('mealPlan.generatePlanQuestion', 'No meal plan exists for this date. Would you like to generate one?'),
          variant: 'default',
          action: (
            <div className="flex gap-2">
              <ToastAction altText={t('mealPlan.generatePlan', 'Generate meal plan')} onClick={() => {
                setLocation('/meal-planning-quiz');
              }}>
                {t('mealPlan.generatePlan', 'Generate Plan')}
              </ToastAction>
            </div>
          ),
        });
      }
    }
  };

  // Check if there's an authentication error
  const hasAuthError = 
    (todayError instanceof Error && todayError.message.includes('Authentication required')) ||
    (allPlansError instanceof Error && allPlansError.message.includes('Authentication required'));

  // Mutation to mark a meal as complete or incomplete
  const markMealStatusMutation = useMutation({
    mutationFn: async (params: { mealId: number; isCompleted: boolean }) => {
      const response = await fetch(`/api/meal-plans/meal/${params.mealId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isCompleted: params.isCompleted }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update meal status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      allMealPlansRefetch();
    },
    onError: (error) => {
      toast({
        title: t('mealPlan.errors.failedUpdate', 'Failed to update meal'),
        description: error instanceof Error ? error.message : t('mealPlan.errors.unexpected', 'An unexpected error occurred'),
        variant: 'destructive',
      });
    }
  });

  // Helper function to get meal type icon
  const getMealTypeIcon = (mealType: string) => {
    switch(mealType.toLowerCase()) {
      case 'breakfast':
        return <Coffee className="w-6 h-6 text-[#0CC5BA]" />;
      case 'lunch':
        return <Pizza className="w-6 h-6 text-[#0CC5BA]" />;
      case 'dinner':
        return <Utensils className="w-6 h-6 text-[#0CC5BA]" />;
      default:
        return <Coffee className="w-6 h-6 text-[#0CC5BA]" />;
    }
  };

  if (hasAuthError) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('mealPlan.auth.required', 'Authentication Required')}</h2>
          <p className="text-gray-600 mb-4">{t('mealPlan.auth.message', 'Please log in to view your meal plans.')}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation("/auth")}
              className="bg-[#0CC5BA] text-white"
            >
              {t('mealPlan.auth.login', 'Log In')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/dashboard")}
            >
              {t('mealPlan.auth.backToDashboard', 'Back to Dashboard')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0CC5BA] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">{t('mealPlan.loading', 'Loading your meal plan...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 flex items-center justify-between sticky top-0 z-10 bg-[#f7f9fc]/95 backdrop-blur-sm"
      >
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-gray-600 hover:bg-[#0CC5BA]/10 hover:text-[#0CC5BA]"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] bg-clip-text text-transparent">
            {t('mealPlan.title', 'Meal Plan')}
          </h1>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="text-[#0CC5BA] border-[#0CC5BA] hover:bg-[#0CC5BA]/10 hover:text-[#0CC5BA]"
          onClick={() => setLocation("/meal-planning-quiz")}
        >
          <Calendar className="h-4 w-4 mr-1.5" />
          {t('mealPlan.regenerate', 'Regenerate')}
        </Button>
      </motion.div>

      {/* Date Selection Area (Matching Screenshot) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="px-4 py-4 bg-white rounded-xl mx-4 shadow-sm"
      >
        {/* Select Date Header */}
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-[#0CC5BA] mr-2" />
          <span className="text-lg font-semibold text-gray-800">{t('mealPlan.selectDate', 'Select Date')}</span>
        </div>
        
        {/* Date Selection - Starting from Today */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Generate day headers based on today */}
          {calendarDates.map((date, i) => {
            const dayName = format(date, 'EEE');
            return (
              <div key={`day-${i}`} className="text-center text-sm text-gray-500 font-medium">
                {dayName}
              </div>
            );
          })}
          
          {calendarDates.map((date, i) => {
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const dayNumber = format(date, 'd');
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            // Check if this date has a meal plan
            const hasMealPlan = allMealPlansData && 'plans' in allMealPlansData && 
              allMealPlansData.plans.some((p: MealPlan) => p.date === format(date, 'yyyy-MM-dd'));
            
            return (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center justify-center rounded-lg p-3 cursor-pointer ${
                  isSelected 
                    ? "bg-[#0CC5BA] text-white" 
                    : hasMealPlan
                      ? "bg-[#e6fbfa] text-[#0CC5BA]"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => handleDateSelect(date)}
              >
                <span className="font-medium">{dayNumber}</span>
              </motion.div>
            );
          })}
          
          {/* Add Previous/Next Week navigation buttons */}
          <div className="col-span-7 flex justify-between mt-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center text-gray-500 hover:text-[#0CC5BA]"
              onClick={() => {
                setCalendarStartDate(addDays(calendarStartDate, -7));
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('mealPlan.previousWeek', 'Previous Week')}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center text-gray-500 hover:text-[#0CC5BA]"
              onClick={() => {
                setCalendarStartDate(addDays(calendarStartDate, 7));
              }}
            >
              {t('mealPlan.nextWeek', 'Next Week')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
        
        {/* Selected Date Display */}
        <div className="font-bold text-lg text-gray-800 mt-2">
          {i18n.language === 'pl' 
            ? format(selectedDate, 'd MMMM yyyy', { locale: pl })
            : format(selectedDate, 'MMMM d, yyyy')
          }
          <span className="text-gray-500 text-base font-normal ml-2">
            {selectedPlan ? `${selectedPlan.totalCalories} ${t('nutrition.calShort', 'kcal')}` : ''}
          </span>
        </div>
      </motion.div>

      {/* Main Content Area */}
      {selectedPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-4 mt-6"
        >
          {/* Plan Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] rounded-2xl p-5 text-white mb-6 shadow-lg shadow-[#0CC5BA]/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                <h2 className="text-lg font-bold">
                  {i18n.language === 'pl' 
                    ? format(selectedDate, 'EEEE, d MMMM', { locale: pl })
                    : format(selectedDate, 'EEEE, MMMM d')
                  }
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!selectedPlan.meals.length && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-white/20 hover:bg-white/30 text-white border-none"
                    onClick={() => {
                      setLocation('/meal-planning-quiz');
                    }}
                  >
                    {t('mealPlan.generateMeals', 'Generate Meals')}
                  </Button>
                )}
                <Badge className="bg-white/20 text-white border-none">
                  {selectedPlan.meals.filter(m => m.isCompleted).length}/{selectedPlan.meals.length} {t('mealPlan.completed', 'completed')}
                </Badge>
              </div>
            </div>
            
            {/* Nutrition summary */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/20 px-3 py-2 rounded-xl flex flex-col items-center">
                <span className="text-xs opacity-80">{t('mealPlan.calories', 'Calories')}</span>
                <span className="font-bold">{selectedPlan.totalCalories}</span>
              </div>
              <div className="bg-white/20 px-3 py-2 rounded-xl flex flex-col items-center">
                <span className="text-xs opacity-80">{t('mealPlan.meals', 'Meals')}</span>
                <span className="font-bold">{selectedPlan.meals.length}</span>
              </div>
              <div className="bg-white/20 px-3 py-2 rounded-xl flex flex-col items-center">
                <span className="text-xs opacity-80">{t('mealPlan.progress', 'Progress')}</span>
                <span className="font-bold">{Math.round(selectedPlan.meals.filter(m => m.isCompleted).length / selectedPlan.meals.length * 100)}%</span>
              </div>
            </div>
            
            <Progress 
              value={selectedPlan.meals.filter(m => m.isCompleted).length / selectedPlan.meals.length * 100} 
              className="h-1.5 mt-3 bg-white/20"
            />
          </motion.div>
          
          {/* Meal Type Tabs */}
          <Tabs defaultValue="all" className="mb-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <TabsList className="w-full grid grid-cols-4 bg-[#f1f5f9] p-1">
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0CC5BA] data-[state=active]:shadow-sm">
                  {t('mealPlan.all', 'All')}
                </TabsTrigger>
                <TabsTrigger value="breakfast" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#ff9500] data-[state=active]:shadow-sm">
                  <Coffee className="w-4 h-4 mr-1" />
                  {t('mealPlan.breakfast', 'Breakfast')}
                </TabsTrigger>
                <TabsTrigger value="lunch" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0CC5BA] data-[state=active]:shadow-sm">
                  <Pizza className="w-4 h-4 mr-1" />
                  {t('mealPlan.lunch', 'Lunch')}
                </TabsTrigger>
                <TabsTrigger value="dinner" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#6366f1] data-[state=active]:shadow-sm">
                  <Utensils className="w-4 h-4 mr-1" />
                  {t('mealPlan.dinner', 'Dinner')}
                </TabsTrigger>
              </TabsList>
            </motion.div>
            
            <TabsContent value="all" className="space-y-4 pb-20 mt-4">
              {selectedPlan.meals
                .sort((a, b) => {
                  if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                  }
                  const mealTypeOrder: Record<string, number> = {
                    'breakfast': 0,
                    'lunch': 1,
                    'dinner': 2
                  };
                  const aType = a.mealType.toLowerCase();
                  const bType = b.mealType.toLowerCase();
                  return (mealTypeOrder[aType] || 99) - (mealTypeOrder[bType] || 99);
                })
                .map((meal) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <MealCard 
                      meal={meal}
                      onToggleComplete={(mealId, isCompleted) => {
                        markMealStatusMutation.mutate({
                          mealId,
                          isCompleted
                        });
                      }}
                      onClick={(mealId) => setLocation(`/recipes/${mealId}`)}
                    />
                  </motion.div>
                ))}
            </TabsContent>
            
            {['breakfast', 'lunch', 'dinner'].map((mealType) => (
              <TabsContent key={mealType} value={mealType} className="space-y-4 pb-20 mt-4">
                {selectedPlan.meals
                  .filter(meal => meal.mealType.toLowerCase() === mealType)
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((meal) => (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <MealCard 
                        meal={meal}
                        onToggleComplete={(mealId, isCompleted) => {
                          markMealStatusMutation.mutate({
                            mealId,
                            isCompleted
                          });
                        }}
                        onClick={(mealId) => setLocation(`/recipes/${mealId}`)}
                      />
                    </motion.div>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
          
          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] rounded-t-xl z-10"
          >
            <div className="flex gap-3 justify-between max-w-md mx-auto">
              <Button
                variant="default"
                size="lg"
                className="w-full bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] text-white shadow-md hover:opacity-90 font-medium rounded-xl"
                onClick={() => {
                  setLocation('/shopping-list');
                }}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                {t('mealPlan.shoppingList', 'Shopping List')}
              </Button>
            </div>
          </motion.div>
          
          {/* Extra padding at bottom for fixed button */}
          <div className="h-24"></div>
        </motion.div>
      )}
      
      {/* Empty state when no plan is selected */}
      {!selectedPlan && !isLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center p-6 mt-10 text-center"
        >
          <div className="w-20 h-20 bg-[#0CC5BA]/10 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10 text-[#0CC5BA]" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('mealPlan.noPlanSelected', 'No Meal Plan Selected')}</h3>
          <p className="text-gray-500 max-w-xs mb-6">{t('mealPlan.selectDate', 'Select a date from the calendar above or generate a new meal plan.')}</p>
          <Button
            variant="default"
            className="bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] text-white shadow-lg hover:opacity-90 font-medium rounded-xl"
            onClick={() => {
              setLocation('/meal-planning-quiz');
            }}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            {t('mealPlan.createPlan', 'Create Today\'s Plan')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}