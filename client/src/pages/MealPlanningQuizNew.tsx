import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Loader2, Plus, X, Utensils, Target, Clock, Trophy,
  Pizza, Apple, Globe, DollarSign, ChefHat, 
  CalendarDays, Calendar, Computer, FileText, Heart, ArrowLeft, ArrowRight, Check,
  Minus, Coffee, ChevronsUp, ChevronsDown, Flame, Activity, Info, Dumbbell, Search,
  Zap
} from "lucide-react";
import { useTranslation } from "react-i18next";
import MealPlanGenerationProgress from "@/components/MealPlanGenerationProgress";

// Enhanced schema with more detailed preferences
const mealPlanPreferencesSchema = z.object({
  dietaryType: z.enum(["omnivore", "vegetarian", "vegan", "keto", "paleo", "mediterranean", "gluten-free", "low-carb"]),
  healthGoals: z.array(z.string()).min(1, "Please select at least one health goal"),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very-active"]),
  calorieTarget: z.number().min(1000, "Minimum 1000 calories").max(5000, "Maximum 5000 calories"),
  mealsPerDay: z.number().min(1, "Minimum 1 meal").max(6, "Maximum 6 meals"),
  allergies: z.array(z.string()).default([]),
  maxCookingTime: z.number().min(10, "Minimum 10 minutes").max(180, "Maximum 180 minutes"),
  budgetPreference: z.enum(["low", "medium", "high"]),
  cuisinePreferences: z.array(z.string()).min(1, "Please select at least one cuisine preference"),
  preferredIngredients: z.array(z.string()).default([]),
  excludedIngredients: z.array(z.string()).default([]),
  cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  mealPlanDuration: z.enum(["week"]),
  specialRequirements: z.string().optional(),
  weekdayVsWeekend: z.enum(["same", "different"]),
  cookingEquipment: z.array(z.string()).default([]),
});

type MealPlanPreferencesForm = z.infer<typeof mealPlanPreferencesSchema>;

// Create a custom Salad icon as it's not in lucide-react
const Salad = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M7 21h10a5 5 0 0 0 5-5c0-2.76-2.5-5-5.5-5H7.5C4.5 11 2 8.76 2 6c0-2.76 2.24-5 5-5" />
      <path d="M7 21V6c0-2.76 2.24-5 5-5a5 5 0 0 1 5 5v15" />
    </svg>
  );
};

// Questions presented to the user with enhanced styling props
const getQuestions = (t: Function) => [
  {
    id: "dietaryType",
    title: t("mealPlanningQuiz:questions.diet.title", "What's your eating style?"),
    description: t("mealPlanningQuiz:questions.diet.description", "Choose your preferred diet type"),
    type: "select",
    icon: <Utensils className="w-8 h-8 text-[#0CC5BA]" />,
  },
  {
    id: "healthGoals",
    title: t("mealPlanningQuiz:questions.health_goals.title", "What are your health goals?"),
    description: t("mealPlanningQuiz:questions.health_goals.description", "Select all that apply to you"),
    type: "multiselect",
    icon: <Target className="w-8 h-8 text-[#0CC5BA]" />,
  },
  {
    id: "activityLevel",
    title: t("mealPlanningQuiz:questions.activity.title", "How active are you?"),
    description: t("mealPlanningQuiz:questions.activity.description", "This helps us determine your calorie needs"),
    type: "select",
    icon: <Activity className="w-8 h-8 text-[#0CC5BA]" />,
  },
  {
    id: "calorieTarget",
    title: t("mealPlanningQuiz:questions.calorie_target.title", "Daily calorie target?"),
    description: t("mealPlanningQuiz:questions.calorie_target.description", "Adjust based on your goals"),
    type: "slider",
    icon: <Zap className="w-8 h-8 text-[#0CC5BA]" />,
  },
  {
    id: "mealsPerDay",
    title: t("mealPlanningQuiz:questions.meals_per_day.title", "How many meals per day?"),
    description: t("mealPlanningQuiz:questions.meals_per_day.description", "Including snacks"),
    type: "number",
    icon: <Clock className="w-8 h-8 text-[#0CC5BA]" />,
  },
  {
    id: "cuisinePreferences",
    title: t("mealPlanningQuiz:questions.cuisine_preferences.title", "What cuisines do you enjoy?"),
    description: t("mealPlanningQuiz:questions.cuisine_preferences.description", "Select all that you like"),
    type: "multiselect",
    icon: <Globe className="w-8 h-8 text-[#0CC5BA]" />,
  },
  {
    id: "cookingSkillLevel",
    title: t("mealPlanningQuiz:questions.cooking_skill_level.title", "Your cooking skill level?"),
    description: t("mealPlanningQuiz:questions.cooking_skill_level.description", "We'll match recipes to your experience"),
    type: "select",
    icon: <ChefHat className="w-8 h-8 text-[#0CC5BA]" />,
  },
];

export default function MealPlanningQuiz() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['translation', 'mealPlanningQuiz']);
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<MealPlanPreferencesForm>({
    resolver: zodResolver(mealPlanPreferencesSchema),
    defaultValues: {
      dietaryType: "omnivore",
      healthGoals: ["maintenance"],
      activityLevel: "moderate",
      calorieTarget: 2000,
      mealsPerDay: 3,
      allergies: [],
      maxCookingTime: 60,
      budgetPreference: "medium",
      cuisinePreferences: ["italian", "american"],
      preferredIngredients: [],
      excludedIngredients: [],
      cookingSkillLevel: "intermediate",
      mealPlanDuration: "week",
      weekdayVsWeekend: "same",
      cookingEquipment: ["stove", "oven"],
    },
  });

  const questions = getQuestions(t);
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      // Prevent multiple submissions
      if (saveMealPlanPreferences.isPending || isGeneratingMealPlan) {
        return;
      }
      // Submit form
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
      try {
        // Save preferences first (no animation yet)
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

        // Now show the progress animation for meal plan generation
        setIsGeneratingMealPlan(true);

        // Create meal plan
        const mealPlanResponse = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!mealPlanResponse.ok) {
          const errorData = await mealPlanResponse.json();
          
          // If generation is already in progress (409), just show progress screen
          if (mealPlanResponse.status === 409) {
            console.log('Meal plan generation already in progress, showing progress...');
            return { preferences, mealPlan: { alreadyInProgress: true } };
          }
          
          throw new Error(errorData.message || "Failed to create meal plan");
        }

        const mealPlan = await mealPlanResponse.json();
        return { preferences, mealPlan };
      } catch (error) {
        console.error("Meal plan creation error:", error);
        setIsGeneratingMealPlan(false);
        throw error;
      }
    },
    onSuccess: async () => {
      setIsGeneratingMealPlan(false);
      
      // Invalidate and wait for refetch to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/today"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/all"] })
      ]);
      
      // Refetch the all meal plans query to ensure data is loaded before navigation
      await queryClient.refetchQueries({ 
        queryKey: ["/api/meal-plans/all"],
        type: 'active'
      });
      
      toast({
        title: t("mealPlanningQuiz:success.title", "Success!"),
        description: t("mealPlanningQuiz:success.description", "Your meal plan has been created!"),
      });
      
      // Navigate immediately after data is loaded
      setLocation("/meal-plan/view");
    },
    onError: (error) => {
      setIsGeneratingMealPlan(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to save preferences";
      toast({
        variant: "destructive",
        title: t("mealPlanningQuiz:error.title", "Error"),
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
        return formValues.healthGoals?.length > 0;
      case "activityLevel":
        return !!formValues.activityLevel;
      case "calorieTarget":
        return formValues.calorieTarget >= 1000 && formValues.calorieTarget <= 5000;
      case "mealsPerDay":
        return formValues.mealsPerDay >= 1 && formValues.mealsPerDay <= 6;
      case "cuisinePreferences":
        return formValues.cuisinePreferences?.length > 0;
      case "cookingSkillLevel":
        return !!formValues.cookingSkillLevel;
      default:
        return true;
    }
  };

  const renderQuestionContent = () => {
    const questionId = currentQuestion.id;
    const formValues = watch();

    switch (currentQuestion.type) {
      case "select":
        if (questionId === "dietaryType") {
          const options = [
            { value: "omnivore", label: "Omnivore", description: "Eat everything" },
            { value: "vegetarian", label: "Vegetarian", description: "No meat" },
            { value: "vegan", label: "Vegan", description: "Plant-based only" },
            { value: "keto", label: "Keto", description: "Low carb, high fat" },
            { value: "paleo", label: "Paleo", description: "Natural foods only" },
            { value: "mediterranean", label: "Mediterranean", description: "Heart-healthy diet" },
          ];

          return (
            <Controller
              control={control}
              name="dietaryType"
              render={({ field }) => (
                <div className="space-y-3">
                  {options.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => field.onChange(option.value)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        field.value === option.value
                          ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">{option.label}</h3>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          field.value === option.value
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                            : 'border-gray-300'
                        }`}>
                          {field.value === option.value && (
                            <Check className="w-3 h-3 text-white m-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            />
          );
        }

        if (questionId === "activityLevel") {
          const options = [
            { value: "sedentary", label: "Sedentary", description: "Little to no exercise" },
            { value: "light", label: "Light", description: "Light exercise 1-3 days/week" },
            { value: "moderate", label: "Moderate", description: "Moderate exercise 3-5 days/week" },
            { value: "active", label: "Active", description: "Heavy exercise 6-7 days/week" },
            { value: "very-active", label: "Very Active", description: "Very heavy exercise, physical job" },
          ];

          return (
            <Controller
              control={control}
              name="activityLevel"
              render={({ field }) => (
                <div className="space-y-3">
                  {options.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => field.onChange(option.value)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        field.value === option.value
                          ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">{option.label}</h3>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          field.value === option.value
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                            : 'border-gray-300'
                        }`}>
                          {field.value === option.value && (
                            <Check className="w-3 h-3 text-white m-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            />
          );
        }

        if (questionId === "cookingSkillLevel") {
          const options = [
            { value: "beginner", label: "Beginner", description: "Simple recipes with basic techniques" },
            { value: "intermediate", label: "Intermediate", description: "Comfortable with most cooking methods" },
            { value: "advanced", label: "Advanced", description: "Complex recipes and techniques" },
          ];

          return (
            <Controller
              control={control}
              name="cookingSkillLevel"
              render={({ field }) => (
                <div className="space-y-3">
                  {options.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => field.onChange(option.value)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        field.value === option.value
                          ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">{option.label}</h3>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          field.value === option.value
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                            : 'border-gray-300'
                        }`}>
                          {field.value === option.value && (
                            <Check className="w-3 h-3 text-white m-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
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
            { value: "energy", label: "More Energy", description: "Boost energy levels" },
            { value: "heart_health", label: "Heart Health", description: "Improve cardiovascular health" },
            { value: "digestive_health", label: "Digestive Health", description: "Better gut health" },
          ];

          const weightGoals = ["weight_loss", "muscle_gain", "maintenance"];

          return (
            <Controller
              control={control}
              name="healthGoals"
              render={({ field }) => (
                <div className="space-y-3">
                  {options.map((option) => {
                    const isSelected = field.value?.includes(option.value);
                    const isWeightGoal = weightGoals.includes(option.value);
                    
                    return (
                      <div
                        key={option.value}
                        onClick={() => {
                          const currentValues = field.value || [];
                          if (isSelected) {
                            field.onChange(currentValues.filter(v => v !== option.value));
                          } else {
                            // If selecting a weight goal, first remove all other weight goals
                            let newValues = [...currentValues];
                            if (isWeightGoal) {
                              newValues = newValues.filter(v => !weightGoals.includes(v));
                            }
                            // Then add the new selection
                            newValues.push(option.value);
                            field.onChange(newValues);
                          }
                        }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800">{option.label}</h3>
                            <p className="text-sm text-gray-600">{option.description}</p>
                          </div>
                          <div className={`w-5 h-5 ${isWeightGoal ? 'rounded-full' : 'rounded'} border-2 ${
                            isSelected
                              ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              isWeightGoal ? 
                                <div className="w-2 h-2 bg-white rounded-full m-0.5" /> :
                                <Check className="w-3 h-3 text-white m-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
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
            { value: "american", label: "American", description: "Burgers, BBQ, comfort food" },
            { value: "asian", label: "Asian", description: "Chinese, Japanese, Thai" },
            { value: "mexican", label: "Mexican", description: "Tacos, burritos, spicy food" },
            { value: "mediterranean", label: "Mediterranean", description: "Greek, Turkish, fresh ingredients" },
            { value: "indian", label: "Indian", description: "Curry, spices, vegetarian options" },
          ];

          return (
            <Controller
              control={control}
              name="cuisinePreferences"
              render={({ field }) => (
                <div className="space-y-3">
                  {options.map((option) => {
                    const isSelected = field.value?.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        onClick={() => {
                          const currentValues = field.value || [];
                          if (isSelected) {
                            field.onChange(currentValues.filter(v => v !== option.value));
                          } else {
                            field.onChange([...currentValues, option.value]);
                          }
                        }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800">{option.label}</h3>
                            <p className="text-sm text-gray-600">{option.description}</p>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 ${
                            isSelected
                              ? 'border-[#0CC5BA] bg-[#0CC5BA]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <Check className="w-3 h-3 text-white m-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          );
        }
        break;

      case "slider":
        if (questionId === "calorieTarget") {
          return (
            <Controller
              control={control}
              name="calorieTarget"
              render={({ field }) => (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#0CC5BA] mb-2">
                      {field.value}
                    </div>
                    <div className="text-gray-600">calories per day</div>
                  </div>
                  <Slider
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    min={1000}
                    max={4000}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>1000</span>
                    <span>4000</span>
                  </div>
                </div>
              )}
            />
          );
        }
        break;

      case "number":
        if (questionId === "mealsPerDay") {
          return (
            <Controller
              control={control}
              name="mealsPerDay"
              render={({ field }) => (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[3, 4, 5, 6].map((mealCount) => {
                      const isActive = field.value === mealCount;
                      return (
                        <div
                          key={mealCount}
                          onClick={() => field.onChange(mealCount)}
                          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-center ${
                            isActive
                              ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-3xl font-bold text-[#0CC5BA] mb-2">
                            {mealCount}
                          </div>
                          <div className="text-sm text-gray-600">meals</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            />
          );
        }
        break;

      default:
        return <div>Question type not implemented</div>;
    }
  };

  if (isGeneratingMealPlan) {
    return <MealPlanGenerationProgress />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#f6fffe] to-[#f0f7ff] flex items-center justify-center p-2 overflow-hidden">
      <Card className="w-full max-w-md bg-white shadow-xl rounded-3xl overflow-hidden border-0">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header with icon and title */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-[#0CC5BA]/10 to-blue-500/10 rounded-full flex items-center justify-center">
                    {currentQuestion.icon}
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {currentQuestion.title}
                </h1>
                <p className="text-gray-600 text-sm">
                  {currentQuestion.description}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Step {currentStep + 1}</span>
                  <span>{questions.length} steps</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Content */}
              <div className="min-h-[300px]">
                {renderQuestionContent()}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-100">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="h-14 px-6 hover:bg-[#0CC5BA]/5 rounded-xl"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isCurrentStepValid() || saveMealPlanPreferences.isPending || isGeneratingMealPlan}
                  className="h-14 px-6 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-blue-500 text-white hover:opacity-90 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLastStep ? (
                    <>
                      <Flame className="w-5 h-5 mr-2" />
                      {saveMealPlanPreferences.isPending || isGeneratingMealPlan ? 'Creating...' : 'Create Plan'}
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}