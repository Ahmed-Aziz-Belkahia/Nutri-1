import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Camera, Sparkles, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { ANALYSIS_EVENTS } from "./ScannerUI";

interface AnalyzingMealCardProps {
  isAnalyzing: boolean;
  mealData?: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image?: string;
  };
  onAnalysisComplete?: () => void;
}

export default function AnalyzingMealCard({ 
  isAnalyzing, 
  mealData,
  onAnalysisComplete
}: AnalyzingMealCardProps) {
  const [progress, setProgress] = useState(0);
  const [isGlowing, setIsGlowing] = useState(false);
  
  // Listen for progress updates from the analysis events
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      console.log('[AnalyzingMealCard] Progress update:', event.detail.progress);
      // Update progress state from the event
      if (event.detail.progress) {
        setProgress(event.detail.progress);
      }
    };
    
    // Add event listener for progress updates
    document.addEventListener(ANALYSIS_EVENTS.PROGRESS, handleProgressUpdate as EventListener);
    
    // Cleanup
    return () => {
      document.removeEventListener(ANALYSIS_EVENTS.PROGRESS, handleProgressUpdate as EventListener);
    };
  }, []);
  
  // Simulate progress when isAnalyzing is true and there are no external updates
  useEffect(() => {
    if (isAnalyzing && progress === 0) {
      // Start at 30% to show immediate progress after redirect
      setProgress(30);
      
      // Periodically pulse the card to draw attention
      const pulseInterval = setInterval(() => {
        setIsGlowing(prev => !prev);
      }, 2000);
      
      // Gradually increase progress
      const interval = setInterval(() => {
        setProgress(prev => {
          // Slow down as we approach 90%
          const increment = prev < 30 ? 5 : prev < 60 ? 3 : prev < 80 ? 2 : 1;
          const newProgress = Math.min(prev + increment, 90);
          return newProgress;
        });
      }, 200);

      return () => {
        clearInterval(interval);
        clearInterval(pulseInterval);
      };
    } else if (!isAnalyzing && mealData && progress < 100) {
      // When meal data is available, quickly complete the progress
      setProgress(100);
      
      // Call the onAnalysisComplete callback after animation finishes
      const timeout = setTimeout(() => {
        onAnalysisComplete?.();
      }, 800);
      
      return () => clearTimeout(timeout);
    }
  }, [isAnalyzing, mealData, progress, onAnalysisComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <Card 
        className={`overflow-hidden hover:shadow-md transition-all duration-500 ${
          isAnalyzing && isGlowing ? 'shadow-md shadow-[#0CC5BA]/20 border-[#0CC5BA]/30' : ''
        }`}
      >
        {/* Subtle top accent line when analyzing */}
        {isAnalyzing && (
          <div className="h-0.5 bg-gradient-to-r from-[#0CC5BA]/0 via-[#0CC5BA] to-[#0CC5BA]/0 animate-pulse"></div>
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center p-2">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              {/* Blurred image or placeholder */}
              <div className={`w-full h-full flex items-center justify-center ${isAnalyzing || !mealData?.image ? 'bg-gray-100' : ''}`}>
                {mealData?.image ? (
                  <div className="w-full h-full">
                    <img
                      src={mealData.image}
                      alt="Food"
                      className={`w-full h-full object-cover transition-all duration-700 ${isAnalyzing ? 'blur-sm' : 'blur-0'}`}
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: [0.5, 1, 0.5],
                            scale: [0.95, 1.05, 0.95]
                          }}
                          transition={{ 
                            repeat: Infinity,
                            duration: 2,
                            ease: "easeInOut" 
                          }}
                          className="text-center"
                        >
                          <Camera className="h-6 w-6 text-[#0CC5BA] mx-auto drop-shadow-md" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Camera className="h-4 w-4 text-gray-400" />
                )}
              </div>
              
              {/* Processing indicator dots */}
              {isAnalyzing && (
                <div className="absolute bottom-1 right-1">
                  <motion.div 
                    className="flex gap-1"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ scale: [0.8, 1.1, 0.8] }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1, 
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                        className="w-1.5 h-1.5 bg-[#0CC5BA] rounded-full"
                      />
                    ))}
                  </motion.div>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 ml-2">
              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <motion.div 
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ 
                          repeat: Infinity,
                          duration: 1.5,
                          ease: "easeInOut" 
                        }}
                      >
                        <div className="text-sm font-medium text-gray-700">Analyzing food...</div>
                      </motion.div>
                    </div>
                    
                    {/* Enhanced animated progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 flex items-center gap-1">
                          <span>AI analyzing your food</span>
                          {progress >= 50 && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-[#0CC5BA] font-medium"
                            >
                              • identifying ingredients
                            </motion.span>
                          )}
                        </span>
                        <span className="font-medium text-[#0CC5BA]">{progress}%</span>
                      </div>
                      
                      <div className="h-2 relative w-full bg-gray-100 overflow-hidden rounded-full">
                        {/* Base progress bar */}
                        <motion.div 
                          className="h-full absolute left-0 top-0 bg-gradient-to-r from-[#0CC5BA] to-blue-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                        
                        {/* Animated shimmer effect */}
                        <motion.div 
                          className="h-full absolute left-0 top-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['0%', '100%'] }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1.5,
                            ease: 'linear',
                          }}
                          style={{ translateX: '-100%' }}
                        />
                      </div>
                      
                      {/* Extra hint of what's happening at each stage */}
                      <AnimatePresence mode="wait">
                        {progress < 40 ? (
                          <motion.div 
                            key="scanning"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-[10px] text-gray-500">AI Vision processing your image...</p>
                          </motion.div>
                        ) : progress < 75 ? (
                          <motion.div 
                            key="analyzing"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-[10px] text-gray-500">Identifying foods and calculating nutrition...</p>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="finishing"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-[10px] text-gray-500">Almost done! Finalizing analysis...</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="completed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1.5"
                  >
                    {mealData ? (
                      <>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-[#0CC5BA] transition-colors">
                              {mealData.name}
                            </h3>
                          </div>
                          <span className="text-xs font-medium text-[#0CC5BA]">
                            {mealData.calories} kcal
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-500">
                            Protein: {mealData.protein}g
                          </span>
                          <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                          <span className="text-[10px] text-gray-500">
                            Carbs: {mealData.carbs}g
                          </span>
                          <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                          <span className="text-[10px] text-gray-500">
                            Fat: {mealData.fat}g
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-medium text-gray-700">No meal data available</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Success reveal animation - small particles */}
          <AnimatePresence>
            {!isAnalyzing && progress === 100 && mealData && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative h-0.5"
              >
                <div className="absolute inset-x-0 top-0">
                  <div className="h-0.5 bg-gradient-to-r from-[#0CC5BA]/0 via-[#0CC5BA] to-[#0CC5BA]/0"></div>
                  
                  {/* Small glowing particles */}
                  <div className="relative h-0">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ 
                          x: `${30 + (i * 5)}%`, 
                          y: 0, 
                          opacity: 0, 
                          scale: 0 
                        }}
                        animate={{ 
                          y: [0, -20 - (i % 3) * 5], 
                          opacity: [0, 1, 0], 
                          scale: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 0.8 + (i % 3) * 0.2, 
                          delay: i * 0.06,
                          ease: "easeOut"
                        }}
                        className="absolute w-1.5 h-1.5 rounded-full bg-[#0CC5BA] shadow-lg shadow-[#0CC5BA]/20"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}