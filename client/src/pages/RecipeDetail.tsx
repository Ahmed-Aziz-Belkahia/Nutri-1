import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Users, ChefHat, Flame, Heart, Share2, Check, Play } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface Ingredient {
  name: string;
  quantity: number | string;
  unit: string;
  calories?: number;
}

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface Recipe {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  ingredients: string | Ingredient[];
  instructions: string | string[];
  nutritionInfo?: NutritionInfo;
  tags?: string[];
  isSaved?: boolean;
}

export default function RecipeDetail() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const isFoodLog = location.includes('/food-log/');
  const recipeId = id;
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'nutrition'>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [currentInstructionStep, setCurrentInstructionStep] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Fetch recipe details
  const { data: recipe, isLoading } = useQuery<Recipe>({
    queryKey: ['recipe', recipeId, isFoodLog],
    queryFn: async () => {
      const endpoint = isFoodLog 
        ? `/api/recipes/food-log/${recipeId}`
        : `/api/recipes/${recipeId}`;
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return response.json();
    },
    enabled: !!recipeId
  });

  // Parse ingredients
  const ingredients: Ingredient[] = (() => {
    if (!recipe?.ingredients) return [];
    
    if (typeof recipe.ingredients === 'string') {
      try {
        return JSON.parse(recipe.ingredients);
      } catch {
        return recipe.ingredients.split(',').map(i => ({
          name: i.trim(),
          quantity: '',
          unit: ''
        }));
      }
    }
    return recipe.ingredients;
  })();

  // Parse instructions
  const instructions: string[] = (() => {
    if (!recipe?.instructions) return [];
    
    if (typeof recipe.instructions === 'string') {
      try {
        const parsed = JSON.parse(recipe.instructions);
        return Array.isArray(parsed) ? parsed : [recipe.instructions];
      } catch {
        return recipe.instructions.split('\n').filter(i => i.trim()).map(i => i.trim().replace(/^\d+\.\s*/, ''));
      }
    }
    return Array.isArray(recipe.instructions) ? recipe.instructions : [];
  })();

  const totalTime = (recipe?.prepTime || 0) + (recipe?.cookTime || 0);

  const toggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const handleSaveRecipe = async () => {
    try {
      const endpoint = isSaved ? `/api/saved-recipes/${recipeId}` : `/api/saved-recipes`;
      const method = isSaved ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: !isSaved ? JSON.stringify({ recipeId }) : undefined
      });

      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
    }
  };

  useEffect(() => {
    setIsSaved(recipe?.isSaved || false);
  }, [recipe]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#26A8FF]"></div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <p className="text-gray-500">Recipe not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Hero Section with Image */}
      <div className="relative w-full h-80 bg-gray-100 overflow-hidden">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
            <ChefHat className="w-20 h-20 text-[#26A8FF]/20" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button
            onClick={() => navigate('/recipes')}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleSaveRecipe}
              className={`w-10 h-10 ${isSaved ? 'bg-[#26A8FF]' : 'bg-white/90'} backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-colors`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'text-white fill-white' : 'text-gray-800'}`} />
            </button>
            <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
              <Share2 className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="max-w-md mx-auto px-5 -mt-8 relative z-10">
        {/* Recipe Title Card */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {recipe.name.replace(/\s*\(Day \d+\)\s*$/i, '')}
          </h1>
          
          {recipe.description && (
            <p className="text-gray-600 text-sm mb-4">{recipe.description}</p>
          )}
          
          {/* Recipe Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-semibold text-gray-900">{totalTime || 30} min</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Servings</p>
                <p className="text-sm font-semibold text-gray-900">{recipe.servings || 1}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                <Flame className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Calories</p>
                <p className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo?.calories || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['ingredients', 'instructions', 'nutrition'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                  activeTab === tab
                    ? 'text-[#26A8FF]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#26A8FF]" />
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Ingredients Tab */}
            {activeTab === 'ingredients' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Ingredients</h3>
                  <span className="text-xs text-gray-500">
                    {checkedIngredients.size}/{ingredients.length} checked
                  </span>
                </div>
                
                {ingredients.map((ingredient, index) => (
                  <button
                    key={index}
                    onClick={() => toggleIngredient(index)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      checkedIngredients.has(index)
                        ? 'bg-blue-50 border border-[#26A8FF]/20'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        checkedIngredients.has(index)
                          ? 'bg-[#26A8FF] border-[#26A8FF]'
                          : 'border-gray-300'
                      }`}>
                        {checkedIngredients.has(index) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        checkedIngredients.has(index) ? 'line-through text-gray-400' : 'text-gray-700'
                      }`}>
                        {typeof ingredient === 'string' ? ingredient : ingredient.name}
                      </span>
                    </div>
                    {typeof ingredient !== 'string' && ingredient.quantity && (
                      <span className="text-xs text-gray-500">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Instructions Tab */}
            {activeTab === 'instructions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Instructions</h3>
                  <span className="text-xs text-gray-500">
                    Step {currentInstructionStep + 1} of {instructions.length}
                  </span>
                </div>
                
                {instructions.map((instruction, index) => (
                  <div
                    key={index}
                    className={`relative pl-10 pb-4 ${
                      index === currentInstructionStep ? 'opacity-100' : 'opacity-50'
                    } transition-opacity cursor-pointer`}
                    onClick={() => setCurrentInstructionStep(index)}
                  >
                    <div className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index <= currentInstructionStep
                        ? 'bg-[#26A8FF] text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index <= currentInstructionStep ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    
                    {index < instructions.length - 1 && (
                      <div className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${
                        index < currentInstructionStep ? 'bg-[#26A8FF]' : 'bg-gray-200'
                      }`} />
                    )}
                    
                    <p className="text-sm text-gray-700">{instruction}</p>
                  </div>
                ))}
                
                {currentInstructionStep < instructions.length - 1 && (
                  <button
                    onClick={() => setCurrentInstructionStep(prev => prev + 1)}
                    className="w-full py-3 bg-[#26A8FF] text-white rounded-xl font-medium hover:bg-[#1A8FE6] transition-colors"
                  >
                    Next Step
                  </button>
                )}
              </div>
            )}

            {/* Nutrition Tab */}
            {activeTab === 'nutrition' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">Nutrition Facts</h3>
                
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-[#26A8FF]">{recipe.nutritionInfo?.calories || 0}</p>
                    <p className="text-sm text-gray-500">Calories per serving</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <span className="text-lg font-bold text-orange-500">P</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo?.protein || 0}g</p>
                      <p className="text-xs text-gray-500">Protein</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <span className="text-lg font-bold text-green-500">C</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo?.carbs || 0}g</p>
                      <p className="text-xs text-gray-500">Carbs</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <span className="text-lg font-bold text-red-500">F</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo?.fat || 0}g</p>
                      <p className="text-xs text-gray-500">Fat</p>
                    </div>
                  </div>
                </div>

                {/* Additional Nutrition Info */}
                {(recipe.nutritionInfo?.fiber || recipe.nutritionInfo?.sugar || recipe.nutritionInfo?.sodium) && (
                  <div className="space-y-2">
                    {recipe.nutritionInfo.fiber && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Fiber</span>
                        <span className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo.fiber}g</span>
                      </div>
                    )}
                    {recipe.nutritionInfo.sugar && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Sugar</span>
                        <span className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo.sugar}g</span>
                      </div>
                    )}
                    {recipe.nutritionInfo.sodium && (
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-gray-600">Sodium</span>
                        <span className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo.sodium}mg</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Navbar />

      {/* Floating Start Cooking Button */}
      <button
        onClick={() => navigate(`/cooking/${recipeId}`)}
        className="fixed bottom-24 right-5 w-16 h-16 bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50 group"
      >
        <Play className="w-8 h-8 ml-1" />
        <span className="absolute -top-12 right-0 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Start Cooking
        </span>
      </button>
    </div>
  );
}