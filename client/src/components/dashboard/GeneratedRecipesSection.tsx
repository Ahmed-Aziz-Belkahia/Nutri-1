import { useState, useRef, useEffect } from 'react';
import { Drawer } from 'vaul';
import { MoreVertical, Edit2, Trash2, ChefHat, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIngredientGeneratedRecipes } from '@/hooks/queries/useFoodLogs';

interface Recipe {
  id: number;
  name: string;
  imageUrl?: string;
  image?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  description?: string;
}

export default function GeneratedRecipesSection() {
  const { t } = useTranslation();
  const { data: recipes = [], isLoading } = useIngredientGeneratedRecipes();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<{ id: number; name: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRecipeIdRef = useRef<number | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const handleMenuToggle = (recipeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    selectedRecipeIdRef.current = recipeId;
    setOpenMenuId(openMenuId === recipeId ? null : recipeId);
  };

  const handleCloseMenu = () => {
    setOpenMenuId(null);
  };

  const handleEdit = (recipeId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuId(null);
    
    if (!recipeId) return;
    window.location.href = `/recipes/${recipeId}`;
  };

  const handleDelete = async (recipeId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuId(null);
    
    const recipe = recipes.find((r: Recipe) => r.id === recipeId);
    setRecipeToDelete({ id: recipeId, name: recipe?.name || 'this recipe' });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!recipeToDelete) return;

    try {
      const response = await fetch(`/api/recipes/${recipeToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      setShowDeleteDialog(false);
      setRecipeToDelete(null);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
      setShowDeleteDialog(false);
      setRecipeToDelete(null);
    }
  };

  // Don't render if no recipes
  if (!isLoading && recipes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('common:actions.deleteConfirmTitle', 'Delete Recipe?')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('common:actions.deleteConfirmMessage', 'Are you sure you want to delete "{{name}}"? This action cannot be undone.', { name: recipeToDelete?.name })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setRecipeToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t('common:actions.cancel', 'Cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                {t('common:actions.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu drawer */}
      <Drawer.Root 
        open={openMenuId !== null && window.innerWidth < 768} 
        onOpenChange={(open) => !open && handleCloseMenu()}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[1000]" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[20px] h-fit fixed bottom-0 left-0 right-0 z-[1001] md:hidden">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-4 mb-6" />
            <div className="px-4 pb-8">
              <button
                onClick={() => {
                  const recipeId = selectedRecipeIdRef.current;
                  if (recipeId !== null) handleEdit(recipeId);
                }}
                className="w-full px-4 py-4 text-left text-base text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors rounded-lg"
              >
                <Edit2 className="w-5 h-5" />
                {t('common:actions.edit', 'Edit')}
              </button>
              <button
                onClick={() => {
                  const recipeId = selectedRecipeIdRef.current;
                  if (recipeId !== null) handleDelete(recipeId);
                }}
                className="w-full px-4 py-4 text-left text-base text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-3 transition-colors rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
                {t('common:actions.delete', 'Delete')}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div style={{ marginBottom: '20px' }}>
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#26A8FF]/10 to-[#0CC5BA]/10">
            <Sparkles className="w-4 h-4 text-[#26A8FF]" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            {t('common:generatedRecipes.title', 'AI Generated Recipes')}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {recipes.length}
          </span>
        </div>

        {/* Recipe Cards Carousel */}
        <div 
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading ? (
            // Loading skeleton
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px] bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                <div className="h-[120px] bg-gray-200" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : (
            recipes.map((recipe: Recipe) => (
              <div 
                key={recipe.id}
                className="flex-shrink-0 w-[180px] bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                {/* Menu button */}
                <button
                  onClick={(e) => handleMenuToggle(recipe.id, e)}
                  className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-white transition-all"
                >
                  <MoreVertical className="w-4 h-4 text-gray-700" />
                </button>

                {/* Desktop dropdown menu */}
                {openMenuId === recipe.id && (
                  <div 
                    ref={menuRef}
                    className="hidden md:block absolute top-10 right-2 z-20 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden"
                    style={{ minWidth: '120px' }}
                  >
                    <button
                      onClick={(e) => handleEdit(recipe.id, e)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {t('common:actions.edit', 'Edit')}
                    </button>
                    <button
                      onClick={(e) => handleDelete(recipe.id, e)}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('common:actions.delete', 'Delete')}
                    </button>
                  </div>
                )}

                {/* Recipe Image/Placeholder */}
                <div 
                  onClick={() => window.location.href = `/recipes/${recipe.id}`}
                  className="h-[120px] bg-gradient-to-br from-[#26A8FF]/5 to-[#0CC5BA]/10 flex items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#26A8FF]/20 to-[#0CC5BA]/20 flex items-center justify-center">
                    <ChefHat className="w-7 h-7 text-[#26A8FF]" />
                  </div>
                </div>

                {/* Recipe Info */}
                <div 
                  onClick={() => window.location.href = `/recipes/${recipe.id}`}
                  className="p-3"
                >
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                    {recipe.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{recipe.calories || 0} kcal</span>
                    {recipe.prepTime && (
                      <>
                        <span>•</span>
                        <span>{recipe.prepTime} min</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
