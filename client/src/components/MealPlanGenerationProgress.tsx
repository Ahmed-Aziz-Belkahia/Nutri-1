import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMealPlanProgress } from '@/hooks/use-meal-plan-progress';
import { 
  ChefHat, 
  Brain, 
  Target, 
  Sparkles, 
  Flame, 
  Calendar, 
  Utensils, 
  Save, 
  CheckCircle, 
  Clock, 
  Loader2,
  Check
} from 'lucide-react';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: number;
}

const getProgressSteps = (dayCount: number = 7): ProgressStep[] => {
  const steps: ProgressStep[] = [
    {
      id: 'analyzing',
      title: 'Analyzing preferences',
      description: 'Processing nutritional goals',
      icon: <Brain className="w-5 h-5" />,
      duration: 500
    },
    {
      id: 'calculating',
      title: 'Calculating macros',
      description: 'Setting optimal macros',
      icon: <Target className="w-5 h-5" />,
      duration: 500
    }
  ];

  // Add dynamic day steps based on plan length
  // Backend takes ~1-2 seconds per day for AI generation + 1 second delay between days
  const perDayDuration = 2500; // Realistic timing for OpenAI API call + delay
  
  for (let i = 1; i <= dayCount; i++) {
    steps.push({
      id: `day${i}`,
      title: `Generating Day ${i}`,
      description: `Creating meals for day ${i}`,
      icon: <Calendar className="w-5 h-5" />,
      duration: perDayDuration
    });
  }

  // Add final steps
  steps.push(
    {
      id: 'optimizing',
      title: 'Optimizing balance',
      description: `Fine-tuning nutrition for ${dayCount} days`,
      icon: <Flame className="w-5 h-5" />,
      duration: 800
    },
    {
      id: 'shopping',
      title: 'Creating shopping list',
      description: 'Generating weekly grocery list',
      icon: <Utensils className="w-5 h-5" />,
      duration: 1500
    },
    {
      id: 'saving',
      title: 'Saving plan',
      description: 'Storing everything',
      icon: <Save className="w-5 h-5" />,
      duration: 1000
    }
  );

  return steps;
};

interface MealPlanGenerationProgressProps {
  dayCount?: number;
}

export default function MealPlanGenerationProgress({ dayCount = 7 }: MealPlanGenerationProgressProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const progressSteps = getProgressSteps(dayCount);
  
  // Poll for real-time progress from backend
  const { data: progress } = useMealPlanProgress(true);
  
  // Check if generation is actually in progress
  const isActuallyInProgress = progress?.inProgress !== false;
  
  // Calculate current step and progress based on real backend data
  const currentDay = progress?.currentDay || 0;
  const totalDays = progress?.totalDays || dayCount;
  const currentMessage = progress?.message || 'Starting meal plan generation';
  const backendStep = progress?.step || 'analyzing';
  
  // If backend reports not in progress, show completion state
  const effectiveStep = !isActuallyInProgress ? 'completed' : backendStep;
  
  // Determine which step we're on based on backend step and currentDay
  let currentStepIndex = 0;
  if (effectiveStep === 'analyzing') {
    currentStepIndex = 0;
  } else if (effectiveStep === 'calculating') {
    currentStepIndex = 1;
  } else if (effectiveStep === 'generating' && currentDay > 0) {
    currentStepIndex = 1 + currentDay; // 2 initial steps + current day
  } else if (effectiveStep === 'saving' || effectiveStep === 'completed') {
    currentStepIndex = progressSteps.length - 1; // saving step (last)
  } else if (effectiveStep === 'shopping') {
    currentStepIndex = progressSteps.length - 2; // shopping list step
  } else if (effectiveStep === 'optimizing') {
    currentStepIndex = progressSteps.length - 3; // optimizing step
  }
  
  // Calculate accurate progress percentage based on actual day progress
  let progressPercent = 5;
  if (effectiveStep === 'analyzing') {
    progressPercent = 5;
  } else if (effectiveStep === 'calculating') {
    progressPercent = 10;
  } else if (effectiveStep === 'generating' && currentDay > 0) {
    progressPercent = 10 + ((currentDay / totalDays) * 70); // 10% to 80%
  } else if (effectiveStep === 'optimizing') {
    progressPercent = 85;
  } else if (effectiveStep === 'shopping') {
    progressPercent = 92;
  } else if (effectiveStep === 'saving') {
    progressPercent = 97;
  } else if (effectiveStep === 'completed' || !isActuallyInProgress) {
    progressPercent = 100;
  }
  
  // Mark steps as completed based on actual progress
  useEffect(() => {
    const completed: string[] = [];
    
    // If not in progress, mark everything as complete
    if (!isActuallyInProgress) {
      progressSteps.forEach(step => completed.push(step.id));
      setCompletedSteps(completed);
      return;
    }
    
    // Mark analyzing as complete if we're past it
    if (effectiveStep !== 'analyzing') {
      completed.push('analyzing');
    }
    
    // Mark calculating as complete if we're past it
    if (effectiveStep !== 'analyzing' && effectiveStep !== 'calculating') {
      completed.push('calculating');
    }
    
    // Mark completed days
    if (effectiveStep === 'generating' && currentDay > 0) {
      for (let i = 1; i < currentDay; i++) {
        completed.push(`day${i}`);
      }
    }
    
    // If saving, shopping, or optimizing, mark all days complete
    if (effectiveStep === 'optimizing' || effectiveStep === 'shopping' || effectiveStep === 'saving' || effectiveStep === 'completed') {
      for (let i = 1; i <= totalDays; i++) {
        completed.push(`day${i}`);
      }
      if (effectiveStep === 'shopping' || effectiveStep === 'saving' || effectiveStep === 'completed') {
        completed.push('optimizing');
      }
      if (effectiveStep === 'saving' || effectiveStep === 'completed') {
        completed.push('shopping');
      }
      if (effectiveStep === 'completed') {
        completed.push('saving');
      }
    }
    
    setCompletedSteps(completed);
  }, [currentDay, effectiveStep, totalDays, isActuallyInProgress, progressSteps]);

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-3">
      <div className="w-full max-w-sm bg-white shadow-lg rounded-xl overflow-hidden border-0">
        <div className="p-6">
          {/* Header with icon and title - matching quiz style */}
          <div className="text-center mb-5">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#0CC5BA]/10 to-[#0091ff]/10 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-[#0CC5BA]" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              Creating Your Meal Plan
            </h1>
            <p className="text-gray-600 text-sm">
              We're analyzing your preferences and building your personalized nutrition plan
            </p>
          </div>

          {/* Progress Bar - matching quiz style */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span className="text-[#0CC5BA] font-semibold">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] transition-all duration-300 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Current Step Indicator - matching quiz card style */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-5"
            >
              <div className="p-3 rounded-lg border border-[#0CC5BA]/20 bg-[#0CC5BA]/5">
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-4 h-4 text-[#0CC5BA]" />
                  </motion.div>
                  <span className="text-xs font-medium text-gray-700">
                    {currentMessage}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress Steps Grid - compact quiz-style cards */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {progressSteps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStepIndex === index;
              
              return (
                <motion.div
                  key={step.id}
                  className={`relative p-3 rounded-xl border-2 cursor-default transition-all duration-300 ${
                    isCompleted 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : isCurrent 
                      ? 'border-[#0CC5BA] bg-[#0CC5BA]/5 scale-105' 
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: isCurrent ? 1.05 : 1 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  {/* Icon */}
                  <div className={`mb-2 ${
                    isCompleted ? 'text-green-500' : isCurrent ? 'text-[#0CC5BA]' : 'text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  
                  {/* Content */}
                  <h3 className={`text-xs font-bold mb-1 leading-tight ${
                    isCompleted ? 'text-green-600' : isCurrent ? 'text-gray-800' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h3>
                  
                  {/* Status indicators */}
                  {isCurrent && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-[#0CC5BA] rounded-full flex items-center justify-center"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </motion.div>
                  )}
                  
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Info - matching quiz footer style */}
          <div className="text-center pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-2 text-gray-500 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs">
                Estimated time: {dayCount === 3 ? '10-15' : dayCount === 7 ? '20-30' : '40-60'} seconds
              </span>
            </div>
            <p className="text-gray-500 text-xs">
              Generating {dayCount} days of personalized meals with AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}