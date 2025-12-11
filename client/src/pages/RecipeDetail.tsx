import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Clock, Users, ChefHat, Flame, Heart, Share2, Check, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar';
import { useRecipeById } from '@/hooks/queries/useRecipes';

interface Ingredient {
  name: string;
  quantity: number | string;
  unit: string;
  calories?: number;
  servingSize?: string;
}

interface Component {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  quantity: number;
  details?: {
    type?: string;
    preparation?: string;
    texture?: string;
    color?: string;
    estimatedWeight?: string;
  };
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
  components?: Component[];
  tags?: string[];
  isSaved?: boolean;
}

export default function RecipeDetail() {
  const { t } = useTranslation(['common']);
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const isFoodLog = location.includes('/food-log/');
  const recipeId = id;
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'nutrition'>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [currentInstructionStep, setCurrentInstructionStep] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Fetch recipe details using custom hook
  const { data: recipeData, isLoading } = useRecipeById(Number(recipeId), isFoodLog);
  const recipe = recipeData as any; // Cast to support additional properties

  // Parse ingredients
  const ingredients: Ingredient[] = (() => {
    if (!recipe?.ingredients) return [];
    
    if (typeof recipe.ingredients === 'string') {
      try {
        return JSON.parse(recipe.ingredients);
      } catch {
        return recipe.ingredients.split(',').map((i: string) => ({
          name: i.trim(),
          quantity: '',
          unit: ''
        }));
      }
    }
    return recipe.ingredients;
  })();

  // Parse components (from AI food recognition)
  const components: Component[] = (() => {
    if (!recipe?.components) return [];
    
    if (typeof recipe.components === 'string') {
      try {
        return JSON.parse(recipe.components);
      } catch {
        return [];
      }
    }
    return recipe.components;
  })();

  // Parse instructions
  const instructions: string[] = (() => {
    if (!recipe?.instructions) return [];
    
    if (typeof recipe.instructions === 'string') {
      try {
        const parsed = JSON.parse(recipe.instructions);
        return Array.isArray(parsed) ? parsed : [recipe.instructions];
      } catch {
        return recipe.instructions.split('\n').filter((i: string) => i.trim()).map((i: string) => i.trim().replace(/^\d+\.\s*/, ''));
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
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a4a] to-[#0d2030] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#26A8FF]"></div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a4a] to-[#0d2030] flex items-center justify-center">
        <p className="text-gray-400">{t('common:recipeDetail.notFound')}</p>
      </div>
    );
  }

  // Get display components - either from components array or create from ingredients
  const displayComponents = components.length > 0 
    ? components.slice(0, 3) 
    : ingredients.slice(0, 3).map(ing => ({
        name: typeof ing === 'string' ? ing : ing.name,
        calories: typeof ing === 'object' && ing.calories ? ing.calories : 0,
        servingSize: typeof ing === 'object' && ing.quantity ? `${ing.quantity} ${ing.unit || ''}`.trim() : '',
        quantity: 1,
        protein: 0,
        carbs: 0,
        fat: 0
      }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3a4a] to-[#0d2030] pb-24">
      {/* Hero Section with Image */}
      <div className="relative w-full h-72">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#2a5a6a] to-[#1a3a4a] flex items-center justify-center">
            <ChefHat className="w-20 h-20 text-white/20" />
          </div>
        )}
        
        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button
            onClick={() => navigate('/recipes')}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleSaveRecipe}
              className={`w-10 h-10 ${isSaved ? 'bg-[#26A8FF]' : 'bg-white/20'} backdrop-blur-md rounded-full flex items-center justify-center transition-colors`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'text-white fill-white' : 'text-white'}`} />
            </button>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Recipe Card */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-2">
            {recipe.name.replace(/\s*\(Day \d+\)\s*$/i, '')}
          </h1>
          
          {recipe.description && (
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">{recipe.description}</p>
          )}
          
          {/* Recipe Stats Row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#26A8FF]/20 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('common:recipeDetail.stats.time')}</p>
                <p className="text-sm font-semibold text-white">{totalTime || 30} {t('common:recipeDetail.stats.min')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#26A8FF]/20 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('common:recipeDetail.stats.servings')}</p>
                <p className="text-sm font-semibold text-white">{recipe.servings || 1}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#26A8FF]/20 rounded-full flex items-center justify-center">
                <Flame className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('common:recipeDetail.stats.calories')}</p>
                <p className="text-sm font-semibold text-white">{recipe.nutritionInfo?.calories || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="px-4 mt-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(['ingredients', 'instructions', 'nutrition'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                  activeTab === tab
                    ? 'text-[#26A8FF]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {t(`common:recipeDetail.tabs.${tab}`)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#26A8FF]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {/* Ingredients Tab */}
            {activeTab === 'ingredients' && (
              <div className="space-y-4">
                {/* Quick Component Cards - Show top 3 ingredients with calories */}
                {displayComponents.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {displayComponents.map((comp, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 bg-white/5 backdrop-blur rounded-2xl p-3 min-w-[100px] border border-white/10"
                      >
                        <p className="font-semibold text-white text-sm">{comp.name}</p>
                        <p className="text-xs text-gray-400">{comp.servingSize || `${comp.quantity}`}</p>
                        {comp.calories > 0 && (
                          <p className="text-xs text-[#26A8FF] mt-1">{comp.calories} kcal</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Full Ingredient List */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-white">{t('common:recipeDetail.ingredients.title')}</h3>
                    <span className="text-xs text-gray-400">
                      {checkedIngredients.size}/{ingredients.length} {t('common:recipeDetail.ingredients.checked')}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {ingredients.map((ingredient, index) => (
                      <button
                        key={index}
                        onClick={() => toggleIngredient(index)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                          checkedIngredients.has(index)
                            ? 'bg-[#26A8FF]/20 border border-[#26A8FF]/30'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            checkedIngredients.has(index)
                              ? 'bg-[#26A8FF] border-[#26A8FF]'
                              : 'border-gray-500'
                          }`}>
                            {checkedIngredients.has(index) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className={`text-sm ${
                            checkedIngredients.has(index) ? 'line-through text-gray-500' : 'text-white'
                          }`}>
                            {typeof ingredient === 'string' ? ingredient : ingredient.name}
                          </span>
                        </div>
                        {typeof ingredient !== 'string' && ingredient.quantity && (
                          <span className="text-xs text-gray-400">
                            {ingredient.quantity} {ingredient.unit}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions Tab */}
            {activeTab === 'instructions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-white">{t('common:recipeDetail.instructions.title')}</h3>
                  <span className="text-xs text-gray-400">
                    {t('common:recipeDetail.instructions.stepOf', { current: currentInstructionStep + 1, total: instructions.length })}
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
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      {index <= currentInstructionStep ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    
                    {index < instructions.length - 1 && (
                      <div className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${
                        index < currentInstructionStep ? 'bg-[#26A8FF]' : 'bg-white/10'
                      }`} />
                    )}
                    
                    <p className="text-sm text-gray-300">{instruction}</p>
                  </div>
                ))}
                
                {currentInstructionStep < instructions.length - 1 && (
                  <button
                    onClick={() => setCurrentInstructionStep(prev => prev + 1)}
                    className="w-full py-3 bg-[#26A8FF] text-white rounded-xl font-medium hover:bg-[#1A8FE6] transition-colors"
                  >
                    {t('common:recipeDetail.instructions.nextStep')}
                  </button>
                )}
              </div>
            )}

            {/* Nutrition Tab */}
            {activeTab === 'nutrition' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white mb-4">{t('common:recipeDetail.nutrition.title')}</h3>
                
                <div className="bg-gradient-to-br from-[#26A8FF]/20 to-[#1A8FE6]/10 rounded-xl p-4 border border-[#26A8FF]/20">
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-[#26A8FF]">{recipe.nutritionInfo?.calories || 0}</p>
                    <p className="text-sm text-gray-400">{t('common:recipeDetail.nutrition.caloriesPerServing')}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-bold text-orange-400">P</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{recipe.nutritionInfo?.protein || 0}g</p>
                      <p className="text-xs text-gray-400">{t('common:recipeDetail.nutrition.protein')}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-bold text-green-400">C</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{recipe.nutritionInfo?.carbs || 0}g</p>
                      <p className="text-xs text-gray-400">{t('common:recipeDetail.nutrition.carbs')}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-bold text-red-400">F</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{recipe.nutritionInfo?.fat || 0}g</p>
                      <p className="text-xs text-gray-400">{t('common:recipeDetail.nutrition.fat')}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Nutrition Info */}
                {(recipe.nutritionInfo?.fiber || recipe.nutritionInfo?.sugar || recipe.nutritionInfo?.sodium) && (
                  <div className="space-y-2">
                    {recipe.nutritionInfo.fiber && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-sm text-gray-400">{t('common:recipeDetail.nutrition.fiber')}</span>
                        <span className="text-sm font-semibold text-white">{recipe.nutritionInfo.fiber}g</span>
                      </div>
                    )}
                    {recipe.nutritionInfo.sugar && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-sm text-gray-400">{t('common:recipeDetail.nutrition.sugar')}</span>
                        <span className="text-sm font-semibold text-white">{recipe.nutritionInfo.sugar}g</span>
                      </div>
                    )}
                    {recipe.nutritionInfo.sodium && (
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-gray-400">{t('common:recipeDetail.nutrition.sodium')}</span>
                        <span className="text-sm font-semibold text-white">{recipe.nutritionInfo.sodium}mg</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Components Breakdown - if available from AI */}
                {components.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-white mb-3">{t('common:recipeDetail.nutrition.breakdown') || 'Nutrition Breakdown'}</h4>
                    <div className="space-y-2">
                      {components.map((comp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                          <div>
                            <p className="text-sm font-medium text-white">{comp.name}</p>
                            <p className="text-xs text-gray-400">{comp.servingSize}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#26A8FF]">{comp.calories} kcal</p>
                            <p className="text-xs text-gray-500">P:{comp.protein}g C:{comp.carbs}g F:{comp.fat}g</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
        onClick={() => navigate(isFoodLog ? `/cooking/food-log/${recipeId}` : `/cooking/${recipeId}`)}
        className="fixed bottom-24 right-5 w-16 h-16 bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50 group"
      >
        <Play className="w-8 h-8 ml-1" />
        <span className="absolute -top-12 right-0 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {t('common:recipeDetail.startCooking')}
        </span>
      </button>
    </div>
  );
}