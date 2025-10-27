import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MealsSection from "@/components/dashboard/MealsSection";
import AllRecipesSection from "@/components/recipes/AllRecipesSection";
import MobileMenu from "@/components/dashboard/MobileMenu";
import ProfileHeader from "@/components/dashboard/ProfileHeader";
import { Book, Calendar } from "lucide-react";

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'recipes' | 'meal-plan'>('recipes');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);

  const handleCloseMenu = () => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsMenuClosing(false);
    }, 300);
  };

  // Fetch today's scanned recipes (last 24 hours)
  const { data: todaysRecipes = [], isLoading: todaysLoading } = useQuery<FoodLog[]>({
    queryKey: ['recipes', 'today'],
    queryFn: async () => {
      const response = await fetch('/api/food-logs/recent', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch today\'s recipes');
      const data = await response.json();
      
      // Filter for items with images (scanned meals) from last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      return data.filter((log: FoodLog) => 
        (log.image || log.imageUrl) && 
        new Date(log.id) > yesterday // Assuming ID is timestamp-based
      );
    }
  });

  // Fetch all recipes (all scanned meals with images)
  const { data: allRecipes = [], isLoading: allLoading } = useQuery<FoodLog[]>({
    queryKey: ['recipes', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/food-logs/recent', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch all recipes');
      const data = await response.json();
      
      // Filter for items with images and recipe data
      return data.filter((log: FoodLog) => 
        (log.image || log.imageUrl) && 
        (log.instructions || log.prepTime || log.cookTime)
      );
    }
  });

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <ProfileHeader user={user} onMenuClick={() => setIsMenuOpen(!isMenuOpen)} />

          {/* Title */}
          <div className="mb-4 mt-3">
            <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Your scanned meal collection
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'recipes'
                  ? 'bg-[#26A8FF] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Book className="w-4 h-4" />
              <span>Recipes</span>
            </button>
            <button
              onClick={() => setActiveTab('meal-plan')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'meal-plan'
                  ? 'bg-[#26A8FF] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Meal Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24 space-y-6">
        {activeTab === 'recipes' ? (
          <>
            {/* Today's Recipes Section */}
            {todaysRecipes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Today's Scans</h2>
                  <span className="text-xs text-gray-500">Last 24 hours</span>
                </div>
                <MealsSection 
                  foodLogs={todaysRecipes} 
                  isLoading={todaysLoading}
                />
              </div>
            )}

            {/* All Recipes Section */}
            <AllRecipesSection 
              recipes={allRecipes}
              isLoading={allLoading}
            />
          </>
        ) : (
          /* Meal Plan Tab - Keep existing content for now */
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="mb-4">
              <Calendar className="w-16 h-16 mx-auto text-[#26A8FF] opacity-20" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Meal Planning</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Plan your meals for the week ahead
            </p>
            <button 
              className="inline-flex items-center px-6 py-3 rounded-full text-white font-medium transition-all hover:shadow-lg"
              style={{ backgroundColor: '#26A8FF' }}
              onClick={() => {/* TODO: Implement meal planning */}}
            >
              Create Meal Plan
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMenuOpen} isClosing={isMenuClosing} onClose={handleCloseMenu} />
    </div>
  );
}
