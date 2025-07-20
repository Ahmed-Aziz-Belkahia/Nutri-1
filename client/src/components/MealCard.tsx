import { motion } from "framer-motion";
import { Check, Coffee, Pizza, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface MealCardProps {
  meal: {
    id: number;
    name: string;
    mealType: string;
    imageUrl?: string;
    isCompleted?: boolean;
    ingredients?: string[];
    instructions?: string[] | string;
    nutritionInfo?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    // For backward compatibility with the old structure
    recipe?: {
      ingredients?: string[];
      instructions?: string[] | string;
      prepTime?: number;
      nutritionInfo?: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };
  };
  onToggleComplete: (mealId: number, isCompleted: boolean) => void;
  onClick: (mealId: number) => void;
}

// Helper function to get meal type icon - simplified version matching the screenshot
const getMealTypeIcon = (mealType: string) => {
  switch(mealType.toLowerCase()) {
    case 'breakfast':
      return (
        <div className="bg-[#ff9500] p-3 rounded-xl text-white shadow-md">
          <Coffee className="w-7 h-7" />
        </div>
      );
    case 'lunch':
      return (
        <div className="bg-[#0CC5BA] p-3 rounded-xl text-white shadow-md">
          <Pizza className="w-7 h-7" />
        </div>
      );
    case 'dinner':
      return (
        <div className="bg-[#6366f1] p-3 rounded-xl text-white shadow-md">
          <Utensils className="w-7 h-7" />
        </div>
      );
    case 'morning snack':
      return (
        <div className="bg-[#22c55e] p-3 rounded-xl text-white shadow-md">
          <Coffee className="w-7 h-7" />
        </div>
      );
    case 'afternoon snack':
      return (
        <div className="bg-[#ff5a5a] p-3 rounded-xl text-white shadow-md">
          <Pizza className="w-7 h-7" />
        </div>
      );
    case 'evening snack':
      return (
        <div className="bg-[#a855f7] p-3 rounded-xl text-white shadow-md">
          <Utensils className="w-7 h-7" />
        </div>
      );
    default:
      return (
        <div className="bg-[#22c55e] p-3 rounded-xl text-white shadow-md">
          <Coffee className="w-7 h-7" />
        </div>
      );
  }
};

export function MealCard({ meal, onToggleComplete, onClick }: MealCardProps) {
  const { t } = useTranslation();
  
  // Function to simplify meal names by removing detailed descriptions
  const getSimplifiedMealName = (name: string): string => {
    // First remove meal type prefixes
    let simplifiedName = name.replace(/^(Śniadanie|Sniadanie|Obiad|Kolacja|Przekąska|Przekaska|Breakfast|Lunch|Dinner|Snack|Morning Snack|Afternoon Snack|Evening Snack|Day \d+)[:. ]\s*/i, '');
    
    // Then extract just the first part before detailed descriptions
    // This will keep "Fresh Start eggs" from "Fresh Start eggs (Day 1) with 1/4 cup..."
    const mainNameMatch = simplifiedName.match(/^([^(]+?)(?:\s+\(|$|\s+with\s+)/i);
    if (mainNameMatch && mainNameMatch[1]) {
      simplifiedName = mainNameMatch[1].trim();
    }
    
    return simplifiedName;
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-50 hover:border-[#0CC5BA]/20 transition-all mb-4"
      onClick={() => onClick(meal.id)}
    >
      <div className="flex items-center p-3">
        {/* Meal Icon - Made BIGGER */}
        <div className="w-16 h-16 flex items-center justify-center">
          {getMealTypeIcon(meal.mealType)}
        </div>
        
        {/* Meal Info - BIGGER text and spacing with simplified name */}
        <div className="flex-1 p-3">
          <h3 className="font-semibold text-gray-900 line-clamp-1 text-base">
            {getSimplifiedMealName(meal.name)}
          </h3>
          
          <div className="flex flex-wrap gap-3 text-xs mt-2">
            <div className="flex items-center px-3 py-1 rounded-full bg-orange-500 text-white">
              <span className="font-medium">
                {meal.nutritionInfo?.calories || 
                 meal.recipe?.nutritionInfo?.calories || 0} {t('nutrition.calShort', 'kcal')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Complete Button - BIGGER */}
        <div className="p-3">
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              meal.isCompleted 
                ? "bg-[#0CC5BA] text-white" 
                : "bg-white border border-gray-200 hover:bg-gray-50"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(meal.id, !meal.isCompleted);
            }}
          >
            {meal.isCompleted ? (
              <Check className="w-4 h-4" />
            ) : null}
          </button>
        </div>
      </div>
    </motion.div>
  );
}