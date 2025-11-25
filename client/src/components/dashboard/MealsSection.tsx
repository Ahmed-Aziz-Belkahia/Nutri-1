import { useState, useEffect, useRef } from 'react';
import { Drawer } from 'vaul';
import { MoreVertical, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Meal {
  id: number;
  name: string;
  imageUrl?: string;
  image?: string;
  calories?: number;
  nutritionInfo?: {
    calories: number;
  };
}

interface MealPlan {
  id: number;
  meals?: Meal[];
}

interface MealsSectionProps {
  foodLogs: Meal[];
  isLoading: boolean;
  onDeleteMeal?: (mealId: number) => void;
}

export default function MealsSection({ foodLogs, isLoading, onDeleteMeal }: MealsSectionProps) {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<{ id: number; name: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedMealIdRef = useRef<number | null>(null);
  
  // Debug: Log the foodLogs to see what we're getting
  useEffect(() => {
    console.log('MealsSection foodLogs:', foodLogs);
    if (foodLogs && foodLogs.length > 0) {
      console.log('First meal:', foodLogs[0]);
      console.log('First meal ID:', foodLogs[0].id);
    }
  }, [foodLogs]);

  // Close menu when clicking outside (desktop only)
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

  // Show all food logs, not just scanned ones
  const scannedMeals = foodLogs;

  const handleMenuToggle = (mealId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Menu toggled for meal ID:', mealId);
    selectedMealIdRef.current = mealId;
    setOpenMenuId(openMenuId === mealId ? null : mealId);
  };

  const handleCloseMenu = () => {
    setOpenMenuId(null);
  };

  const handleEdit = (mealId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    console.log('handleEdit called with mealId:', mealId, 'type:', typeof mealId);
    
    setOpenMenuId(null);
    
    // Safety check to ensure mealId is valid
    if (!mealId || mealId === null || mealId === undefined) {
      console.error('Invalid meal ID - cannot edit. Received:', mealId);
      alert(`Cannot edit meal - invalid ID: ${mealId}`);
      return;
    }
    
    console.log('Navigating to /meal/' + mealId);
    window.location.href = `/meal/${mealId}`;
  };

  const handleDelete = async (mealId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuId(null);
    
    // Find the meal to get its name
    const meal = scannedMeals.find(m => m.id === mealId);
    setMealToDelete({ id: mealId, name: meal?.name || 'this meal' });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!mealToDelete) return;

    try {
      const response = await fetch(`/api/food-logs/${mealToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }

      // Call the callback if provided
      if (onDeleteMeal) {
        onDeleteMeal(mealToDelete.id);
      }

      setShowDeleteDialog(false);
      setMealToDelete(null);

      // Reload the page to refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal. Please try again.');
      setShowDeleteDialog(false);
      setMealToDelete(null);
    }
  };

  if (scannedMeals.length === 0 && !isLoading) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div className="card text-center py-12">
          <div className="mb-4">
            <svg className="w-20 h-20 mx-auto text-[#26A8FF] opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('common:mealsSection.noMealsYet')}</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            {t('common:mealsSection.addFirstMeal')}
          </p>
          <button 
            className="inline-flex items-center px-6 py-3 rounded-full text-white font-medium transition-all hover:shadow-lg"
            style={{ backgroundColor: '#26A8FF' }}
            onClick={() => window.location.href = '/add-food'}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('common:mealsSection.scanMeal')}
          </button>
        </div>
      </div>
    );
  }

  // Show all scanned meals in the carousel
  const mealsToShow = scannedMeals;

  return (
    <>
      {/* Mobile menu drawer (three dots) - using vaul */}
      <Drawer.Root 
        open={openMenuId !== null && window.innerWidth < 768} 
        onOpenChange={(open) => !open && handleCloseMenu()}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[1000]" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[20px] h-fit fixed bottom-0 left-0 right-0 z-[1001] md:hidden">
            {/* Handle bar */}
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-4 mb-6" />
            
            {/* Menu content */}
            <div className="px-4 pb-8">
              <button
                onClick={() => {
                  console.log('Edit button clicked! selectedMealIdRef:', selectedMealIdRef.current);
                  const mealId = selectedMealIdRef.current;
                  if (mealId !== null) {
                    console.log('Calling handleEdit with mealId:', mealId);
                    handleEdit(mealId);
                  } else {
                    console.error('selectedMealIdRef is null, cannot edit');
                  }
                }}
                className="w-full px-4 py-4 text-left text-base text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors rounded-lg"
              >
                <Edit2 className="w-5 h-5" />
                {t('common:mealsSection.editMeal')}
              </button>
              <button
                onClick={() => {
                  const mealId = selectedMealIdRef.current;
                  if (mealId !== null) {
                    handleDelete(mealId);
                  }
                }}
                className="w-full px-4 py-4 text-left text-base text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-3 transition-colors rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
                {t('common:mealsSection.deleteMeal')}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div style={{ marginBottom: '20px' }}>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {mealsToShow.map((meal) => (
            <div 
              key={meal.id} 
              className="meal-card"
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              {/* Three dots menu button */}
              <button
                onClick={(e) => handleMenuToggle(meal.id, e)}
                className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-all"
                style={{ width: '32px', height: '32px' }}
              >
                <MoreVertical className="w-4 h-4 text-gray-700" />
              </button>

              {/* Desktop dropdown menu */}
              {openMenuId === meal.id && (
                <div 
                  ref={menuRef}
                  className="hidden md:block absolute top-12 right-2 z-20 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden"
                  style={{ minWidth: '140px' }}
                >
                  <button
                    onClick={(e) => handleEdit(meal.id, e)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t('common:actions.edit')}
                  </button>
                  <button
                    onClick={(e) => handleDelete(meal.id, e)}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common:actions.delete')}
                  </button>
                </div>
              )}

            <div 
              onClick={() => window.location.href = `/recipes/food-log/${meal.id}`}
              className="bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden"
              style={{
                height: '160px',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px'
              }}
            >
              {(meal.image || meal.imageUrl) ? (
                <img 
                  src={meal.image || meal.imageUrl} 
                  alt={meal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div 
              onClick={() => window.location.href = `/recipes/food-log/${meal.id}`}
              className="p-3 bg-white" 
              style={{
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px'
              }}
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {meal.name.replace(/\s*\(Day \d+\)\s*$/i, '')}
              </h3>
              <p className="text-xs text-gray-500">
                {meal.nutritionInfo?.calories ? Math.round(meal.nutritionInfo.calories) : meal.calories ? Math.round(meal.calories) : 0}kcal
              </p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1002]"
              onClick={() => {
                setShowDeleteDialog(false);
                setMealToDelete(null);
              }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 flex items-center justify-center z-[1003] px-4"
            >
              <div className="w-full max-w-md">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-rose-600 px-6 py-8 text-white">
                  {/* Close button */}
                  <button
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setMealToDelete(null);
                    }}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Icon */}
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    >
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-center mb-2">
                    {t('common:mealsSection.deleteModal.title')}
                  </h3>
                  <p className="text-white/90 text-center text-sm">
                    {t('common:mealsSection.deleteModal.description')}
                  </p>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <p className="text-gray-600 text-sm text-center">
                      {t('common:mealsSection.deleteModal.confirmQuestion')}
                    </p>
                    <p className="text-gray-900 font-semibold text-center mt-1 text-base">
                      "{mealToDelete?.name}"
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteDialog(false);
                        setMealToDelete(null);
                      }}
                      className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all text-base"
                    >
                      {t('common:actions.cancel')}
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95 transition-all shadow-lg shadow-red-500/30 text-base"
                    >
                      {t('common:actions.delete')}
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
