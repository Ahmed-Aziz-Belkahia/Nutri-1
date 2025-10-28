import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronRight, Loader2, Plus, Heart, ChefHat, Camera, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Recipe {
  id?: number;
  name: string;
  description?: string;
  mealType?: string;
  ingredients: string[];
  instructions: string[];
  difficulty: string;
  prepTime: number;
  cookingTime: number;
  flavor: string;
  cuisine?: string;
  nutritionalInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface AnalysisData {
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    estimatedWeight: number;
    freshness?: string;
    quality?: string;
  }>;
  image?: string;
  recipes: {
    recipeSuggestions: Recipe[]; 
  };
}

export default function RecipeResults() {
  const [location, setLocation] = useLocation();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState<number[]>([]); // Track already saved recipes
  const { toast } = useToast();

  const generateRecipesFromIngredients = async (ingredientsData: any) => {
    try {
      setIsLoading(true);
      
      // Format ingredients for recipe generation
      const ingredients = ingredientsData.ingredients.map((ing: any) =>
        `${ing.quantity} ${ing.unit} of ${ing.name}`
      ).join(', ');

      console.log('Generating recipes for ingredients:', ingredients);
      console.log('Recipe preferences:', ingredientsData.preferences);

      // Call backend to generate recipes with preferences
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ingredients: ingredientsData.ingredients,
          preferences: ingredientsData.preferences || {
            difficulty: 'Medium',
            timeNeeded: 30,
            flavor: 'Balanced',
            language: 'en'
          },
          prompt: `Generate 3 creative recipe suggestions using these ingredients: ${ingredients}. Include detailed instructions, nutritional information, prep time, cooking time, difficulty level, and cuisine type.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }

      const recipeData = await response.json();
      console.log('Generated recipe data:', recipeData);

      // Transform the generated recipes to match expected format
      const transformedRecipes = (recipeData.recipes || []).map((recipe: any) => {
        // The API returns nutritionInfo, not nutritional_information
        const nutritionalInfo = recipe.nutritionInfo || recipe.nutritional_information || recipe.nutritionalInformation || {};
        console.log('Processing recipe:', recipe.name, 'Nutrition data:', nutritionalInfo);
        
        const parseNutritionValue = (value: string | number | undefined) => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          const strValue = String(value).replace(/[^\d]/g, '');
          const parsed = parseInt(strValue) || 0;
          return parsed;
        };

        const transformedRecipe = {
          name: recipe.name || recipe.title || 'Generated Recipe',
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          difficulty: recipe.difficultyLevel || recipe.difficulty || 'Medium',
          prepTime: parseInt(String(recipe.prepTime || recipe.prep_time || '15').split(' ')[0]),
          cookingTime: parseInt(String(recipe.cookingTime || recipe.cooking_time || '15').split(' ')[0]),
          flavor: recipe.flavor || 'Mixed',
          cuisine: recipe.cuisine || 'International',
          nutritionalInfo: {
            calories: parseNutritionValue(nutritionalInfo.calories),
            protein: parseNutritionValue(nutritionalInfo.protein),
            carbs: parseNutritionValue(nutritionalInfo.carbohydrates || nutritionalInfo.carbs),
            fat: parseNutritionValue(nutritionalInfo.fat)
          }
        };
        
        console.log('Transformed nutrition values:', transformedRecipe.nutritionalInfo);
        return transformedRecipe;
      });

      setAnalysisData({
        ingredients: ingredientsData.ingredients,
        image: ingredientsData.image,
        recipes: {
          recipeSuggestions: transformedRecipes
        }
      });
      
    } catch (error) {
      console.error('Failed to generate recipes:', error);
      setError('Failed to generate recipes from ingredients');
      toast({
        variant: "destructive",
        title: "Recipe Generation Failed",
        description: "Could not generate recipes from the scanned ingredients. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch recipes from database by IDs
  const fetchRecipesFromDatabase = async (recipeIds: number[]) => {
    try {
      setIsLoading(true);
      console.log('[RecipeResults] Fetching recipes from database:', recipeIds);
      
      // Fetch each recipe from the food logs endpoint
      const recipePromises = recipeIds.map(id => 
        fetch(`/api/food-logs/${id}`, {
          credentials: 'include'
        }).then(res => res.ok ? res.json() : null)
      );
      
      const recipes = await Promise.all(recipePromises);
      const validRecipes = recipes.filter(r => r !== null);
      
      console.log('[RecipeResults] Fetched recipes:', validRecipes);
      
      if (validRecipes.length === 0) {
        throw new Error('No recipes found');
      }
      
      // Transform to expected format
      const transformedRecipes = validRecipes.map((recipe: any) => ({
        id: recipe.id,
        name: recipe.name,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        difficulty: recipe.difficulty || 'Medium',
        prepTime: recipe.prepTime || recipe.prep_time || 15,
        cookingTime: recipe.cookTime || recipe.cook_time || 15,
        flavor: recipe.flavor || 'Mixed',
        cuisine: recipe.cuisine || recipe.cuisineType || 'International',
        nutritionalInfo: {
          calories: recipe.calories || 0,
          protein: recipe.protein || 0,
          carbs: recipe.carbs || 0,
          fat: recipe.fat || 0
        }
      }));
      
      setAnalysisData({
        ingredients: [], // We don't have ingredients info when loading from DB
        recipes: {
          recipeSuggestions: transformedRecipes
        }
      });
      setSavedRecipeIds(recipeIds);
      setIsLoading(false);
    } catch (error) {
      console.error('[RecipeResults] Failed to fetch recipes from database:', error);
      setError('Failed to load recipes');
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load recipes. Please try again."
      });
    }
  };

  useEffect(() => {
    console.log('[RecipeResults] useEffect triggered');
    
    // First check URL for recipe IDs (new approach - fetch from DB)
    const searchParams = new URLSearchParams(window.location.search);
    const idsParam = searchParams.get('ids');
    
    if (idsParam) {
      console.log('[RecipeResults] Found recipe IDs in URL:', idsParam);
      const recipeIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (recipeIds.length > 0) {
        fetchRecipesFromDatabase(recipeIds);
        return;
      }
    }
    
    console.log('[RecipeResults] Checking localStorage for recipeResultsData');
    
    // Fallback: check localStorage for data (old approach for compatibility)
    const localData = localStorage.getItem('recipeResultsData');
    console.log('[RecipeResults] localStorage data exists:', !!localData);
    console.log('[RecipeResults] localStorage data length:', localData?.length);
    
    if (localData) {
      console.log('[RecipeResults] Found data in localStorage');
      try {
        const parsedData = JSON.parse(localData);
        console.log('[RecipeResults] Parsed data:', parsedData);
        console.log('[RecipeResults] Recipes array:', parsedData.recipes?.recipeSuggestions);
        
        if (!parsedData || !parsedData.ingredients) {
          throw new Error('Invalid data format - no ingredients found');
        }

        // If we have ingredients but no recipes, generate them
        if (!parsedData.recipes?.recipeSuggestions || parsedData.recipes.recipeSuggestions.length === 0) {
          console.log('[RecipeResults] No recipes found in data, generating from ingredients...');
          localStorage.removeItem('recipeResultsData'); // Clean up before generating
          generateRecipesFromIngredients(parsedData);
          return;
        }

        const transformedRecipes = parsedData.recipes.recipeSuggestions.map((recipe: any) => {
          // Handle both nested nutritionInfo and top-level nutrition fields
          const nutritionalInfo = recipe.nutritionInfo || recipe.nutritional_information || recipe.nutritionalInformation || {};
          console.log('Processing existing recipe:', recipe.name, 'Full recipe:', recipe);
          console.log('Raw nutrition data:', nutritionalInfo);
          
          const parseNutritionValue = (value: string | number | undefined) => {
            if (!value) return 0;
            if (typeof value === 'number') return value;
            const strValue = String(value).replace(/[^\d]/g, '');
            const parsed = parseInt(strValue) || 0;
            return parsed;
          };

          const transformedRecipe = {
            id: recipe.id, // Include ID for saved recipes
            name: recipe.name || recipe.title || 'Untitled Recipe',
            ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
            instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
            difficulty: recipe.difficultyLevel || recipe.difficulty || 'Medium',
            prepTime: parseInt(String(recipe.prepTime || recipe.prep_time || recipe.cookingTime || '15').split(' ')[0]),
            cookingTime: parseInt(String(recipe.cookTime || recipe.cook_time || recipe.cookingTime || '15').split(' ')[0]),
            flavor: recipe.flavor || 'Mixed',
            cuisine: recipe.cuisine || recipe.cuisineType || 'International',
            nutritionalInfo: {
              // Check both nested nutritionalInfo and top-level fields (from saved recipes)
              calories: parseNutritionValue(nutritionalInfo.calories || recipe.calories),
              protein: parseNutritionValue(nutritionalInfo.protein || recipe.protein),
              carbs: parseNutritionValue(nutritionalInfo.carbohydrates || nutritionalInfo.carbs || recipe.carbs),
              fat: parseNutritionValue(nutritionalInfo.fat || recipe.fat)
            }
          };
          
          console.log('Final transformed nutrition values:', transformedRecipe.nutritionalInfo);
          return transformedRecipe;
        });

        setAnalysisData({
          ingredients: parsedData.ingredients,
          image: parsedData.image,
          recipes: {
            recipeSuggestions: transformedRecipes
          }
        });
        setSavedRecipeIds(parsedData.savedRecipeIds || []); // Track which recipes are already saved
        localStorage.removeItem('recipeResultsData'); // Clean up after successful processing
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('[Recipe Results] Failed to parse localStorage data:', error);
        localStorage.removeItem('recipeResultsData'); // Clean up on error
        // Fall through to old URL parameter check (for backward compatibility)
      }
    }
    
    // Old fallback: Check for 'data' parameter (legacy approach - not recommended)
    const dataParam = searchParams.get('data');
    
    console.log('Full window location:', window.location.href);
    console.log('Search params:', window.location.search);
    console.log('Data param from URL:', dataParam);

    if (!dataParam) {
      setIsLoading(false);
      setError('No recipe data found');
      console.error('No data parameter found in URL. Full location:', location);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No recipe data found. Please try scanning again."
      });
      return;
    }

    try {
      const decodedData = decodeURIComponent(dataParam);
      const parsedData = JSON.parse(decodedData);

      if (!parsedData || !parsedData.ingredients) {
        throw new Error('Invalid data format - no ingredients found');
      }

      // If we have ingredients but no recipes, generate them
      if (!parsedData.recipes?.recipeSuggestions) {
        console.log('No recipes found in data, generating from ingredients...');
        generateRecipesFromIngredients(parsedData);
        return;
      }

      const transformedRecipes = parsedData.recipes.recipeSuggestions.map((recipe: any) => {
        // Handle both nested nutritionInfo and top-level nutrition fields
        const nutritionalInfo = recipe.nutritionInfo || recipe.nutritional_information || recipe.nutritionalInformation || {};
        console.log('Processing existing recipe:', recipe.name, 'Full recipe:', recipe);
        console.log('Raw nutrition data:', nutritionalInfo);
        
        const parseNutritionValue = (value: string | number | undefined) => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          const strValue = String(value).replace(/[^\d]/g, '');
          const parsed = parseInt(strValue) || 0;
          return parsed;
        };

        const transformedRecipe = {
          id: recipe.id, // Include ID for saved recipes
          name: recipe.name || recipe.title || 'Untitled Recipe',
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          difficulty: recipe.difficultyLevel || recipe.difficulty || 'Medium',
          prepTime: parseInt(String(recipe.prepTime || recipe.prep_time || recipe.cookingTime || '15').split(' ')[0]),
          cookingTime: parseInt(String(recipe.cookTime || recipe.cook_time || recipe.cookingTime || '15').split(' ')[0]),
          flavor: recipe.flavor || 'Mixed',
          cuisine: recipe.cuisine || recipe.cuisineType || 'International',
          nutritionalInfo: {
            // Check both nested nutritionalInfo and top-level fields (from saved recipes)
            calories: parseNutritionValue(nutritionalInfo.calories || recipe.calories),
            protein: parseNutritionValue(nutritionalInfo.protein || recipe.protein),
            carbs: parseNutritionValue(nutritionalInfo.carbohydrates || nutritionalInfo.carbs || recipe.carbs),
            fat: parseNutritionValue(nutritionalInfo.fat || recipe.fat)
          }
        };
        
        console.log('Final transformed nutrition values:', transformedRecipe.nutritionalInfo);
        return transformedRecipe;
      });

      setAnalysisData({
        ingredients: parsedData.ingredients,
        image: parsedData.image,
        recipes: {
          recipeSuggestions: transformedRecipes
        }
      });
      setIsLoading(false);

    } catch (error) {
      console.error('[Recipe Results] Failed to parse analysis data:', error);
      setError('Failed to load recipe data');
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load recipe data. Please try scanning again."
      });
    }
  }, [location, toast]);

  const handleSaveSelected = async () => {
    if (!analysisData || selectedRecipes.size === 0) {
      toast({
        title: "No recipes selected",
        description: "Please select at least one recipe to save.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const recipesToSave = Array.from(selectedRecipes)
        .map(index => analysisData.recipes.recipeSuggestions[index])
        .filter(recipe => recipe.id ? !savedRecipeIds.includes(recipe.id) : true); // Skip already saved

      if (recipesToSave.length === 0) {
        toast({
          title: "Already Saved",
          description: "All selected recipes are already in your collection!",
        });
        setIsSaving(false);
        return;
      }

      const selectedRecipesArray = recipesToSave.map(recipe => {
        return {
          name: recipe.name,
          description: recipe.description || `AI-generated recipe based on ingredients scan`,
          servings: 4,
          prepTime: recipe.prepTime || 15,
          cookTime: recipe.cookingTime || 15,
          totalTime: (recipe.prepTime || 15) + (recipe.cookingTime || 15),
          difficulty: recipe.difficulty || 'Medium',
          cuisine: recipe.cuisine || 'International',
          mealType: recipe.mealType || determineMealType(recipe.name),
          calories: recipe.nutritionalInfo.calories || 0,
          protein: recipe.nutritionalInfo.protein || 0,
          carbs: recipe.nutritionalInfo.carbs || 0,
          fat: recipe.nutritionalInfo.fat || 0,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          notes: `Generated from ingredient scan. Cuisine: ${recipe.cuisine || 'International'}, Flavor profile: ${recipe.flavor || 'Mixed'}`,
          tags: [recipe.cuisine || 'International', recipe.flavor || 'Mixed', 'AI Generated'],
          isPublic: true,
          isRecipe: true,
          source: 'ingredient_scan',
          imageUrl: analysisData.image || ''
        };
      });

      const newSavedIds = [];
      for (const recipe of selectedRecipesArray) {
        const response = await fetch("/api/food-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(recipe),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save recipe');
        }
        
        const result = await response.json();
        if (result.log?.id) {
          newSavedIds.push(result.log.id);
        }
      }

      setSavedRecipeIds([...savedRecipeIds, ...newSavedIds]);

      toast({
        title: "Success",
        description: `${recipesToSave.length} recipe(s) saved successfully!`
      });
      setLocation('/recipes');

    } catch (error) {
      console.error('Error saving recipes:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save recipes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const determineMealType = (recipeName: string): string => {
    const name = recipeName.toLowerCase();
    if (name.includes('breakfast') || name.includes('morning') || name.includes('oatmeal') || name.includes('pancake')) {
      return 'breakfast';
    } else if (name.includes('lunch') || name.includes('sandwich') || name.includes('salad')) {
      return 'lunch';
    } else if (name.includes('dinner') || name.includes('evening')) {
      return 'dinner';
    } else if (name.includes('snack') || name.includes('bite')) {
      return 'snack';
    } else {
      const hour = new Date().getHours();
      if (hour < 11) return 'breakfast';
      else if (hour < 15) return 'lunch';
      else if (hour < 20) return 'dinner';
      else return 'snack';
    }
  };

  const toggleRecipeSelection = (index: number) => {
    setSelectedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] via-white to-[#ecfeff] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0CC5BA]"></div>
        <p className="text-base font-medium text-gray-600">
          Processing ingredients...
        </p>
      </div>
    );
  }

  if (error || !analysisData || !analysisData.recipes.recipeSuggestions || analysisData.recipes.recipeSuggestions.length === 0) {
    return (
       <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] via-white to-[#ecfeff] flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {error || "No recipes found"}
          </h2>
          <p className="text-gray-600 text-sm">
            {error
              ? "An error occurred while processing ingredients. Please try again."
              : "We couldn't find recipes matching your ingredients. Try scanning different ingredients."}
          </p>
        </div>
        <Link href="/recipes">
          <Button className="bg-[#0CC5BA] hover:bg-[#0BB5AA] text-white px-6 py-2 rounded-xl font-medium">
            Try Again
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation('/recipes')}
              className="flex items-center gap-2 text-gray-600 hover:text-[#0CC5BA] hover:bg-[#0CC5BA]/10 rounded-xl px-3 py-2 font-medium transition-all duration-200"
            >
              <X className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#0CC5BA]/20 to-[#0C9CCC]/20 p-2.5 rounded-full">
                <ChefHat className="h-5 w-5 text-[#0CC5BA]" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#0C9CCC] bg-clip-text text-transparent">
                Recipe Suggestions
              </h1>
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setLocation("/scan-recipe")}
              className="flex items-center gap-2 text-gray-600 hover:text-[#0CC5BA] hover:bg-[#0CC5BA]/10 rounded-xl px-3 py-2 font-medium transition-all duration-200"
            >
              <Camera className="h-4 w-4" />
              Scan More
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recipe Results Grid */}
        <div className="grid gap-6 lg:gap-8 mb-8">
          {analysisData.recipes.recipeSuggestions.map((recipe, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="group"
            >
              <Card className="bg-white rounded-2xl shadow-md border border-gray-200/50 overflow-hidden hover:shadow-lg hover:border-[#0CC5BA]/30 transition-all duration-300">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <Checkbox
                        checked={selectedRecipes.has(index)}
                        onCheckedChange={() => toggleRecipeSelection(index)}
                        className="w-4 h-4 data-[state=checked]:bg-[#0CC5BA] data-[state=checked]:border-[#0CC5BA] border-2"
                      />
                    </div>
                    
                    {/* Recipe Content */}
                    <div className="flex-1 space-y-3">
                      {/* Recipe Header */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-lg font-bold text-gray-900 leading-tight">
                            {recipe.name}
                          </h2>
                          {recipe.id && (
                            <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 px-2 py-0.5 text-xs font-medium flex-shrink-0">
                              ✓ Saved
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 text-xs font-medium">
                            {recipe.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 text-xs font-medium">
                            {((recipe.prepTime || 0) + (recipe.cookingTime || 0)) || 30} min
                          </Badge>
                          {recipe.cuisine && (
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-0.5 text-xs font-medium">
                              {recipe.cuisine}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Nutrition Cards - Compact */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'CAL', value: recipe.nutritionalInfo.calories || 0, color: 'text-red-600', bg: 'bg-red-50' },
                          { label: 'PROT', value: `${recipe.nutritionalInfo.protein || 0}g`, color: 'text-blue-600', bg: 'bg-blue-50' },
                          { label: 'CARBS', value: `${recipe.nutritionalInfo.carbs || 0}g`, color: 'text-green-600', bg: 'bg-green-50' },
                          { label: 'FAT', value: `${recipe.nutritionalInfo.fat || 0}g`, color: 'text-orange-600', bg: 'bg-orange-50' }
                        ].map((macro) => (
                          <div key={macro.label} className={`${macro.bg} rounded-lg p-2 text-center`}>
                            <div className={`text-sm font-bold ${macro.color}`}>
                              {macro.value}
                            </div>
                            <div className="text-xs font-medium text-gray-600 uppercase">
                              {macro.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Ingredients Preview - Compact */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                          Key Ingredients
                        </h4>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.ingredients.slice(0, 4).map((ingredient, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs text-gray-700 border border-gray-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0CC5BA]" />
                                {ingredient.length > 20 ? `${ingredient.substring(0, 20)}...` : ingredient}
                              </span>
                            ))}
                            {recipe.ingredients.length > 4 && (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-200 rounded-lg text-xs text-gray-500">
                                +{recipe.ingredients.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setLocation(`/recipe-detail?recipe=${encodeURIComponent(JSON.stringify(recipe))}`);
                          }}
                          className="flex items-center gap-1 text-[#0CC5BA] hover:text-white hover:bg-[#0CC5BA] rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300"
                        >
                          View Full Recipe
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Generate More Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-[#0CC5BA]/10 via-white to-[#0C9CCC]/10 rounded-3xl shadow-xl border border-[#0CC5BA]/20 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#0CC5BA] to-[#0C9CCC] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Want More Recipe Ideas?
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Generate additional recipes using the same ingredients with different cooking styles and flavors
              </p>
              
              <Button
                onClick={() => generateRecipesFromIngredients({ ingredients: analysisData.ingredients })}
                disabled={isLoading}
                className="py-4 px-8 bg-gradient-to-r from-[#0CC5BA] to-[#0C9CCC] text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating New Recipes...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5" />
                    Generate More Recipes
                  </div>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Fixed Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 p-4 shadow-lg"
      >
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={handleSaveSelected}
            disabled={selectedRecipes.size === 0 || isSaving}
            className="w-full py-4 bg-gradient-to-r from-[#0CC5BA] to-[#0C9CCC] text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                Saving Selected Recipes...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Heart className="w-5 h-5" />
                {(() => {
                  const selectedArray = Array.from(selectedRecipes);
                  const newCount = selectedArray.filter(index => !analysisData.recipes.recipeSuggestions[index].id).length;
                  const savedCount = selectedArray.length - newCount;
                  if (savedCount > 0 && newCount > 0) {
                    return `Save Selected (${newCount} new, ${savedCount} already saved)`;
                  } else if (savedCount > 0) {
                    return `View Selected (${savedCount} already saved)`;
                  } else {
                    return `Save Selected Recipes (${selectedRecipes.size})`;
                  }
                })()}
              </div>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}