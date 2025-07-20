import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { useState, useEffect } from "react";

interface MacroProgressProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  goalReached?: boolean;
}

const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return "0";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toFixed(0);
};

const MacroProgress = ({ label, current, goal, unit = "g", goalReached = false }: MacroProgressProps) => {
  const percentage = Math.min(Math.round((current / goal) * 100), 100);
  const isOverGoal = current > goal;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className={`text-sm ${goalReached ? 'text-white' : 'text-gray-600'}`}>{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-base font-medium tabular-nums ${goalReached 
            ? 'text-white' 
            : isOverGoal ? 'text-amber-500' : 'text-gray-800'}`}
          >
            {formatNumber(current)}
          </span>
          <span className={`text-xs ${goalReached ? 'text-white/80' : 'text-gray-400'}`}>
            / {formatNumber(goal)} {unit}
          </span>
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${
          goalReached 
            ? 'bg-white/20 [&>[data-progress]]:bg-white' 
            : isOverGoal 
              ? 'bg-amber-100 [&>[data-progress]]:bg-amber-500' 
              : 'bg-black/5 [&>[data-progress]]:bg-gradient-to-r [&>[data-progress]]:from-[#0CC5BA] [&>[data-progress]]:to-blue-500'
        }`}
      />
    </div>
  );
};

interface NutritionProgressCardProps {
  calories: {
    current: number;
    goal: number;
  };
  macros: {
    carbs: { current: number; goal: number };
    protein: { current: number; goal: number };
    fat: { current: number; goal: number };
  };
  className?: string;
}

export default function NutritionProgressCard({ calories, macros, className = "" }: NutritionProgressCardProps) {
  // Make sure we're working with numbers
  const currentCalories = typeof calories.current === 'string' ? parseFloat(calories.current) : calories.current;
  const goalCalories = typeof calories.goal === 'string' ? parseFloat(calories.goal) : calories.goal;
  
  // Calculate percentage capped at 100%
  const caloriePercentage = Math.min(Math.round((currentCalories / goalCalories) * 100), 100);
  
  // Only mark as goal reached when current is strictly >= goal
  const goalReached = currentCalories >= goalCalories;
  
  // Console log for debugging
  console.log('Nutrition card state:', { currentCalories, goalCalories, caloriePercentage, goalReached });
  
  // Animation states - initialize with false to ensure default state shows first
  const [animateGoalReached, setAnimateGoalReached] = useState(false);

  // Handle animation when goal is reached - with delay
  useEffect(() => {
    // Small delay to ensure animation is visible
    const timer = setTimeout(() => {
      setAnimateGoalReached(goalReached);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [goalReached]);
  
  return (
    <Card 
      className={`p-5 rounded-[24px] shadow-lg transition-all duration-500 ease-in-out ${
        animateGoalReached 
          ? 'bg-gradient-to-br from-[#0CC5BA] to-blue-500 shadow-[#0CC5BA]/20' 
          : 'bg-white/90 shadow-[#0CC5BA]/5'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
              animateGoalReached 
                ? 'bg-white/20' 
                : 'bg-gradient-to-br from-[#0CC5BA] to-blue-500'
            }`}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className={`text-lg font-bold transition-colors duration-500 ${
              animateGoalReached ? 'text-white' : 'text-gray-800'
            }`}>
              Nutrition
            </h3>
          </div>
          <div className="flex mt-2">
            <div className={`text-3xl font-bold transition-all duration-500 ${
              animateGoalReached 
                ? 'text-white' 
                : 'bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent'
            }`}>
              {formatNumber(calories.current)}
            </div>
            <div className={`text-sm self-end mb-1 ml-1.5 transition-colors duration-500 ${
              animateGoalReached ? 'text-white/80' : 'text-gray-500'
            }`}>
              of {formatNumber(calories.goal)} kcal
            </div>
          </div>
        </div>
        
        <div className="relative" style={{ width: "100px", height: "100px" }}>
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={animateGoalReached ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.05)"}
              strokeWidth="6"
              className="transition-colors duration-500"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={animateGoalReached ? "white" : "url(#calorieProgressGradient)"}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 45}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - caloriePercentage / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`transition-colors duration-500 ${
                animateGoalReached 
                  ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
                  : 'drop-shadow-[0_0_8px_rgba(12,197,186,0.3)]'
              }`}
            />
            <defs>
              <linearGradient id="calorieProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0CC5BA" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className={`absolute inset-0 flex items-center justify-center text-2xl font-bold transition-colors duration-500 ${
              animateGoalReached ? 'text-white' : 'text-gray-800'
            }`}
          >
            {caloriePercentage}%
          </motion.div>
        </div>
      </div>
      
      <div className="space-y-4 mt-5">
        <MacroProgress 
          label="Carbs" 
          current={macros.carbs.current} 
          goal={macros.carbs.goal}
          goalReached={animateGoalReached}
        />
        <MacroProgress 
          label="Protein" 
          current={macros.protein.current} 
          goal={macros.protein.goal}
          goalReached={animateGoalReached}
        />
        <MacroProgress 
          label="Fat" 
          current={macros.fat.current} 
          goal={macros.fat.goal}
          goalReached={animateGoalReached}
        />
      </div>
    </Card>
  );
}