import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Clock, Check, ChevronRight, Utensils, Coffee, Pizza, CalendarDays, Plus, Sun, Moon, Cloud } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useTranslation } from 'react-i18next';
import { SimpleMealCard } from "@/components/SimpleMealCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Meal {
  id: number;
  name: string;
  mealType: string;
  imageUrl?: string;
  isCompleted: boolean;
  recipe: {
    nutritionInfo: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

interface TodaysMealPlansProps {
  className?: string;
  selectedDate?: Date;
}

export function TodaysMealPlans({ className, selectedDate }: TodaysMealPlansProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [completedMeals, setCompletedMeals] = useState<Set<number>>(new Set());
  const [markedMeals, setMarkedMeals] = useState<Set<number>>(new Set());
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  const { data: mealPlanData, isLoading } = useQuery({
    // Update the queryKey to accurately reflect the endpoint we're using (based on date)
    queryKey: selectedDate ? 
      [`/api/meal-plans/${selectedDate.toISOString().split('T')[0]}`] : 
      ["/api/meal-plans/today"],
    queryFn: async () => {
      let url = "/api/meal-plans/today";
      
      // If a date is selected and it's not today, fetch the meal plan for that date
      if (selectedDate) {
        const today = new Date();
        const isToday = 
          selectedDate.getDate() === today.getDate() &&
          selectedDate.getMonth() === today.getMonth() &&
          selectedDate.getFullYear() === today.getFullYear();
          
        if (!isToday) {
          // Format date as YYYY-MM-DD for the API request
          const dateStr = selectedDate.toISOString().split('T')[0];
          url = `/api/meal-plans/${dateStr}`;
          console.log(`[TodaysMealPlans] Fetching meal plan for date: ${dateStr}`);
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch meal plan");
      }
      const data = await response.json();
      // Update the completed meals set whenever we fetch new data
      if (data.plan?.meals) {
        const completedMealIds = data.plan.meals
          .filter((meal: Meal) => meal.isCompleted)
          .map((meal: Meal) => meal.id);
        
        setCompletedMeals(new Set(completedMealIds));
        console.log("[TodaysMealPlans] Updated completed meals from API:", completedMealIds);
      }
      return data;
    },
    staleTime: 10000, // 10 seconds - reduced from 30s for faster updates
    refetchInterval: 3000, // Check for new meal plans every 3 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true // Always fetch fresh data when component mounts
  });

  const completeMealMutation = useMutation({
    mutationFn: async ({ mealPlanId, recipeId }: { mealPlanId: number; recipeId: number }) => {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/recipes/${recipeId}/complete`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error?.includes("Already completed")) {
          return { success: true, alreadyCompleted: true };
        }
        throw new Error(error.message || "Failed to mark meal as complete");
      }

      return { success: true, alreadyCompleted: false };
    },
    onMutate: async ({ recipeId }) => {
      setCompletedMeals(prev => new Set([...Array.from(prev), recipeId]));
    },
    onSuccess: (data, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-logs"] });
      if (!data.alreadyCompleted) {
        toast({
          title: "Success",
          description: "Meal marked as completed and added to your food log!",
        });
      }
    },
    onError: (error, { recipeId }) => {
      setCompletedMeals(prev => {
        const next = new Set(Array.from(prev));
        next.delete(recipeId);
        return next;
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark meal as complete",
      });
    },
    onSettled: (_, __, { recipeId }) => {
      setMarkedMeals(prev => {
        const next = new Set(Array.from(prev));
        next.delete(recipeId);
        return next;
      });
    }
  });

  const handleMarkAsEaten = async (e: React.MouseEvent<HTMLElement>, meal: Meal) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent navigation when clicking the button
    
    // Skip if already completed or in progress
    if (completedMeals.has(meal.id) || markedMeals.has(meal.id)) return;
    
    console.log(`[TodaysMealPlans] Marking meal ${meal.id} (${meal.name}) as eaten`);
    
    // Update UI state immediately to show loading
    setMarkedMeals(prev => new Set([...Array.from(prev), meal.id]));
    
    try {
      await completeMealMutation.mutateAsync({
        mealPlanId: mealPlanData.plan.id,
        recipeId: meal.id,
      });
      
      // Update local state to show completion immediately
      setCompletedMeals(prev => new Set([...Array.from(prev), meal.id]));
      
      // Force refresh both food logs and meal plan data
      // Use the same query key format we defined in the useQuery hook
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        // Invalidate the specific date-based query
        queryClient.invalidateQueries({ 
          queryKey: [`/api/meal-plans/${dateStr}`] 
        });
      } else {
        // Invalidate the "today" query
        queryClient.invalidateQueries({ 
          queryKey: ["/api/meal-plans/today"] 
        });
      }
      
      // Also invalidate food logs to update nutrition totals
      queryClient.invalidateQueries({ queryKey: ["/api/food-logs"] });
      
      console.log(`[TodaysMealPlans] Successfully marked meal ${meal.id} as eaten`);
    } catch (error) {
      console.error('Error marking meal as eaten:', error);
      
      // Remove from completed meals if there was an error
      setCompletedMeals(prev => {
        const next = new Set(Array.from(prev));
        next.delete(meal.id);
        return next;
      });
    }
  };

  // Function to render meal cards in the dashboard
  const renderMealCard = (meal: Meal) => {
    const isCompleted = meal.isCompleted || completedMeals.has(meal.id);
    const isLoading = markedMeals.has(meal.id);
    
    // Create a properly formatted meal object that matches the SimpleMealCard component expectations
    const formattedMeal = {
      ...meal,
      isCompleted: isCompleted, // Use our combined state
      recipe: {
        ...meal.recipe,
        // Add missing properties if needed
        nutritionInfo: meal.recipe?.nutritionInfo || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      }
    };
    
    // Use the SimpleMealCard component without images and with simplified names
    return (
      <SimpleMealCard 
        key={meal.id}
        meal={formattedMeal}
        onToggleComplete={(mealId: number, isComplete: boolean) => {
          handleMarkAsEaten({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent<HTMLElement>, meal);
        }}
        onClick={(mealId: number) => {
          console.log(`Navigating to meal: ${meal.id} (${meal.name})`);
          // Navigate to the detailed view 
          // Note: The RecipeDetail component is the one to display both recipes and meals
          setLocation(`/recipes/${meal.id}`);
        }}
      />
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex-[0_0_260px] min-w-0 mr-4 last:mr-0">
              <div className="w-full bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="relative">
                  <AspectRatio ratio={2 / 2}>
                    <div className="w-full h-full bg-[#0CC5BA]/10" />
                  </AspectRatio>
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded-md w-1/3" />
                  <div className="h-7 bg-gray-200 rounded-md w-3/4" />
                  <div className="h-5 bg-gray-200 rounded-md w-1/2" />
                  <div className="h-16 bg-[#0CC5BA]/5 rounded-lg w-full mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!mealPlanData?.hasPlan) {
    return (
      <div className={className}>
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-full flex items-center justify-center">
            <CalendarDays className="h-10 w-10 text-purple-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">No meal plan created</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Create a personalized meal plan tailored to your nutritional goals and preferences
          </p>
          <Button 
            onClick={() => setLocation('/meal-planning-quiz')}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-md font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Meal Plan
          </Button>
        </div>
      </div>
    );
  }

  // Collect all meals from the meal plan
  const meals = mealPlanData.plan.meals;
  
  // Group meal types by time of day
  const mealGroups = {
    morning: ["breakfast", "morning_snack", "morning snack"],
    afternoon: ["lunch", "afternoon_snack", "afternoon snack"],
    evening: ["dinner", "evening_snack", "evening snack"]
  };
  
  // Handle special case for generic "snack" type - distribute evenly
  if (meals && meals.length > 0) {
    // Find any meals with generic "snack" type
    const snackMeals = meals.filter((m: Meal) => m.mealType.toLowerCase() === "snack");
    
    if (snackMeals.length > 0) {
      console.log(`Found ${snackMeals.length} generic snack meals to distribute`);
      
      // Distribute the first snack to morning, and the second to evening
      if (snackMeals.length >= 1) {
        snackMeals[0].mealType = "morning snack";
        console.log(`Assigned first snack to morning: ${snackMeals[0].name}`);
      }
      
      if (snackMeals.length >= 2) {
        snackMeals[1].mealType = "evening snack";
        console.log(`Assigned second snack to evening: ${snackMeals[1].name}`);
      }
      
      // If there are more snacks (unlikely), assign them to afternoon
      for (let i = 2; i < snackMeals.length; i++) {
        snackMeals[i].mealType = "afternoon snack";
        console.log(`Assigned extra snack ${i+1} to afternoon: ${snackMeals[i].name}`);
      }
    }
  }
  
  // Debug: Check what meal types are actually present
  if (meals && meals.length > 0) {
    const mealTypes = meals.map((m: Meal) => m.mealType.toLowerCase());
    const uniqueTypes = Array.from(new Set(mealTypes));
    console.log("TodaysMealPlans - Unique meal types:", uniqueTypes);
  }
  
  // Map of meal types for translation
  const mealTypeTranslations: {[key: string]: string} = {
    "breakfast": t('mealTypes.breakfast', 'śniadanie'),
    "morning_snack": t('mealTypes.morningSnack', 'przekąska poranna'),
    "morning snack": t('mealTypes.morningSnack', 'przekąska poranna'),
    "lunch": t('mealTypes.lunch', 'obiad'),
    "afternoon_snack": t('mealTypes.afternoonSnack', 'przekąska popołudniowa'),
    "afternoon snack": t('mealTypes.afternoonSnack', 'przekąska popołudniowa'),
    "snack": t('mealTypes.snack', 'przekąska'),
    "dinner": t('mealTypes.dinner', 'kolacja'),
    "evening_snack": t('mealTypes.eveningSnack', 'przekąska wieczorna'),
    "evening snack": t('mealTypes.eveningSnack', 'przekąska wieczorna')
  };
  
  // Group translations for display
  const groupTranslations: {[key: string]: string} = {
    "morning": t('mealGroups.morning', 'Poranek'),
    "afternoon": t('mealGroups.afternoon', 'Popołudnie'),
    "evening": t('mealGroups.evening', 'Wieczór')
  };

  // Sort the meals by time of day and by type within each group
  const sortedMeals = [...meals].sort((a, b) => {
    // Check both database flag and local state for completed status
    const aCompleted = a.isCompleted || completedMeals.has(a.id);
    const bCompleted = b.isCompleted || completedMeals.has(b.id);
    
    // Define time of day groups (morning, afternoon, evening)
    const getTimeOfDay = (mealType: string): string => {
      const normalizedType = mealType.toLowerCase();
      if (mealGroups.morning.includes(normalizedType)) return "morning";
      if (mealGroups.afternoon.includes(normalizedType)) return "afternoon";
      if (mealGroups.evening.includes(normalizedType)) return "evening";
      return "other";
    };
    
    // Define the order of meal types within each time of day
    const getMealTypeOrder = (mealType: string): number => {
      const normalizedType = mealType.toLowerCase();
      
      // Order within morning group
      if (normalizedType === "breakfast") return 0;
      if (normalizedType === "morning_snack" || normalizedType === "morning snack") return 1;
      
      // Order within afternoon group
      if (normalizedType === "lunch") return 0;
      if (normalizedType === "afternoon_snack" || normalizedType === "afternoon snack") return 1;
      if (normalizedType === "snack") return 2; // Add generic snack as last in afternoon
      
      // Order within evening group
      if (normalizedType === "dinner") return 0;
      if (normalizedType === "evening_snack" || normalizedType === "evening snack") return 1;
      
      return 999; // fallback
    };
    
    // First sort by completion status
    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }
    
    // Then sort by time of day group
    const aTimeOfDay = getTimeOfDay(a.mealType);
    const bTimeOfDay = getTimeOfDay(b.mealType);
    
    if (aTimeOfDay !== bTimeOfDay) {
      // Morning first, then afternoon, then evening
      const timeOfDayOrder: Record<string, number> = { 
        "morning": 0, 
        "afternoon": 1, 
        "evening": 2, 
        "other": 3 
      };
      return timeOfDayOrder[aTimeOfDay] - timeOfDayOrder[bTimeOfDay];
    }
    
    // Within the same time of day, sort by meal type
    return getMealTypeOrder(a.mealType) - getMealTypeOrder(b.mealType);
  });

  // Log all meals received from the API to understand what we're working with
  console.log("All meals from API:", meals.map((m: any) => ({
    id: m.id,
    name: m.name,
    mealType: m.mealType
  })));
  
  // Group meals by time of day for display
  const groupedMeals = sortedMeals.reduce((groups: Record<string, Meal[]>, meal) => {
    const normalizedType = meal.mealType.toLowerCase();
    let timeOfDay = 'other';
    
    if (mealGroups.morning.includes(normalizedType)) timeOfDay = 'morning';
    else if (mealGroups.afternoon.includes(normalizedType)) timeOfDay = 'afternoon';
    else if (mealGroups.evening.includes(normalizedType)) timeOfDay = 'evening';
    
    if (!groups[timeOfDay]) {
      groups[timeOfDay] = [];
    }
    groups[timeOfDay].push(meal);
    return groups;
  }, {} as Record<string, Meal[]>);
  
  // Log grouped meals to see how they are organized
  console.log("Grouped meals:", Object.keys(groupedMeals).map(group => ({
    group,
    mealCount: groupedMeals[group].length,
    meals: groupedMeals[group].map((m: Meal) => `${m.mealType}: ${m.name}`)
  })));
  
  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Morning meals */}
        {groupedMeals['morning'] && groupedMeals['morning'].length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-700">Morning</h3>
              <span className="text-xs text-gray-500">({groupedMeals['morning'].length} meals)</span>
            </div>
            <div className="space-y-2">
              {groupedMeals['morning'].map(meal => renderMealCard(meal))}
            </div>
          </div>
        )}
        
        {/* Afternoon meals */}
        {groupedMeals['afternoon'] && groupedMeals['afternoon'].length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-700">Afternoon</h3>
              <span className="text-xs text-gray-500">({groupedMeals['afternoon'].length} meals)</span>
            </div>
            <div className="space-y-2">
              {groupedMeals['afternoon'].map(meal => renderMealCard(meal))}
            </div>
          </div>
        )}
        
        {/* Evening meals */}
        {groupedMeals['evening'] && groupedMeals['evening'].length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Moon className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700">Evening</h3>
              <span className="text-xs text-gray-500">({groupedMeals['evening'].length} meals)</span>
            </div>
            <div className="space-y-2">
              {groupedMeals['evening'].map(meal => renderMealCard(meal))}
            </div>
          </div>
        )}
        
        {/* If no meals in any category */}
        {(!groupedMeals['morning'] || groupedMeals['morning'].length === 0) && 
         (!groupedMeals['afternoon'] || groupedMeals['afternoon'].length === 0) && 
         (!groupedMeals['evening'] || groupedMeals['evening'].length === 0) && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No meals scheduled for today</p>
          </div>
        )}
      </div>
    </div>
  );
}