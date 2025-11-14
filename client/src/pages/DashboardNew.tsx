import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import BaseLayout from "@/components/layouts/BaseLayout";
import CalendarSelector from "@/components/dashboard/CalendarSelector";
import MacroCard from "@/components/dashboard/MacroCard";
import MealsSection from "@/components/dashboard/MealsSection";
import GroceryList from "@/components/dashboard/GroceryList";
import MealPlanSection from "@/components/dashboard/MealPlanSection";
import { useFoodLogsByDate, useDailyTotals } from "@/hooks/queries/useFoodLogs";
import { useAllMealPlans } from "@/hooks/queries/useMealPlans";
import { useShoppingListByPlanId } from "@/hooks/queries/useShoppingList";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useQueryClient } from "@tanstack/react-query";
import { createInvalidator } from "@/lib/queryUtils";
import { useFoodLog } from "@/hooks/use-food-log";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";

interface GroceryItem {
  id: number;
  name: string;
  quantity: number | string;
  unit: string;
  category: string;
  isPurchased?: boolean;
  purchased?: boolean; // Fallback for older format
}

// Helper function to get all days from the last 3 months + next 7 days
function getLast3MonthsPlus7Days() {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];
  
  // Generate days for the last 90 days (approximately 3 months)
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      formattedDate: format(date, 'yyyy-MM-dd')
    });
  }
  
  // Add next 7 days after today
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: false,
      formattedDate: format(date, 'yyyy-MM-dd')
    });
  }
  
  return days;
}

export default function DashboardNew() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addFood } = useFoodLog();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [allDays] = useState(getLast3MonthsPlus7Days());
  const [currentMacroIndex, setCurrentMacroIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessingManualFood, setIsProcessingManualFood] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [processingComplete, setProcessingComplete] = useState(false);

  // Fetch user profile for calorie goals (from WHO formula in onboarding)
  const { data: userProfile } = useUserProfile();

  // Fetch food logs for selected date using custom hook
  const { data: foodLogsData, isLoading: logsLoading } = useFoodLogsByDate(selectedDate);
  const foodLogs = foodLogsData?.logs || [];

  // Fetch daily totals for selected date using custom hook
  const { data: dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 } } = useDailyTotals(selectedDate);

  // Fetch all meal plans using custom hook
  const { data: allMealPlans } = useAllMealPlans();

  // Get the meal plan for the selected date from all plans
  const mealPlan = useMemo(() => {
    if (!allMealPlans || !selectedDate) {
      console.log('[MEAL PLAN] No plans available or no date selected');
      return null;
    }
    // allMealPlans is already an array of MealPlan objects
    const plan = allMealPlans.find((p: any) => p.date === selectedDate);
    console.log('[MEAL PLAN] Found plan for', selectedDate, ':', plan);
    return plan || null;
  }, [allMealPlans, selectedDate]);

  // Fetch shopping list for the meal plan using custom hook
  const { data: groceryListData, refetch: refetchGroceries } = useShoppingListByPlanId(mealPlan?.id);
  
  // Transform shopping list data to match GroceryItem interface
  const groceryList: GroceryItem[] = useMemo(() => {
    if (!groceryListData?.items) return [];
    
    return groceryListData.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category || 'Other',
      isPurchased: item.isChecked || false
    }));
  }, [groceryListData]);

  // Debug log for grocery list
  useEffect(() => {
    console.log('[DASHBOARD] Grocery list state changed:', {
      hasData: !!groceryList,
      isArray: Array.isArray(groceryList),
      length: groceryList?.length,
      items: groceryList,
      mealPlanId: mealPlan?.id,
      selectedDate
    });
  }, [groceryList, mealPlan?.id, selectedDate]);

  // Debug log for selected date changes
  useEffect(() => {
    console.log('[DASHBOARD] Selected date changed to:', selectedDate);
    console.log('[DASHBOARD] Current meal plan:', mealPlan);
  }, [selectedDate, mealPlan]);

  // Process pending manual food entry
  useEffect(() => {
    const processPendingManualFood = async () => {
      const pendingData = localStorage.getItem('pendingManualFood');
      if (!pendingData) return;

      try {
        setIsProcessingManualFood(true);
        setProcessingStep("Preparing your meal entry...");
        
        const foodData = JSON.parse(pendingData);
        console.log('[DASHBOARD] Processing pending manual food:', foodData);

        // Simulate progress steps
        setTimeout(() => setProcessingStep("Adding to your food log..."), 500);
        setTimeout(() => setProcessingStep("Updating nutrition totals..."), 1000);

        // Add the food to the log
        const result = await addFood(foodData);
        console.log('[DASHBOARD] Food added successfully:', result);

        setProcessingStep("Complete!");
        setProcessingComplete(true);

        // Clear the pending data immediately
        localStorage.removeItem('pendingManualFood');

        // Force immediate refetch of food logs using the correct query keys
        console.log('[DASHBOARD] Refetching food logs for date:', selectedDate);
        
        await queryClient.refetchQueries({ 
          queryKey: ['food-logs', 'date', selectedDate],
          type: 'active',
          exact: true
        });

        await queryClient.refetchQueries({ 
          queryKey: ['food-logs', 'totals', selectedDate],
          type: 'active',
          exact: true
        });

        // Also invalidate all food logs to be safe
        await queryClient.invalidateQueries({ 
          queryKey: ['food-logs'],
          refetchType: 'active'
        });

        // Invalidate recent food logs for recipes page
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/food-logs/recent-all'],
          refetchType: 'active'
        });

        console.log('[DASHBOARD] Queries refreshed, showing success message');

        toast({
          title: "Success",
          description: `Added ${foodData.name} to your log`,
        });

        // Hide the processing screen after showing success
        setTimeout(() => {
          setIsProcessingManualFood(false);
          setProcessingComplete(false);
        }, 1500);

      } catch (error) {
        console.error('[DASHBOARD] Error processing manual food:', error);
        
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add food",
        });

        localStorage.removeItem('pendingManualFood');
        setIsProcessingManualFood(false);
        setProcessingComplete(false);
      }
    };

    processPendingManualFood();
  }, []); // Only run once on mount

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    const autoScrollInterval = setInterval(() => {
      setCurrentMacroIndex((prev) => (prev === 3 ? 0 : prev + 1)); // 4 macros (0-3)
    }, 5000);

    return () => clearInterval(autoScrollInterval);
  }, [isPaused]);

  // Scroll to today's date on mount
  useEffect(() => {
    const todayIndex = allDays.findIndex(day => day.isToday);
    if (todayIndex !== -1) {
      const scrollContainer = document.querySelector('.day-selector-scroll');
      if (scrollContainer) {
        const dayButton = scrollContainer.children[todayIndex] as HTMLElement;
        if (dayButton) {
          // Center the today button
          const containerWidth = scrollContainer.clientWidth;
          const buttonOffset = dayButton.offsetLeft;
          const buttonWidth = dayButton.offsetWidth;
          scrollContainer.scrollLeft = buttonOffset - (containerWidth / 2) + (buttonWidth / 2);
        }
      }
    }
  }, [allDays]);

  const handleDayClick = (formattedDate: string) => {
    setSelectedDate(formattedDate);
  };

  const handlePreviousMacro = () => {
    setIsPaused(true);
    setCurrentMacroIndex((prev) => (prev === 0 ? 3 : prev - 1)); // 4 macros (0-3)
  };

  const handleNextMacro = () => {
    setIsPaused(true);
    setCurrentMacroIndex((prev) => (prev === 3 ? 0 : prev + 1)); // 4 macros (0-3)
  };

  const handleDotClick = (index: number) => {
    setIsPaused(true);
    setCurrentMacroIndex(index);
  };

  const toggleGroceryItem = async (itemId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/shopping-list/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ purchased: !currentStatus })
      });

      if (response.ok) {
        // Invalidate shopping list queries using centralized invalidation
        const invalidator = createInvalidator(queryClient);
        await invalidator.shoppingList(selectedDate, mealPlan?.id);
      }
    } catch (error) {
      // If API fails, refetch to sync state
      refetchGroceries();
    }
  };

  return (
    <BaseLayout>
      {/* Manual Food Processing Screen */}
      {isProcessingManualFood && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0E95A7] via-[#1E6F7D] to-[#0D8495]"
        >
          <div className="text-center px-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              {processingComplete ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>
              ) : (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-4"
            >
              {processingComplete ? "Added!" : "Processing..."}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/90 text-lg"
            >
              {processingStep}
            </motion.p>

            {/* Progress dots */}
            {!processingComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-2 mt-8"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      <CalendarSelector 
        allDays={allDays}
        selectedDate={selectedDate}
        onDateSelect={handleDayClick}
      />

      <MacroCard 
        dailyTotals={dailyTotals}
        currentCardIndex={currentMacroIndex}
        onPrevious={handlePreviousMacro}
        onNext={handleNextMacro}
        onDotClick={handleDotClick}
        userProfile={userProfile}
      />

      <MealsSection 
        foodLogs={foodLogs}
        isLoading={logsLoading}
      />

      <MealPlanSection 
        mealPlan={mealPlan as any}
      />
    </BaseLayout>
  );
}