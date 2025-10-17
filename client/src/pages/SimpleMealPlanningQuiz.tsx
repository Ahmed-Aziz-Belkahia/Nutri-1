import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  Utensils, 
  Flame, 
  Clock, 
  AlertTriangle, 
  Globe, 
  Leaf, 
  X,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import MealPlanGenerationProgress from "@/components/MealPlanGenerationProgress";

interface MealPlanPreferencesForm {
  dietaryType: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies: string;
  cuisinePreferences: string;
  preferredIngredients: string;
  excludedIngredients: string;
}

const questions = [
  {
    id: "dietaryType",
    title: "What diet do you follow?",
    description: "Choose your eating style",
    type: "select",
    options: [
      { value: "omnivore", label: "Omnivore" },
      { value: "vegetarian", label: "Vegetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "pescetarian", label: "Pescetarian" }
    ],
    icon: <Utensils className="w-6 h-6 text-white" />,
    gradient: "from-green-500 to-emerald-500"
  },
  {
    id: "calorieTarget",
    title: "Daily calorie goal?",
    description: "Enter your target calories",
    type: "number",
    placeholder: "2000",
    icon: <Flame className="w-6 h-6 text-white" />,
    gradient: "from-orange-500 to-red-500"
  },
  {
    id: "mealsPerDay",
    title: "Meals per day?",
    description: "Including snacks",
    type: "select",
    options: [
      { value: 1, label: "1 meal" },
      { value: 2, label: "2 meals" },
      { value: 3, label: "3 meals" },
      { value: 4, label: "4 meals" },
      { value: 5, label: "5 meals" }
    ],
    icon: <Clock className="w-6 h-6 text-white" />,
    gradient: "from-purple-500 to-indigo-500"
  },
  {
    id: "allergies",
    title: "Allergies & intolerances",
    description: "Separate with commas",
    type: "text",
    placeholder: "e.g. gluten, nuts, lactose",
    icon: <AlertTriangle className="w-6 h-6 text-white" />,
    gradient: "from-yellow-500 to-orange-500"
  },
  {
    id: "cuisinePreferences",
    title: "Favorite cuisines",
    description: "Separate with commas",
    type: "text",
    placeholder: "e.g. Italian, Asian, Mexican",
    icon: <Globe className="w-6 h-6 text-white" />,
    gradient: "from-cyan-500 to-blue-500"
  },
  {
    id: "preferredIngredients",
    title: "Favorite ingredients",
    description: "Separate with commas",
    type: "text",
    placeholder: "e.g. chicken, broccoli, rice",
    icon: <Leaf className="w-6 h-6 text-white" />,
    gradient: "from-green-500 to-emerald-500"
  },
  {
    id: "excludedIngredients",
    title: "Ingredients to avoid",
    description: "Separate with commas",
    type: "text",
    placeholder: "e.g. mushrooms, olives, peppers",
    icon: <X className="w-6 h-6 text-white" />,
    gradient: "from-red-500 to-pink-500"
  }
];

export default function SimpleMealPlanningQuiz() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);
  const [mealPlanDays, setMealPlanDays] = useState<number>(7); // Track days for progress
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false); // Prevent double submission

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MealPlanPreferencesForm>({
    defaultValues: {
      dietaryType: "omnivore",
      calorieTarget: 2000,
      mealsPerDay: 3,
      allergies: "",
      cuisinePreferences: "",
      preferredIngredients: "",
      excludedIngredients: ""
    }
  });

  const formValues = watch();
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 200000);

      try {
        // Process text inputs to arrays
        const processedData = {
          ...data,
          healthGoals: [], // Default empty array
          activityLevel: "moderate", // Default value
          maxCookingTime: 60, // Default value
          budgetPreference: "medium", // Default value
          cookingSkillLevel: "intermediate", // Default value
          mealPlanDuration: "week", // Default value
          weekdayVsWeekend: "same", // Default value
          cookingEquipment: ["stove", "oven"], // Default values
          specialRequirements: "", // Default value
          allergies: data.allergies ? data.allergies.split(',').map(item => item.trim()).filter(item => item.length > 0) : [],
          cuisinePreferences: data.cuisinePreferences ? data.cuisinePreferences.split(',').map(item => item.trim()).filter(item => item.length > 0) : [],
          preferredIngredients: data.preferredIngredients ? data.preferredIngredients.split(',').map(item => item.trim()).filter(item => item.length > 0) : [],
          excludedIngredients: data.excludedIngredients ? data.excludedIngredients.split(',').map(item => item.trim()).filter(item => item.length > 0) : []
        };

        const mealPlanResponse = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify(processedData),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!mealPlanResponse.ok) {
          const errorText = await mealPlanResponse.text();
          throw new Error(`Failed to create meal plan: ${mealPlanResponse.status} - ${errorText}`);
        }

        const responseData = await mealPlanResponse.json();
        const mealPlanData = responseData.generated && responseData.plan ? responseData.plan : responseData;
        
        return { preferences: processedData, mealPlan: mealPlanData };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    onSuccess: async () => {
      setIsGeneratingMealPlan(false);
      isSubmittingRef.current = false; // Reset flag on success
      
      // Invalidate all meal plan related queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/today'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/all'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/recipes'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] })
      ]);
      
      // Prefetch shopping list to ensure it's loaded before navigation
      try {
        await queryClient.prefetchQuery({
          queryKey: ['/api/shopping-list'],
          queryFn: async () => {
            const res = await fetch('/api/shopping-list', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch shopping list');
            return res.json();
          }
        });
        console.log('✅ Shopping list prefetched successfully');
      } catch (error) {
        console.error('Failed to prefetch shopping list:', error);
      }
      
      toast({
        title: "Meal plan created!",
        description: "Your personalized meal plan and shopping list are ready.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      setIsGeneratingMealPlan(false);
      isSubmittingRef.current = false; // Reset flag on error
      console.error("Meal plan creation error:", error);
      toast({
        title: "Plan Creation Error",
        description: error instanceof Error ? error.message : "Failed to create meal plan.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: MealPlanPreferencesForm) => {
    // Prevent double submission
    if (isSubmittingRef.current) {
      console.log('⚠️  Already generating meal plan, preventing duplicate submission');
      return;
    }
    
    isSubmittingRef.current = true;
    
    try {
      // Calculate days from duration (matching backend logic)
      const duration = "week"; // Default to week - could be extended to ask user
      const daysCount = duration === '3days' ? 3 : duration === 'week' ? 7 : duration === 'twoWeeks' ? 14 : 7;
      setMealPlanDays(daysCount);
      
      setIsGeneratingMealPlan(true);
      await saveMealPlanPreferences.mutateAsync(data);
    } catch (error) {
      // Reset flag on error
      isSubmittingRef.current = false;
      setIsGeneratingMealPlan(false);
      throw error;
    }
  };

  if (isGeneratingMealPlan) {
    return <MealPlanGenerationProgress dayCount={mealPlanDays} />;
  }

  const renderQuestionContent = () => {
    const currentField = currentQuestion.id as keyof MealPlanPreferencesForm;
    
    if (currentQuestion.type === "select") {
      return (
        <RadioGroup
          value={String(formValues[currentField])}
          onValueChange={(value) => setValue(currentField, currentQuestion.id === "mealsPerDay" ? Number(value) : value as any)}
          className="space-y-3"
        >
          {currentQuestion.options?.map((option) => (
            <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <RadioGroupItem value={String(option.value)} id={String(option.value)} />
              <Label htmlFor={String(option.value)} className="flex-1 cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    if (currentQuestion.type === "number") {
      return (
        <Input
          type="number"
          placeholder={currentQuestion.placeholder}
          {...register(currentField, { required: true, valueAsNumber: true })}
          className="text-center text-lg"
        />
      );
    }

    return (
      <Input
        type="text"
        placeholder={currentQuestion.placeholder}
        {...register(currentField)}
        className="text-center"
      />
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center p-2 overflow-hidden">
      <motion.div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="relative p-6 text-center">
          <motion.div 
            className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${currentQuestion.gradient} flex items-center justify-center shadow-lg`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {currentQuestion.icon}
          </motion.div>
          
          <motion.h1 
            className="text-xl font-bold text-gray-900 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Meal Planning
          </motion.h1>
          
          <motion.p 
            className="text-gray-600 text-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Step {currentStep + 1} of {questions.length}
          </motion.p>
          
          <motion.div 
            className="w-full bg-gray-200 rounded-full h-1.5 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div 
              className="bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              transition={{ delay: 0.6, duration: 0.5 }}
            />
          </motion.div>
          
          <motion.p 
            className="text-xs text-[#0CC5BA] font-medium mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {Math.round(((currentStep + 1) / questions.length) * 100)}% complete
          </motion.p>
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Question */}
              <div className="text-center space-y-2">
                <motion.h2 
                  className="text-lg font-semibold text-gray-900"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {currentQuestion.title}
                </motion.h2>
                <motion.p 
                  className="text-gray-600 text-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentQuestion.description}
                </motion.p>
              </div>

              {/* Question Content */}
              <motion.div 
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {renderQuestionContent()}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <motion.div 
            className="flex justify-between mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              className="flex items-center gap-2 bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] hover:from-[#0CC5BA]/90 hover:to-[#0091ff]/90"
            >
              {isLastStep ? "Create Plan" : "Next"}
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}