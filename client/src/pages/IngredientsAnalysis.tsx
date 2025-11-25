import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Sparkles, Check, Loader2, Search, ChefHat, Utensils, BookOpen, Plus, Trash2, Edit2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AnalysisState = 'detecting' | 'analyzing' | 'confirming' | 'generating' | 'finalizing' | 'complete' | 'error';

interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

interface AnalysisStep {
  id: AnalysisState;
  label: string;
  icon: React.ReactNode;
}

const getAnalysisSteps = (t: any): AnalysisStep[] => [
  { id: 'detecting', label: t('common:ingredientsAnalysis.steps.detecting'), icon: <Search className="w-5 h-5" /> },
  { id: 'analyzing', label: t('common:ingredientsAnalysis.steps.analyzing'), icon: <ChefHat className="w-5 h-5" /> },
  { id: 'generating', label: t('common:ingredientsAnalysis.steps.generating'), icon: <Utensils className="w-5 h-5" /> },
  { id: 'finalizing', label: t('common:ingredientsAnalysis.steps.finalizing'), icon: <BookOpen className="w-5 h-5" /> },
];

export default function IngredientsAnalysis() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();
  const analysisSteps = getAnalysisSteps(t);
  const [currentState, setCurrentState] = useState<AnalysisState>('detecting');
  const [detectedIngredients, setDetectedIngredients] = useState<Ingredient[]>([]);
  const [difficulty, setDifficulty] = useState<string>('Medium');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const { toast } = useToast();
  const hasAnalyzed = useRef(false);
  const analysisStarted = useRef(false);
  const isPolling = useRef(false);

  // Get image from localStorage
  const imageData = localStorage.getItem('analyzingIngredientsImage');

  useEffect(() => {
    console.log('[IngredientsAnalysis] Component mounted');
    console.log('[IngredientsAnalysis] imageData exists:', !!imageData);
    
    // Don't redirect if we're in the middle of polling
    if (!imageData && !isPolling.current) {
      console.log('[IngredientsAnalysis] No image data found, redirecting to /scan-recipe');
      setLocation('/scan-recipe');
      return;
    }

    const performAnalysis = async () => {
      // Prevent duplicate analysis
      if (analysisStarted.current) {
        console.log('[IngredientsAnalysis] Analysis already started, skipping');
        return;
      }
      
      // Check if we already have a result stored from this session
      const storedIngredients = sessionStorage.getItem('lastAnalyzedIngredients');
      const storedRecipes = sessionStorage.getItem('lastGeneratedRecipes');
      if (storedIngredients && storedRecipes && hasAnalyzed.current) {
        console.log('[IngredientsAnalysis] Found previous analysis result, redirecting');
        setLocation('/recipe-results');
        return;
      }
      
      analysisStarted.current = true;
      hasAnalyzed.current = true;

      let isMounted = true;

      try {
        console.log('[IngredientsAnalysis] Starting analysis...');
        
        // Step 1: Start detection
        setCurrentState('detecting');
        console.log('[IngredientsAnalysis] State: detecting');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isMounted) return;
        
        // Step 2: Analyzing (call API to detect ingredients)
        setCurrentState('analyzing');
        console.log('[IngredientsAnalysis] State: analyzing, calling ingredient detection API...');
        
        const ingredientsResponse = await fetch('/api/analyze-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData }),
          credentials: 'include'
        });

        if (!ingredientsResponse.ok) {
          throw new Error(t('common:ingredientsAnalysis.errors.failedToAnalyze'));
        }

        const ingredientsResult = await ingredientsResponse.json();
        console.log('[IngredientsAnalysis] Ingredients result:', ingredientsResult);
        
        if (!isMounted) return;

        if (!ingredientsResult || !ingredientsResult.ingredients) {
          throw new Error(t('common:ingredientsAnalysis.errors.invalidResult'));
        }
        
        // Parse and format ingredients
        const ingredients = ingredientsResult.ingredients.map((ing: any) => ({
          name: ing.name || ing,
          quantity: ing.quantity || ing.amount || '',
          unit: ing.unit || ''
        }));
        
        setDetectedIngredients(ingredients);
        localStorage.setItem('scannedIngredients', JSON.stringify(ingredients));
        sessionStorage.setItem('lastAnalyzedIngredients', JSON.stringify(ingredients));
        
        // Step 3: Show confirmation screen for editing
        setCurrentState('confirming');
        console.log('[IngredientsAnalysis] State: confirming, waiting for user to confirm ingredients...');
      } catch (error) {
        console.error('Ingredients Analysis Error:', error);
        if (!isMounted) return;
        
        setCurrentState('error');
        localStorage.removeItem('analyzingIngredientsImage');
        
        toast({
          title: t('common:ingredientsAnalysis.errors.analysisError'),
          description: error instanceof Error ? error.message : t('common:ingredientsAnalysis.errors.tryAgain'),
          variant: "destructive",
        });
        
        setTimeout(() => {
          if (isMounted) setLocation('/scan-recipe');
        }, 2000);
      }

      return () => {
        isMounted = false;
      };
    };

    performAnalysis();
  }, [imageData, setLocation, toast]);

  // Handler functions for ingredient editing
  const handleEditIngredient = (index: number) => {
    const ingredient = detectedIngredients[index];
    setEditingIndex(index);
    setEditName(ingredient.name);
    setEditQuantity(ingredient.quantity || '');
    setEditUnit(ingredient.unit || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const updatedIngredients = [...detectedIngredients];
    updatedIngredients[editingIndex] = {
      name: editName,
      quantity: editQuantity,
      unit: editUnit
    };
    
    setDetectedIngredients(updatedIngredients);
    localStorage.setItem('scannedIngredients', JSON.stringify(updatedIngredients));
    setEditingIndex(null);
    setEditName('');
    setEditQuantity('');
    setEditUnit('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditName('');
    setEditQuantity('');
    setEditUnit('');
  };

  const handleAddIngredient = () => {
    const newIngredient = { name: '', quantity: '', unit: '' };
    setDetectedIngredients([...detectedIngredients, newIngredient]);
    setEditingIndex(detectedIngredients.length);
    setEditName('');
    setEditQuantity('');
    setEditUnit('');
  };

  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = detectedIngredients.filter((_, i) => i !== index);
    setDetectedIngredients(updatedIngredients);
    localStorage.setItem('scannedIngredients', JSON.stringify(updatedIngredients));
    
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditName('');
      setEditQuantity('');
      setEditUnit('');
    }
  };

  const handleConfirmAndGenerate = async () => {
    if (detectedIngredients.length === 0) {
      toast({
        title: t('common:ingredientsAnalysis.errors.noIngredients'),
        description: t('common:ingredientsAnalysis.errors.addOneIngredient'),
        variant: "destructive",
      });
      return;
    }

    await generateRecipes(detectedIngredients, difficulty);
  };

  // Generate recipes from ingredients
  const generateRecipes = async (ingredients: Ingredient[], selectedDifficulty: string) => {
    // Continue with recipe generation
    setCurrentState('generating');
    console.log('[IngredientsAnalysis] State: generating recipes...');

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Call recipe generation API with ingredients and difficulty
      const recipesResponse = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ingredients: ingredients,
          preferences: { difficulty: selectedDifficulty, timeNeeded: 30, flavor: 'Mixed' }
        }),
        credentials: 'include'
      });

      if (!recipesResponse.ok) {
        throw new Error(t('common:ingredientsAnalysis.errors.failedToGenerate'));
      }

      const recipesResult = await recipesResponse.json();
      console.log('[IngredientsAnalysis] Recipes result:', recipesResult);

      // Step 4: Finalizing - Save recipes to database
      setCurrentState('finalizing');
      console.log('[IngredientsAnalysis] State: finalizing, saving recipes...');

      // Helper function to determine meal type
      const determineMealType = (recipeName: string): string => {
        const name = recipeName.toLowerCase();
        if (name.includes('breakfast') || name.includes('morning') || name.includes('oatmeal') || name.includes('pancake')) {
          return 'breakfast';
        } else if (name.includes('lunch') || name.includes('sandwich') || name.includes('salad')) {
          return 'lunch';
        } else if (name.includes('dinner') || name.includes('evening')) {
          return 'dinner';
        } else if (name.includes('snack') || name.includes('bite')) {
          return 'snack';
        } else {
          const hour = new Date().getHours();
          if (hour < 11) return 'breakfast';
          else if (hour < 15) return 'lunch';
          else if (hour < 20) return 'dinner';
          else return 'snack';
        }
      };

      const savedRecipes = [];
      for (const recipe of recipesResult.recipes || []) {
        try {
          const formattedRecipe = {
            name: recipe.name,
            description: recipe.description || `Recipe generated from scanned ingredients`,
            mealType: determineMealType(recipe.name),
            ingredients: Array.isArray(recipe.ingredients) 
              ? recipe.ingredients 
              : typeof recipe.ingredients === 'string'
                ? recipe.ingredients.split('\n').filter((i: string) => i.trim())
                : [],
            instructions: Array.isArray(recipe.instructions)
              ? recipe.instructions
              : typeof recipe.instructions === 'string'
                ? recipe.instructions.split('\n').filter((i: string) => i.trim())
                : [],
            prepTime: recipe.prepTime || recipe.prep_time || 20,
            cookTime: recipe.cookTime || recipe.cook_time || 15,
            servings: recipe.servings || 1,
            difficulty: recipe.difficulty || selectedDifficulty,
            cuisineType: recipe.cuisineType || recipe.cuisine || 'International',
            calories: recipe.nutritionInfo?.calories || recipe.calories || 400,
            protein: recipe.nutritionInfo?.protein || recipe.protein || 20,
            carbs: recipe.nutritionInfo?.carbs || recipe.carbs || 40,
            fat: recipe.nutritionInfo?.fat || recipe.fat || 15,
            fiber: recipe.nutritionInfo?.fiber || recipe.fiber || 5,
            sugar: recipe.nutritionInfo?.sugar || recipe.sugar || 8,
            sodium: recipe.nutritionInfo?.sodium || recipe.sodium || 500,
            image: imageData,
            isRecipe: true,
            source: 'ingredient_generation', // Different source to separate from scanned meals
            components: ingredients.map((ing: any) => ing.name),
            isAnalyzing: true,
            hideFromToday: true // Flag to hide from today's scans
          };

          const saveResponse = await fetch('/api/food-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedRecipe),
            credentials: 'include'
          });

          if (saveResponse.ok) {
            const savedRecipe = await saveResponse.json();
            savedRecipes.push(savedRecipe.log);
          }
        } catch (error) {
          console.error('[IngredientsAnalysis] Error saving recipe:', error);
        }
      }

      console.log('[IngredientsAnalysis] Saved recipes:', savedRecipes);

      // Store both original and saved recipes
      localStorage.setItem('generatedRecipes', JSON.stringify(recipesResult));
      sessionStorage.setItem('lastGeneratedRecipes', JSON.stringify(recipesResult));
      localStorage.setItem('savedRecipeIds', JSON.stringify(savedRecipes.map(r => r.id)));

      // Just pass the recipe IDs - RecipeResults will fetch from DB
      const savedRecipeIds = savedRecipes.map((r: any) => r.id);
      console.log('[IngredientsAnalysis] Saved recipe IDs:', savedRecipeIds);

      // Keep showing finalizing state while polling database
      setCurrentState('finalizing');
      
      // Set polling flag to prevent redirect during polling
      isPolling.current = true;
      
      // Poll database to ensure recipes are retrievable before redirecting
      let recipesReady = false;
      let attempts = 0;
      const maxAttempts = 15;

      console.log('[IngredientsAnalysis] Starting polling to verify recipes are retrievable...');

      while (attempts < maxAttempts && !recipesReady) {
        attempts++;
        console.log(`[IngredientsAnalysis] Poll attempt ${attempts}/${maxAttempts}...`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const verifyResponse = await fetch(`/api/food-logs?ids=${savedRecipeIds.join(',')}`, {
            credentials: 'include'
          });

          if (verifyResponse.ok) {
            const verifiedData = await verifyResponse.json();
            const verifiedRecipes = Array.isArray(verifiedData) ? verifiedData : verifiedData.logs || [];

            console.log(`[IngredientsAnalysis] Poll ${attempts}: Found ${verifiedRecipes.length} recipes in database`);

            if (verifiedRecipes.length === savedRecipeIds.length) {
              console.log('[IngredientsAnalysis] ✓ All recipes verified in database!');
              recipesReady = true;
              break;
            }
          }
        } catch (pollError) {
          console.error(`[IngredientsAnalysis] Poll attempt ${attempts} error:`, pollError);
        }
      }

      // Store ingredients data so RecipeResults can generate more recipes
      localStorage.setItem('recipeIngredientsData', JSON.stringify(ingredients));

      // Clear polling flag
      isPolling.current = false;
      
      // Now set complete and clean up before redirecting
      setCurrentState('complete');
      localStorage.removeItem('analyzingIngredientsImage');

      if (recipesReady) {
        console.log('[IngredientsAnalysis] Recipes verified! Redirecting to /recipe-results');
        setLocation(`/recipe-results?ids=${savedRecipeIds.join(',')}`);
      } else {
        console.warn('[IngredientsAnalysis] Timeout waiting for recipes, redirecting anyway...');
        setLocation(`/recipe-results?ids=${savedRecipeIds.join(',')}`);
      }
    } catch (error) {
      console.error('Recipe Generation Error:', error);
      setCurrentState('error');
      isPolling.current = false;

      toast({
        title: t('common:ingredientsAnalysis.errors.generationError'),
        description: error instanceof Error ? error.message : t('common:ingredientsAnalysis.errors.tryAgain'),
        variant: "destructive",
      });

      setTimeout(() => {
        setLocation('/scan-recipe');
      }, 2000);
    }
  };

  if (!imageData) {
    return null;
  }

  // Helper function to determine step status
  const getStepStatus = (stepId: AnalysisState): 'completed' | 'current' | 'pending' => {
    const stepOrder: AnalysisState[] = ['detecting', 'analyzing', 'generating', 'finalizing'];
    const currentIndex = stepOrder.indexOf(currentState);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (currentState === 'complete') return 'completed';
    if (currentState === 'error') return stepIndex < currentIndex ? 'completed' : 'pending';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const isComplete = currentState === 'complete';
  const hasError = currentState === 'error';

  // Get current step message
  const getCurrentStepMessage = () => {
    switch (currentState) {
      case 'detecting':
        return t('common:ingredientsAnalysis.messages.scanning');
      case 'analyzing':
        return t('common:ingredientsAnalysis.messages.findingCombinations');
      case 'generating':
        return t('common:ingredientsAnalysis.messages.creatingRecipes');
      case 'finalizing':
        return t('common:ingredientsAnalysis.messages.addingTouches');
      case 'complete':
        return t('common:ingredientsAnalysis.messages.recipesReady');
      case 'error':
        return t('common:ingredientsAnalysis.messages.somethingWrong');
      default:
        return t('common:ingredientsAnalysis.messages.processing');
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.2, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-[#26A8FF]/20 to-cyan-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.3, 0.2],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center px-5 py-8 overflow-y-auto"
        style={{ 
          paddingTop: 'max(32px, env(safe-area-inset-top, 32px))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))'
        }}
      >
        {/* Main Content Container */}
        <div className={`w-full max-w-md space-y-8 ${currentState !== 'confirming' ? 'min-h-full flex flex-col justify-center' : ''}`}>
          
          {/* Image with Circular Progress Ring */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              {/* Progress Ring */}
              <svg className="absolute inset-0 -m-3 w-[calc(100%+24px)] h-[calc(100%+24px)]" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="rgba(38, 168, 255, 0.1)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ 
                    strokeDashoffset: isComplete ? 0 : hasError ? 283 : 
                      currentState === 'detecting' ? 212 :
                      currentState === 'analyzing' ? 141 :
                      currentState === 'generating' ? 71 :
                      currentState === 'finalizing' ? 20 : 283
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#26A8FF" />
                    <stop offset="100%" stopColor="#0EA5E9" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Image */}
              <div className="relative w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white">
                <img 
                  src={imageData} 
                  alt="Analyzing ingredients" 
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning Pulse Effect */}
                {!isComplete && !hasError && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 bg-[#26A8FF] rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                      className="absolute inset-0 bg-cyan-500 rounded-full"
                    />
                  </>
                )}

                {/* Success Overlay */}
                <AnimatePresence>
                  {isComplete && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-br from-green-500/90 to-emerald-500/90 backdrop-blur-sm flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                      >
                        <Check className="w-24 h-24 text-white" strokeWidth={3} />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Status Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-3"
          >
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentState}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-3xl font-bold bg-gradient-to-r from-[#26A8FF] to-cyan-600 bg-clip-text text-transparent"
              >
                {getCurrentStepMessage()}
              </motion.h1>
            </AnimatePresence>
            
            <p className="text-gray-600 text-sm">
              {isComplete ? 'Your personalized recipes are ready!' : 
               hasError ? 'Please try again' :
               'Our AI chef is working on your recipes'}
            </p>
          </motion.div>

          {/* Step Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center items-center gap-3"
          >
            {analysisSteps.map((step, index) => {
              const status = getStepStatus(step.id);
              const isStepComplete = status === 'completed';
              const isStepCurrent = status === 'current';

              return (
                <React.Fragment key={step.id}>
                  {/* Step Dot */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: isStepCurrent ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ 
                      delay: 0.5 + index * 0.1, 
                      type: "spring",
                      scale: { duration: 1, repeat: isStepCurrent ? Infinity : 0 }
                    }}
                    className={`w-3 h-3 rounded-full transition-all duration-300 z-10 ${
                      isStepComplete ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50' :
                      isStepCurrent ? 'bg-gradient-to-br from-[#26A8FF] to-cyan-500 shadow-lg shadow-blue-500/50' :
                      'bg-gray-300'
                    }`}
                  />
                  
                  {/* Connecting Line */}
                  {index < analysisSteps.length - 1 && (
                    <div className="relative w-8 h-0.5 bg-gray-300">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isStepComplete ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 origin-left"
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </motion.div>

          {/* Current Step Label */}
          <AnimatePresence mode="wait">
            {!isComplete && !hasError && currentState !== 'confirming' && (
              <motion.div
                key={currentState}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
                  <Loader2 className="w-4 h-4 text-[#26A8FF] animate-spin" />
                  <span className="text-sm font-medium text-gray-700">
                    {analysisSteps.find(s => s.id === currentState)?.label || 'Processing...'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ingredient Confirmation Screen */}
          <AnimatePresence>
            {currentState === 'confirming' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full space-y-6"
              >
                {/* Ingredients List */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{t('common:ingredientsAnalysis.confirmation.title')}</h2>
                    <Button
                      onClick={handleAddIngredient}
                      size="sm"
                      className="bg-gradient-to-r from-[#26A8FF] to-cyan-500 hover:from-[#1a8fdf] hover:to-cyan-600"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t('common:ingredientsAnalysis.confirmation.add')}
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {detectedIngredients.map((ingredient, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-4 border border-cyan-200"
                      >
                        {editingIndex === index ? (
                          <div className="space-y-3">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder={t('common:ingredientsAnalysis.confirmation.ingredientName')}
                              className="bg-white"
                            />
                            <div className="flex gap-2">
                              <Input
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                placeholder={t('common:ingredientsAnalysis.confirmation.quantity')}
                                className="bg-white flex-1"
                              />
                              <Input
                                value={editUnit}
                                onChange={(e) => setEditUnit(e.target.value)}
                                placeholder={t('common:ingredientsAnalysis.confirmation.unit')}
                                className="bg-white flex-1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleSaveEdit}
                                size="sm"
                                className="flex-1 bg-green-500 hover:bg-green-600"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                {t('common:ingredientsAnalysis.confirmation.save')}
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                size="sm"
                                variant="outline"
                                className="flex-1"
                              >
                                <X className="w-4 h-4 mr-1" />
                                {t('common:ingredientsAnalysis.confirmation.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{ingredient.name}</p>
                              {(ingredient.quantity || ingredient.unit) && (
                                <p className="text-sm text-gray-600">
                                  {ingredient.quantity} {ingredient.unit}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEditIngredient(index)}
                                size="sm"
                                variant="ghost"
                                className="text-[#26A8FF] hover:text-[#1a8fdf] hover:bg-cyan-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleRemoveIngredient(index)}
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">{t('common:ingredientsAnalysis.confirmation.difficultyTitle')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[{key: 'Easy', label: t('common:ingredientsAnalysis.confirmation.easy')}, {key: 'Medium', label: t('common:ingredientsAnalysis.confirmation.medium')}, {key: 'Hard', label: t('common:ingredientsAnalysis.confirmation.hard')}].map((level) => (
                      <button
                        key={level.key}
                        onClick={() => setDifficulty(level.key)}
                        className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                          difficulty === level.key
                            ? 'bg-gradient-to-r from-[#26A8FF] to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleConfirmAndGenerate}
                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-[#26A8FF] to-cyan-500 hover:from-[#1a8fdf] hover:to-cyan-600 rounded-2xl shadow-xl"
                  disabled={detectedIngredients.length === 0}
                >
                  <ChefHat className="w-5 h-5 mr-2" />
                  {t('common:ingredientsAnalysis.confirmation.continueButton')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", delay: 0.3 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-6 shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <ChefHat className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-green-800">Amazing!</p>
                    <p className="text-sm text-green-700 mt-0.5">Your custom recipes are ready to view</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {hasError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 shadow-xl"
              >
                <p className="text-center text-red-700 font-medium">
                  Unable to analyze ingredients. Redirecting back...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
