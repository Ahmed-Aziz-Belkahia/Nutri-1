import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';
import RecipeCard from './RecipeCard';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

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
  isIngredientGenerated?: boolean;
  source?: string;
}

interface AllRecipesSectionProps {
  recipes: Recipe[];
  isLoading: boolean;
}

type SortOption = 'newest' | 'calories-low' | 'calories-high' | 'time-low' | 'time-high' | 'name';

export default function AllRecipesSection({ recipes, isLoading }: AllRecipesSectionProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: t('allRecipes.sortOptions.newest', 'Newest First') },
    { value: 'name', label: t('allRecipes.sortOptions.name', 'Name (A-Z)') },
    { value: 'calories-low', label: t('allRecipes.sortOptions.caloriesLow', 'Calories (Low to High)') },
    { value: 'calories-high', label: t('allRecipes.sortOptions.caloriesHigh', 'Calories (High to Low)') },
    { value: 'time-low', label: t('allRecipes.sortOptions.timeLow', 'Quick Meals First') },
    { value: 'time-high', label: t('allRecipes.sortOptions.timeHigh', 'Longest Time First') },
  ];

  // Filter recipes by search query
  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort recipes
  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.id - a.id; // Assuming higher ID = newer
      case 'calories-low':
        return a.calories - b.calories;
      case 'calories-high':
        return b.calories - a.calories;
      case 'time-low': {
        const timeA = (a.prepTime || 0) + (a.cookTime || 0);
        const timeB = (b.prepTime || 0) + (b.cookTime || 0);
        return timeA - timeB;
      }
      case 'time-high': {
        const timeA = (a.prepTime || 0) + (a.cookTime || 0);
        const timeB = (b.prepTime || 0) + (b.cookTime || 0);
        return timeB - timeA;
      }
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleRecipeClick = (recipe: Recipe) => {
    // Ingredient-generated recipes are in the recipes table, scanned meals are in food_logs
    if (recipe.isIngredientGenerated || recipe.source === 'ingredient_generation') {
      setLocation(`/recipes/${recipe.id}`);
    } else {
      setLocation(`/recipes/food-log/${recipe.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t('allRecipes.title', 'All Recipes')}</h2>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <div className="mb-4">
          <svg className="w-20 h-20 mx-auto text-[#26A8FF] opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('allRecipes.emptyState.title', 'No Recipes Yet')}</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          {t('allRecipes.emptyState.description', 'Scan your meals to automatically create a recipe collection')}
        </p>
        <button 
          className="inline-flex items-center px-6 py-3 rounded-full text-white font-medium transition-all hover:shadow-lg"
          style={{ backgroundColor: '#26A8FF' }}
          onClick={() => setLocation('/add-food')}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('allRecipes.emptyState.button', 'Scan Your First Meal')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('allRecipes.title', 'All Recipes')}</h2>
        <span className="text-sm text-gray-500">{t('allRecipes.recipesCount', '{{count}} recipes', { count: recipes.length })}</span>
      </div>

      {/* Search and Sort Bar */}
      <div className="flex justify-center items-center flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('allRecipes.searchPlaceholder', 'Search recipes...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#26A8FF] focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#26A8FF] focus:border-transparent transition-all text-sm font-medium text-gray-700"
          >
            <span>{t('allRecipes.sort', 'Sort')}</span>
            <SlidersHorizontal className="w-5 h-5 text-[#26A8FF]" />
          </button>

          {/* Dropdown Menu */}
          {showFilters && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    setShowFilters(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span className={sortBy === option.value ? 'font-medium text-[#26A8FF]' : 'text-gray-700'}>
                    {option.label}
                  </span>
                  {sortBy === option.value && (
                    <Check className="w-4 h-4 text-[#26A8FF]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          {sortedRecipes.length === 1 
            ? t('allRecipes.searchResults', 'Found {{count}} recipe for "{{query}}"', { count: sortedRecipes.length, query: searchQuery })
            : sortedRecipes.length < 5
            ? t('allRecipes.searchResultsPlural', 'Found {{count}} recipes for "{{query}}"', { count: sortedRecipes.length, query: searchQuery })
            : t('allRecipes.searchResultsMany', 'Found {{count}} recipes for "{{query}}"', { count: sortedRecipes.length, query: searchQuery })}
        </div>
      )}

      {/* Recipes Grid */}
      {sortedRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => handleRecipeClick(recipe)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500">{t('allRecipes.noResults', 'No recipes match your search')}</p>
        </div>
      )}
    </div>
  );
}
