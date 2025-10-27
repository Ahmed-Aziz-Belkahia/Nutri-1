import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  Heart, 
  Activity, 
  Utensils, 
  Clock,
  Apple,
  Globe,
  DollarSign,
  Pizza,
  ChefHat,
  Flame,
  Dumbbell,
  Salad,
  Loader2,
  Sparkles,
  CheckCircle,
  Check,
  Target,
  Zap,
  Plus,
  Minus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import MealPlanGenerationProgress from "@/components/MealPlanGenerationProgress";

// Form types
interface MealPlanPreferencesForm {
  dietaryType: string;
  // Allow both string and array for flexibility with UI components using text input or multi-select
  healthGoals: string | string[];
  activityLevel: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies: string[];
  maxCookingTime: number;
  budgetPreference: string;
  cuisinePreferences: string | string[];
  preferredIngredients: string[];
  excludedIngredients: string[];
  cookingSkillLevel: string;
  mealPlanDuration: string;
  weekdayVsWeekend: string;
  cookingEquipment: string[];
  specialRequirements?: string;
}

const getQuestions = (t: Function) => [
  {
    id: "dietaryType",
    title: "What is your eating style?",
    description: "Choose your preferred diet type",
    type: "select",
    icon: <Utensils className="w-6 h-6" />,
    color: "from-green-400 to-emerald-600"
  },
  {
    id: "healthGoals",
    title: "What are your health goals?",
    description: "Lub dodaj własne, aby było bardziej spersonalizowane",
    type: "select_with_input",
    icon: <Target className="w-6 h-6" />,
    color: "from-blue-400 to-cyan-600",
    popularOptions: [
      { value: "schudnąć", label: "Schudnąć" },
      { value: "przytyć_mięśnie", label: "Przytyć mięśnie" }
    ]
  },
  {
    id: "calorieTarget",
    title: "Dzienne zapotrzebowanie kaloryczne",
    description: "Ile kalorii dziennie?",
    type: "number",
    icon: <Activity className="w-6 h-6" />,
    color: "from-purple-400 to-purple-600"
  },
  {
    id: "cuisinePreferences",
    title: "Ulubione kuchnie",
    description: "Lub dodaj własne, aby było bardziej spersonalizowane",
    type: "select_with_input",
    icon: <Globe className="w-6 h-6" />,
    color: "from-pink-400 to-rose-600",
    popularOptions: [
      { value: "włoska", label: "Włoska" },
      { value: "azjatycka", label: "Azjatycka" }
    ]
  },
  {
    id: "allergies",
    title: "Alergie lub ograniczenia",
    description: "Lub dodaj własne, aby było bardziej spersonalizowane",
    type: "select_with_input",
    icon: <ChefHat className="w-6 h-6" />,
    color: "from-indigo-400 to-blue-600",
    popularOptions: [
      { value: "nietolerancja_laktozy", label: "Nietolerancja laktozy" },
      { value: "bezglutenowe", label: "Bezglutenowe" }
    ]
  }
];

export default function MealPlanningQuiz() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['translation', 'mealPlanningQuiz']);
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);
  const isSubmittingRef = useRef(false);

  // Fetch user nutrition preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['userNutritionPreferences'],
    queryFn: async () => {
      const response = await fetch('/api/user-nutrition-preferences');
      if (!response.ok) return null;
      return response.json();
    },
    retry: false
  });

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<MealPlanPreferencesForm>({
    defaultValues: {
      dietaryType: "omnivore",
  healthGoals: "schudnąć",
      activityLevel: "moderate",
      calorieTarget: 2000,
      mealsPerDay: 3,
      allergies: [],
      maxCookingTime: 60,
      budgetPreference: "medium",
  cuisinePreferences: "polskie",
      preferredIngredients: [],
      excludedIngredients: [],
      cookingSkillLevel: "intermediate",
      mealPlanDuration: "week",
      weekdayVsWeekend: "same",
      cookingEquipment: ["stove", "oven"],
    },
  });

  // Update form values when user preferences load
  useEffect(() => {
    if (userPreferences) {
      setValue('dietaryType', userPreferences.dietaryRestrictions?.[0] || 'omnivore');
      setValue('calorieTarget', userPreferences.caloriesGoal || 2000);
      setValue('mealsPerDay', userPreferences.mealsPerDay || 3);
    }
  }, [userPreferences, setValue]);

  const questions = getQuestions(t);
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit(onSubmit)();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setLocation("/dashboard");
    }
  };

  const saveMealPlanPreferences = useMutation({
    mutationFn: async (data: MealPlanPreferencesForm) => {
      // Prevent double submission
      if (isSubmittingRef.current) {
        console.log('[Meal Plan Quiz] Already submitting, ignoring duplicate request');
        throw new Error('Already submitting');
      }
      
      isSubmittingRef.current = true;
      
      try {
        const preferencesResponse = await fetch("/api/user/dietary-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!preferencesResponse.ok) {
          throw new Error("Failed to save preferences");
        }

        const preferences = await preferencesResponse.json();
        setIsGeneratingMealPlan(true);

        const mealPlanResponse = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!mealPlanResponse.ok) {
          throw new Error("Failed to create meal plan");
        }

        const mealPlan = await mealPlanResponse.json();
        return { preferences, mealPlan };
      } catch (error) {
        console.error("Meal plan creation error:", error);
        setIsGeneratingMealPlan(false);
        isSubmittingRef.current = false;
        throw error;
      }
    },
    onSuccess: async () => {
      setIsGeneratingMealPlan(false);
      isSubmittingRef.current = false;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/today"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/all"] })
      ]);
      
      toast({
        title: "Success!",
        description: "Your meal plan has been created!",
      });
      
      // Wait for queries to refetch before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      setLocation("/");
    },
    onError: (error) => {
      setIsGeneratingMealPlan(false);
      isSubmittingRef.current = false;
      const errorMessage = error instanceof Error ? error.message : "Failed to save preferences";
      
      // Don't show error toast for duplicate submission
      if (errorMessage === 'Already submitting') {
        return;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  const onSubmit = async (data: MealPlanPreferencesForm) => {
    await saveMealPlanPreferences.mutateAsync(data);
  };

  const isCurrentStepValid = () => {
    const questionId = currentQuestion.id;
    const formValues = watch();
    
    switch (questionId) {
      case "dietaryType":
        return !!formValues.dietaryType;
      case "healthGoals":
        return !!formValues.healthGoals && (
          (typeof formValues.healthGoals === 'string' && formValues.healthGoals.trim().length > 0) ||
          (Array.isArray(formValues.healthGoals) && formValues.healthGoals.length > 0)
        );
      case "calorieTarget":
        return !!formValues.calorieTarget && formValues.calorieTarget > 0;
      case "cuisinePreferences":
        return !!formValues.cuisinePreferences && typeof formValues.cuisinePreferences === 'string' && formValues.cuisinePreferences.trim().length > 0;
      case "allergies":
        return true; // Optional field
      default:
        return true;
    }
  };

  const renderQuestionContent = () => {
    const questionId = currentQuestion.id;

    switch (currentQuestion.type) {
      case "select":
        if (questionId === "dietaryType") {
          const popularOptions = [
            { value: "omnivore", label: "Omniwor", description: "Jem wszystko" },
            { value: "vegetarian", label: "Vegetarian", description: "No meat" },
            { value: "vegan", label: "Vegan", description: "Plant-based only" },
            { value: "keto", label: "Ketogenic", description: "Low carb" },
            { value: "paleo", label: "Paleo", description: "Natural products" },
            { value: "mediterranean", label: "Mediterranean", description: "Healthy fats" },
          ];

          return (
            <Controller
              control={control}
              name="dietaryType"
              render={({ field }) => (
                <div className="space-y-4">
                  {/* Popular Options as Tags */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Popularne opcje:</h4>
                    <div className="flex flex-wrap gap-2">
                      {popularOptions.map((option) => (
                        <motion.button
                          key={option.value}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => field.onChange(field.value === option.value ? '' : option.value)}
                          className={`relative px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300 transform ${
                            field.value === option.value
                              ? 'bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] text-white shadow-lg shadow-[#0CC5BA]/30'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <span className="relative z-10">{option.label}</span>
                          {field.value === option.value && (
                            <motion.div
                              layoutId="activeTag"
                              className="absolute inset-0 bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] rounded-2xl"
                              initial={false}
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Input */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Lub wpisz własną opcję:</h4>
                    <div className="relative">
                      <Input
                        placeholder="Np. bezglutenowa, diabetyczna, sportowa..."
                        value={popularOptions.some(opt => opt.value === field.value) ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full px-4 py-3 text-sm rounded-2xl border-2 border-gray-200 focus:border-[#0CC5BA] focus:ring-2 focus:ring-[#0CC5BA]/20 bg-white shadow-sm hover:shadow-md transition-all duration-200 font-medium placeholder:text-gray-400"
                      />
                      {!popularOptions.some(opt => opt.value === field.value) && field.value && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#0CC5BA]/5 to-[#0CBACC]/5 pointer-events-none" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          );
        }

  if (questionId === "activityLevel") {
          const options = [
            { value: "sedentary", label: "Sedentary", description: "Little to no exercise" },
            { value: "moderate", label: "Moderate", description: "Regular exercise" },
            { value: "active", label: "Active", description: "Very active lifestyle" },
          ];

          return (
            <Controller
              control={control}
              name="activityLevel"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-3">
                  {options.map((option) => (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => field.onChange(option.value)}
                      className={`p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                        field.value === option.value
                          ? 'border-[#0CC5BA] bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CC5BA]/5 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 text-lg">{option.label}</h3>
                          <p className="text-sm text-gray-500">{option.description}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          field.value === option.value
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                            : 'border-gray-300'
                        }`}>
                          {field.value === option.value && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            />
          );
        }

    if (questionId === "cookingSkillLevel") {
          const options = [
            { value: "beginner", label: "Beginner", description: "Simple recipes" },
            { value: "intermediate", label: "Intermediate", description: "Most cooking methods" },
          ];

          return (
            <Controller
              control={control}
              name="cookingSkillLevel"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-3">
                  {options.map((option) => (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => field.onChange(option.value)}
                      className={`p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                        field.value === option.value
                          ? 'border-[#0CC5BA] bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CC5BA]/5 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 text-lg">{option.label}</h3>
                          <p className="text-sm text-gray-500">{option.description}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          field.value === option.value
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                            : 'border-gray-300'
                        }`}>
                          {field.value === option.value && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            />
          );
        }
        break;

      case "multiselect":
        if (questionId === "healthGoals") {
          const options = [
            { value: "weight_loss", label: "Weight Loss", description: "Lose weight healthily" },
            { value: "muscle_gain", label: "Muscle Gain", description: "Build lean muscle" },
            { value: "maintenance", label: "Maintenance", description: "Maintain current weight" },
          ];

          return (
            <Controller
              control={control}
              name="healthGoals"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-3">
                  {options.map((option) => {
        const values = Array.isArray(field.value) ? field.value : [];
        const isSelected = values.includes(option.value);
                    
                    return (
                      <motion.div
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
          const currentValues = Array.isArray(field.value) ? field.value : [];
                          if (isSelected) {
                            field.onChange(currentValues.filter(v => v !== option.value));
                          } else {
                            field.onChange([...currentValues, option.value]);
                          }
                        }}
                        className={`p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                          isSelected
                            ? 'border-[#0CC5BA] bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CC5BA]/5 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-lg">{option.label}</h3>
                            <p className="text-sm text-gray-500">{option.description}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            />
          );
        }

        if (questionId === "cuisinePreferences") {
          const options = [
            { value: "italian", label: "Italian", description: "Pizza, pasta, risotto" },
            { value: "american", label: "American", description: "Classic comfort food" },
            { value: "asian", label: "Asian", description: "Stir-fries, rice, noodles" },
            { value: "mediterranean", label: "Mediterranean", description: "Healthy, fresh, olive oil" },
          ];

      return (
            <Controller
              control={control}
              name="cuisinePreferences"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-3">
                  {options.map((option) => {
        const values = Array.isArray(field.value) ? field.value : [];
        const isSelected = values.includes(option.value);
                    
                    return (
                      <motion.div
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
          const currentValues = Array.isArray(field.value) ? field.value : [];
                          if (isSelected) {
                            field.onChange(currentValues.filter(v => v !== option.value));
                          } else {
                            field.onChange([...currentValues, option.value]);
                          }
                        }}
                        className={`p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                          isSelected
                            ? 'border-[#0CC5BA] bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CC5BA]/5 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-lg">{option.label}</h3>
                            <p className="text-sm text-gray-500">{option.description}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            />
          );
        }
        break;

      case "counter":
        if (questionId === "mealsPerDay") {
          return (
            <Controller
              control={control}
              name="mealsPerDay"
              render={({ field }) => (
                <div className="text-center space-y-6">
                  <div className="bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 rounded-3xl p-8">
                    <div className="text-6xl font-bold text-[#0CC5BA] mb-2">
                      {field.value}
                    </div>
                    <div className="text-gray-600 text-lg">meals per day</div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-6">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => field.onChange(Math.max(1, field.value - 1))}
                      className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                      disabled={field.value <= 1}
                    >
                      <Minus className="w-5 h-5 text-gray-600" />
                    </motion.button>
                    
                    <div className="flex-1 max-w-xs">
                      <div className="grid grid-cols-6 gap-2">
                        {[1, 2, 3, 4, 5, 6].map(count => (
                          <motion.button
                            key={count}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => field.onChange(count)}
                            className={`aspect-square rounded-2xl text-sm font-medium transition-all duration-200 ${
                              field.value === count
                                ? 'bg-[#0CC5BA] text-white shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {count}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => field.onChange(Math.min(6, field.value + 1))}
                      className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                      disabled={field.value >= 6}
                    >
                      <Plus className="w-5 h-5 text-gray-600" />
                    </motion.button>
                  </div>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    {field.value >= 1 && <div>✓ Breakfast, Lunch, Dinner</div>}
                    {field.value >= 4 && <div>✓ + Morning Snack</div>}
                    {field.value >= 5 && <div>✓ + Afternoon Snack</div>}
                    {field.value >= 6 && <div>✓ + Evening Snack</div>}
                  </div>
                </div>
              )}
            />
          );
        }
        break;

      case "select_with_input":
    if (questionId === "healthGoals") {
          // Get current weight goal from user preferences
          const getCurrentWeightGoal = () => {
            if (!userPreferences) return null;
            
            // Check current vs goal weight to determine the correct goal
            const currentWeight = parseFloat(userPreferences.currentWeight || "0");
            const goalWeight = parseFloat(userPreferences.goalWeight || "0");
            
            if (goalWeight > currentWeight) {
              return "przytyć";
            } else if (goalWeight < currentWeight) {
              return "schudnąć";
            } else {
              return "utrzymać obecną wagę";
            }
          };

          const currentGoal = getCurrentWeightGoal();

          return (
            <Controller
              control={control}
      // Cast dynamic name to satisfy RHF generic constraints
      name={questionId as keyof MealPlanPreferencesForm as any}
              render={({ field }) => {
                const [agreed, setAgreed] = useState(false);
                const [customGoal, setCustomGoal] = useState("");

                return (
                  <div className="space-y-4">
                    {/* Current Goal Display */}
                    {currentGoal && (
                      <div className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-lg">
                        <div className="text-center mb-5">
                          <h4 className="text-sm font-medium text-gray-500 mb-3">
                            Your current health goal:
                          </h4>
                          <div className="inline-flex items-center px-6 py-4 bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CBACC]/10 rounded-2xl border-2 border-[#0CC5BA]/20">
                            <span className="text-xl font-semibold text-[#0CC5BA]">{currentGoal}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => {
                              setAgreed(true);
                              field.onChange(currentGoal);
                            }}
                            className={`flex-1 py-4 px-4 rounded-2xl font-medium transition-all duration-200 ${
                              agreed && !customGoal
                                ? 'bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] text-white border-2 border-transparent shadow-lg shadow-[#0CC5BA]/20'
                                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0CC5BA]/30 hover:bg-gray-50'
                            }`}
                          >
                            <span>Zgadzam się</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => {
                              setAgreed(false);
                              setCustomGoal("");
                            }}
                            className={`flex-1 py-4 px-4 rounded-2xl font-medium transition-all duration-200 ${
                              !agreed || customGoal
                                ? 'bg-white text-gray-700 border-2 border-gray-300 hover:border-[#0CC5BA]/30 hover:bg-gray-50'
                                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0CC5BA]/30 hover:bg-gray-50'
                            }`}
                          >
                            <span>Zmienię</span>
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Custom Goal Input */}
                    {(!agreed || !currentGoal) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="relative">
                          <Input
                            value={customGoal}
                            onChange={(e) => {
                              setCustomGoal(e.target.value);
                              field.onChange(e.target.value);
                            }}
                            placeholder="Wpisz swój cel zdrowotny..."
                            className="text-base p-4 rounded-2xl border-2 border-gray-200 focus:border-[#0CC5BA] focus:ring-2 focus:ring-[#0CC5BA]/20 bg-white placeholder:text-gray-400 transition-all duration-200"
                          />
                        </div>
                        {customGoal && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-gradient-to-r from-[#0CC5BA]/5 to-[#0CBACC]/5 border-2 border-[#0CC5BA]/20 rounded-2xl"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#0CC5BA] flex items-center justify-center mt-0.5">
                                <span className="text-white text-xs font-medium">✓</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-1">Nowy cel zdrowotny:</div>
                                <div className="text-base text-gray-900 font-medium">"{customGoal}"</div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              }}
            />
          );
        }

        // Original logic for other select_with_input questions
    const popularOptions = currentQuestion.popularOptions || [] as Array<{ value: string; label: string }>;
        return (
          <Controller
            control={control}
      // Cast dynamic name
      name={questionId as keyof MealPlanPreferencesForm as any}
            render={({ field }) => {
              const [customValue, setCustomValue] = useState("");
              const [selectedType, setSelectedType] = useState("popular"); // "popular" or "custom"
              
              const handlePopularSelect = (value: string) => {
                setSelectedType("popular");
                field.onChange(value);
                setCustomValue("");
              };
              
              const handleCustomInput = (value: string) => {
                setSelectedType("custom");
                setCustomValue(value);
                field.onChange(value);
              };
              
              return (
                <div className="space-y-4">
                  {/* Popular Options */}
                  <div className="grid grid-cols-1 gap-3">
                    {popularOptions.map((option) => (
                      <motion.div
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePopularSelect(option.value)}
                        className={`p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                          selectedType === "popular" && field.value === option.value
                            ? 'border-[#0CC5BA] bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CC5BA]/5 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-lg">{option.label}</h3>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedType === "popular" && field.value === option.value
                              ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                              : 'border-gray-300'
                          }`}>
                            {selectedType === "popular" && field.value === option.value && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Custom Input */}
                  <div className="relative mt-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <span className="px-4 text-sm font-medium text-gray-500 bg-gradient-to-br from-gray-50 via-white to-blue-50">
                        {currentQuestion.description}
                      </span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className={`p-4 rounded-3xl border-2 transition-all duration-300 ${
                        selectedType === "custom" && customValue
                          ? 'border-[#0CC5BA] bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CC5BA]/5 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Input
                            value={customValue}
                            onChange={(e) => handleCustomInput(e.target.value)}
                            placeholder="Wpisz swoją spersonalizowaną odpowiedź tutaj..."
                            className="border-0 p-0 text-base font-medium text-gray-800 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                          />
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          selectedType === "custom" && customValue
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                            : 'border-gray-300'
                        }`}>
                          {selectedType === "custom" && customValue && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              );
            }}
          />
        );

      case "text":
        return (
          <Controller
            control={control}
            name={questionId as keyof MealPlanPreferencesForm as any}
            render={({ field }) => (
              <Input
                {...field}
                placeholder={currentQuestion.description}
                className="text-base p-4 rounded-xl border-2 border-gray-200 focus:border-[#0CC5BA] bg-white"
              />
            )}
          />
        );

      case "number":
        if (questionId === "calorieTarget") {
          return (
            <Controller
              control={control}
              name={questionId as keyof MealPlanPreferencesForm as any}
              render={({ field }) => (
                <div className="space-y-4">
                  {/* Current Macro Goals */}
                  {userPreferences && (
                    <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-5 border border-gray-200/50 shadow-lg shadow-gray-100/30">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">Your current macro goals:</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl p-3 text-center border border-purple-500/20">
                          <div className="text-xl font-bold text-purple-600 mb-1">{userPreferences.caloriesGoal || 2000}</div>
                          <div className="text-xs font-medium text-gray-600">Calories</div>
                        </div>
                        <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-2xl p-3 text-center border border-pink-500/20">
                          <div className="text-xl font-bold text-pink-600 mb-1">
                            {Math.round(((userPreferences.caloriesGoal || 2000) * (userPreferences.proteinGoal || 30) / 100) / 4)}g
                          </div>
                          <div className="text-xs font-medium text-gray-600">Protein</div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl p-3 text-center border border-emerald-500/20">
                          <div className="text-xl font-bold text-emerald-600 mb-1">
                            {Math.round(((userPreferences.caloriesGoal || 2000) * (userPreferences.carbsGoal || 40) / 100) / 4)}g
                          </div>
                          <div className="text-xs font-medium text-gray-600">Carbs</div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-2xl p-3 text-center border border-amber-500/20">
                          <div className="text-xl font-bold text-amber-600 mb-1">
                            {Math.round(((userPreferences.caloriesGoal || 2000) * (userPreferences.fatGoal || 30) / 100) / 9)}g
                          </div>
                          <div className="text-xs font-medium text-gray-600">Fat</div>
                        </div>
                      </div>
                      
                      {/* Weight Goal Explanation */}
                      <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="text-xs font-medium text-blue-800 text-center">
                          {userPreferences.weightGoal === 'gain' || userPreferences.goalWeight > userPreferences.currentWeight ? (
                            <span>To gain weight, eat more protein (builds muscle) and increase calories!</span>
                          ) : userPreferences.weightGoal === 'loss' || userPreferences.goalWeight < userPreferences.currentWeight ? (
                            <span>To lose weight, maintain high protein intake (protects muscle) and reduce calories!</span>
                          ) : (
                            <span>To maintain weight, keep balanced macros and stable calories!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Calorie Input */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Dostosuj cele kaloryczne:</h4>
                    <div className="relative">
                      <Input
                        {...field}
                        type="number"
                        placeholder={userPreferences?.caloriesGoal?.toString() || "2000"}
                        className="text-lg font-semibold p-4 rounded-2xl border-2 border-gray-200 focus:border-[#0CC5BA] focus:ring-2 focus:ring-[#0CC5BA]/20 bg-white text-center shadow-sm hover:shadow-md transition-all duration-200"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-400">
                        kcal
                      </div>
                    </div>
                  </div>
                </div>
              )}
            />
          );
        }
        
        return (
          <Controller
            control={control}
            name={questionId as keyof MealPlanPreferencesForm as any}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                placeholder="2000"
                className="text-base p-4 rounded-xl border-2 border-gray-200 focus:border-[#0CC5BA] bg-white text-center"
              />
            )}
          />
        );

      default:
        return null;
    }
  };

  if (isGeneratingMealPlan) {
    return <MealPlanGenerationProgress />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0CC5BA]/5 to-blue-500/5" />
        <div className="relative px-6 py-4">
          <div className="max-w-lg mx-auto">
            {/* Back button and progress */}
            <div className="flex items-center justify-between mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>
              
              <div className="text-sm font-medium text-gray-500">
                {currentStep + 1} z {questions.length}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <motion.div
                className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Question header */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-4"
            >
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${currentQuestion.color} flex items-center justify-center shadow-lg`}>
                <div className="text-white">
                  {currentQuestion.icon}
                </div>
              </div>
              
              <h1 className="text-xl font-bold text-gray-800 mb-2">
                {currentQuestion.title}
              </h1>
              <p className="text-gray-600 text-sm">
                {currentQuestion.description}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        <div className="max-w-lg mx-auto">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-transparent mb-6"
          >
            {renderQuestionContent()}
          </motion.div>

          {/* Navigation buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleNext}
              disabled={!isCurrentStepValid()}
              className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90 text-white py-3 rounded-2xl text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Stwórz Mój Plan Żywieniowy
                </>
              ) : (
                <>
                  Dalej
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}