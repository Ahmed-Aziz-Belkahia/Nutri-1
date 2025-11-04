import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Loader2, Heart, ChefHat, Camera, Sparkles, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


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
  const [savedRecipeIds, setSavedRecipeIds] = useState<number[]>([]); // Track already saved recipes
  const [canGenerateMore, setCanGenerateMore] = useState(false); // Track if we can generate more recipes
  const { toast } = useToast();

  const generateMoreRecipes = async () => {
    if (!analysisData?.ingredients || analysisData.ingredients.length === 0) {
      toast({
        variant: "destructive",
        title: "Cannot Generate More",
        description: "No ingredient information available. Please scan new ingredients."
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Format ingredients for recipe generation
      const ingredients = analysisData.ingredients.map((ing: any) =>
        `${ing.quantity} ${ing.unit} of ${ing.name}`
      ).join(', ');

      console.log('[RecipeResults] Generating more recipes for ingredients:', ingredients);

      // Call backend to generate recipes
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ingredients: analysisData.ingredients,
          preferences: {
            difficulty: 'Medium',
            timeNeeded: 30,
            flavor: 'Balanced',
            language: 'en'
          },
          prompt: `Generate 3 NEW and different creative recipe suggestions using these ingredients: ${ingredients}. Make them unique from previous suggestions. Include detailed instructions, nutritional information, prep time, cooking time, and difficulty level.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }

      const recipeData = await response.json();
      console.log('[RecipeResults] Generated new recipe data:', recipeData);

      // Transform the generated recipes to match expected format
      const transformedRecipes = (recipeData.recipes || []).map((recipe: any) => {
        const nutritionalInfo = recipe.nutritionInfo || recipe.nutritional_information || recipe.nutritionalInformation || {};
        
        const parseNutritionValue = (value: string | number | undefined) => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          const strValue = String(value).replace(/[^\d]/g, '');
          const parsed = parseInt(strValue) || 0;
          return parsed;
        };

        return {
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
      });

      // Add new recipes to existing ones
      setAnalysisData(prev => prev ? {
        ...prev,
        recipes: {
          recipeSuggestions: [...prev.recipes.recipeSuggestions, ...transformedRecipes]
        }
      } : null);
      
      toast({
        title: "Success!",
        description: `Generated ${transformedRecipes.length} new recipes!`
      });
      
    } catch (error) {
      console.error('[RecipeResults] Failed to generate more recipes:', error);
      toast({
        variant: "destructive",
        title: "Recipe Generation Failed",
        description: "Could not generate more recipes. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      
      setCanGenerateMore(true); // Enable generate more button
      
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
      
      // Check if we have stored ingredients data
      const storedIngredients = localStorage.getItem('recipeIngredientsData');
      let ingredientsData = [];
      
      if (storedIngredients) {
        try {
          ingredientsData = JSON.parse(storedIngredients);
          console.log('[RecipeResults] Found stored ingredients data:', ingredientsData);
        } catch (e) {
          console.error('[RecipeResults] Failed to parse stored ingredients:', e);
        }
      }
      
      // Fetch each recipe from the food logs endpoint
      const recipePromises = recipeIds.map(async id => {
        try {
          const response = await fetch(`/api/food-logs/${id}`, {
            credentials: 'include'
          });
          if (!response.ok) {
            console.error(`[RecipeResults] Failed to fetch recipe ${id}: ${response.status}`);
            return null;
          }
          const data = await response.json();
          console.log(`[RecipeResults] Successfully fetched recipe ${id}:`, data);
          return data;
        } catch (error) {
          console.error(`[RecipeResults] Error fetching recipe ${id}:`, error);
          return null;
        }
      });
      
      const recipes = await Promise.all(recipePromises);
      const validRecipes = recipes.filter(r => r !== null);
      
      console.log('[RecipeResults] Fetched recipes:', {
        total: recipeIds.length,
        successful: validRecipes.length,
        failed: recipeIds.length - validRecipes.length
      });
      
      if (validRecipes.length === 0) {
        console.error('[RecipeResults] No recipes could be fetched from database');
        throw new Error('No recipes found in database. They may still be saving...');
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
        ingredients: ingredientsData, // Use stored ingredients if available
        recipes: {
          recipeSuggestions: transformedRecipes
        }
      });
      setSavedRecipeIds(recipeIds);
      setCanGenerateMore(ingredientsData.length > 0); // Enable if we have ingredients data
      setIsLoading(false);
    } catch (error) {
      console.error('[RecipeResults] Failed to fetch recipes from database:', error);
      
      // If we have ingredients data, offer to regenerate
      const storedIngredients = localStorage.getItem('recipeIngredientsData');
      if (storedIngredients) {
        try {
          const ingredientsData = JSON.parse(storedIngredients);
          setError('Recipes are still being saved. Generating fresh recipes...');
          
          // Wait a bit then try to generate fresh recipes
          setTimeout(() => {
            generateRecipesFromIngredients({
              ingredients: ingredientsData,
              preferences: {
                difficulty: 'Medium',
                timeNeeded: 30,
                flavor: 'Mixed'
              }
            });
          }, 1000);
          return;
        } catch (e) {
          console.error('[RecipeResults] Could not parse stored ingredients:', e);
        }
      }
      
      setError('Failed to load recipes');
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load recipes. Redirecting back...",
        duration: 3000
      });
      
      // Redirect back to scan page after 3 seconds
      setTimeout(() => {
        setLocation('/scan-recipe');
      }, 3000);
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
        setCanGenerateMore(parsedData.ingredients && parsedData.ingredients.length > 0); // Enable if we have ingredients
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
      setCanGenerateMore(parsedData.ingredients && parsedData.ingredients.length > 0);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex flex-col items-center justify-center gap-4 p-6">
        <div className="relative">
          <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#26A8FF]"></div>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Sparkles className="w-8 h-8 text-[#26A8FF] animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-gray-900">
            Processing ingredients...
          </p>
          <p className="text-sm text-gray-600">
            AI is crafting your perfect recipes
          </p>
        </div>
      </div>
    );
  }

  if (error || !analysisData || !analysisData.recipes.recipeSuggestions || analysisData.recipes.recipeSuggestions.length === 0) {
    return (
       <div className="min-h-screen bg-[#F8F8F8] flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
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
          <Button className="bg-[#26A8FF] hover:bg-[#1A8FE8] text-white px-6 py-3 rounded-xl font-semibold shadow-sm">
            Try Again
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation('/recipes')}
              className="text-gray-700 hover:text-[#26A8FF] hover:bg-gray-50 rounded-lg p-2"
            >
              <X className="h-5 w-5" />
            </Button>
            
            <h1 className="text-xl font-bold text-gray-900">
              Recipe Suggestions
            </h1>
            
            <div className="w-9 h-9"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-32">
        {/* Recipe Results Grid */}
        <div className="space-y-4">
          {analysisData.recipes.recipeSuggestions.map((recipe, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="p-5">
                {/* Recipe Header */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {recipe.name}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      <ChefHat className="w-3.5 h-3.5 mr-1.5" />
                      {recipe.difficulty}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {((recipe.prepTime || 0) + (recipe.cookingTime || 0)) || 30} min
                    </span>
                  </div>
                </div>

                {/* Nutrition Grid */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { 
                      label: 'Cal', 
                      value: recipe.nutritionalInfo.calories || 0,
                      bgColor: 'bg-blue-50',
                      textColor: 'text-blue-600'
                    },
                    { 
                      label: 'Protein', 
                      value: `${recipe.nutritionalInfo.protein || 0}g`,
                      bgColor: 'bg-[#F8F8F8]',
                      textColor: 'text-gray-900'
                    },
                    { 
                      label: 'Carbs', 
                      value: `${recipe.nutritionalInfo.carbs || 0}g`,
                      bgColor: 'bg-[#F8F8F8]',
                      textColor: 'text-gray-900'
                    },
                    { 
                      label: 'Fat', 
                      value: `${recipe.nutritionalInfo.fat || 0}g`,
                      bgColor: 'bg-[#F8F8F8]',
                      textColor: 'text-gray-900'
                    }
                  ].map((macro) => (
                    <div key={macro.label} className={`${macro.bgColor} rounded-xl p-3 text-center`}>
                      <div className={`text-lg font-bold ${macro.textColor}`}>
                        {macro.value}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {macro.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ingredients Section */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">
                    Ingredients
                  </h4>
                  <div className="bg-[#F8F8F8] rounded-xl p-3">
                    <div className="flex flex-wrap gap-2">
                      {recipe.ingredients.slice(0, 5).map((ingredient, idx) => (
                        <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-white rounded-lg text-xs text-gray-700 border border-gray-200">
                          {ingredient.length > 25 ? `${ingredient.substring(0, 25)}...` : ingredient}
                        </span>
                      ))}
                      {recipe.ingredients.length > 5 && (
                        <span className="inline-flex items-center px-3 py-1.5 bg-[#26A8FF] text-white rounded-lg text-xs font-semibold">
                          +{recipe.ingredients.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Recipe Button */}
                <Button
                  onClick={async () => {
                    // If recipe has an ID (saved in database), use ID-based route
                    if (recipe.id) {
                      setLocation(`/recipe-detail/${recipe.id}`);
                      return;
                    }
                    
                    // If recipe is not saved, save it first then navigate
                    try {
                      const imageData = analysisData?.image || localStorage.getItem('analyzingIngredientsImage');
                      
                      const formattedRecipe = {
                        name: recipe.name,
                        description: recipe.description || `Recipe generated from scanned ingredients`,
                        mealType: recipe.mealType || 'dinner',
                        ingredients: recipe.ingredients,
                        instructions: recipe.instructions,
                        prepTime: recipe.prepTime,
                        cookTime: recipe.cookingTime,
                        servings: 2,
                        difficulty: recipe.difficulty,
                        cuisineType: recipe.cuisine || 'International',
                        calories: recipe.nutritionalInfo.calories,
                        protein: recipe.nutritionalInfo.protein,
                        carbs: recipe.nutritionalInfo.carbs,
                        fat: recipe.nutritionalInfo.fat,
                        fiber: 5,
                        sugar: 8,
                        sodium: 500,
                        image: imageData,
                        isRecipe: true,
                        source: 'ingredient_generation',
                        components: analysisData?.ingredients?.map((ing: any) => ing.name) || [],
                        isAnalyzing: true,
                        hideFromToday: true
                      };

                      const saveResponse = await fetch('/api/food-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formattedRecipe),
                        credentials: 'include'
                      });

                      if (saveResponse.ok) {
                        const savedRecipe = await saveResponse.json();
                        setLocation(`/recipe-detail/${savedRecipe.log.id}`);
                      } else {
                        throw new Error('Failed to save recipe');
                      }
                    } catch (error) {
                      console.error('Failed to save recipe:', error);
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to save recipe. Please try again."
                      });
                    }
                  }}
                  className="w-full py-3 bg-[#26A8FF] hover:bg-[#1A8FE8] text-white rounded-xl font-semibold text-base shadow-sm transition-all duration-200"
                >
                  <span className="flex items-center justify-center gap-2">
                    View Full Recipe
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Generate More Section - Only show if we have ingredient data */}
        {canGenerateMore && (
          <div className="mt-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-[#26A8FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Want More Recipe Ideas?
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  Generate additional recipes using the same ingredients
                </p>
                
                <Button
                  onClick={generateMoreRecipes}
                  disabled={isLoading}
                  className="w-full py-3 bg-[#26A8FF] hover:bg-[#1A8FE8] text-white rounded-xl font-semibold shadow-sm transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Generate More Recipes
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed View All Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => setLocation('/recipes')}
            className="w-full py-4 bg-[#26A8FF] hover:bg-[#1A8FE8] text-white rounded-xl font-semibold text-base shadow-sm transition-all duration-200"
          >
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 fill-white" />
              <span>View All Recipes ({analysisData.recipes.recipeSuggestions.length})</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}