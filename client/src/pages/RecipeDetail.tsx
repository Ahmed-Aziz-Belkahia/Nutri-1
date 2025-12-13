import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Clock, Users, ChefHat, Flame, Heart, Share2, Check, Play, X, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar';
import { useRecipeById } from '@/hooks/queries/useRecipes';
import { toPng } from 'html-to-image';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'ingredients' | 'instructions'>('overview');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [currentInstructionStep, setCurrentInstructionStep] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

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

  const handleShare = () => {
    setShowShareModal(true);
  };

  const generateAndShareImage = async () => {
    if (!shareCardRef.current) return;
    
    setIsGeneratingImage(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#f0f7fa'
      });

      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: recipe.name,
            text: `Check out this meal: ${recipe.name}`
          });
        } else {
          // Fallback: download the image
          downloadImage(dataUrl);
        }
      } else {
        // Fallback: download the image
        downloadImage(dataUrl);
      }
    } catch (error) {
      console.error('Error generating/sharing image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  useEffect(() => {
    setIsSaved(recipe?.isSaved || false);
  }, [recipe]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0f7fa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#26A8FF]"></div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-[#f0f7fa] flex items-center justify-center">
        <p className="text-gray-500">{t('common:recipeDetail.notFound')}</p>
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
    <div className="min-h-screen bg-[#f0f7fa] pb-24 relative overflow-hidden">
      {/* Blurry Blue Circle Decorations */}
      <div className="absolute top-20 -left-20 w-64 h-64 bg-[#26A8FF]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-96 -right-20 w-80 h-80 bg-[#1A8FE6]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-48 h-48 bg-[#26A8FF]/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Hero Section with Image */}
      <div className="relative w-full h-72 z-10">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6] flex items-center justify-center">
            <ChefHat className="w-20 h-20 text-white/30" />
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
            <button 
              onClick={handleShare}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Recipe Card */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 border border-white/60 shadow-xl">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {recipe.name.replace(/\s*\(Day \d+\)\s*$/i, '')}
          </h1>
          
          {recipe.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
          )}
          
          {/* Recipe Stats Row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#26A8FF]/10 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('common:recipeDetail.stats.time')}</p>
                <p className="text-sm font-semibold text-gray-900">{totalTime || 30} {t('common:recipeDetail.stats.min')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#26A8FF]/10 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('common:recipeDetail.stats.servings')}</p>
                <p className="text-sm font-semibold text-gray-900">{recipe.servings || 1}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#26A8FF]/10 rounded-full flex items-center justify-center">
                <Flame className="w-4 h-4 text-[#26A8FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('common:recipeDetail.stats.calories')}</p>
                <p className="text-sm font-semibold text-gray-900">{recipe.nutritionInfo?.calories || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="px-4 mt-4 relative z-10">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/60 shadow-lg">
          {/* Tabs */}
          <div className="flex border-b border-gray-100/50 bg-white/50">
            {(['overview', 'ingredients', 'instructions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                  activeTab === tab
                    ? 'text-[#26A8FF]'
                    : 'text-gray-500 hover:text-gray-700'
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
                {/* Full Ingredient List */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">{t('common:recipeDetail.ingredients.title')}</h3>
                    <span className="text-xs text-gray-500">
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
                            ? 'bg-[#26A8FF]/10 border border-[#26A8FF]/30'
                            : 'bg-white/50 hover:bg-white/70 border border-white/60 backdrop-blur-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            checkedIngredients.has(index)
                              ? 'bg-[#26A8FF] border-[#26A8FF]'
                              : 'border-gray-400'
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
                </div>
              </div>
            )}

            {/* Instructions Tab */}
            {activeTab === 'instructions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">{t('common:recipeDetail.instructions.title')}</h3>
                  <span className="text-xs text-gray-500">
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
                    {t('common:recipeDetail.instructions.nextStep')}
                  </button>
                )}
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Main Calories Display */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold text-gray-900">{recipe.nutritionInfo?.calories || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{recipe.nutritionInfo?.calories || 0} {t('common:recipeDetail.nutrition.caloriesPerServing')}</p>
                  </div>
                </div>

                {/* Quick Component Cards - Ingredients with calories */}
                {displayComponents.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {displayComponents.map((comp, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 bg-white/70 backdrop-blur-sm rounded-2xl p-4 min-w-[110px] border border-white/60 shadow-sm"
                      >
                        <p className="font-semibold text-gray-900 text-sm">{comp.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{comp.servingSize || `${comp.quantity}`}</p>
                        {comp.calories > 0 && (
                          <p className="text-xs text-[#26A8FF] font-medium mt-2">{comp.calories} kcal</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Macros with Progress Bars */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Protein */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('common:recipeDetail.nutrition.protein')}</span>
                      <span className="text-sm font-bold text-gray-900">{recipe.nutritionInfo?.protein || 0}g</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: `${Math.min((recipe.nutritionInfo?.protein || 0) / 50 * 100, 100)}%` }} />
                    </div>
                  </div>
                  
                  {/* Carbs */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('common:recipeDetail.nutrition.carbs')}</span>
                      <span className="text-sm font-bold text-gray-900">{recipe.nutritionInfo?.carbs || 0}g</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full" style={{ width: `${Math.min((recipe.nutritionInfo?.carbs || 0) / 100 * 100, 100)}%` }} />
                    </div>
                  </div>
                  
                  {/* Fat */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('common:recipeDetail.nutrition.fat')}</span>
                      <span className="text-sm font-bold text-gray-900">{recipe.nutritionInfo?.fat || 0}g</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{ width: `${Math.min((recipe.nutritionInfo?.fat || 0) / 65 * 100, 100)}%` }} />
                    </div>
                  </div>
                  
                  {/* Fiber */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('common:recipeDetail.nutrition.fiber') || 'Fiber'}</span>
                      <span className="text-sm font-bold text-gray-900">{recipe.nutritionInfo?.fiber || 0}g</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{ width: `${Math.min((recipe.nutritionInfo?.fiber || 0) / 25 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Components Breakdown - if available from AI */}
                {components.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{t('common:recipeDetail.nutrition.breakdown') || 'Nutrition Breakdown'}</h4>
                    <div className="space-y-2">
                      {components.map((comp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{comp.name}</p>
                            <p className="text-xs text-gray-500">{comp.servingSize}</p>
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

      {/* Floating Start Cooking Button - Glassmorphism Design */}
      <button
        onClick={() => navigate(isFoodLog ? `/cooking/food-log/${recipeId}` : `/cooking/${recipeId}`)}
        className="fixed bottom-24 right-5 w-16 h-16 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 z-50 group"
      >
        <div className="w-14 h-14 bg-[#26A8FF]/40 backdrop-blur-md rounded-full flex items-center justify-center border border-[#26A8FF]/30 shadow-lg">
          <Play className="w-7 h-7 text-[#26A8FF] ml-0.5" fill="#26A8FF" />
        </div>
        <span className="absolute -top-12 right-0 bg-white/80 backdrop-blur-lg text-gray-800 text-sm px-3 py-1.5 rounded-xl border border-white/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          {t('common:recipeDetail.startCooking')}
        </span>
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/60">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Share Meal</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Share Card Preview */}
            <div className="p-4">
              <div 
                ref={shareCardRef}
                className="bg-gradient-to-br from-[#f0f7fa] to-[#e8f4f8] rounded-2xl p-3 relative overflow-hidden"
              >
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#26A8FF]/20 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#1A8FE6]/15 rounded-full blur-2xl" />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Meal Image with Title Overlay */}
                  <div className="relative rounded-xl overflow-hidden mb-3">
                    {recipe.imageUrl ? (
                      <img 
                        src={recipe.imageUrl} 
                        alt={recipe.name}
                        className="w-full h-32 object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6] flex items-center justify-center">
                        <ChefHat className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    
                    {/* Title Overlay at bottom right */}
                    <div className="absolute bottom-0 right-0 left-0">
                      <div className="bg-white/70 backdrop-blur-md px-3 py-2">
                        <h4 className="text-sm font-bold text-gray-900 text-right truncate">
                          {recipe.name.replace(/\s*\(Day \d+\)\s*$/i, '')}
                        </h4>
                      </div>
                    </div>
                  </div>
                  
                  {/* Nutrition Grid - Compact */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-white/60">
                      <Flame className="w-4 h-4 text-orange-500 mx-auto mb-0.5" />
                      <p className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.calories || 0}</p>
                      <p className="text-[10px] text-gray-500">kcal</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-white/60">
                      <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-0.5 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">P</span>
                      </div>
                      <p className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.protein || 0}g</p>
                      <p className="text-[10px] text-gray-500">Protein</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-white/60">
                      <div className="w-4 h-4 bg-amber-500 rounded-full mx-auto mb-0.5 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">C</span>
                      </div>
                      <p className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.carbs || 0}g</p>
                      <p className="text-[10px] text-gray-500">Carbs</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-white/60">
                      <div className="w-4 h-4 bg-pink-500 rounded-full mx-auto mb-0.5 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">F</span>
                      </div>
                      <p className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.fat || 0}g</p>
                      <p className="text-[10px] text-gray-500">Fat</p>
                    </div>
                  </div>
                  
                  {/* Branding with Logo */}
                  <div className="flex items-center justify-center gap-1.5 opacity-70">
                    <img src="/logo.png" alt="NutriAI" className="w-4 h-4 object-contain" />
                    <span className="text-[10px] font-medium text-gray-600">Made with NutriAI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Button */}
            <div className="p-4 pt-0">
              <button
                onClick={generateAndShareImage}
                disabled={isGeneratingImage}
                className="w-full py-3 bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5" />
                    <span>Share Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}