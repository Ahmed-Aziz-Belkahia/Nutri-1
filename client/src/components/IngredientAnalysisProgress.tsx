import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Eye, Sparkles, Search } from 'lucide-react';

interface IngredientAnalysisProgressProps {
  isVisible: boolean;
}

const IngredientAnalysisProgress: React.FC<IngredientAnalysisProgressProps> = ({ isVisible }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      return;
    }

    // Simulate progress through steps
    const timers = [
      setTimeout(() => setCurrentStep(1), 2000),  // Step 1 completes after 2s
      setTimeout(() => setCurrentStep(2), 5000),  // Step 2 completes after 5s (2+3)
      setTimeout(() => setCurrentStep(3), 7000),  // Step 3 completes after 7s (5+2)
      setTimeout(() => setCurrentStep(4), 10000), // Step 4 completes after 10s (7+3)
    ];

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const steps = [
    { icon: Eye, text: "Skanowanie obrazu", duration: 2, delay: 0 },
    { icon: Search, text: "Identyfikacja składników", duration: 3, delay: 2 },
    { icon: Sparkles, text: "Analiza jakości", duration: 2, delay: 5 },
    { icon: ChefHat, text: "Generowanie przepisów", duration: 3, delay: 7 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 px-6"
    >
      {/* Main animation circle - matches screenshot design */}
      <div className="relative w-48 h-48 mb-16">
        {/* Background circle with subtle pattern */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#B8E5E5]/30 to-[#A8D8D8]/30" />
        
        {/* Animated progress ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, #4FD1C7 180deg, transparent 360deg)`,
          }}
        />
        
        {/* Inner circle with chef icon */}
        <div className="absolute inset-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="text-[#4FD1C7]"
          >
            <ChefHat className="h-12 w-12" />
          </motion.div>
        </div>

        {/* Floating particles around the circle */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: `linear-gradient(135deg, #4FD1C7, #7FDBDA)`,
              top: '50%',
              left: '50%',
              transformOrigin: `0 ${80 + i * 8}px`,
            }}
            animate={{
              rotate: 360,
              scale: [0.5, 1, 0.5],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Progress steps - styled to match screenshot */}
      <div className="space-y-4 w-full max-w-md">
        {steps.map((step, index) => {
          const isActive = index === currentStep && currentStep < steps.length; // Currently processing step
          const isCompleted = index < currentStep; // Completed steps
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex items-center space-x-4"
            >
              {/* Icon circle */}
              <motion.div
                animate={isActive ? {
                  scale: [1, 1.1, 1],
                  backgroundColor: ['#4FD1C7', '#7FDBDA', '#4FD1C7']
                } : {}}
                transition={{
                  duration: 2,
                  repeat: isActive ? Infinity : 0
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                  isCompleted ? 'bg-green-500' : 
                  isActive ? 'bg-[#4FD1C7]' : 
                  'bg-gray-300'
                }`}
              >
                <motion.div
                  animate={isActive ? {
                    rotate: [0, 360]
                  } : {}}
                  transition={{
                    duration: 3,
                    repeat: isActive ? Infinity : 0,
                    ease: "linear"
                  }}
                >
                  <step.icon className="h-7 w-7 text-white" />
                </motion.div>
              </motion.div>
              
              {/* Step text */}
              <div className="flex-1">
                <motion.p
                  animate={isActive ? {
                    opacity: [0.8, 1, 0.8]
                  } : {}}
                  transition={{
                    duration: 1.5,
                    repeat: isActive ? Infinity : 0
                  }}
                  className={`font-semibold text-lg ${
                    isCompleted ? 'text-green-600' :
                    isActive ? 'text-gray-700' :
                    'text-gray-400'
                  }`}
                >
                  {step.text}
                </motion.p>
              </div>

              {/* Progress bar - matches screenshot style */}
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ 
                    width: isCompleted ? "100%" : 
                           isActive ? "100%" : 
                           "0%" 
                  }}
                  transition={{
                    duration: isActive ? step.duration : 0.5,
                    ease: "easeOut"
                  }}
                  className={`h-full rounded-full ${
                    isCompleted ? 'bg-green-500' :
                    isActive ? 'bg-gradient-to-r from-[#4FD1C7] to-[#7FDBDA]' :
                    'bg-gray-300'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom text - exactly matching screenshot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="mt-16 text-center"
      >
        <p className="text-gray-800 font-bold text-xl mb-3">
          Analiza AI w trakcie
        </p>
        <p className="text-gray-500 text-base">
          Zwykle trwa 30-60 sekund
        </p>
      </motion.div>

      {/* Animated dots indicator - matching screenshot */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="flex space-x-2 mt-8"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.4, 1, 0.4],
              backgroundColor: ['#4FD1C7', '#7FDBDA', '#4FD1C7']
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
            className="w-3 h-3 bg-[#4FD1C7] rounded-full"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default IngredientAnalysisProgress;