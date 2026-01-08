import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import BaseLayout from "@/components/layouts/BaseLayout";
import MealsSection from "@/components/dashboard/MealsSection";
import AllRecipesSection from "@/components/recipes/AllRecipesSection";
import MealPlanViewContent from "@/components/recipes/MealPlanViewContent";
import { Book, Calendar, Camera, Sparkles, Clock, ChefHat, Store, ArrowRight } from "lucide-react";
import { useScannedMealsToday, useScannedMeals, useIngredientGeneratedRecipes } from "@/hooks/queries/useFoodLogs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface FoodLog {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisineType?: string;
  mealType?: string;
  servings?: number;
  isRecipe?: boolean;
  instructions?: string | string[];
}

export default function RecipesNew() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Get current tab from URL
  const getCurrentTab = (): 'recipes' | 'meal-plan' => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return tab === 'meal-plan' ? 'meal-plan' : 'recipes';
  };
  
  const [activeTab, setActiveTab] = useState<'recipes' | 'meal-plan'>(getCurrentTab());

  // Sync tab with URL
  useEffect(() => {
    const newTab = getCurrentTab();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location]);

  // Ensure URL reflects current tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    
    if (!urlTab) {
      navigate(`/recipes?tab=${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate]);

  // Handle tab change
  const handleTabChange = (tab: 'recipes' | 'meal-plan') => {
    setActiveTab(tab);
    navigate(`/recipes?tab=${tab}`, { replace: true });
  };

  // Fetch today's scanned recipes using custom hook
  const { data: todaysRecipes = [], isLoading: todaysLoading } = useScannedMealsToday();

  // Fetch all scanned recipes using custom hook
  const { data: scannedRecipes = [], isLoading: scannedLoading } = useScannedMeals();

  // Fetch ingredient-generated recipes
  const { data: ingredientRecipes = [], isLoading: ingredientLoading } = useIngredientGeneratedRecipes();

  // Combine all recipes (scanned + ingredient-generated)
  const allRecipes = useMemo(() => {
    // Transform ingredient recipes to match the expected format
    const transformedIngredientRecipes = ingredientRecipes.map((recipe: any) => ({
      ...recipe,
      image: recipe.imageUrl || recipe.image,
      // Mark as ingredient-generated for potential UI differentiation
      isIngredientGenerated: true,
    }));
    
    // Combine and sort by newest first (by id descending)
    return [...scannedRecipes, ...transformedIngredientRecipes].sort((a, b) => b.id - a.id);
  }, [scannedRecipes, ingredientRecipes]);

  const allLoading = scannedLoading || ingredientLoading;

  return (
    <BaseLayout>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleTabChange('recipes')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'recipes'
              ? 'bg-[#26A8FF] text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Book className="w-4 h-4" />
          <span>{t('common:recipesNew.tabs.recipes')}</span>
        </button>
        <button
          onClick={() => handleTabChange('meal-plan')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'meal-plan'
              ? 'bg-[#26A8FF] text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('common:recipesNew.tabs.mealPlan')}</span>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'recipes' ? (
          <>
            {/* Scan Ingredients CTA Card - Dashboard Style */}
            <div style={{ marginBottom: '20px' }}>
              <div 
                className="card"
                style={{
                  background: 'linear-gradient(135deg, rgba(38, 168, 255, 0.08) 0%, rgba(38, 168, 255, 0.02) 100%)',
                  border: '1px solid rgba(38, 168, 255, 0.12)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Decorative gradient overlay */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-20%',
                  width: '200px',
                  height: '200px',
                  background: 'radial-gradient(circle, rgba(38, 168, 255, 0.15) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />
                
                <div style={{ position: 'relative', textAlign: 'center', padding: '8px 0' }}>
                  {/* Icon */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(38, 168, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    border: '1px solid rgba(38, 168, 255, 0.2)'
                  }}>
                    <Camera style={{ width: '32px', height: '32px', color: '#26A8FF' }} />
                  </div>
                  
                  {/* Title */}
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1f1f1e',
                    marginBottom: '8px',
                    lineHeight: '1.3'
                  }}>
                    {t('common:recipesNew.aiCreator.title')}
                  </h2>
                  
                  {/* Description */}
                  <p style={{
                    fontSize: '14px',
                    color: '#888888',
                    marginBottom: '20px',
                    lineHeight: '1.5',
                    maxWidth: '320px',
                    margin: '0 auto 20px'
                  }}>
                    {t('common:recipesNew.aiCreator.description')}
                  </p>
                  
                  {/* CTA Button */}
                  <button
                    onClick={() => navigate('/scan-recipe')}
                    style={{
                      background: '#26A8FF',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 32px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(38, 168, 255, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(38, 168, 255, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(38, 168, 255, 0.25)';
                    }}
                  >
                    <Camera style={{ width: '20px', height: '20px' }} />
                    <span>{t('common:recipesNew.aiCreator.scanButton')}</span>
                  </button>
                  
                  {/* Feature Pills */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginTop: '20px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(38, 168, 255, 0.08)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: '#26A8FF',
                      fontWeight: '500'
                    }}>
                      <Sparkles style={{ width: '14px', height: '14px' }} />
                      <span>{t('common:recipesNew.aiCreator.features.aiPowered')}</span>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(38, 168, 255, 0.08)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: '#26A8FF',
                      fontWeight: '500'
                    }}>
                      <Clock style={{ width: '14px', height: '14px' }} />
                      <span>{t('common:recipesNew.aiCreator.features.instant')}</span>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(38, 168, 255, 0.08)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: '#26A8FF',
                      fontWeight: '500'
                    }}>
                      <ChefHat style={{ width: '14px', height: '14px' }} />
                      <span>{t('common:recipesNew.aiCreator.features.custom')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Recipes Section */}
            {todaysRecipes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">{t('common:recipesNew.todaysScans')}</h2>
                  <span className="text-xs text-gray-500">{t('common:recipesNew.last24Hours')}</span>
                </div>
                <MealsSection 
                  foodLogs={todaysRecipes} 
                  isLoading={todaysLoading}
                />
              </div>
            )}

            {/* Marketplace CTA Banner */}
            <div 
              onClick={() => navigate('/meal-plan-marketplace')}
              className="cursor-pointer bg-gradient-to-r from-[#0E95A7]/10 to-[#26A8FF]/10 border border-[#0E95A7]/20 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#0E95A7] to-[#26A8FF] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#0E95A7]/30">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900">Meal Plan Marketplace</h3>
                <p className="text-xs text-gray-500">Discover meal plans from chefs around the world</p>
              </div>
              <ArrowRight className="w-5 h-5 text-[#0E95A7]" />
            </div>

            {/* All Recipes Section */}
            <AllRecipesSection 
              recipes={allRecipes}
              isLoading={allLoading}
            />
          </>
        ) : (
          /* Meal Plan Tab - Using MealPlanViewContent */
          <MealPlanViewContent showHeader={true} />
        )}
      </div>
    </BaseLayout>
  );
}
