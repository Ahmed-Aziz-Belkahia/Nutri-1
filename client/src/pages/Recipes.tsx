import { useState, useRef, useEffect, useMemo } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Loader2, 
  Utensils, ChefHat, Clock
} from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import { format } from "date-fns";
import BaseLayout from "@/components/layouts/BaseLayout";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Plus, Camera, ChevronRight, 
  Search, User, Settings, LogOut, Trash2,
  Filter, LayoutGrid, Heart, Flame,
  CalendarDays, Coffee, Pizza, ShoppingCart, ShoppingBag, Sparkles,
  Book, Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useTranslation } from "react-i18next";
import { parseISO, addDays, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MealCard } from "@/components/MealCard";
import { EnhancedRecipeCard } from "@/components/EnhancedRecipeCard";
import { Recipe } from "@/types/recipe";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getRecipeImage } from "@/lib/imageUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ImprovedShoppingList from "@/pages/ImprovedShoppingList";
import EmbeddedShoppingList from "@/components/EmbeddedShoppingList";
import MealPlanningWelcome from "@/components/MealPlanningWelcome";
import GroceryList from "@/components/dashboard/GroceryList";
import { useCreatedRecipes, useSavedRecipes } from "@/hooks/queries/useRecipes";
import { useTodaysMealPlan, useAllMealPlans } from "@/hooks/queries/useMealPlans";
import { useShoppingListByPlanId } from "@/hooks/queries/useShoppingList";

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

const createRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().optional(),
  prepTime: z.string().min(1, "Preparation time is required"),
  servings: z.number().min(1, "Number of servings is required"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  ingredients: z.array(z.string()).min(1, "At least one ingredient is required"),
  instructions: z.string().min(1, "Instructions are required"),
  imageUrl: z.string().optional(),
  isPublic: z.boolean().default(true),
});

type CreateRecipeForm = z.infer<typeof createRecipeSchema>;

// Additional interfaces for meal plan 
interface Meal {
  id: number;
  name: string;
  mealType: string;
  imageUrl?: string;
  isCompleted?: boolean;
  order?: number;
  instructions?: string[] | string;
  ingredients?: string[];
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  recipe?: {
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

export default function Recipes() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useUser();
  const { t } = useTranslation();

  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<import('@/types/recipe').Recipe | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "lowCalorie" | "highProtein" | "balanced">("all");
  const username = user?.email ? user.email.split('@')[0] : 'User';
  const userInitial = username.charAt(0).toUpperCase();
  
  // Pull to refresh setup
  const handleRefresh = usePullToRefresh([
    ['/api/recipes/user'],
    ['/api/recipes/saved'],
    ['/api/meal-plans/today'],
    ['/api/meal-plans/all']
  ]);
  
  // Meal plan state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  
  // Get current tab from URL
  const getCurrentTab = (): "recipes" | "meal-plan" => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'meal-plan' ? 'meal-plan' : 'recipes';
  };
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"recipes" | "meal-plan">(getCurrentTab());
  
  // Watch for URL changes and update tab
  useEffect(() => {
    const newTab = getCurrentTab();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location]);
  
  // Handle tab click
  const handleTabChange = (tab: "recipes" | "meal-plan") => {
    setActiveTab(tab);
    navigate(`/recipes?tab=${tab}`, { replace: true });
  };
  
  // Refresh recipes data when component mounts
  useEffect(() => {
    // Force refetch the latest recipe data when page loads
    queryClient.invalidateQueries({ queryKey: ["/api/recipes", "created"] });
    queryClient.invalidateQueries({ queryKey: ["/api/recipes", "saved"] });
  }, [queryClient]);
  
  // Level functionality removed

  // Use custom hooks for recipes (cast to match local types)
  const { data: createdRecipes, isLoading: isLoadingCreated } = useCreatedRecipes();
  const { data: savedRecipes, isLoading: isLoadingSaved } = useSavedRecipes();
  
  // Fetch recent food logs using React Query
  const { data: recentFoodLogs = [] } = useQuery({
    queryKey: ['/api/food-logs/recent-all'],
    queryFn: async () => {
      const response = await fetch('/api/food-logs/recent-all?limit=20', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch recent meals');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Use custom hooks for meal plans (cast to match local types)
  const { data: todayMealPlanData, isLoading: isTodayLoading, error: todayError } = useTodaysMealPlan();
  const { data: allMealPlansData, isLoading: isAllPlansLoading, error: allPlansError, refetch: allMealPlansRefetch } = useAllMealPlans();

  // Use custom hook for grocery list (cast to match local types)
  const { data: groceryList = [], isLoading: groceriesLoading, refetch: refetchGroceries } = useShoppingListByPlanId(selectedPlan?.id);
  
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
        variant: "destructive",
      });
    }
  });
  
  // Generate meal plan mutation
  const generateMealPlanMutation = useMutation({
    mutationFn: async (params: { date: string; duration: string; useExistingPreferences: boolean }) => {
      const response = await fetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate meal plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      allMealPlansRefetch();
      
      // Invalidate shopping list cache to show updated items immediately
      queryClient.invalidateQueries({ 
        queryKey: ["/api/shopping-list"],
        refetchType: 'active'
      });
      
      toast({
        title: t('mealPlan.generated', 'Plan generated!'),
        description: t('mealPlan.generatedDescription', 'Your meal plan has been created successfully.'),
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: t('mealPlan.errors.generationFailed', 'Generation failed'),
        description: error instanceof Error ? error.message : t('mealPlan.errors.unexpected', 'An unexpected error occurred'),
        variant: 'destructive',
      });
    }
  });
  
  // Calendar date initialization and handling
  useEffect(() => {
    // Initialize calendar dates starting from today and showing the next 6 days
    const today = new Date();
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      // Add the current day and the next 6 days
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      weekDates.push(day);
    }
    
    setCalendarDates(weekDates);
    setSelectedDate(today);
  }, []);
  
  // Handle date selection in calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    // Find the plan for the selected date
    if (allMealPlansData) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      const plan = allMealPlansData.find((plan: any) => plan.date === selectedDateStr);
      setSelectedPlan((plan || null) as any);
      
      // If no plan exists for this date, show toast with option to generate
      if (!plan) {
        toast({
          title: t('mealPlan.generatePlan', 'Generate meal plan?'),
          description: t('mealPlan.generatePlanQuestion', 'No meal plan exists for this date. Would you like to generate one?'),
          variant: 'default',
          action: (
            <div className="flex gap-2">
              <ToastAction altText={t('mealPlan.generatePlan', 'Generate meal plan')} onClick={() => {
                navigate('/meal-planning-quiz');
              }}>
                {t('mealPlan.generatePlan', 'Generate Plan')}
              </ToastAction>
            </div>
          ),
        });
      }
    }
  };
  
  // Set selected plan when all plans data loads
  useEffect(() => {
    if (allMealPlansData && (allMealPlansData as any).length > 0) {
      // If today's date is selected, try to find today's meal plan
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const plan = (allMealPlansData as any).find((plan: any) => plan.date === selectedDateStr);
      
      setSelectedPlan((plan || null) as any);
    }
  }, [allMealPlansData, selectedDate]);

  // Normalize meals for display (distribute generic "snack" types)
  const normalizedMeals = useMemo(() => {
    if (!selectedPlan?.meals) return [] as Meal[];
    // Clone to avoid mutating original state
    const meals = selectedPlan.meals.map(m => ({ ...m }));
    const snackMeals = meals.filter(m => m.mealType?.toLowerCase() === 'snack');

    if (snackMeals.length >= 1) snackMeals[0].mealType = 'morning snack';
    if (snackMeals.length >= 2) snackMeals[1].mealType = 'evening snack';
    for (let i = 2; i < snackMeals.length; i++) {
      snackMeals[i].mealType = 'afternoon snack';
    }

    return meals;
  }, [selectedPlan]);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateRecipeForm>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: {
      name: "High-Protein Breakfast Bowl",
      description: "A nutritious breakfast bowl perfect for muscle recovery and sustained energy throughout the morning.",
      prepTime: "20 mins",
      servings: 1,
      difficulty: "Easy",
      ingredients: [],
      instructions: "1. Cook quinoa according to package instructions and let it cool\n2. Cook turkey bacon until crispy\n3. Scramble the eggs\n4. Dice avocado and tomatoes\n5. In a bowl, arrange quinoa as the base\n6. Top with scrambled eggs, spinach, avocado, tomatoes, and crumbled bacon\n7. Season with salt and pepper\n8. Drizzle with olive oil\n9. Serve immediately while warm",
      isPublic: true
    }
  });

  // Toggle grocery item handler
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

  const createRecipeMutation = useMutation({
    mutationFn: async (data: CreateRecipeForm) => {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create recipe");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", "created"] });
      toast({
        title: "Success",
        description: "Recipe created successfully!",
        duration: 3000,
      });
      setShowCreateModal(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create recipe. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });
  
  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to delete recipe");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", "created"] });
      toast({
        title: t('common.success', 'Success'),
        description: t('recipes.deleteSuccess', 'Recipe deleted successfully!'),
        duration: 3000,
      });
      setShowDeleteModal(false);
      setRecipeToDelete(null);
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: t('recipes.deleteError', 'Failed to delete recipe. Please try again.'),
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient("");
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const onSubmit = (data: CreateRecipeForm) => {
    data.ingredients = ingredients;
    createRecipeMutation.mutate(data);
  };

  const handleRecipeClick = (recipe: Recipe) => {
    // Ensure we have all required data before navigation
    if (!recipe || !recipe.id) {
      toast({
        title: "Error",
        description: "Invalid recipe data",
        variant: "destructive"
      });
      return;
    }
    navigate(`/recipes/${recipe.id}`);
  };
  
  // Get filtered recipes based on filterMode
  const getFilteredRecipes = (recipes: import('@/types/recipe').Recipe[] | undefined) => {
    if (!recipes) return [];
    
    switch (filterMode) {
      case "lowCalorie":
        return recipes.filter(r => {
          const calories = r.nutritionInfo?.calories || 0;
          return calories <= 500;
        });
      case "highProtein":
        return recipes.filter(r => {
          const protein = r.nutritionInfo?.protein || 0;
          return protein >= 20; // Minimum 20g protein
        });
      case "balanced":
        return recipes.filter(r => {
          const cal = r.nutritionInfo?.calories || 0;
          const protein = r.nutritionInfo?.protein || 0;
          const carbs = r.nutritionInfo?.carbs || 0;
          const fat = r.nutritionInfo?.fat || 0;
          return protein >= 15 && carbs >= 15 && fat >= 5;
        });
      default:
        return recipes;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout. Please try again.",
      });
    }
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoadingCreated || isLoadingSaved) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-bg">
        <div className="bg-white/15 backdrop-blur-md rounded-full p-5">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      </div>
    );
  }

  return (
    <BaseLayout onRefresh={handleRefresh}>
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="pb-24"
      >
          {/* Mobile-Standard Tab Navigation */}
          <div className="mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => handleTabChange("recipes")}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                  ${activeTab === "recipes" 
                    ? "bg-[#26A8FF] text-white shadow-sm" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }
                `}
              >
                <Book className="w-4 h-4" />
                <span>{t('navigation.recipes', 'Recipes')}</span>
              </button>
              <button
                onClick={() => handleTabChange("meal-plan")}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                  ${activeTab === "meal-plan" 
                    ? "bg-[#26A8FF] text-white shadow-sm" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }
                `}
              >
                <Calendar className="w-4 h-4" />
                <span>{t('navigation.mealPlan', 'Meal Plan')}</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "recipes" && (
            <motion.div
              key="recipes-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Scan ingredients card - ENHANCED */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 border-none shadow-xl overflow-hidden relative">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                  
                  <div className="relative p-6 text-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Camera className="w-10 h-10 text-white" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-3">
                      {t('recipes.aIPoweredCreator', 'AI-Powered Recipe Creator')}
                    </h2>
                    
                    <p className="text-white/90 mb-6 max-w-md mx-auto leading-relaxed">
                      {t('recipes.takePhoto', 'Take a photo of your ingredients and let AI create personalized recipes for you instantly!')}
                    </p>
                    
                    <Button
                      onClick={() => navigate('/scan-recipe')}
                      className="py-6 px-12 bg-white text-cyan-600 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/95"
                    >
                      <Camera className="w-6 h-6 mr-3" />
                      {t('recipes.scanIngredients', 'Scan Ingredients')}
                    </Button>
                    
                    <div className="flex items-center justify-center gap-6 mt-6 text-white/80 text-sm">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>AI Powered</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Instant Results</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="w-4 h-4" />
                        <span>Custom Recipes</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
              
              {/* Created Recipes Section - COMPLETELY REDESIGNED */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-10"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                      <Utensils className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white ml-2">
                      {t('recipes.yourRecipes')}
                    </h2>
                  </div>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-white text-primary rounded-lg px-4 py-2 flex items-center gap-2 hover:shadow-lg transition-all hover:bg-white/90"
                  >
                    <Plus className="h-4 w-4" />
                    {t('recipes.createRecipe', 'Create Recipe')}
                  </Button>
                </div>

                {/* Display recipes with new styling or skeletons while loading */}
                {isLoadingCreated ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
                        <div className="animate-pulse">
                          <div className="h-40 bg-white/20 w-full" />
                          <div className="p-4 space-y-2">
                            <div className="h-5 bg-white/20 rounded w-3/4" />
                            <div className="h-4 bg-white/20 rounded w-1/2" />
                            <div className="flex gap-2 pt-1">
                              <div className="h-6 w-6 rounded-full bg-white/20" />
                              <div className="h-6 w-6 rounded-full bg-white/20" />
                              <div className="h-6 w-6 rounded-full bg-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : createdRecipes && createdRecipes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {getFilteredRecipes(createdRecipes as any).map((recipe: any) => (
                      <EnhancedRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onClick={handleRecipeClick}
                        onDelete={(recipe) => {
                          setRecipeToDelete(recipe);
                          setShowDeleteModal(true);
                        }}
                      />
                    ))}
                    
                    {getFilteredRecipes(createdRecipes as any).length === 0 && (
                      <div className="col-span-1 sm:col-span-2 text-center py-8 text-white/80">
                        <p>No matching recipes found. Try adjusting your filters or create a new recipe!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{t('recipes.noRecipesYet')}</h3>
                    <p className="text-white/80 mb-6">{t('recipes.startCulinaryJourney')}</p>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-white text-primary rounded-lg px-6 py-3 flex items-center gap-2 hover:shadow-lg transition-all mx-auto hover:bg-white/90"
                    >
                      <Plus className="h-5 w-5" />
                      {t('recipes.createRecipe', 'Create Recipe')}
                    </Button>
                  </div>
                )}
              </motion.section>
              
              {/* Saved Recipes Section - REDESIGNED */}
              {savedRecipes && savedRecipes.length > 0 && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-8"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {t('recipes.savedFavorites')}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {getFilteredRecipes(savedRecipes as any).map((recipe: any) => (
                      <EnhancedRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onClick={handleRecipeClick}
                      />
                    ))}
                    
                    {getFilteredRecipes(savedRecipes as any).length === 0 && (
                      <div className="col-span-1 sm:col-span-2 text-center py-8 text-white/80">
                        <p>No matching saved recipes found with your current filters.</p>
                      </div>
                    )}
                  </div>
                </motion.section>
              )}

              {/* Recent Meals Section (Food Logs) - NEW */}
              {recentFoodLogs && recentFoodLogs.length > 0 && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-8"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                      <Utensils className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {t('recipes.recentMeals', 'My Recent Meals')}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {recentFoodLogs.map((meal: any) => (
                      <Card
                        key={meal.id}
                        className="overflow-hidden rounded-3xl border-none shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer group bg-white/10 backdrop-blur-sm"
                        onClick={() => {
                          // For food logs, we might want to show details differently
                          // For now, just show a toast
                          toast({
                            title: meal.name,
                            description: `${meal.calories} cal • ${meal.protein}g protein`
                          });
                        }}
                      >
                        <div className="relative h-44 overflow-hidden">
                          {meal.image || meal.imageUrl ? (
                            <img 
                              src={meal.image || meal.imageUrl} 
                              alt={meal.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                              <Utensils className="w-16 h-16 text-white/80" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        </div>
                        
                        <div className="p-5 bg-white/5 backdrop-blur-sm">
                          <h3 className="text-xl font-bold leading-tight mb-2 text-white group-hover:text-white/80 transition-colors line-clamp-2">
                            {meal.name}
                          </h3>
                          
                          <div className="flex flex-wrap gap-2 text-sm text-white/80">
                            <div className="flex items-center gap-1">
                              <Flame className="w-4 h-4" />
                              <span>{meal.calories} cal</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">P:</span>
                              <span>{meal.protein}g</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">C:</span>
                              <span>{meal.carbs}g</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">F:</span>
                              <span>{meal.fat}g</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.section>
              )}
            </motion.div>
          )}

          {activeTab === "meal-plan" && (
            <motion.div
              key="meal-plan-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Meal Plan Content */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card mb-6"
              >
                {/* View Full Plan Button */}
                <button
                  onClick={() => setLocation("/meal-plan/view")}
                  className="w-full mb-4 flex items-center justify-between p-4 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm hover:bg-white/80 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-[#0CC5BA]/30">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-900 font-semibold text-sm">View Full Meal Plan</p>
                      <p className="text-gray-500 text-xs">See your complete weekly plan</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>
                </button>

                {/* Calendar Date Selector */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <CalendarDays className="w-6 h-6 mr-2 text-primary" />
                    {t('mealPlan.selectDate', 'Select Date')}
                  </h2>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white/80 to-transparent rounded-l-xl" />
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white/80 to-transparent rounded-r-xl" />
                    <div className="flex overflow-x-auto gap-2 pb-2 px-1 no-scrollbar scroll-smooth">
                      {calendarDates.map((date, index) => {
                        const isSelected = 
                          selectedDate && 
                          date.getDate() === selectedDate.getDate() && 
                          date.getMonth() === selectedDate.getMonth();
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const hasPlan = allMealPlansData?.some((p: any) => p.date === dateStr);
                        const isToday = new Date().toDateString() === date.toDateString();
                        return (
                          <button
                            key={index}
                            onClick={() => handleDateSelect(date)}
                            className={`flex flex-col items-center justify-center py-2 px-1 min-w-[56px] h-14 rounded-xl transition-all border select-none leading-tight
                              ${isSelected
                                ? 'bg-primary text-white shadow-md border-primary'
                                : isToday
                                  ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/30'
                                  : hasPlan
                                    ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                          >
                            <span className={`text-[10px] font-medium mb-0.5 ${isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-gray-500'}`}>
                              {format(date, 'EEE')}
                            </span>
                            <span className={`text-base font-semibold ${isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-gray-800'}`}>
                              {format(date, 'd')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Today's Meals or Selected Day's Meals */}
                {isAllPlansLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : selectedPlan ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">
                        {format(parseISO(selectedPlan.date), 'PPP')}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Flame className="h-4 w-4 mr-1 text-orange-500" />
                        {selectedPlan.totalCalories} {t('mealPlan.calories', 'calories')}
                      </div>
                    </div>
                    
                    {/* Meal tabs: Morning, Afternoon, Evening */}
                    <Tabs defaultValue="morning" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
                        <TabsTrigger value="morning" className="text-xs py-2 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <Coffee className="h-3 w-3 mr-1" />
                          {t('mealPlan.morning', 'Morning')}
                        </TabsTrigger>
                        <TabsTrigger value="afternoon" className="text-xs py-2 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <Utensils className="h-3 w-3 mr-1" />
                          {t('mealPlan.afternoon', 'Afternoon')}
                        </TabsTrigger>
                        <TabsTrigger value="evening" className="text-xs py-2 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <Pizza className="h-3 w-3 mr-1" />
                          {t('mealPlan.evening', 'Evening')}
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="morning">
                        {/* Morning meals (breakfast + morning snack) */}
                        {normalizedMeals
                          .filter(meal => 
                            meal.mealType.toLowerCase() === 'breakfast' || 
                            meal.mealType.toLowerCase() === 'morning_snack' ||
                            meal.mealType.toLowerCase() === 'morning snack'
                          )
                          .sort((a, b) => {
                            // Sort breakfast before morning snack
                            if (a.mealType.toLowerCase() === 'breakfast') return -1;
                            if (b.mealType.toLowerCase() === 'breakfast') return 1;
                            return 0;
                          })
                          .map(meal => (
                            <MealCard
                              key={meal.id}
                              meal={meal}
                              onToggleComplete={(mealId, isCompleted) => {
                                markMealStatusMutation.mutate({ mealId, isCompleted });
                              }}
                              onClick={() => navigate(`/recipes/${meal.id}`)}
                            />
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="afternoon">
                        {/* Afternoon meals (lunch + afternoon snack) */}
                        {normalizedMeals
                          .filter(meal => 
                            meal.mealType.toLowerCase() === 'lunch' || 
                            meal.mealType.toLowerCase() === 'afternoon_snack' ||
                            meal.mealType.toLowerCase() === 'afternoon snack'
                          )
                          .sort((a, b) => {
                            // Sort lunch before afternoon snack
                            if (a.mealType.toLowerCase() === 'lunch') return -1;
                            if (b.mealType.toLowerCase() === 'lunch') return 1;
                            return 0;
                          })
                          .map(meal => (
                            <MealCard
                              key={meal.id}
                              meal={meal}
                              onToggleComplete={(mealId, isCompleted) => {
                                markMealStatusMutation.mutate({ mealId, isCompleted });
                              }}
                              onClick={() => navigate(`/recipes/${meal.id}`)}
                            />
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="evening">
                        {/* Evening meals (dinner + evening snack if any) */}
                        {normalizedMeals
                          .filter(meal => 
                            meal.mealType.toLowerCase() === 'dinner' || 
                            meal.mealType.toLowerCase() === 'evening_snack' ||
                            meal.mealType.toLowerCase() === 'evening snack'
                          )
                          .sort((a, b) => {
                            // Sort dinner before evening snack
                            if (a.mealType.toLowerCase() === 'dinner') return -1;
                            if (b.mealType.toLowerCase() === 'dinner') return 1;
                            return 0;
                          })
                          .map(meal => (
                            <MealCard
                              key={meal.id}
                              meal={meal}
                              onToggleComplete={(mealId, isCompleted) => {
                                markMealStatusMutation.mutate({ mealId, isCompleted });
                              }}
                              onClick={() => navigate(`/recipes/${meal.id}`)}
                            />
                        ))}
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="py-6 px-4">
                    <MealPlanningWelcome />
                  </div>
                )}
              </motion.div>

              {/* Shopping List Section - Styled like Recipe Cards */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white ml-2">
                    {t('navigation.shoppingList', 'Shopping List')}
                  </h2>
                </div>
                
                <Card className="overflow-hidden rounded-3xl border-none shadow-lg transition-all duration-300 group bg-white/10 backdrop-blur-sm">
                  <div className="relative p-5 bg-transparent border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold leading-tight text-white group-hover:text-white/80 transition-colors">
                          {t('shoppingList.weeklyTitle', 'Weekly Shopping List')}
                        </h3>
                        <p className="text-sm text-white/80 mt-1">
                          {t('shoppingList.description', 'Your meal plan shopping items')}
                        </p>
                      </div>
                      <div className="h-12 w-12 flex items-center justify-center bg-white rounded-full shadow-lg">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-transparent">
                    <GroceryList 
                      groceryList={groceryList as any}
                      mealPlan={selectedPlan}
                      onToggleItem={toggleGroceryItem}
                    />
                  </div>
                </Card>
              </motion.section>

              {/* Generate New Meal Plan button at the bottom */}
        <div className="flex flex-col gap-4 justify-center mb-6">
                <Button
                  onClick={() => navigate('/meal-planning-quiz')}
          className="w-full max-w-md py-5 bg-primary text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <CalendarDays className="mr-2 h-5 w-5" />
                  {t('mealPlan.generateNew', 'Generate New Meal Plan')}
                </Button>
              </div>
            </motion.div>
          )}

      </motion.main>
        
      <Dialog open={showCreateModal} onOpenChange={(open) => setShowCreateModal(open)}>
        <DialogContent className="max-w-[420px] rounded-xl">
          <DialogHeader>
            <DialogTitle>{t('recipes.createNewRecipe')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">{t('recipes.name')}</label>
              <Input
                id="name"
                {...register("name")}
                className="mt-1"
                placeholder={t('recipes.name')}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium">{t('recipes.description')}</label>
              <Textarea
                id="description"
                {...register("description")}
                className="mt-1"
                placeholder={t('recipes.description')}
              />
            </div>
            <div>
              <label htmlFor="prepTime" className="block text-sm font-medium">{t('recipes.prepTime')}</label>
              <Input
                id="prepTime"
                {...register("prepTime")}
                className="mt-1"
                placeholder={t('recipes.prepTimePlaceholder')}
              />
              {errors.prepTime && <p className="text-red-500 text-xs mt-1">{errors.prepTime.message}</p>}
            </div>
            <div>
              <label htmlFor="ingredients" className="block text-sm font-medium">{t('recipes.ingredients')}</label>
              <div className="flex items-center mt-1">
                <Input
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  className="flex-1"
                  placeholder={t('recipes.ingredientPlaceholder')}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddIngredient())}
                />
                <Button
                  type="button"
                  onClick={handleAddIngredient}
                  variant="outline"
                  className="ml-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {ingredients.length === 0 && errors.ingredients && (
                <p className="text-red-500 text-xs mt-1">{errors.ingredients.message}</p>
              )}
              <div className="mt-2 space-y-1">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded-md">
                    <span className="text-sm">{ingredient}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="instructions" className="block text-sm font-medium">{t('recipes.instructions')}</label>
              <Textarea
                id="instructions"
                {...register("instructions")}
                className="mt-1"
                placeholder={t('recipes.instructionsPlaceholder')}
                rows={4}
              />
              {errors.instructions && <p className="text-red-500 text-xs mt-1">{errors.instructions.message}</p>}
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createRecipeMutation.isPending}
              >
                {createRecipeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('recipes.creating')}
                  </>
                ) : (
                  t('recipes.createRecipe')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recipes.deleteRecipe', 'Delete Recipe')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('recipes.deleteConfirmation', 'Are you sure you want to delete recipe')}: "{recipeToDelete?.name}"? {t('recipes.cannotBeUndone', 'This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (recipeToDelete && recipeToDelete.id) {
                  deleteRecipeMutation.mutate(recipeToDelete.id);
                }
              }}
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseLayout>
  );
}