import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, Trash, Utensils } from 'lucide-react';
import { Recipe } from '@/types/recipe';
import { useTranslation } from 'react-i18next';

interface EnhancedRecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
}

export function EnhancedRecipeCard({ recipe, onClick, onDelete }: EnhancedRecipeCardProps) {
  const { t } = useTranslation();
  // Use available time data or default to 30 min
  const totalTime = (recipe.prepTime || 0) + (recipe.cookingTime || 0) || 30;
  
  // Generate a random pastel background color for recipes without images
  const getBgColor = () => {
    const colors = [
      'bg-gradient-to-br from-[#e6f7f6] to-[#d9f2f1]', // Teal pastel
      'bg-gradient-to-br from-[#e6f0f9] to-[#d9e8f5]', // Blue pastel
      'bg-gradient-to-br from-[#f5e6f9] to-[#edd9f5]', // Purple pastel
      'bg-gradient-to-br from-[#f9e6e6] to-[#f5d9d9]', // Red pastel
      'bg-gradient-to-br from-[#f9f6e6] to-[#f5f1d9]', // Yellow pastel
    ];
    
    // Use recipe ID to pick a consistent color for each recipe
    const index = (recipe.id % colors.length);
    return colors[index];
  };
  
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={() => onClick(recipe)}
      className="h-full"
    >
      <Card className="overflow-hidden rounded-2xl border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col">
        {/* Top Image Section - Reduced height */}
        <div className={`relative h-24 ${getBgColor()} flex items-center justify-center overflow-hidden`}>
          {recipe.imageUrl ? (
            <img 
              src={recipe.imageUrl} 
              alt={recipe.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <Utensils className="w-10 h-10 text-[#0CC5BA]/30" />
          )}
          
          {/* Calorie badge - smaller */}
          <div className="absolute top-2 right-2">
            <Badge className="bg-white shadow-sm text-[#0CC5BA] font-medium px-2 py-0.5 rounded-lg text-xs">
              {recipe.nutritionInfo?.calories || 0} kcal
            </Badge>
          </div>
        </div>
        
        {/* Content Section - Reduced padding */}
        <div className="p-3 flex-grow flex flex-col">
          {/* Title - smaller font */}
          <h3 className="text-base font-bold leading-tight text-gray-900 line-clamp-1 group-hover:text-[#0CC5BA] transition-colors mb-2">
            {recipe.name}
          </h3>
          
          {/* Info Pills - more compact */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <div className="flex items-center text-xs text-gray-600 font-medium bg-gray-100 rounded-full px-2 py-0.5">
              <Clock className="h-3 w-3 mr-1 text-[#0CC5BA]" />
              {totalTime}min
            </div>
            <div className="flex items-center text-xs text-gray-600 font-medium bg-gray-100 rounded-full px-2 py-0.5">
              <Flame className="h-3 w-3 mr-1 text-[#0CC5BA]" />
              {recipe.nutritionInfo?.protein || 0}g
            </div>
          </div>
          
          {/* Description - single line */}
          <div className="flex-grow">
            <div className="line-clamp-1 text-xs text-gray-600">
              {recipe.description || "Recipe for " + recipe.name}
            </div>
          </div>
          
          {/* Footer with delete button - minimal spacing */}
          {onDelete && (
            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-end">
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click when clicking delete
                  onDelete(recipe);
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
                aria-label={t('recipes.deleteRecipe', 'Usuń przepis')}
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}