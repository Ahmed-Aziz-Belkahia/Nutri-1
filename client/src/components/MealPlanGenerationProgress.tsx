import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      title: 'Analizowanie preferencji',
      description: 'Przetwarzanie celów żywieniowych',
      icon: <Brain className="w-5 h-5" />,
      duration: 800
    },
    {
      id: 'calculating',
      title: 'Obliczanie składników',
      description: 'Ustalanie optymalnych makro',
      icon: <Target className="w-5 h-5" />,
      duration: 1000
    }
  ];

  // Add dynamic day steps based on plan length
  for (let i = 1; i <= dayCount; i++) {
    steps.push({
      id: `day${i}`,
      title: `Tworzenie Dzień ${i}`,
      description: `Generowanie posiłków na ${i === 1 ? 'pierwszy' : i === 2 ? 'drugi' : i === 3 ? 'trzeci' : `${i}. dzień`}`,
      icon: <Calendar className="w-5 h-5" />,
      duration: 1800
    });
  }

  // Add final steps
  steps.push(
    {
      id: 'optimizing',
      title: 'Optymalizacja równowagi',
      description: `Dostrojenie odżywiania ${dayCount === 3 ? 'weekendu' : dayCount === 7 ? 'tygodnia' : `${dayCount} dni`}`,
      icon: <Flame className="w-5 h-5" />,
      duration: 1000
    },
    {
      id: 'saving',
      title: 'Zapisywanie planu',
      description: 'Przechowywanie wszystkiego',
      icon: <Save className="w-5 h-5" />,
      duration: 1200
    }
  );

  return steps;
};

interface MealPlanGenerationProgressProps {
  dayCount?: number;
}

export default function MealPlanGenerationProgress({ dayCount = 7 }: MealPlanGenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStepText, setCurrentStepText] = useState('');
  const progressSteps = getProgressSteps(dayCount);

  useEffect(() => {
    const runProgress = async () => {
      for (let i = 0; i < progressSteps.length; i++) {
        const step = progressSteps[i];
        setCurrentStep(i);
        setCurrentStepText(step.title);

        // For the last step, set progress to 95% and stay there
        if (i === progressSteps.length - 1) {
          setProgress(95);
          // Don't mark the last step as completed until API finishes
          return;
        }

        // Animate progress for this step (up to 85% for all steps except last)
        const stepProgress = ((i + 1) / (progressSteps.length - 1)) * 85;
        setProgress(stepProgress);

        // Wait for step duration
        await new Promise(resolve => setTimeout(resolve, step.duration));

        // Mark step as completed
        setCompletedSteps(prev => [...prev, step.id]);
      }
    };

    runProgress();
  }, []);

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
              <span className="text-[#0CC5BA] font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] transition-all duration-300 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Current Step Indicator - matching quiz card style */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepText}
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
                    {currentStepText}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress Steps Grid - compact quiz-style cards */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {progressSteps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === index;
              
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
              <span className="text-xs">Estimated time: 10-20 seconds</span>
            </div>
            <p className="text-gray-500 text-xs">
              Using optimized AI for fast, accurate meal planning
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}