import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useRoute } from 'wouter';
import { Sparkles, Check, Loader2, ChefHat, Scale, Flame, Beef } from 'lucide-react';
import { analyzeFoodImage } from '@/lib/vision';
import { useFoodLog } from '@/hooks/use-food-log';
import { useToast } from '@/hooks/use-toast';

type AnalysisState = 'detecting' | 'analyzing' | 'calculating' | 'finalizing' | 'complete' | 'error';

interface AnalysisStep {
  id: AnalysisState;
  label: string;
  icon: React.ReactNode;
}

const analysisSteps: AnalysisStep[] = [
  { id: 'detecting', label: 'Detecting food items...', icon: <ChefHat className="w-5 h-5" /> },
  { id: 'analyzing', label: 'Analyzing ingredients...', icon: <Scale className="w-5 h-5" /> },
  { id: 'calculating', label: 'Calculating nutrition...', icon: <Flame className="w-5 h-5" /> },
  { id: 'finalizing', label: 'Finalizing details...', icon: <Beef className="w-5 h-5" /> },
];

export default function MealAnalysis() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/meal-analysis/:image');
  const [currentState, setCurrentState] = useState<AnalysisState>('detecting');
  const { addFood } = useFoodLog();
  const { toast } = useToast();
  const hasAnalyzed = useRef(false);
  const analysisStarted = useRef(false);

  // Get image from route params or localStorage
  const imageData = params?.image ? decodeURIComponent(params.image) : localStorage.getItem('analyzingMealImage');

  useEffect(() => {
    console.log('[MealAnalysis] Component mounted');
    console.log('[MealAnalysis] imageData exists:', !!imageData);
    console.log('[MealAnalysis] imageData length:', imageData?.length);
    
    if (!imageData) {
      console.log('[MealAnalysis] No image data found, redirecting to /add-food');
      setLocation('/add-food');
      return;
    }

    const checkAndAnalyze = async () => {
      // Prevent duplicate analysis - use a flag that persists across strict mode remounts
      if (analysisStarted.current) {
        console.log('[MealAnalysis] Analysis already started, skipping');
        return;
      }
      
      // Check if we already have a result stored from this session
      const storedResult = sessionStorage.getItem('lastAnalyzedFoodId');
      if (storedResult && hasAnalyzed.current) {
        console.log('[MealAnalysis] Found previous analysis result, redirecting to:', storedResult);
        setLocation(`/meal/${storedResult}`);
        return;
      }
      
      analysisStarted.current = true;
      hasAnalyzed.current = true;

      let isMounted = true;

    const performAnalysis = async () => {
      try {
        console.log('[MealAnalysis] Starting analysis...');
        
        // Step 1: Start detection
        setCurrentState('detecting');
        console.log('[MealAnalysis] State: detecting');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Min 1s for UX
        
        if (!isMounted) return;
        
        // Step 2: Analyzing (call API)
        setCurrentState('analyzing');
        console.log('[MealAnalysis] State: analyzing, calling API...');
        const result = await analyzeFoodImage(imageData);
        console.log('[MealAnalysis] API result:', result);
        
        if (!isMounted) return;

        if (!result || !result.name) {
          throw new Error('Invalid analysis result: Missing required data');
        }
        
        // Step 3: Calculating nutrition
        setCurrentState('calculating');
        await new Promise(resolve => setTimeout(resolve, 800)); // Min 0.8s for UX
        
        if (!isMounted) return;
        
        // Step 4: Finalizing - save to database
        setCurrentState('finalizing');
        
        const foodData = {
          name: result.name,
          calories: typeof result.calories === 'number' ? result.calories : 0,
          protein: typeof result.protein === 'number' ? result.protein : 0,
          carbs: typeof result.carbs === 'number' ? result.carbs : 0,
          fat: typeof result.fat === 'number' ? result.fat : 0,
          components: Array.isArray(result.components) ? result.components : [],
          image: imageData,
          description: result.description || undefined,
          ingredients: result.ingredients || undefined,
          instructions: result.instructions || undefined,
          prepTime: result.prepTime || undefined,
          cookTime: result.cookTime || undefined,
          servings: result.servings || 1,
          source: 'scanned' as const,
          isRecipe: !!(result.instructions && result.instructions.length > 0),
          cuisineType: result.cuisineType || undefined,
          mealType: result.mealType || undefined,
          difficulty: result.difficulty || undefined,
          tags: result.tags || undefined,
          isAnalyzing: true, // Tell backend we already analyzed this image
        };
        
        const response = await addFood(foodData);
        
        if (!isMounted) return;

        console.log('[MealAnalysis] addFood response:', response);
        
        // Complete!
        setCurrentState('complete');
        localStorage.removeItem('analyzingMealImage');
        
        // Store the food ID in sessionStorage so we can redirect on remount
        const foodId = response?.log?.id;
        if (foodId) {
          sessionStorage.setItem('lastAnalyzedFoodId', foodId.toString());
          console.log('[MealAnalysis] Stored analysis result, foodId:', foodId);
        }
        
        // Wait a moment to show success, then redirect
        setTimeout(() => {
          if (!isMounted) return;
          
          // Response structure: { log: { id: number, ... }, totals: {...} }
          console.log('[MealAnalysis] Extracted foodId:', foodId);
          
          if (foodId) {
            console.log('[MealAnalysis] Redirecting to /meal/' + foodId);
            sessionStorage.removeItem('lastAnalyzedFoodId'); // Clean up after redirect
            setLocation(`/meal/${foodId}`);
          } else {
            console.log('[MealAnalysis] No foodId found, redirecting to dashboard');
            setLocation('/dashboard');
          }
        }, 1500);
      } catch (error) {
        console.error('Analysis Error:', error);
        if (!isMounted) return;
        
        setCurrentState('error');
        localStorage.removeItem('analyzingMealImage');
        
        toast({
          title: "Analysis Error",
          description: "Failed to analyze your meal. Please try again.",
          variant: "destructive",
        });
        
        setTimeout(() => {
          if (isMounted) setLocation('/add-food');
        }, 2000);
      }
    };

    performAnalysis();

    return () => {
      isMounted = false;
    };
  };

  checkAndAnalyze();
  }, [imageData, setLocation, addFood, toast]);

  if (!imageData) {
    return null;
  }

  // Helper function to determine step status
  const getStepStatus = (stepId: AnalysisState): 'completed' | 'current' | 'pending' => {
    const stepOrder: AnalysisState[] = ['detecting', 'analyzing', 'calculating', 'finalizing'];
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
        return 'Scanning your food...';
      case 'analyzing':
        return 'Identifying ingredients...';
      case 'calculating':
        return 'Crunching the numbers...';
      case 'finalizing':
        return 'Almost done...';
      case 'complete':
        return 'All set!';
      case 'error':
        return 'Oops, something went wrong';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
          className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-[#26A8FF]/20 to-purple-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.3, 0.2],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-5 py-8"
        style={{ 
          paddingTop: 'max(32px, env(safe-area-inset-top, 32px))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))'
        }}
      >
        {/* Main Content Container */}
        <div className="w-full max-w-md space-y-8">
          
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
                      currentState === 'calculating' ? 71 :
                      currentState === 'finalizing' ? 20 : 283
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#26A8FF" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Image */}
              <div className="relative w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white">
                <img 
                  src={imageData} 
                  alt="Analyzing meal" 
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
                      className="absolute inset-0 bg-purple-500 rounded-full"
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
                className="text-3xl font-bold bg-gradient-to-r from-[#26A8FF] to-purple-600 bg-clip-text text-transparent"
              >
                {getCurrentStepMessage()}
              </motion.h1>
            </AnimatePresence>
            
            <p className="text-gray-600 text-sm">
              {isComplete ? 'Your meal has been analyzed successfully' : 
               hasError ? 'Please try again' :
               'Our AI is working its magic'}
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
                      isStepCurrent ? 'bg-gradient-to-br from-[#26A8FF] to-purple-500 shadow-lg shadow-blue-500/50' :
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
            {!isComplete && !hasError && (
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
                    <Check className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-green-800">Perfect!</p>
                    <p className="text-sm text-green-700 mt-0.5">Your meal has been added to your log</p>
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
                  Unable to analyze your meal. Redirecting back...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
