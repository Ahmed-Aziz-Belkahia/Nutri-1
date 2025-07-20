import React from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Eye, Sparkles, Search } from 'lucide-react';

interface IngredientAnalysisProgressProps {
  isVisible: boolean;
}

const IngredientAnalysisProgress: React.FC<IngredientAnalysisProgressProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  const steps = [
    { icon: Eye, text: "Skanowanie obrazu", duration: 2 },
    { icon: Search, text: "Identyfikacja składników", duration: 3 },
    { icon: Sparkles, text: "Analiza jakości", duration: 2 },
    { icon: ChefHat, text: "Generowanie przepisów", duration: 3 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50"
    >
      {/* Main animation circle */}
      <div className="relative w-40 h-40 mb-12">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0E95A7] border-r-[#0CC5BA]"
        />
        
        {/* Inner pulsing circle */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-6 rounded-full bg-gradient-to-br from-[#0E95A7]/20 to-[#0CC5BA]/20 flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="text-[#0E95A7]"
          >
            <ChefHat className="h-16 w-16" />
          </motion.div>
        </motion.div>

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-[#0E95A7] rounded-full"
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: `0 ${60 + i * 5}px`,
            }}
            animate={{
              rotate: 360,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Progress steps */}
      <div className="space-y-6 w-full max-w-sm">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.5 }}
            className="flex items-center space-x-4"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: step.duration,
                repeat: Infinity,
                delay: index * 0.3
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0E95A7] to-[#0CC5BA] flex items-center justify-center"
            >
              <step.icon className="h-6 w-6 text-white" />
            </motion.div>
            
            <div className="flex-1">
              <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.3
                }}
                className="text-gray-800 font-medium"
              >
                {step.text}
              </motion.p>
            </div>

            {/* Progress bar */}
            <div className="w-20 h-1 bg-gray-300 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: step.duration,
                  repeat: Infinity,
                  delay: index * 0.5,
                  ease: "easeInOut"
                }}
                className="h-full bg-gradient-to-r from-[#0E95A7] to-[#0CC5BA]"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-12 text-center"
      >
        <p className="text-gray-800 font-semibold text-lg mb-2">
          Analiza AI w trakcie
        </p>
        <p className="text-gray-600 text-sm">
          Zwykle trwa 30-60 sekund
        </p>
      </motion.div>

      {/* Animated progress indicator */}
      <div className="flex space-x-1 mt-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.15
            }}
            className="w-2 h-2 bg-[#0E95A7] rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
};

export default IngredientAnalysisProgress;