import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useRoute } from 'wouter';
import { Sparkles, Check, Loader2, ChefHat, Scale, Flame, Beef } from 'lucide-react';

interface AnalysisStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  duration: number;
}

const analysisSteps: AnalysisStep[] = [
  { id: 'detecting', label: 'Detecting food items...', icon: <ChefHat className="w-5 h-5" />, duration: 8000 },
  { id: 'analyzing', label: 'Analyzing ingredients...', icon: <Scale className="w-5 h-5" />, duration: 15000 },
  { id: 'calculating', label: 'Calculating nutrition...', icon: <Flame className="w-5 h-5" />, duration: 10000 },
  { id: 'finalizing', label: 'Finalizing details...', icon: <Beef className="w-5 h-5" />, duration: 6000 },
];

export default function MealAnalysis() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/meal-analysis/:image');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Get image from route params or localStorage
  const imageData = params?.image ? decodeURIComponent(params.image) : localStorage.getItem('analyzingMealImage');

  useEffect(() => {
    if (!imageData) {
      setLocation('/add-food');
      return;
    }

    // Simulate analysis progress
    let stepIndex = 0;
    const intervals: NodeJS.Timeout[] = [];

    const progressThroughSteps = () => {
      if (stepIndex < analysisSteps.length) {
        setCurrentStep(stepIndex);
        
        const timer = setTimeout(() => {
          setCompletedSteps(prev => new Set(prev).add(stepIndex));
          stepIndex++;
          progressThroughSteps();
        }, analysisSteps[stepIndex].duration);
        
        intervals.push(timer);
      } else {
        setAnalysisComplete(true);
        // Clean up image from localStorage after completion
        localStorage.removeItem('analyzingMealImage');
        
        // Get the food log ID and redirect to food detail page
        const foodId = localStorage.getItem('analyzedFoodId');
        setTimeout(() => {
          if (foodId) {
            localStorage.removeItem('analyzedFoodId'); // Clean up
            setLocation(`/food/${foodId}`);
          } else {
            // Fallback to dashboard if no ID found
            setLocation('/dashboard');
          }
        }, 2000);
      }
    };

    progressThroughSteps();

    return () => {
      intervals.forEach(clearTimeout);
    };
  }, [imageData, setLocation]);

  if (!imageData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-gray-50/30 to-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100/50"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Analyzing Your Meal</h1>
              <p className="text-sm text-gray-500">AI is processing your food photo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 overflow-auto"
        style={{ 
          paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))'
        }}
      >
        <div className="max-w-md mx-auto px-5 py-6">
          {/* Image Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-6"
          >
            <div className="relative aspect-[4/3] bg-gray-100">
              <img 
                src={imageData} 
                alt="Analyzing meal" 
                className="w-full h-full object-cover"
              />
              {/* Scanning Animation Overlay */}
              {!analysisComplete && (
                <motion.div
                  initial={{ top: 0 }}
                  animate={{ top: '100%' }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear",
                    repeatDelay: 0.5 
                  }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#26A8FF] to-transparent"
                  style={{ filter: 'blur(2px)' }}
                />
              )}
              
              {/* Success Checkmark */}
              <AnimatePresence>
                {analysisComplete && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl">
                      <Check className="w-10 h-10 text-white" strokeWidth={3} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Analysis Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6"
          >
            <div className="space-y-4">
              {analysisSteps.map((step, index) => {
                const isCompleted = completedSteps.has(index);
                const isCurrent = currentStep === index && !isCompleted;
                const isPending = index > currentStep;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      isCompleted 
                        ? 'bg-green-50 border border-green-100' 
                        : isCurrent 
                          ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100'
                          : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    {/* Icon/Status */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : isCurrent
                          ? 'bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6]'
                          : 'bg-gray-200'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                      ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <div className="text-white opacity-50">{step.icon}</div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${
                        isCompleted 
                          ? 'text-green-700' 
                          : isCurrent 
                            ? 'text-[#26A8FF]'
                            : 'text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: step.duration / 1000, ease: 'linear' }}
                          className="h-1 bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] rounded-full mt-2"
                        />
                      )}
                    </div>

                    {/* Status Indicator */}
                    {isCurrent && (
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-[#26A8FF]"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 rounded-full bg-[#26A8FF]"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 rounded-full bg-[#26A8FF]"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Completion Message */}
            <AnimatePresence>
              {analysisComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-700">Analysis Complete!</p>
                      <p className="text-xs text-green-600 mt-0.5">Adding to your food log...</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Fun Fact Card */}
          {!analysisComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100"
            >
              <p className="text-xs font-semibold text-purple-700 mb-1">💡 Did you know?</p>
              <p className="text-xs text-purple-600 leading-relaxed">
                Our AI can identify over 10,000 different foods and accurately estimate portion sizes from photos!
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
