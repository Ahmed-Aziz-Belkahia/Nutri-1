import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  Utensils, 
  Target,
  Globe,
  ChefHat,
  Sparkles,
  Check,
  Plus,
  Minus,
  Flame
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import MealPlanGenerationProgress from "@/components/MealPlanGenerationProgress";

// Form types
interface MealPlanPreferencesForm {
  dietaryType: string;
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

const getQuestions = () => [
  {
    id: "dietaryType",
    title: "What's your eating style?",
    description: "Choose your preferred diet type",
    type: "select",
    icon: <Utensils className="w-6 h-6" />,
    gradient: "from-[#0CC5BA] to-[#0AA59C]"
  },
  {
    id: "healthGoals",
    title: "What are your health goals?",
    description: "Or add your own for personalization",
    type: "select_with_input",
    icon: <Target className="w-6 h-6" />,
    gradient: "from-[#26A8FF] to-[#1E96E8]"
  },
  {
    id: "calorieTarget",
    title: "Daily Calorie Target",
    description: "How many calories per day?",
    type: "number",
    icon: <Flame className="w-6 h-6" />,
    gradient: "from-[#FF6B6B] to-[#EE5A5A]"
  },
  {
    id: "cuisinePreferences",
    title: "Favorite Cuisines",
    description: "Or add your own for personalization",
    type: "select_with_input",
    icon: <Globe className="w-6 h-6" />,
    gradient: "from-[#A855F7] to-[#9333EA]"
  },
  {
    id: "allergies",
    title: "Allergies or Restrictions",
    description: "Select all that apply",
    type: "select_with_input",
    icon: <ChefHat className="w-6 h-6" />,
    gradient: "from-[#F59E0B] to-[#D97706]"
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

  const { control, handleSubmit, setValue, watch } = useForm<MealPlanPreferencesForm>({
    defaultValues: {
      dietaryType: "omnivore",
      healthGoals: "lose_weight",
      activityLevel: "moderate",
      calorieTarget: 2000,
      mealsPerDay: 3,
      allergies: [],
      maxCookingTime: 60,
      budgetPreference: "medium",
      cuisinePreferences: "italian",
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

  const questions = getQuestions();
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      if (saveMealPlanPreferences.isPending || isGeneratingMealPlan || isSubmittingRef.current) {
        return;
      }
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
      if (isSubmittingRef.current) {
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
          const errorData = await mealPlanResponse.json();
          
          if (mealPlanResponse.status === 409) {
            return { preferences, mealPlan: { alreadyInProgress: true } };
          }
          
          throw new Error(errorData.message || "Failed to create meal plan");
        }

        const mealPlan = await mealPlanResponse.json();
        return { preferences, mealPlan };
      } catch (error) {
        setIsGeneratingMealPlan(false);
        isSubmittingRef.current = false;
        throw error;
      }
    },
    onSuccess: async () => {
      isSubmittingRef.current = false;
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/today"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/all"] })
      ]);
      
      let attempts = 0;
      const maxAttempts = 15;
      let plansReady = false;
      
      while (attempts < maxAttempts && !plansReady) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const response = await fetch('/api/meal-plans/all', { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            if (data.plans && data.plans.length > 0) {
              plansReady = true;
              break;
            }
          }
        } catch (error) {
          console.error('Poll failed:', error);
        }
      }
      
      await queryClient.refetchQueries({ 
        queryKey: ["/api/meal-plans/all"],
        type: 'active'
      });
      
      toast({
        title: "Success!",
        description: "Your meal plan has been created!",
      });
      
      setIsGeneratingMealPlan(false);
      setLocation("/meal-plan/view");
    },
    onError: (error) => {
      setIsGeneratingMealPlan(false);
      isSubmittingRef.current = false;
      const errorMessage = error instanceof Error ? error.message : "Failed to save preferences";
      
      if (errorMessage === 'Already submitting') return;
      
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
        return true;
      default:
        return true;
    }
  };

  const renderQuestionContent = () => {
    const questionId = currentQuestion.id;

    // Diet Type Selection
    if (questionId === "dietaryType") {
      const options = [
        { value: "omnivore", label: "Omnivore", emoji: "🍽️" },
        { value: "vegetarian", label: "Vegetarian", emoji: "🥗" },
        { value: "vegan", label: "Vegan", emoji: "🌱" },
        { value: "keto", label: "Keto", emoji: "🥑" },
        { value: "paleo", label: "Paleo", emoji: "🍖" },
        { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
      ];

      return (
        <Controller
          control={control}
          name="dietaryType"
          render={({ field }) => (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {options.map((option) => (
                  <motion.div
                    key={option.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => field.onChange(option.value)}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      field.value === option.value
                        ? 'bg-gradient-to-r from-[#0CC5BA]/20 to-[#0CC5BA]/10 border-2 border-[#0CC5BA]'
                        : 'bg-white/70 backdrop-blur-xl border border-white/60 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-sm font-medium text-gray-800">{option.label}</span>
                      {field.value === option.value && (
                        <Check className="w-4 h-4 text-[#0CC5BA] ml-auto" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Custom Input */}
              <Input
                placeholder="Or enter custom..."
                value={options.some(opt => opt.value === field.value) ? '' : field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="rounded-xl border border-gray-200 focus:border-[#0CC5BA] bg-white/70 text-sm h-10"
              />
            </div>
          )}
        />
      );
    }

    // Calorie Target
    if (questionId === "calorieTarget") {
      return (
        <Controller
          control={control}
          name="calorieTarget"
          render={({ field }) => (
            <div className="space-y-4">
              {/* Current Macros Card */}
              {userPreferences && (
                <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-md border border-white/60 overflow-hidden">
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 text-center">Current Macros</h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-2 text-center border border-purple-500/20">
                        <div className="text-lg font-bold text-purple-600">{userPreferences.caloriesGoal || 2000}</div>
                        <div className="text-[10px] font-medium text-gray-600">kcal</div>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-2 text-center border border-pink-500/20">
                        <div className="text-lg font-bold text-pink-600">
                          {Math.round(((userPreferences.caloriesGoal || 2000) * (userPreferences.proteinGoal || 30) / 100) / 4)}g
                        </div>
                        <div className="text-[10px] font-medium text-gray-600">Protein</div>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-2 text-center border border-emerald-500/20">
                        <div className="text-lg font-bold text-emerald-600">
                          {Math.round(((userPreferences.caloriesGoal || 2000) * (userPreferences.carbsGoal || 40) / 100) / 4)}g
                        </div>
                        <div className="text-[10px] font-medium text-gray-600">Carbs</div>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-2 text-center border border-amber-500/20">
                        <div className="text-lg font-bold text-amber-600">
                          {Math.round(((userPreferences.caloriesGoal || 2000) * (userPreferences.fatGoal || 30) / 100) / 9)}g
                        </div>
                        <div className="text-[10px] font-medium text-gray-600">Fat</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Calorie Input */}
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-md border border-white/60 p-4">
                <div className="flex items-center justify-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => field.onChange(Math.max(1000, (field.value || 2000) - 100))}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </motion.button>
                  
                  <div className="relative">
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 2000)}
                      className="text-center text-xl font-bold py-2 w-32 rounded-xl border-2 border-gray-200 focus:border-[#0CC5BA] bg-white"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kcal</div>
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => field.onChange(Math.min(5000, (field.value || 2000) + 100))}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </motion.button>
                </div>
                
                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[1500, 1800, 2000, 2500].map((cal) => (
                    <motion.button
                      key={cal}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => field.onChange(cal)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                        field.value === cal
                          ? 'bg-[#0CC5BA] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cal}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}
        />
      );
    }

    // Health Goals
    if (questionId === "healthGoals") {
      const currentGoal = userPreferences ? (
        parseFloat(userPreferences.goalWeight || "0") > parseFloat(userPreferences.currentWeight || "0")
          ? "gain_weight"
          : parseFloat(userPreferences.goalWeight || "0") < parseFloat(userPreferences.currentWeight || "0")
          ? "lose_weight"
          : "maintain"
      ) : null;

      const goalLabels: { [key: string]: string } = {
        gain_weight: "Gain Weight",
        lose_weight: "Lose Weight",
        maintain: "Maintain Weight"
      };

      return (
        <Controller
          control={control}
          name="healthGoals"
          render={({ field }) => (
            <div className="space-y-2">
              {/* Current Goal from Profile */}
              {currentGoal && (
                <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-md border border-white/60 p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Current:</span>
                      <span className="text-sm font-bold text-[#0CC5BA]">{goalLabels[currentGoal]}</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => field.onChange(currentGoal)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        field.value === currentGoal
                          ? 'bg-[#0CC5BA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Keep
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Options - Grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "lose_weight", label: "Lose Weight", emoji: "⬇️" },
                  { value: "gain_muscle", label: "Gain Muscle", emoji: "💪" },
                  { value: "maintain", label: "Maintain", emoji: "⚖️" },
                  { value: "improve_health", label: "Improve Health", emoji: "❤️" },
                ].map((option) => (
                  <motion.div
                    key={option.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => field.onChange(option.value)}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      field.value === option.value
                        ? 'bg-gradient-to-r from-[#26A8FF]/20 to-[#26A8FF]/10 border-2 border-[#26A8FF]'
                        : 'bg-white/70 backdrop-blur-xl border border-white/60 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-sm font-medium text-gray-800">{option.label}</span>
                      {field.value === option.value && (
                        <Check className="w-4 h-4 text-[#26A8FF] ml-auto" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Custom Input */}
              <Input
                placeholder="Or enter custom goal..."
                value={['lose_weight', 'gain_muscle', 'maintain', 'improve_health'].includes(field.value as string) ? '' : (field.value as string)}
                onChange={(e) => field.onChange(e.target.value)}
                className="rounded-xl border border-gray-200 focus:border-[#26A8FF] bg-white/70 text-sm h-10"
              />
            </div>
          )}
        />
      );
    }

    // Cuisine Preferences
    if (questionId === "cuisinePreferences") {
      return (
        <Controller
          control={control}
          name="cuisinePreferences"
          render={({ field }) => (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "italian", label: "Italian", emoji: "🍝" },
                  { value: "asian", label: "Asian", emoji: "🍜" },
                  { value: "mediterranean", label: "Mediterranean", emoji: "🥙" },
                  { value: "mexican", label: "Mexican", emoji: "🌮" },
                  { value: "american", label: "American", emoji: "🍔" },
                  { value: "indian", label: "Indian", emoji: "🍛" },
                ].map((option) => (
                  <motion.div
                    key={option.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => field.onChange(option.value)}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      field.value === option.value
                        ? 'bg-gradient-to-r from-[#A855F7]/20 to-[#A855F7]/10 border-2 border-[#A855F7]'
                        : 'bg-white/70 backdrop-blur-xl border border-white/60 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-sm font-medium text-gray-800">{option.label}</span>
                      {field.value === option.value && (
                        <Check className="w-4 h-4 text-[#A855F7] ml-auto" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Custom Input */}
              <Input
                placeholder="Or enter custom cuisine..."
                value={['italian', 'asian', 'mediterranean', 'mexican', 'american', 'indian'].includes(field.value as string) ? '' : (field.value as string)}
                onChange={(e) => field.onChange(e.target.value)}
                className="rounded-xl border border-gray-200 focus:border-[#A855F7] bg-white/70 text-sm h-10"
              />
            </div>
          )}
        />
      );
    }

    // Allergies
    if (questionId === "allergies") {
      return (
        <Controller
          control={control}
          name="allergies"
          render={({ field }) => {
            const selectedAllergies = Array.isArray(field.value) ? field.value : [];
            const toggleAllergy = (value: string) => {
              if (selectedAllergies.includes(value)) {
                field.onChange(selectedAllergies.filter(v => v !== value));
              } else {
                field.onChange([...selectedAllergies, value]);
              }
            };

            return (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "lactose", label: "Lactose", emoji: "🥛" },
                    { value: "gluten", label: "Gluten", emoji: "🌾" },
                    { value: "nuts", label: "Nuts", emoji: "🥜" },
                    { value: "shellfish", label: "Shellfish", emoji: "🦐" },
                    { value: "eggs", label: "Eggs", emoji: "🥚" },
                    { value: "soy", label: "Soy", emoji: "🫘" },
                  ].map((option) => (
                    <motion.div
                      key={option.value}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleAllergy(option.value)}
                      className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedAllergies.includes(option.value)
                          ? 'bg-gradient-to-r from-[#F59E0B]/20 to-[#F59E0B]/10 border-2 border-[#F59E0B]'
                          : 'bg-white/70 backdrop-blur-xl border border-white/60 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{option.emoji}</span>
                        <span className="text-sm font-medium text-gray-800">{option.label}</span>
                        {selectedAllergies.includes(option.value) && (
                          <Check className="w-4 h-4 text-[#F59E0B] ml-auto" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* None Option */}
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => field.onChange([])}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedAllergies.length === 0
                      ? 'bg-gradient-to-r from-green-500/20 to-green-500/10 border-2 border-green-500'
                      : 'bg-white/70 backdrop-blur-xl border border-white/60 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✅</span>
                    <span className="text-sm font-medium text-gray-800">No Allergies</span>
                    {selectedAllergies.length === 0 && (
                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                  </div>
                </motion.div>

                {/* Custom Input */}
                <Input
                  placeholder="Or enter other allergies..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value && !selectedAllergies.includes(value)) {
                        field.onChange([...selectedAllergies, value]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  className="rounded-xl border border-gray-200 focus:border-[#F59E0B] bg-white/70 text-sm h-10"
                />
              </div>
            );
          }}
        />
      );
    }

    return null;
  };

  if (isGeneratingMealPlan) {
    return <MealPlanGenerationProgress />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/60">
        <div className="px-4 py-3 max-w-lg mx-auto">
          {/* Back button and step counter */}
          <div className="flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </motion.button>
            
            <div className="flex items-center gap-1.5">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep
                      ? 'w-6 bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF]'
                      : idx < currentStep
                      ? 'w-1.5 bg-[#0CC5BA]'
                      : 'w-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>
            
            <div className="text-xs font-medium text-gray-500">
              {currentStep + 1}/{questions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Question Header */}
            <div className="text-center mb-4">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${currentQuestion.gradient} flex items-center justify-center shadow-md`}>
                <div className="text-white">
                  {currentQuestion.icon}
                </div>
              </div>
              
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {currentQuestion.title}
              </h1>
              <p className="text-sm text-gray-500">
                {currentQuestion.description}
              </p>
            </div>

            {/* Question Options */}
            <div className="mb-4">
              {renderQuestionContent()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Button - Fixed at bottom */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-white/60 px-4 py-3 max-w-lg mx-auto w-full">
        <Button
          onClick={handleNext}
          disabled={!isCurrentStepValid() || saveMealPlanPreferences.isPending || isGeneratingMealPlan}
          className="w-full h-12 bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] hover:opacity-90 text-white rounded-xl text-base font-semibold shadow-lg shadow-[#0CC5BA]/30 transition-all disabled:opacity-50"
        >
          {isLastStep ? (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {saveMealPlanPreferences.isPending || isGeneratingMealPlan ? 'Creating...' : 'Create Meal Plan'}
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
