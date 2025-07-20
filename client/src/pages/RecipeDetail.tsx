import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Heart, Share2, Clock, Users, Apple, ChefHat, Minus, Plus, Printer, Calendar, Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Recipe {
  id: number;
  name: string;
  ingredients: string[];
  instructions: string[] | string;
  nutritionInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  prepTime: string;
  difficulty: string;
  description?: string;
  rating?: number;
  createdAt: string;
}

export default function RecipeDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<'ingredients' | 'instructions'>('ingredients');
  const [servings, setServings] = useState(4);
  const [isLiked, setIsLiked] = useState(false);

  // Fetch recipe data
  const { data: recipe, isLoading, error } = useQuery<Recipe>({
    queryKey: ['/api/recipes', id],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipe');
      }
      return response.json();
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0CC5BA] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Recipe not found</p>
          <Button onClick={() => navigate('/recipes')} className="bg-[#0CC5BA] hover:bg-[#0CC5BA]/90">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipes
          </Button>
        </div>
      </div>
    );
  }

  // Calculate adjusted ingredients based on servings
  const originalServings = 4; // Assuming recipes are for 4 servings by default
  const adjustedIngredients = recipe.ingredients.map(ingredient => {
    if (servings === originalServings) return ingredient;
    
    // Simple scaling for ingredients with numbers
    return ingredient.replace(/(\d+(?:\.\d+)?)/g, (match) => {
      const num = parseFloat(match);
      const adjusted = (num * servings) / originalServings;
      return adjusted % 1 === 0 ? adjusted.toString() : adjusted.toFixed(1);
    });
  });

  // Process instructions
  const displayInstructions = Array.isArray(recipe.instructions) 
    ? recipe.instructions 
    : [recipe.instructions];

  // Adjust nutrition based on servings
  const adjustNutrition = (value: number) => {
    return Math.round((value * servings) / originalServings);
  };

  // Generate a gradient background for the recipe header similar to EnhancedRecipeCard
  const getBgGradient = () => {
    const gradients = [
      'bg-gradient-to-br from-[#e6f7f6] to-[#d9f2f1]', // Teal pastel
      'bg-gradient-to-br from-[#e6f0f9] to-[#d9e8f5]', // Blue pastel
      'bg-gradient-to-br from-[#f5e6f9] to-[#edd9f5]', // Purple pastel
      'bg-gradient-to-br from-[#f9e6e6] to-[#f5d9d9]', // Red pastel
      'bg-gradient-to-br from-[#f9f6e6] to-[#f5f1d9]', // Yellow pastel
    ];
    
    const index = (recipe.id % gradients.length);
    return gradients[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-20">
      {/* Navigation matching recipes page style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/recipes')}
              className="flex items-center gap-2 text-gray-700 hover:text-[#0CC5BA] hover:bg-[#0CC5BA]/10 rounded-xl px-4 py-2 font-medium transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Recipes
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-4 pb-8 max-w-4xl">
        {/* Recipe Header Card - matching EnhancedRecipeCard style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="overflow-hidden rounded-3xl border-0 shadow-xl">
            {/* Header with gradient background */}
            <div className={`relative ${getBgGradient()} pt-8 pb-6 px-6`}>
              <div className="text-center max-w-lg mx-auto">
                {/* Icon - integrated into the card */}
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-lg border border-white/20">
                  <Utensils className="w-8 h-8 text-[#0CC5BA]" />
                </div>
                
                {/* Title - properly centered */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4 leading-tight text-center">
                  {recipe.name}
                </h1>
                
                {/* Subtitle - clearly separated and muted */}
                <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed text-center">
                  AI-generated recipe based on ingredients scan
                </p>
              </div>
            </div>
            
            {/* Stats section */}
            <div className="p-6 bg-white">
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Badge variant="secondary" className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">
                  <Clock className="h-4 w-4 mr-2" />
                  25 min
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">
                  <Users className="h-4 w-4 mr-2" />
                  {servings} porcje
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">
                  Łatwy
                </Badge>
              </div>

              {/* Nutrition grid matching recipes page card style */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'CALORIES', value: adjustNutrition(recipe.nutritionInfo.calories) },
                  { label: 'PROTEIN', value: `${adjustNutrition(recipe.nutritionInfo.protein)}g` },
                  { label: 'CARBS', value: `${adjustNutrition(recipe.nutritionInfo.carbs)}g` },
                  { label: 'FAT', value: `${adjustNutrition(recipe.nutritionInfo.fat)}g` }
                ].map((stat, index) => (
                  <div key={stat.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="text-xl font-bold text-[#0CC5BA] mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Content Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Ingredients Card */}
          <Card className="overflow-hidden rounded-3xl border-0 shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#0CC5BA]/10 p-2 rounded-full flex items-center justify-center">
                    <Apple className="h-5 w-5 text-[#0CC5BA] flex-shrink-0" />
                  </div>
                  <h2 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">
                    Ingredients
                  </h2>
                </div>
                
                {/* Servings controller */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="h-8 w-8 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                    {servings}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setServings(servings + 1)}
                    className="h-8 w-8 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Ingredients list */}
              <div className="space-y-3">
                {adjustedIngredients.map((ingredient, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="h-2 w-2 rounded-full bg-[#0CC5BA]" />
                    <span className="text-gray-700 font-medium">
                      {ingredient}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>

          {/* Instructions Card */}
          <Card className="overflow-hidden rounded-3xl border-0 shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#0CC5BA]/10 p-2 rounded-full">
                  <ChefHat className="h-5 w-5 text-[#0CC5BA]" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">
                  Instructions
                </h2>
              </div>
              
              <div className="space-y-4">
                {displayInstructions.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-[#0CC5BA] flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 leading-relaxed font-medium">
                        {step}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>

        </motion.div>
      </div>
      
      {/* Sticky Start Cooking Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50">
        <Button 
          className="w-full bg-[#0CC5BA] hover:bg-teal-600 text-white font-semibold py-4 rounded-2xl transition-all duration-300"
          onClick={() => {
            navigate(`/cooking/${recipe.id}`);
          }}
        >
          <ChefHat className="h-5 w-5 mr-2" />
          {t('cooking.startCooking', 'Zacznij gotować')}
        </Button>
      </div>
    </div>
  );
}