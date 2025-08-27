import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Plus, Camera, ChevronRight, Loader2, 
  Search, User, Settings, LogOut, Trash2,
  Utensils, Filter, LayoutGrid, Heart, Clock, Flame,
  CalendarDays, Coffee, Pizza, ShoppingCart, ShoppingBag, Sparkles
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast"; 
import { useUser } from "../hooks/use-user";
import { useTranslation } from "react-i18next";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
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
  cookTime: z.string().optional(),
  servings: z.number().min(1, "Number of servings is required"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  ingredients: z.array(z.string()).min(1, "At least one ingredient is required"),
  instructions: z.string().min(1, "Instructions are required"),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
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
  const [, setLocation] = useLocation();
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
  
  // Meal plan state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  
  // Get tab parameter from URL if available, but always default to recipes tab
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<"recipes" | "meal-plan">(
    tabParam === "meal-plan" ? "meal-plan" : "recipes"
  );
  
  // Update activeTab when URL parameter changes
  useEffect(() => {
    if (tabParam === "meal-plan") {
      setActiveTab("meal-plan");
    } else if (tabParam === "recipes" || !tabParam) {
      setActiveTab("recipes");
    }
  }, [tabParam]);
  
  // Refresh recipes data when component mounts
  useEffect(() => {
    // Force refetch the latest recipe data when page loads
    queryClient.invalidateQueries({ queryKey: ["/api/recipes", "created"] });
    queryClient.invalidateQueries({ queryKey: ["/api/recipes", "saved"] });
  }, [queryClient]);
  
  // Level functionality removed

  const { data: createdRecipes, isLoading: isLoadingCreated } = useQuery({
    queryKey: ["/api/recipes", "created"],
    queryFn: async () => {
      const response = await fetch("/api/recipes?type=created");
      if (!response.ok) throw new Error("Failed to fetch created recipes");
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1, // Limit retries to reduce unnecessary requests
    refetchOnWindowFocus: false, // Disable refetching when window regains focus
    enabled: activeTab === "recipes", // Only fetch when on recipes tab
    refetchOnMount: true, // Always fetch when component mounts to ensure fresh data
    placeholderData: [], // Use empty array as placeholder to avoid undefined errors
  });

  const { data: savedRecipes, isLoading: isLoadingSaved } = useQuery({
    queryKey: ["/api/recipes", "saved"],
    queryFn: async () => {
      const response = await fetch("/api/recipes?type=saved");
      if (!response.ok) throw new Error("Failed to fetch saved recipes");
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1, // Limit retries to reduce unnecessary requests
    refetchOnWindowFocus: false, // Disable refetching when window regains focus
    enabled: activeTab === "recipes", // Only fetch when on recipes tab
    refetchOnMount: true, // Always fetch when component mounts to ensure fresh data
    placeholderData: [], // Use empty array as placeholder to avoid undefined errors
  });
  
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
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: activeTab === "meal-plan",
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: activeTab === "meal-plan",
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  
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
    if (allMealPlansData?.plans) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      const plan = allMealPlansData.plans.find(plan => plan.date === selectedDateStr);
      setSelectedPlan(plan || null);
      
      // If no plan exists for this date, show toast with option to generate
      if (!plan) {
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
  
  // Set selected plan when all plans data loads
  useEffect(() => {
    if (allMealPlansData?.plans && allMealPlansData.plans.length > 0) {
      // If today's date is selected, try to find today's meal plan
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const plan = allMealPlansData.plans.find(plan => plan.date === selectedDateStr);
      
      setSelectedPlan(plan || null);
    }
  }, [allMealPlansData, selectedDate]);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<CreateRecipeForm>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: {
      name: "",
      description: "",
      prepTime: "",
      cookTime: "",
      servings: 4,
      difficulty: "Medium",
      ingredients: [],
      instructions: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      isPublic: false
    }
  });

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
      setIngredients([]); // Clear ingredients array
      setNewIngredient("");
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
    // Ensure ingredients are included
    const recipeData = {
      ...data,
      ingredients: ingredients,
      // Parse prep time to number (in minutes)
      prepTime: parseInt(data.prepTime) || 0,
      cookTime: parseInt(data.cookTime || "0") || 0,
      totalTime: (parseInt(data.prepTime) || 0) + (parseInt(data.cookTime || "0") || 0),
      // Ensure nutrition values are numbers
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0
    };
    createRecipeMutation.mutate(recipeData);
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
    setLocation(`/recipes/${recipe.id}`);
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
      setLocation('/');
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
      <div className="flex items-center justify-center min-h-screen bg-[#0CC5BA]">
        <div className="bg-white/15 backdrop-blur-md rounded-full p-5">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      </div>
    );
  }

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
    
      <div className="max-w-[600px] mx-auto relative z-10 pt-4 px-4">
        {/* Keep the header part from original design */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full bg-white/60 backdrop-blur-md border-b border-white/10 p-4 rounded-xl mb-6"
        >
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent truncate"
              >
                {t('recipes.welcomeBack')} {username}!
              </motion.h1>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-2"
              >

                <span className="text-sm sm:text-base text-gray-500 truncate">
                  {t('recipes.discover')}
                </span>
              </motion.div>
            </div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative group"
              ref={dropdownRef}
            >
              <div className="relative">
                <button
                  className="w-12 h-12 rounded-full bg-[#0CC5BA] flex items-center justify-center text-white text-xl font-semibold hover:bg-[#0CC5BA]/90 transition-colors overflow-hidden"
                  onClick={() => setLocation('/profile')}
                >
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </button>

              </div>
            </motion.div>
          </div>
        </motion.header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="pb-24"
        >
          {/* Redesigned Scan Ingredients Card */}
          {/* Tab navigation */}
          <Tabs
            defaultValue="recipes"
            value={activeTab}
            onValueChange={(value) => {
              if (value === "recipes" || value === "meal-plan") {
                setActiveTab(value);
              }
            }}
            className="w-full mb-8"
          >
            <TabsList className="grid w-full grid-cols-2 mb-2 bg-gray-100 rounded-xl p-1">
              <TabsTrigger value="recipes" className="text-base font-medium py-2 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {t('navigation.recipes', 'Recipes')}
              </TabsTrigger>
              <TabsTrigger value="meal-plan" className="text-base font-medium py-2 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {t('navigation.mealPlan', 'Meal Plan')}
              </TabsTrigger>
            </TabsList>
            

            
            <TabsContent value="recipes">
              {/* Scan ingredients card */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-xl p-6 mb-8 relative overflow-hidden"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#0CC5BA]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-[#0CC5BA]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{t('recipes.aIPoweredCreator')}</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    {t('recipes.takePhoto')}
                  </p>
                  
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setLocation('/scan-recipe')}
                      className="py-8 px-12 bg-gradient-to-r from-[#0CC5BA] to-[#0C9CCC] text-white rounded-2xl font-semibold text-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center"
                    >
                      <Camera className="w-6 h-6 mr-3" />
                      {t('recipes.scanIngredients')}
                    </Button>
                  </div>
                </div>
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
                    <div className="bg-[#0CC5BA]/10 p-2 rounded-full">
                      <Utensils className="h-5 w-5 text-[#0CC5BA]" />
                    </div>
                    <h2 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent ml-2">
                      {t('recipes.yourRecipes')}
                    </h2>
                  </div>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    size="sm"
                    className="bg-gradient-to-r from-[#0CC5BA] to-[#0C9CCC] text-white hover:shadow-md transition-all"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Recipe
                  </Button>
                </div>

                {/* Display recipes with new styling or skeletons while loading */}
                {isLoadingCreated ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="animate-pulse">
                          <div className="h-40 bg-gray-200 w-full" />
                          <div className="p-4 space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-3/4" />
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="flex gap-2 pt-1">
                              <div className="h-6 w-6 rounded-full bg-gray-200" />
                              <div className="h-6 w-6 rounded-full bg-gray-200" />
                              <div className="h-6 w-6 rounded-full bg-gray-200" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : createdRecipes && createdRecipes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {getFilteredRecipes(createdRecipes).map((recipe) => (
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
                    
                    {getFilteredRecipes(createdRecipes).length === 0 && (
                      <div className="col-span-1 sm:col-span-2 text-center py-8 text-gray-500">
                        <p>No matching recipes found. Try adjusting your filters or create a new recipe!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{t('recipes.noRecipesYet')}</h3>
                    <p className="text-gray-500 mb-6">{t('recipes.startCulinaryJourney')}</p>
                    {/* Buttons removed as requested */}
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
                    <div className="bg-blue-500/10 p-2 rounded-full">
                      <Heart className="h-5 w-5 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
                      {t('recipes.savedFavorites')}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {getFilteredRecipes(savedRecipes).map((recipe) => (
                      <EnhancedRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onClick={handleRecipeClick}
                      />
                    ))}
                    
                    {getFilteredRecipes(savedRecipes).length === 0 && (
                      <div className="col-span-1 sm:col-span-2 text-center py-8 text-gray-500">
                        <p>No matching saved recipes found with your current filters.</p>
                      </div>
                    )}
                  </div>
                </motion.section>
              )}
            </TabsContent>

            <TabsContent value="meal-plan">
              {/* Meal Plan Content */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-xl p-6 mb-8"
              >
                {/* Calendar Date Selector */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <CalendarDays className="w-6 h-6 mr-2 text-[#0CC5BA]" />
                    {t('mealPlan.selectDate', 'Select Date')}
                  </h2>
                  <div className="flex overflow-x-auto pb-2 gap-2">
                    {calendarDates.map((date, index) => {
                      const isSelected = 
                        selectedDate && 
                        date.getDate() === selectedDate.getDate() && 
                        date.getMonth() === selectedDate.getMonth();
                      
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const hasPlan = allMealPlansData?.plans?.some(p => p.date === dateStr);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleDateSelect(date)}
                          className={`flex flex-col items-center justify-center p-2 min-w-[60px] rounded-xl transition-all ${
                            isSelected
                              ? 'bg-[#0CC5BA] text-white'
                              : hasPlan
                              ? 'bg-[#0CC5BA]/10 text-[#0CC5BA]'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <span className="text-xs font-medium">
                            {format(date, 'EEE')}
                          </span>
                          <span className={`text-lg font-bold ${isSelected ? 'text-white' : ''}`}>
                            {format(date, 'd')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Today's Meals or Selected Day's Meals */}
                {isAllPlansLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0CC5BA]" />
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
                    
                    {/* Add debug logging for the meals */}
                    {console.log("Recipe.tsx - Meals:", selectedPlan.meals.map(m => ({
                      id: m.id, 
                      name: m.name,
                      mealType: m.mealType
                    })))}
                    
                    {/* Handle distribution of "snack" types for proper display */}
                    {(() => {
                      // Find any meals with generic "snack" type
                      const snackMeals = selectedPlan.meals.filter(m => 
                        m.mealType.toLowerCase() === "snack"
                      );
                      
                      if (snackMeals.length > 0) {
                        console.log(`Found ${snackMeals.length} generic snack meals to distribute in Recipes.tsx`);
                        
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
                      
                      return null;
                    })()}
                    
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
                        {selectedPlan.meals
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
                              onClick={() => setLocation(`/recipes/${meal.id}`)}
                            />
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="afternoon">
                        {/* Afternoon meals (lunch + afternoon snack) */}
                        {selectedPlan.meals
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
                              onClick={() => setLocation(`/recipes/${meal.id}`)}
                            />
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="evening">
                        {/* Evening meals (dinner + evening snack if any) */}
                        {selectedPlan.meals
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
                              onClick={() => setLocation(`/recipes/${meal.id}`)}
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
                  <div className="bg-[#0CC5BA]/10 p-2 rounded-full">
                    <ShoppingBag className="h-5 w-5 text-[#0CC5BA]" />
                  </div>
                  <h2 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent ml-2">
                    {t('navigation.shoppingList', 'Shopping List')}
                  </h2>
                </div>
                
                <Card className="overflow-hidden rounded-3xl border-0 shadow-lg transition-all duration-300 group bg-white">
                  <div className="relative p-5 bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold leading-tight text-gray-900 group-hover:text-[#0CC5BA] transition-colors">
                          {t('shoppingList.weeklyTitle', 'Weekly Shopping List')}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {t('shoppingList.description', 'Your meal plan shopping items')}
                        </p>
                      </div>
                      <div className="h-12 w-12 flex items-center justify-center bg-gradient-to-br from-[#0CC5BA] to-[#0091ff] rounded-full shadow-lg">
                        <ShoppingBag className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <EmbeddedShoppingList />
                  </div>
                </Card>
              </motion.section>

              {/* Generate New Meal Plan button at the bottom */}
              <div className="flex flex-col gap-4 justify-center mb-6">
                <Button
                  onClick={() => setLocation('/meal-planning-quiz')}
                  className="w-full max-w-md py-5 bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <CalendarDays className="mr-2 h-5 w-5" />
                  {t('mealPlan.generateNew', 'Generate New Meal Plan')}
                </Button>
              </div>
            </TabsContent>


          </Tabs>
        </motion.main>
      </div>
      
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          // Reset form when dialog closes
          reset();
          setIngredients([]);
          setNewIngredient("");
        }
      }}>
        <DialogContent className="max-w-[480px] max-h-[85vh] overflow-hidden p-0 border-0 bg-transparent fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
          {/* Glassmorphism container */}
          <div className="relative bg-white/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-[#0CC5BA] to-[#0091ff] rounded-full blur-3xl opacity-20" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-3xl opacity-20" />
            
            <div className="relative z-10 p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] bg-clip-text text-transparent">
                  {t('recipes.createNewRecipe')}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6 max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
                {/* Recipe name with glassmorphism input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('recipes.name')}
                  </label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Grandma's Secret Pasta"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/70 transition-all placeholder:text-gray-400"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.name.message}</p>}
                </div>
                
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('recipes.description')}
                  </label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="What makes this recipe special?"
                    rows={2}
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/70 transition-all resize-none placeholder:text-gray-400"
                  />
                </div>
                
                {/* Time and Servings Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <label htmlFor="prepTime" className="block text-xs font-semibold text-gray-600 mb-1">
                      <Clock className="inline w-3 h-3 mr-1" />
                      {t('recipes.prepTime')}
                    </label>
                    <Input
                      id="prepTime"
                      {...register("prepTime")}
                      placeholder="15 mins"
                      className="bg-white/60 border-0 h-8 text-sm rounded-md"
                    />
                  </div>
                  
                  <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <label htmlFor="cookTime" className="block text-xs font-semibold text-gray-600 mb-1">
                      <Flame className="inline w-3 h-3 mr-1" />
                      Cook Time
                    </label>
                    <Input
                      id="cookTime"
                      {...register("cookTime")}
                      placeholder="30 mins"
                      className="bg-white/60 border-0 h-8 text-sm rounded-md"
                    />
                  </div>
                </div>
                
                {/* Servings and Difficulty */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <label htmlFor="servings" className="block text-xs font-semibold text-gray-600 mb-1">
                      <User className="inline w-3 h-3 mr-1" />
                      Servings
                    </label>
                    <Input
                      id="servings"
                      type="number"
                      {...register("servings", { valueAsNumber: true })}
                      placeholder="4"
                      className="bg-white/60 border-0 h-8 text-sm rounded-md"
                    />
                  </div>
                  
                  <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <label htmlFor="difficulty" className="block text-xs font-semibold text-gray-600 mb-1">
                      <Settings className="inline w-3 h-3 mr-1" />
                      Difficulty
                    </label>
                    <select 
                      id="difficulty"
                      {...register("difficulty")}
                      className="w-full h-8 px-2 rounded-md bg-white/60 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/50"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
                
                {/* Nutrition Info with gradient background */}
                <div className="bg-gradient-to-r from-[#0CC5BA]/10 to-[#0091ff]/10 rounded-lg p-4 border border-white/20">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <Heart className="inline w-4 h-4 mr-1" />
                    Nutrition Info (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Input
                        type="number"
                        {...register("calories", { valueAsNumber: true })}
                        placeholder="Calories"
                        className="bg-white/70 border-white/50 h-9 text-sm pl-8"
                      />
                      <Flame className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        {...register("protein", { valueAsNumber: true })}
                        placeholder="Protein (g)"
                        className="bg-white/70 border-white/50 h-9 text-sm"
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        {...register("carbs", { valueAsNumber: true })}
                        placeholder="Carbs (g)"
                        className="bg-white/70 border-white/50 h-9 text-sm"
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        {...register("fat", { valueAsNumber: true })}
                        placeholder="Fat (g)"
                        className="bg-white/70 border-white/50 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Ingredients Section with glassmorphism */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <ShoppingBag className="inline w-4 h-4 mr-1" />
                    {t('recipes.ingredients')}
                  </label>
                  <div className="space-y-2 bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    {ingredients.map((ingredient, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 bg-white/70 backdrop-blur-sm rounded-md px-3 py-2 text-sm">
                          {ingredient}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveIngredient(index)}
                          className="hover:bg-red-100/50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </motion.div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Input
                        value={newIngredient}
                        onChange={(e) => setNewIngredient(e.target.value)}
                        placeholder={t('recipes.ingredientPlaceholder') || "e.g., 2 cups flour"}
                        className="bg-white/70 border-white/50 text-sm"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddIngredient();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleAddIngredient}
                        className="bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] text-white hover:shadow-md"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {ingredients.length === 0 && errors.ingredients && (
                    <p className="text-red-500 text-xs mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.ingredients.message}</p>
                  )}
                </div>
                
                {/* Instructions with glassmorphism */}
                <div>
                  <label htmlFor="instructions" className="block text-sm font-semibold text-gray-700 mb-2">
                    <Sparkles className="inline w-4 h-4 mr-1" />
                    {t('recipes.instructions')}
                  </label>
                  <Textarea
                    id="instructions"
                    {...register("instructions")}
                    placeholder={t('recipes.instructionsPlaceholder') || "1. First step..."}
                    rows={4}
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/70 transition-all resize-none placeholder:text-gray-400"
                  />
                  {errors.instructions && <p className="text-red-500 text-xs mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.instructions.message}</p>}
                </div>
                
                {/* Buttons with gradient styling */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateModal(false)}
                    className="hover:bg-white/30"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createRecipeMutation.isPending}
                    className="bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] text-white hover:shadow-lg transition-all min-w-[120px]"
                  >
                    {createRecipeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('recipes.creating')}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('recipes.createRecipe')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
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
    </div>
  );
}