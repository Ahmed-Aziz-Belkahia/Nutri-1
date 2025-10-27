import { Clock, Flame, ChefHat } from 'lucide-react';

interface Recipe {
  id: number;
  name: string;
  image?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime?: number;
  cookTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisineType?: string;
  mealType?: string;
  servings?: number;
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  
  const difficultyColor = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700'
  }[recipe.difficulty || 'easy'];

  return (
    <div 
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer border border-gray-100"
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
        {recipe.image ? (
          <img 
            src={recipe.image} 
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
          </div>
        )}
        
        {/* Difficulty Badge */}
        {recipe.difficulty && (
          <div className="absolute top-3 right-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColor}`}>
              {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
          {recipe.name}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {recipe.cuisineType && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
              {recipe.cuisineType}
            </span>
          )}
          {recipe.mealType && (
            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium">
              {recipe.mealType}
            </span>
          )}
        </div>

        {/* Nutrition Info */}
        <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-gray-900">{Math.round(recipe.calories)}</span>
            <span className="text-xs">kcal</span>
          </div>
          {totalTime > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900">{totalTime}</span>
              <span className="text-xs">min</span>
            </div>
          )}
        </div>

        {/* Macros */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          <div className="text-xs">
            <span className="font-medium text-gray-900">{Math.round(recipe.protein)}g</span>
            <span className="text-gray-500 ml-1">protein</span>
          </div>
          <div className="text-xs">
            <span className="font-medium text-gray-900">{Math.round(recipe.carbs)}g</span>
            <span className="text-gray-500 ml-1">carbs</span>
          </div>
          <div className="text-xs">
            <span className="font-medium text-gray-900">{Math.round(recipe.fat)}g</span>
            <span className="text-gray-500 ml-1">fat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
