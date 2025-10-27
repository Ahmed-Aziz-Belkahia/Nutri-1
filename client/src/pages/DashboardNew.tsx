import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import BaseLayout from "@/components/layouts/BaseLayout";
import CalendarSelector from "@/components/dashboard/CalendarSelector";
import MacroCard from "@/components/dashboard/MacroCard";
import MealsSection from "@/components/dashboard/MealsSection";
import GroceryList from "@/components/dashboard/GroceryList";
import MealPlanSection from "@/components/dashboard/MealPlanSection";

interface FoodLog {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
  loggedAt: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPlan {
  id: number;
  name?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  date?: string;
  totalCalories?: number;
  status?: string;
  meals?: Array<{
    id: number;
    name: string;
    mealType: string;
    order: number;
    servingSize: number;
    isFrozen: boolean;
    isCompleted: boolean;
    nutritionInfo?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    instructions?: string | string[];
    ingredients?: string | string[];
    imageUrl?: string;
  }>;
}

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
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [allDays] = useState(getLast3MonthsPlus7Days());
  const [currentMacroIndex, setCurrentMacroIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch food logs for selected date
  const { data: foodLogs = [], isLoading: logsLoading } = useQuery<FoodLog[]>({
    queryKey: ['food-logs', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/food-logs?date=${selectedDate}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch food logs');
      const data = await response.json();
      return data.logs || [];
    }
  });

  // Fetch daily totals for selected date
  const { data: dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 } } = useQuery<DailyTotals>({
    queryKey: ['daily-totals', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/food-logs?date=${selectedDate}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch totals');
      const data = await response.json();
      return data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  });

  // Fetch all meal plans to match the calendar approach used in Recipes page
  const { data: allMealPlans } = useQuery({
    queryKey: ['all-meal-plans'],
    queryFn: async () => {
      console.log('[ALL MEAL PLANS] Fetching all meal plans');
      const response = await fetch('/api/meal-plans/all', {
        credentials: 'include'
      });
      if (!response.ok) {
        console.log('[ALL MEAL PLANS] Failed to fetch');
        return null;
      }
      const data = await response.json();
      console.log('[ALL MEAL PLANS] Received data:', data);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get the meal plan for the selected date from all plans
  const mealPlan = useMemo(() => {
    if (!allMealPlans?.plans || !selectedDate) {
      console.log('[MEAL PLAN] No plans available or no date selected');
      return null;
    }
    const plan = allMealPlans.plans.find((p: any) => p.date === selectedDate);
    console.log('[MEAL PLAN] Found plan for', selectedDate, ':', plan);
    return plan || null;
  }, [allMealPlans, selectedDate]);

  // Fetch daily totals for selected date
  const { data: groceryList = [], refetch: refetchGroceries } = useQuery<GroceryItem[]>({
    queryKey: ['grocery-list', selectedDate, mealPlan?.id],
    queryFn: async () => {
      console.log('[GROCERY LIST] Starting fetch for date:', selectedDate);
      console.log('[GROCERY LIST] mealPlan:', mealPlan);
      console.log('[GROCERY LIST] mealPlan?.id:', mealPlan?.id);
      
      try {
        // If we have a meal plan, fetch its shopping list
        if (mealPlan && mealPlan.id) {
          console.log('[GROCERY LIST] Fetching for meal plan ID:', mealPlan.id);
          const url = `/api/meal-plans/${mealPlan.id}/shopping-list`;
          console.log('[GROCERY LIST] URL:', url);
          
          const response = await fetch(url, {
            credentials: 'include'
          });
          
          console.log('[GROCERY LIST] Response status:', response.status);
          console.log('[GROCERY LIST] Response ok:', response.ok);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[GROCERY LIST] Raw data received:', data);
            
            // Transform the response to match our GroceryItem interface
            if (Array.isArray(data)) {
              console.log('[GROCERY LIST] Data is array, length:', data.length);
              const mapped = data.map((item: any) => {
                console.log('[GROCERY LIST] Mapping item:', item);
                return {
                  id: item.id,
                  name: item.name || item.ingredient || 'Unknown',
                  quantity: item.quantity || 1,
                  unit: item.unit || 'unit',
                  category: item.category || 'Other',
                  isPurchased: item.isPurchased ?? item.is_purchased ?? item.purchased ?? false
                };
              });
              console.log('[GROCERY LIST] Final mapped items:', mapped);
              return mapped;
            } else if (data.items && Array.isArray(data.items)) {
              console.log('[GROCERY LIST] Data has items property, length:', data.items.length);
              const mapped = data.items.map((item: any) => ({
                id: item.id,
                name: item.name || item.ingredient || 'Unknown',
                quantity: item.quantity || 1,
                unit: item.unit || 'unit',  
                category: item.category || 'Other',
                isPurchased: item.isPurchased ?? item.is_purchased ?? item.purchased ?? false
              }));
              console.log('[GROCERY LIST] Final mapped items from data.items:', mapped);
              return mapped;
            } else {
              console.log('[GROCERY LIST] Unexpected data format:', data);
              return [];
            }
          } else {
            const errorText = await response.text();
            console.error('[GROCERY LIST] Failed to fetch meal plan shopping list:', response.status, errorText);
          }
        } else {
          console.log('[GROCERY LIST] No meal plan available yet');
        }
        
        // Fallback to general shopping list
        console.log('[GROCERY LIST] Trying fallback to general shopping list');
        const response = await fetch('/api/shopping-list', {
          credentials: 'include'
        });
        console.log('[GROCERY LIST] General list response status:', response.status);
        
        if (!response.ok) {
          console.log('[GROCERY LIST] General list failed, returning empty array');
          return [];
        }
        
        const data = await response.json();
        console.log('[GROCERY LIST] General list data:', data);
        
        // Ensure we return an array
        if (Array.isArray(data)) {
          console.log('[GROCERY LIST] Returning general list array, length:', data.length);
          return data;
        } else if (data.items && Array.isArray(data.items)) {
          console.log('[GROCERY LIST] Returning general list items array, length:', data.items.length);
          return data.items;
        }
        
        console.log('[GROCERY LIST] No valid data format in general list, returning empty array');
        return [];
      } catch (error) {
        console.error('[GROCERY LIST] Error in queryFn:', error);
        return [];
      }
    },
    enabled: true // Always enabled now
  });

  // Calculate macro percentages based on targets
  const macroData = [
    {
      id: 'calories',
      title: 'Eaten Calories',
      current: Math.round(dailyTotals.calories),
      target: mealPlan?.targetCalories || 2500,
      unit: 'cal',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.calories / (mealPlan?.targetCalories || 2500)) * 100))
    },
    {
      id: 'carbs',
      title: 'Carbohydrates',
      current: Math.round(dailyTotals.carbs),
      target: mealPlan?.targetCarbs || 300,
      unit: 'g',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.carbs / (mealPlan?.targetCarbs || 300)) * 100))
    },
    {
      id: 'protein',
      title: 'Protein',
      current: Math.round(dailyTotals.protein),
      target: mealPlan?.targetProtein || 150,
      unit: 'g',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.protein / (mealPlan?.targetProtein || 150)) * 100))
    },
    {
      id: 'fat',
      title: 'Fat',
      current: Math.round(dailyTotals.fat),
      target: mealPlan?.targetFat || 80,
      unit: 'g',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.fat / (mealPlan?.targetFat || 80)) * 100))
    }
  ];

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
        refetchGroceries();
      }
    } catch (error) {
      // If API fails, just update locally for now
      refetchGroceries();
    }
  };

  return (
    <BaseLayout>
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
        mealPlan={mealPlan}
      />

      <MealsSection 
        foodLogs={foodLogs}
        isLoading={logsLoading}
      />

      <MealPlanSection 
        mealPlan={mealPlan}
      />
    </BaseLayout>
  );
}