import { useState, useEffect, useRef } from 'react';
import { Drawer } from 'vaul';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Filter food logs to only show scanned meals (those with images)
  const scannedMeals = foodLogs.filter(log => log.image || log.imageUrl);

  const handleMenuToggle = (mealId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === mealId ? null : mealId);
  };

  const handleCloseMenu = () => {
    setOpenMenuId(null);
  };

  const handleEdit = (mealId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuId(null);
    window.location.href = `/food-logs/${openMenuId}/edit`;
  };

  const handleDelete = async (mealId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuId(null);
    
    if (confirm('Are you sure you want to delete this meal?')) {
      try {
        const response = await fetch(`/api/food-logs/${openMenuId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to delete meal');
        }

        // Call the callback if provided
        if (onDeleteMeal) {
          onDeleteMeal(openMenuId!);
        }

        // Reload the page to refresh data
        window.location.reload();
      } catch (error) {
        console.error('Error deleting meal:', error);
        alert('Failed to delete meal. Please try again.');
      }
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Scanned Meals Yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Take a photo of your meal to track your nutrition automatically
          </p>
          <button 
            className="inline-flex items-center px-6 py-3 rounded-full text-white font-medium transition-all hover:shadow-lg"
            style={{ backgroundColor: '#26A8FF' }}
            onClick={() => window.location.href = '/scan'}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan a Meal
          </button>
        </div>
      </div>
    );
  }

  const mealsToShow = scannedMeals.slice(0, 3);

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
                onClick={() => handleEdit(openMenuId!)}
                className="w-full px-4 py-4 text-left text-base text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors rounded-lg"
              >
                <Edit2 className="w-5 h-5" />
                Edit Meal
              </button>
              <button
                onClick={() => handleDelete(openMenuId!)}
                className="w-full px-4 py-4 text-left text-base text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-3 transition-colors rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
                Delete Meal
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
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDelete(meal.id, e)}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}

            <div 
              onClick={() => window.location.href = `/food-logs/${meal.id}`}
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
              onClick={() => window.location.href = `/food-logs/${meal.id}`}
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
    </>
  );
}
