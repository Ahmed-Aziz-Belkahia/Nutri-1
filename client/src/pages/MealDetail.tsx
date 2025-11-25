import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Clock, 
  Flame, 
  Edit3, 
  Save, 
  X,
  Plus,
  Minus,
  Check,
  ChefHat,
  Users,
  AlertCircle,
  Upload,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface FoodComponent {
  name: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface MealData {
  id: number;
  name: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  mealType?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  components?: FoodComponent[];
  instructions?: string[];
  date?: string;
}

export default function MealDetail() {
  const { t } = useTranslation(['common']);
  const [location, navigate] = useLocation();
  const mealId = location.split('/').pop();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [meal, setMeal] = useState<MealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Editable fields
  const [editedData, setEditedData] = useState({
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
    components: [] as FoodComponent[],
    instructions: [] as string[]
  });
  
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchMealDetails();
  }, [mealId]);

  const fetchMealDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/food-logs/${mealId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch meal details');
      }

      const data = await response.json();
      setMeal(data);
      
      // Initialize editable data
      setEditedData({
        name: data.name || '',
        description: data.description || '',
        imageUrl: data.image || data.imageUrl || '',
        prepTime: data.prepTime || 15,
        cookTime: data.cookTime || 30,
        servings: data.servings || 1,
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        components: data.components || [],
        instructions: data.instructions || []
      });
    } catch (err) {
      console.error('Error fetching meal:', err);
      setError('Failed to load meal details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!meal) return;
    
    try {
      setIsSaving(true);
      
      // Prepare update data
      const updateData = {
        name: editedData.name,
        description: editedData.description,
        image: editedData.imageUrl,
        prepTime: editedData.prepTime,
        cookTime: editedData.cookTime,
        servings: editedData.servings,
        calories: editedData.calories,
        protein: editedData.protein,
        carbs: editedData.carbs,
        fat: editedData.fat,
        components: editedData.components,
        instructions: editedData.instructions
      };
      
      const response = await fetch(`/api/food-logs/${mealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update meal');
      }

      const updatedMeal = await response.json();
      
      // Keep our edited data as the source of truth
      // Only update with API response if it provides valid values
      const mergedData = {
        name: editedData.name, // Always keep what user edited
        description: editedData.description,
        imageUrl: editedData.imageUrl,
        prepTime: editedData.prepTime,
        cookTime: editedData.cookTime,
        servings: editedData.servings,
        calories: editedData.calories,
        protein: editedData.protein,
        carbs: editedData.carbs,
        fat: editedData.fat,
        components: editedData.components,
        instructions: editedData.instructions
      };
      
      // Update meal with response data for any future fetches
      setMeal({ ...updatedMeal, ...mergedData });
      setEditedData(mergedData);
      
      setIsEditing(false);
      toast({
        title: "Success",
        description: t('common:mealDetail.toast.saveSuccess'),
      });
    } catch (err) {
      console.error('Error updating meal:', err);
      toast({
        title: "Error",
        description: t('common:mealDetail.toast.saveError'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!meal) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/food-logs/${mealId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }

      toast({
        title: "Success",
        description: t('common:mealDetail.toast.deleteSuccess'),
      });
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting meal:', err);
      toast({
        title: "Error",
        description: t('common:mealDetail.toast.deleteError'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setEditedData(prev => ({ ...prev, imageUrl: data.url }));
      
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (err) {
      console.error('Error uploading image:', err);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const addIngredient = () => {
    setEditedData(prev => ({
      ...prev,
      components: [...prev.components, { name: '', quantity: 0, unit: '' }]
    }));
  };

  const updateIngredient = (index: number, field: keyof FoodComponent, value: any) => {
    setEditedData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const removeIngredient = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const addInstruction = () => {
    setEditedData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setEditedData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? value : inst
      )
    }));
  };

  const removeInstruction = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientToggle = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const handleStepToggle = (index: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  const adjustedNutrition = (value: number | undefined) => {
    if (!value) return 0;
    return Math.round(value * servingMultiplier);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <div className="max-w-7xl mx-auto">
          <div className="w-full h-[50vh] bg-gray-200 animate-pulse" />
          <div className="px-4 py-8">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="grid grid-cols-4 gap-4 mt-8">
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('common:mealDetail.error.title')}</h2>
          <p className="text-gray-600 mb-6">{error || t('common:mealDetail.error.description')}</p>
          <div className="space-y-2">
            <button
              onClick={fetchMealDetails}
              className="px-6 py-3 bg-[#26A8FF] text-white rounded-lg hover:bg-[#1A8FE6] transition-colors"
            >
              {t('common:mealDetail.error.tryAgain')}
            </button>
            <button
              onClick={() => window.history.back()}
              className="block w-full px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('common:mealDetail.error.goBack')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mealImage = editedData.imageUrl || meal.image || meal.imageUrl;
  const displayData = editedData;

  return (
    <div className="min-h-screen gradient-bg pb-20">
      {/* Hero Image Section */}
      <div className="relative h-[50vh] md:h-[60vh] bg-gradient-to-b from-gray-200 to-gray-300">
        {mealImage ? (
          <img 
            src={mealImage} 
            alt={displayData.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ChefHat className="w-24 h-24 text-gray-400" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Image Upload Button (Edit Mode) */}
        {isEditing && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-black/50 backdrop-blur-sm rounded-full shadow-lg hover:bg-black/70 transition-all"
            >
              <Upload className="w-8 h-8 text-white" />
            </button>
          </>
        )}
        
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        
        {!isEditing && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute top-4 left-16 p-3 bg-red-500/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-600 transition-all"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        )}
        
        {isEditing && (
          <button
            onClick={() => {
              setIsEditing(false);
              // Reset to original meal data
              if (meal) {
                setEditedData({
                  name: meal.name || '',
                  description: meal.description || '',
                  imageUrl: meal.image || meal.imageUrl || '',
                  prepTime: meal.prepTime || 15,
                  cookTime: meal.cookTime || 30,
                  servings: meal.servings || 1,
                  calories: meal.calories || 0,
                  protein: meal.protein || 0,
                  carbs: meal.carbs || 0,
                  fat: meal.fat || 0,
                  components: meal.components || [],
                  instructions: meal.instructions || []
                });
              }
            }}
            className="absolute top-4 right-16 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        )}
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Saving...</span>
            </>
          ) : isEditing ? (
            <>
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common:mealDetail.buttons.save')}</span>
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common:mealDetail.buttons.edit')}</span>
            </>
          )}
        </button>
        
        {/* Title Section */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedData.name}
                  onChange={(e) => setEditedData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-3xl md:text-4xl font-bold text-white bg-transparent border-b-2 border-white/50 pb-2 w-full focus:outline-none focus:border-white"
                  placeholder="Meal name..."
                />
                <textarea
                  value={editedData.description}
                  onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                  className="text-white/90 text-lg bg-transparent border-b border-white/30 pb-2 w-full focus:outline-none focus:border-white/50 resize-none"
                  placeholder="Add description..."
                  rows={2}
                />
              </div>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{meal.name}</h1>
                {meal.description && (
                  <p className="text-white/90 mt-2 text-lg">{meal.description}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Info Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Prep Time</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.prepTime}
                    onChange={(e) => setEditedData(prev => ({ ...prev, prepTime: parseInt(e.target.value) || 0 }))}
                    className="font-semibold text-gray-900 w-full border-b border-gray-200 focus:border-[#26A8FF] focus:outline-none"
                    min="0"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{displayData.prepTime || 15} min</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Cook Time</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.cookTime}
                    onChange={(e) => setEditedData(prev => ({ ...prev, cookTime: parseInt(e.target.value) || 0 }))}
                    className="font-semibold text-gray-900 w-full border-b border-gray-200 focus:border-[#26A8FF] focus:outline-none"
                    min="0"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{displayData.cookTime || 30} min</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Servings</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.servings}
                    onChange={(e) => setEditedData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                    className="font-semibold text-gray-900 w-full border-b border-gray-200 focus:border-[#26A8FF] focus:outline-none"
                    min="1"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{displayData.servings || 1}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Calories</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.calories}
                    onChange={(e) => setEditedData(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                    className="font-semibold text-gray-900 w-full border-b border-gray-200 focus:border-[#26A8FF] focus:outline-none"
                    min="0"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{Math.round(displayData.calories || 0)} {t('common:mealDetail.nutrition.kcal')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nutrition Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl p-6 text-center shadow-sm"
          >
            {isEditing ? (
              <>
                <input
                  type="number"
                  value={editedData.protein}
                  onChange={(e) => setEditedData(prev => ({ ...prev, protein: parseFloat(e.target.value) || 0 }))}
                  className="text-3xl font-bold text-blue-600 mb-1 w-full text-center border-b border-blue-200 focus:border-blue-600 focus:outline-none"
                  min="0"
                  step="0.1"
                />
              </>
            ) : (
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {adjustedNutrition(displayData.protein)}g
              </div>
            )}
            <div className="text-sm text-gray-600">{t('common:mealDetail.nutrition.protein')}</div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl p-6 text-center shadow-sm"
          >
            {isEditing ? (
              <input
                type="number"
                value={editedData.carbs}
                onChange={(e) => setEditedData(prev => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))}
                className="text-3xl font-bold text-green-600 mb-1 w-full text-center border-b border-green-200 focus:border-green-600 focus:outline-none"
                min="0"
                step="0.1"
              />
            ) : (
              <div className="text-3xl font-bold text-green-600 mb-1">
                {adjustedNutrition(displayData.carbs)}g
              </div>
            )}
            <div className="text-sm text-gray-600">{t('common:mealDetail.nutrition.carbs')}</div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl p-6 text-center shadow-sm"
          >
            {isEditing ? (
              <input
                type="number"
                value={editedData.fat}
                onChange={(e) => setEditedData(prev => ({ ...prev, fat: parseFloat(e.target.value) || 0 }))}
                className="text-3xl font-bold text-orange-600 mb-1 w-full text-center border-b border-orange-200 focus:border-orange-600 focus:outline-none"
                min="0"
                step="0.1"
              />
            ) : (
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {adjustedNutrition(displayData.fat)}g
              </div>
            )}
            <div className="text-sm text-gray-600">{t('common:mealDetail.nutrition.fat')}</div>
          </motion.div>
        </div>

        {!isEditing && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('common:mealDetail.servings.title')}</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setServingMultiplier(Math.max(0.5, servingMultiplier - 0.5))}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-bold text-gray-900 min-w-[60px] text-center">
                  {servingMultiplier}x
                </span>
                <button
                  onClick={() => setServingMultiplier(servingMultiplier + 0.5)}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ingredients Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('common:mealDetail.ingredients.title')}</h3>
              {isEditing && (
                <button
                  onClick={addIngredient}
                  className="flex items-center gap-2 px-3 py-1 bg-[#26A8FF] text-white rounded-lg hover:bg-[#1A8FE6] transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              )}
            </div>
            <div className="space-y-3">
              {displayData.components && displayData.components.length > 0 ? (
                displayData.components.map((component, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isEditing ? 'bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                    onClick={() => !isEditing && handleIngredientToggle(index)}
                  >
                    {!isEditing && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        checkedIngredients.has(index) 
                          ? 'bg-[#26A8FF] border-[#26A8FF]' 
                          : 'border-gray-300'
                      }`}>
                        {checkedIngredients.has(index) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="number"
                          value={component.quantity || ''}
                          onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-200 rounded focus:border-[#26A8FF] focus:outline-none"
                          placeholder={t('common:mealDetail.ingredients.placeholder.quantity')}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <input
                          type="text"
                          value={component.unit || ''}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded focus:border-[#26A8FF] focus:outline-none"
                          placeholder={t('common:mealDetail.ingredients.placeholder.unit')}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <input
                          type="text"
                          value={component.name}
                          onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded focus:border-[#26A8FF] focus:outline-none"
                          placeholder={t('common:mealDetail.ingredients.placeholder.name')}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeIngredient(index);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`flex-1 ${
                        checkedIngredients.has(index) ? 'line-through text-gray-400' : 'text-gray-700'
                      }`}>
                        {component.quantity && component.unit ? `${component.quantity} ${component.unit} ` : ''}
                        {component.name}
                      </span>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">{t('common:mealDetail.ingredients.empty')}</p>
              )}
            </div>
          </div>

          {/* Instructions Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('common:mealDetail.instructions.title')}</h3>
              {isEditing && (
                <button
                  onClick={addInstruction}
                  className="flex items-center gap-2 px-3 py-1 bg-[#26A8FF] text-white rounded-lg hover:bg-[#1A8FE6] transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t('common:mealDetail.instructions.add')}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {displayData.instructions && displayData.instructions.length > 0 ? (
                displayData.instructions.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-4"
                  >
                    {!isEditing && (
                      <button
                        onClick={() => handleStepToggle(index)}
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                          completedSteps.has(index)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {completedSteps.has(index) ? <Check className="w-4 h-4" /> : index + 1}
                      </button>
                    )}
                    
                    {isEditing ? (
                      <div className="flex-1 flex gap-2 items-start">
                        <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-semibold text-sm text-gray-600 mt-1">
                          {index + 1}
                        </span>
                        <textarea
                          value={step}
                          onChange={(e) => updateInstruction(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-[#26A8FF] focus:outline-none resize-none"
                          placeholder={t('common:mealDetail.instructions.placeholder')}
                          rows={2}
                        />
                        <button
                          onClick={() => removeInstruction(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors mt-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className={`text-gray-700 pt-1 ${
                        completedSteps.has(index) ? 'line-through opacity-50' : ''
                      }`}>
                        {step}
                      </p>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">{t('common:mealDetail.instructions.empty')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 px-6 py-5 border-b border-red-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{t('common:mealDetail.deleteModal.title')}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {t('common:mealDetail.deleteModal.description')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Meal Info */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                    <div className="flex items-center gap-3">
                      {mealImage ? (
                        <img 
                          src={mealImage} 
                          alt={meal?.name}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center">
                          <ChefHat className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{meal?.name}</p>
                        <p className="text-sm text-gray-500">{meal?.calories || 0} {t('common:mealDetail.deleteModal.calories')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl h-12 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t('common:mealDetail.deleteModal.deleting')}</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>{t('common:mealDetail.deleteModal.confirm')}</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl h-12 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common:mealDetail.deleteModal.cancel')}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}