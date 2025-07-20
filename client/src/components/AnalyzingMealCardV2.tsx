import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { analyzeFoodImage } from "../lib/vision";
import { useFoodLog } from "../hooks/use-food-log";
import { useToast } from "@/hooks/use-toast";

interface AnalyzingMealCardV2Props {
  meal: {
    id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image?: string;
    createdAt: string;
  };
  onAnalysisComplete?: () => void;
}

export default function AnalyzingMealCardV2({ meal, onAnalysisComplete }: AnalyzingMealCardV2Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const { updateFood } = useFoodLog();
  const { toast } = useToast();

  // Check if this meal needs analysis (placeholder meal or has image but minimal data)
  const needsAnalysis = (
    (meal.name === "Analizowanie..." && meal.calories === 0 && meal.image) ||
    (meal.image && meal.calories <= 150 && meal.protein <= 5) // Simple food items that likely need better analysis
  );

  useEffect(() => {
    if (needsAnalysis && meal.image) {
      performAnalysis();
    }
  }, [needsAnalysis, meal.image]);

  const performAnalysis = async () => {
    if (!meal.image) return;

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalysisError(null);
    setAnalysisStep("Przygotowywanie analizy...");

    try {
      console.log('[AnalyzingMealCardV2] Starting analysis for meal:', meal.id);
      
      // Enhanced progress with realistic steps
      const analysisSteps = [
        { progress: 15, step: "Przetwarzanie obrazu..." },
        { progress: 35, step: "Identyfikowanie składników..." },
        { progress: 55, step: "Obliczanie wartości odżywczych..." },
        { progress: 75, step: "Analizowanie proporcji..." },
        { progress: 90, step: "Finalizowanie wyników..." }
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < analysisSteps.length) {
          const currentStep = analysisSteps[stepIndex];
          setAnalysisProgress(currentStep.progress);
          setAnalysisStep(currentStep.step);
          stepIndex++;
        }
      }, 800);

      // Perform the actual analysis
      const result = await analyzeFoodImage(meal.image);

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setAnalysisStep("Analiza zakończona!");

      if (!result) {
        throw new Error('Invalid response from food analysis');
      }

      console.log('[AnalyzingMealCardV2] Analysis result:', {
        name: result.name,
        calories: result.calories,
        components: result.components?.length
      });

      // Update the meal in the database with analysis results
      const updatedMealData = {
        name: result.name || "Unknown Food", 
        calories: result.calories || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0,
        image: meal.image,
        components: result.components?.map(comp => ({
          name: comp.name || "Unknown Component",
          calories: comp.calories || 0,
          protein: comp.protein || 0,
          carbs: comp.carbs || 0,
          fat: comp.fat || 0,
          servingSize: comp.servingSize,
          quantity: comp.quantity || 1,
          details: comp.details || {}
        }))
      };

      // Update the meal in the database
      await updateFood(meal.id, updatedMealData);

      setAnalysisComplete(true);
      setIsAnalyzing(false);

      toast({
        title: "Analysis Complete",
        description: `Identified: ${result.name}`,
      });

      // Trigger callback to refresh food logs
      onAnalysisComplete?.();

    } catch (error) {
      console.error('[AnalyzingMealCardV2] Analysis failed:', error);
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed");
      setIsAnalyzing(false);
      
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze your meal. Please try again.",
      });
    }
  };

  // Don't render if this meal doesn't need analysis
  if (!needsAnalysis && !isAnalyzing && !analysisComplete) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <Card 
        className={`overflow-hidden transition-all duration-500 ${
          isAnalyzing ? 'shadow-md shadow-[#0CC5BA]/20 border-[#0CC5BA]/30' : ''
        }`}
      >
        {/* Enhanced Progress indicator */}
        {isAnalyzing && (
          <div className="h-2 bg-gray-100 relative overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#0CC5BA] to-[#0E95A7] relative"
              initial={{ width: "0%" }}
              animate={{ width: `${analysisProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: [-100, 300] }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ width: "100px" }}
              />
            </motion.div>
            
            {/* Pulse effect at the end */}
            <motion.div
              className="absolute right-0 top-0 h-full w-1 bg-[#0CC5BA]"
              animate={{ 
                opacity: [0.5, 1, 0.5],
                scaleY: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ left: `${analysisProgress}%` }}
            />
          </div>
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center p-3">
            {/* Image */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              {meal.image ? (
                <div className="w-full h-full">
                  <img
                    src={meal.image}
                    alt="Food being analyzed"
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      isAnalyzing ? 'blur-sm' : 'blur-0'
                    }`}
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                      {/* Floating particles */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-[#0CC5BA] rounded-full"
                          animate={{
                            y: [-20, 20],
                            x: [(-10 + i * 4), (10 - i * 4)],
                            opacity: [0.3, 0.8, 0.3],
                            scale: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2 + i * 0.3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                      
                      {/* Central loading spinner */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="relative z-10"
                      >
                        <Loader2 className="h-6 w-6 text-[#0CC5BA]" />
                      </motion.div>
                      
                      {/* Scanning line effect */}
                      <motion.div
                        className="absolute inset-0 border-l-2 border-[#0CC5BA]/60"
                        animate={{ x: [-64, 64] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 ml-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm text-gray-900">
                    {isAnalyzing ? "Analyzing your meal..." : 
                     analysisComplete ? "Analysis Complete" : 
                     meal.name}
                  </h3>
                  
                  {isAnalyzing && (
                    <motion.p 
                      key={analysisStep}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs text-gray-500 mt-1"
                    >
                      {analysisStep}
                    </motion.p>
                  )}
                  
                  {analysisError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {analysisError}
                    </p>
                  )}
                  
                  {analysisComplete && !isAnalyzing && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Ready to view details
                    </p>
                  )}
                </div>
                
                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  {isAnalyzing && (
                    <div className="text-xs text-[#0CC5BA] font-medium">
                      {Math.round(analysisProgress)}%
                    </div>
                  )}
                  
                  {analysisComplete && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  
                  {analysisError && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}