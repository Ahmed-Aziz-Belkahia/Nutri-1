import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Users, ChefHat, Flame, Heart, Share2, Check, Play, X, Download, Star, Edit3, Save, Plus, Trash2, Loader2, Camera, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { useRecipeById } from '@/hooks/queries/useRecipes';
import { useToast } from '@/hooks/use-toast';
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
  healthScore?: number;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Edit mode state
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    prepTime: 15,
    cookTime: 30,
    servings: 1,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    mealType: '',
    cuisineType: '',
    difficulty: 'easy',
    ingredients: [] as Ingredient[],
    instructions: [] as string[],
    components: [] as Component[],
    tags: [] as string[]
  });

  // Fetch recipe details using custom hook
  const { data: recipeData, isLoading, refetch } = useRecipeById(Number(recipeId), isFoodLog);
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

  // Initialize edit data when opening edit modal
  const openEditModal = () => {
    if (!recipe) return;
    
    setEditData({
      name: recipe.name || '',
      description: recipe.description || '',
      imageUrl: recipe.imageUrl || '',
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      servings: recipe.servings || 1,
      calories: recipe.nutritionInfo?.calories || recipe.calories || 0,
      protein: recipe.nutritionInfo?.protein || recipe.protein || 0,
      carbs: recipe.nutritionInfo?.carbs || recipe.carbs || 0,
      fat: recipe.nutritionInfo?.fat || recipe.fat || 0,
      fiber: recipe.nutritionInfo?.fiber || 0,
      mealType: recipe.mealType || '',
      cuisineType: recipe.cuisineType || '',
      difficulty: recipe.difficulty || 'easy',
      ingredients: ingredients.map(ing => ({
        name: typeof ing === 'string' ? ing : ing.name,
        quantity: typeof ing === 'string' ? '' : ing.quantity,
        unit: typeof ing === 'string' ? '' : ing.unit,
        calories: typeof ing === 'object' ? ing.calories : undefined
      })),
      instructions: [...instructions],
      components: [...components],
      tags: recipe.tags || []
    });
    setShowEditModal(true);
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setEditData(prev => ({ ...prev, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Add new ingredient
  const addIngredient = () => {
    setEditData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '' }]
    }));
  };

  // Remove ingredient
  const removeIngredient = (index: number) => {
    setEditData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  // Update ingredient
  const updateIngredient = (index: number, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  // Add new instruction
  const addInstruction = () => {
    setEditData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  // Remove instruction
  const removeInstruction = (index: number) => {
    setEditData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  // Update instruction
  const updateInstruction = (index: number, value: string) => {
    setEditData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? value : inst
      )
    }));
  };

  // Add new component
  const addComponent = () => {
    setEditData(prev => ({
      ...prev,
      components: [...prev.components, { 
        name: '', 
        calories: 0, 
        protein: 0, 
        carbs: 0, 
        fat: 0, 
        servingSize: '', 
        quantity: 1 
      }]
    }));
  };

  // Remove component
  const removeComponent = (index: number) => {
    setEditData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  // Update component
  const updateComponent = (index: number, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  // Save changes
  const saveChanges = async () => {
    if (!isFoodLog) {
      toast({
        title: "Cannot Edit",
        description: "Only food logs can be edited directly",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/food-logs/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editData.name,
          description: editData.description,
          imageUrl: editData.imageUrl,
          prepTime: editData.prepTime,
          cookTime: editData.cookTime,
          servings: editData.servings,
          calories: editData.calories,
          protein: editData.protein,
          carbs: editData.carbs,
          fat: editData.fat,
          mealType: editData.mealType,
          cuisineType: editData.cuisineType,
          difficulty: editData.difficulty,
          ingredients: editData.ingredients,
          instructions: editData.instructions,
          components: editData.components,
          tags: editData.tags
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      toast({
        title: "Saved!",
        description: "Your changes have been saved successfully"
      });

      // Refresh the data
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['/api/food-logs'] });
      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

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
            {isFoodLog && (
              <button
                onClick={openEditModal}
                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-colors hover:bg-white/30"
              >
                <Edit3 className="w-5 h-5 text-white" />
              </button>
            )}
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
                  <div className="relative rounded-t-xl overflow-hidden mb-3">
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
                  
                  {/* Nutrition Row - Compact Horizontal Layout */}
                  <div className="flex items-center justify-between bg-white/60 backdrop-blur-sm px-3 py-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.calories || 0}</span>
                      <span className="text-[10px] text-gray-500">kcal</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300" />
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[7px] font-bold">P</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.protein || 0}g</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300" />
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[7px] font-bold">C</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.carbs || 0}g</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300" />
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[7px] font-bold">F</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{recipe.nutritionInfo?.fat || 0}g</span>
                    </div>
                  </div>
                  
                  {/* Health Score */}
                  {recipe.healthScore !== undefined && (
                    <div className="flex items-center justify-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 mb-2">
                      <span className="text-[10px] text-gray-500">Health Score</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                          <Star
                            key={score}
                            className={`w-3 h-3 ${score <= (recipe.healthScore || 0) ? 'text-green-500 fill-green-500' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-green-600">{recipe.healthScore}/10</span>
                    </div>
                  )}
                  
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

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg max-h-[90vh] bg-gradient-to-b from-white/95 to-gray-50/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/60"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-gray-100/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-[#0CC5BA]/30">
                    <Edit3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Edit Meal</h2>
                    <p className="text-xs text-gray-500">Update meal details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-5 py-5 space-y-6">
                {/* Image Section */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#0CC5BA]" />
                    Meal Image
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-[#0CC5BA]/50 transition-colors group"
                  >
                    {editData.imageUrl ? (
                      <>
                        <img 
                          src={editData.imageUrl} 
                          alt="Meal" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <Upload className="w-10 h-10 mb-2" />
                        <p className="text-sm font-medium">Click to upload image</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Name & Description */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Meal Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30 focus:border-[#0CC5BA]"
                      placeholder="Enter meal name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Description</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30 focus:border-[#0CC5BA] resize-none"
                      placeholder="Describe your meal..."
                    />
                  </div>
                </div>

                {/* Time & Servings */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Prep Time
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editData.prepTime}
                        onChange={(e) => setEditData(prev => ({ ...prev, prepTime: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-white/80 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Cook Time
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editData.cookTime}
                        onChange={(e) => setEditData(prev => ({ ...prev, cookTime: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-white/80 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Servings
                    </label>
                    <input
                      type="number"
                      value={editData.servings}
                      onChange={(e) => setEditData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-white/80 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                    />
                  </div>
                </div>

                {/* Nutrition Info */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Nutrition Information
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3 border border-orange-100">
                      <label className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Calories</label>
                      <input
                        type="number"
                        value={editData.calories}
                        onChange={(e) => setEditData(prev => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white/70 border-0 rounded-lg px-2 py-1.5 mt-1 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-100">
                      <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Protein (g)</label>
                      <input
                        type="number"
                        value={editData.protein}
                        onChange={(e) => setEditData(prev => ({ ...prev, protein: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white/70 border-0 rounded-lg px-2 py-1.5 mt-1 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 border border-purple-100">
                      <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Carbs (g)</label>
                      <input
                        type="number"
                        value={editData.carbs}
                        onChange={(e) => setEditData(prev => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white/70 border-0 rounded-lg px-2 py-1.5 mt-1 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-xl p-3 border border-pink-100">
                      <label className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Fat (g)</label>
                      <input
                        type="number"
                        value={editData.fat}
                        onChange={(e) => setEditData(prev => ({ ...prev, fat: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white/70 border-0 rounded-lg px-2 py-1.5 mt-1 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Meal Type & Cuisine */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Meal Type</label>
                    <select
                      value={editData.mealType}
                      onChange={(e) => setEditData(prev => ({ ...prev, mealType: e.target.value }))}
                      className="w-full bg-white/80 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                    >
                      <option value="">Select type</option>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Difficulty</label>
                    <select
                      value={editData.difficulty}
                      onChange={(e) => setEditData(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full bg-white/80 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Components Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-[#0CC5BA]" />
                      Food Components
                    </label>
                    <button
                      onClick={addComponent}
                      className="text-xs font-semibold text-[#0CC5BA] flex items-center gap-1 hover:text-[#0CC5BA]/80"
                    >
                      <Plus className="w-4 h-4" />
                      Add Component
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editData.components.map((comp, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-100 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) => updateComponent(index, 'name', e.target.value)}
                            placeholder="Component name"
                            className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                          />
                          <button
                            onClick={() => removeComponent(index)}
                            className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <input
                            type="number"
                            value={comp.calories}
                            onChange={(e) => updateComponent(index, 'calories', parseFloat(e.target.value) || 0)}
                            placeholder="Cal"
                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none"
                          />
                          <input
                            type="number"
                            value={comp.protein}
                            onChange={(e) => updateComponent(index, 'protein', parseFloat(e.target.value) || 0)}
                            placeholder="P"
                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none"
                          />
                          <input
                            type="number"
                            value={comp.carbs}
                            onChange={(e) => updateComponent(index, 'carbs', parseFloat(e.target.value) || 0)}
                            placeholder="C"
                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none"
                          />
                          <input
                            type="number"
                            value={comp.fat}
                            onChange={(e) => updateComponent(index, 'fat', parseFloat(e.target.value) || 0)}
                            placeholder="F"
                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none"
                          />
                        </div>
                      </motion.div>
                    ))}
                    {editData.components.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">No components added yet</p>
                    )}
                  </div>
                </div>

                {/* Ingredients Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      🥗 Ingredients
                    </label>
                    <button
                      onClick={addIngredient}
                      className="text-xs font-semibold text-[#0CC5BA] flex items-center gap-1 hover:text-[#0CC5BA]/80"
                    >
                      <Plus className="w-4 h-4" />
                      Add Ingredient
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editData.ingredients.map((ing, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={ing.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="w-16 bg-white/80 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          placeholder="Unit"
                          className="w-16 bg-white/80 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                        />
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                          placeholder="Ingredient name"
                          className="flex-1 bg-white/80 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30"
                        />
                        <button
                          onClick={() => removeIngredient(index)}
                          className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                    {editData.ingredients.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">No ingredients added yet</p>
                    )}
                  </div>
                </div>

                {/* Instructions Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      📋 Instructions
                    </label>
                    <button
                      onClick={addInstruction}
                      className="text-xs font-semibold text-[#0CC5BA] flex items-center gap-1 hover:text-[#0CC5BA]/80"
                    >
                      <Plus className="w-4 h-4" />
                      Add Step
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editData.instructions.map((inst, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2"
                      >
                        <div className="w-6 h-6 bg-[#0CC5BA] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-2">
                          {index + 1}
                        </div>
                        <textarea
                          value={inst}
                          onChange={(e) => updateInstruction(index, e.target.value)}
                          placeholder={`Step ${index + 1}...`}
                          rows={2}
                          className="flex-1 bg-white/80 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CC5BA]/30 resize-none"
                        />
                        <button
                          onClick={() => removeInstruction(index)}
                          className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 flex-shrink-0 mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                    {editData.instructions.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">No instructions added yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl px-5 py-4 border-t border-gray-100/50 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveChanges}
                  disabled={isSaving || !editData.name}
                  className="flex-1 py-3.5 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-[#0CC5BA]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-xl transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}