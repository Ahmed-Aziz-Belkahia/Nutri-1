import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  ChefHat,
  Check,
  Clock,
  Users,
  Plus,
  Minus
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function SimpleCookingMode() {
  const [_, params] = useRoute('/cooking/:recipeId');
  const recipeId = params?.recipeId;
  const [location, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [showCompletedScreen, setShowCompletedScreen] = useState(false);
  const [servingSize, setServingSize] = useState(2);
  const [showServingSelector, setShowServingSelector] = useState(true);
  const [cookingStarted, setCookingStarted] = useState(false);


  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch recipe data
  const { data: recipe, isLoading, isError } = useQuery({
    queryKey: ["/api/recipes", recipeId],
    queryFn: async () => {
      if (!recipeId) {
        throw new Error('No recipe ID provided');
      }
      const response = await fetch(`/api/recipes/${recipeId}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return response.json();
    },
  });

  // Parse instructions
  const instructionSteps = React.useMemo(() => {
    if (!recipe) return [];
    
    let steps = [];
    
    if (Array.isArray(recipe.instructions)) {
      steps = recipe.instructions;
    } else if (typeof recipe.instructions === 'string') {
      try {
        if (recipe.instructions.startsWith('[') && recipe.instructions.endsWith(']')) {
          steps = JSON.parse(recipe.instructions);
        } else {
          steps = recipe.instructions
            .split(/\r?\n/)
            .filter((step: string) => step.trim() !== '')
            .map((step: string) => step.replace(/^\d+[\.\)\-]\s*/, '').trim());
        }
      } catch (e) {
        steps = recipe.instructions
          .split(/\r?\n/)
          .filter((step: string) => step.trim() !== '')
          .map((step: string) => step.replace(/^\d+[\.\)\-]\s*/, '').trim());
      }
    }
    
    return steps.map((step: string) => {
      let cleanStep = step.replace(/^\d+[\.\)\-]\s*/, '').trim();
      cleanStep = cleanStep.charAt(0).toUpperCase() + cleanStep.slice(1);
      if (!cleanStep.endsWith('.') && !cleanStep.endsWith('!') && !cleanStep.endsWith('?')) {
        cleanStep += '.';
      }
      return cleanStep;
    });
  }, [recipe]);

  // Adjust ingredients based on serving size
  const adjustedIngredients = React.useMemo(() => {
    if (!recipe?.ingredients || !Array.isArray(recipe.ingredients)) return [];
    
    const baseServingSize = 2;
    const ratio = servingSize / baseServingSize;
    
    return recipe.ingredients.map((ingredient: string) => {
      return ingredient.replace(/^([\d\/\.]+)(\s+)/, (match, quantity, space) => {
        let numericValue: number;
        
        if (quantity.includes('/')) {
          const parts = quantity.split('/');
          numericValue = parseInt(parts[0]) / parseInt(parts[1]);
        } else {
          numericValue = parseFloat(quantity);
        }
        
        const adjustedValue = numericValue * ratio;
        let formattedValue: string;
        
        if (adjustedValue === Math.floor(adjustedValue)) {
          formattedValue = adjustedValue.toString();
        } else {
          const rounded = Math.round(adjustedValue * 100) / 100;
          formattedValue = rounded.toString();
        }
        
        return `${formattedValue}${space}`;
      });
    });
  }, [recipe, servingSize]);

  const totalSteps = instructionSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowCompletedScreen(true);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };



  const handleClose = () => {
    navigate(`/recipes/${recipeId}`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-t-[#0CC5BA] border-solid border-gray-200 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">{t('cooking.loadingRecipe')}</p>
        </div>
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('cooking.errorLoadingRecipe')}</h2>
          <p className="text-gray-600 mb-6">{t('cooking.couldntLoadRecipe')}</p>
          <Button 
            className="bg-[#0CC5BA] hover:bg-teal-600"
            onClick={() => navigate(`/recipes/${recipeId}`)}
          >
            {t('cooking.goBackToRecipe')}
          </Button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (showCompletedScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#f9f9f9] to-[#f0f4ff] z-[9999] flex flex-col">
        <div className="flex justify-between items-center z-10 px-5 py-4 bg-white/80 backdrop-blur-sm shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-600 hover:bg-gray-100"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="px-3 py-1.5 bg-[#0CC5BA] rounded-full text-xs font-medium text-white uppercase">
            {t('cooking.completed')}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-[400px] mx-auto">
          <div className="mb-8">
            <div className="h-24 w-24 rounded-full bg-[#e6f7f6] border-2 border-[#0CC5BA]/20 flex items-center justify-center shadow-lg">
              <Check className="h-12 w-12 text-[#0CC5BA]" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t('cooking.wellDone')}
            </h2>
            <p className="text-gray-600 text-base">
              {t('cooking.successfullyPrepared')} <span className="font-semibold text-[#0CC5BA]">{recipe.name}</span>
            </p>
          </div>
          
          <div className="w-full space-y-3">
            <Button 
              className="w-full py-4 rounded-xl font-medium bg-[#0CC5BA] hover:bg-teal-600 text-white"
              onClick={() => navigate('/add-food')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to Food Diary
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full py-4 rounded-xl font-medium"
              onClick={() => navigate('/dashboard')}
            >
              Back to Recipe
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Serving size selector screen
  if (showServingSelector) {
    return (
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-[#f9f9f9] to-[#f0f4ff] z-[9999] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex justify-between items-center z-10 px-5 py-4 bg-white/80 backdrop-blur-sm shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-600 hover:bg-gray-100"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="text-lg font-semibold text-gray-800">{recipe.name}</div>
          <div className="w-10"></div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-[400px] mx-auto">
          <div className="mb-8">
            <div className="h-20 w-20 rounded-full bg-[#e6f7f6] border-2 border-[#0CC5BA]/20 flex items-center justify-center">
              <Users className="h-10 w-10 text-[#0CC5BA]" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t('cooking.servings')}
            </h2>
            <p className="text-gray-600">
              {t('cooking.adjustIngredients')}
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-6 mb-8">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-2"
              onClick={() => servingSize > 1 && setServingSize(servingSize - 1)}
              disabled={servingSize <= 1}
            >
              <Minus className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-[#0CC5BA] mb-1">{servingSize}</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">
                {servingSize === 1 ? 'porcja' : 'porcje'}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-2"
              onClick={() => servingSize < 12 && setServingSize(servingSize + 1)}
              disabled={servingSize >= 12}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            onClick={() => {
              setShowServingSelector(false);
              setCookingStarted(true);
            }}
            className="w-full py-4 rounded-xl font-bold text-lg bg-[#0CC5BA] text-white hover:bg-teal-600"
          >
            <ChefHat className="mr-3 h-5 w-5" />
            {t('cooking.startCooking')}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Cooking mode screens
  if (cookingStarted) {
    return (
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-[#f9f9f9] to-[#f0f4ff] z-[9999] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center z-10 px-5 py-4 bg-white/80 backdrop-blur-sm shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-600 hover:bg-gray-100"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="px-3 py-1.5 bg-[#0CC5BA] rounded-full text-xs font-medium text-white">
            {t('cooking.step')} {currentStep + 1}/{totalSteps}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Progress bar */}
          <div className="px-5 pt-4">
            <Progress 
              value={progress} 
              className="h-2 bg-gray-200 rounded-full"
            />
          </div>

          <div className="flex-1 px-5 pt-6 pb-24">
            {/* Step indicator */}
            <div className="mb-6 flex justify-center">
              <div className="flex items-center px-4 py-2 rounded-full bg-white shadow-sm border">
                <Clock className="h-4 w-4 mr-1.5 text-[#0CC5BA]" />
                <span className="text-sm font-medium text-gray-700">
                  {t('cooking.step')} {currentStep + 1} {t('cooking.of')} {totalSteps}
                </span>
              </div>
            </div>

            {/* Step number */}
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 rounded-full flex items-center justify-center bg-[#0CC5BA] text-white text-2xl font-bold shadow-lg">
                {currentStep + 1}
              </div>
            </div>
            
            {/* Instruction */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
              <p className="text-lg text-gray-800 leading-relaxed">
                {instructionSteps[currentStep] || 'Loading instructions...'}
              </p>
            </div>
            
            {/* Step dots */}
            <div className="flex justify-center gap-1.5">
              {instructionSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`transition-all rounded-full ${
                    index === currentStep 
                      ? 'h-2 w-8 bg-[#0CC5BA]' 
                      : index < currentStep 
                        ? 'h-2 w-2 bg-[#0CC5BA]/60' 
                        : 'h-2 w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Navigation */}
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={goToPrevStep}
                disabled={currentStep === 0}
                className="flex-1 h-12 rounded-xl"
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                {t('cooking.previous')}
              </Button>
              
              <Button
                onClick={goToNextStep}
                className="flex-1 h-12 rounded-xl bg-[#0CC5BA] text-white hover:bg-teal-600"
              >
                {currentStep < totalSteps - 1 ? (
                  <>
                    {t('cooking.next')}
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </>
                ) : (
                  <>
                    {t('cooking.complete')}
                    <Check className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}