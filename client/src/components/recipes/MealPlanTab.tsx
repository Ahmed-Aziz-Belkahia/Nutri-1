import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Calendar, ChevronRight } from 'lucide-react';
import CalendarSelector from '@/components/dashboard/CalendarSelector';
import MealPlanSection from '@/components/dashboard/MealPlanSection';
import { useAllMealPlans } from '@/hooks/queries/useMealPlans';
import { useShoppingListByPlanId, useWeeklyShoppingList } from '@/hooks/queries/useShoppingList';
import { createInvalidator } from '@/lib/queryUtils';

interface Day {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  formattedDate: string;
}

interface GroceryItem {
  id: number;
  name: string;
  quantity: string | number;
  unit: string;
  category?: string;
  isPurchased?: boolean;
  purchased?: boolean;
  itemsWithPlans?: Array<{ itemId: number; mealPlanId: number }>; // Track itemId-mealPlanId pairs
  purchasedCount?: number; // Track how many instances are purchased
}

// Generate days for calendar (ensures current date can be centered with at least 7 days on each side)
function getDaysWithBuffer(): Day[] {
  const today = new Date();
  const days: Day[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate days: 90 days before today
  for (let i = 90; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: false,
      formattedDate: format(date, 'yyyy-MM-dd')
    });
  }
  
  // Add today
  days.push({
    date: new Date(today),
    dayName: dayNames[today.getDay()],
    dayNumber: today.getDate(),
    isToday: true,
    formattedDate: format(today, 'yyyy-MM-dd')
  });
  
  // Add next 90 days after today (ensures we have plenty of buffer)
  for (let i = 1; i <= 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: false,
      formattedDate: format(date, 'yyyy-MM-dd')
    });
  }
  
  return days;
}

export default function MealPlanTab() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [allDays] = useState(getDaysWithBuffer());
  const queryClient = useQueryClient();

  // Scroll to grocery list if hash is present
  useEffect(() => {
    if (window.location.hash === '#grocery-list') {
      setTimeout(() => {
        const element = document.getElementById('grocery-list');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300); // Small delay to ensure content is rendered
    }
  }, []);

  // Fetch all meal plans using custom hook
  const { data: allMealPlans, isLoading: plansLoading } = useAllMealPlans();

  // Get the meal plan for the selected date
  const mealPlan = useMemo(() => {
    if (!allMealPlans || !selectedDate) return null;
    const plan = allMealPlans.find((p: any) => p.date === selectedDate);
    return plan || null;
  }, [allMealPlans, selectedDate]);

  // Fetch grocery list for the selected date's meal plan using custom hook
  const { data: groceryListData, isLoading: groceryLoading } = useShoppingListByPlanId(mealPlan?.id);
  
  // Transform shopping list data to match GroceryItem interface
  const groceryList: GroceryItem[] = useMemo(() => {
    if (!groceryListData?.items) return [];
    
    return groceryListData.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category || 'Other',
      isPurchased: item.isChecked || false
    }));
  }, [groceryListData]);

  // Get weekly grocery list using custom hook
  const { data: weeklyGroceryListData, isLoading: weeklyGroceryLoading } = useWeeklyShoppingList(selectedDate);
  
  // Transform weekly shopping list
  const weeklyGroceryList: GroceryItem[] = useMemo(() => {
    if (!weeklyGroceryListData?.items) return [];
    
    return weeklyGroceryListData.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category || 'Other',
      isPurchased: item.isChecked || false
    }));
  }, [weeklyGroceryListData]);

  // Handle toggling grocery item purchased status
  const handleToggleItem = async (item: GroceryItem, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const invalidator = createInvalidator(queryClient);

    try {
      // If this is a merged item, update all instances
      if (item.itemsWithPlans && item.itemsWithPlans.length > 0) {
        const updatePromises = item.itemsWithPlans.map(async ({ itemId, mealPlanId }) => {
          const response = await fetch(`/api/meal-plans/${mealPlanId}/shopping-list/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ isPurchased: newStatus }),
          });
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to update item ${itemId}: ${response.status} ${text}`);
          }
          
          return response.json();
        });

        await Promise.all(updatePromises);
        
      } else if (mealPlan?.id) {
        // Single item fallback
        const response = await fetch(`/api/meal-plans/${mealPlan.id}/shopping-list/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isPurchased: newStatus }),
        });

        if (!response.ok) {
          throw new Error('Failed to update item');
        }
      }

      // Use centralized invalidation
      await invalidator.shoppingList(selectedDate, mealPlan?.id);
      
    } catch (error) {
      console.error('[Weekly Grocery] Error updating item:', error);
      alert('Failed to update item. Please try again.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* View Full Plan Button */}
      <button
        onClick={() => setLocation("/meal-plan/view")}
        className="w-full flex items-center justify-between p-4 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm hover:bg-white/80 transition-all"
      >
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-[#0CC5BA]/30">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-gray-900 font-semibold text-sm">View Full Meal Plan</p>
            <p className="text-gray-500 text-xs">See your complete weekly plan</p>
          </div>
        </div>
        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </div>
      </button>

      {/* Calendar Section */}
      <CalendarSelector
        allDays={allDays}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        noPadding={true}
      />

      {/* Meal Plan Section */}
      <MealPlanSection mealPlan={mealPlan as any} />

      {/* Weekly Grocery List Section */}
      <div id="grocery-list" className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#26A8FF]">{t('weeklyGroceryList.title', 'Weekly Grocery List')}</h2>
          <span className="text-sm text-gray-500">
            {t('weeklyGroceryList.itemsCount', '{{count}} items', { count: weeklyGroceryList.length })}
          </span>
        </div>

        {weeklyGroceryLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        ) : weeklyGroceryList.length > 0 ? (
          <div className="space-y-1">
            {weeklyGroceryList.map((item) => {
              const isPurchased = item.isPurchased ?? item.purchased ?? false;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <h3 className={`text-base font-medium transition-all ${
                      isPurchased
                        ? 'text-gray-400 line-through'
                        : 'text-gray-900'
                    }`}>
                      {item.name}
                    </h3>
                    <p className={`text-xs transition-all ${
                      isPurchased
                        ? 'text-gray-300 line-through'
                        : 'text-gray-500'
                    }`}>
                      {item.quantity} {item.unit}{item.category && ` • ${item.category}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleItem(item, isPurchased)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isPurchased
                        ? 'bg-[#26A8FF] border-[#26A8FF]'
                        : 'border-gray-300 bg-white hover:border-[#26A8FF]'
                    }`}
                    aria-label={isPurchased ? t('weeklyGroceryList.markNotPurchased', 'Mark as not purchased') : t('weeklyGroceryList.markPurchased', 'Mark as purchased')}
                  >
                    {isPurchased && (
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-4">{t('weeklyGroceryList.emptyState.title', 'No grocery items for this week')}</p>
            <button
              onClick={() => window.location.href = '/meal-planning-quiz'}
              className="px-4 py-2 bg-[#26A8FF] text-white rounded-lg text-sm font-medium hover:bg-[#1A8FE6] transition-colors"
            >
              {t('weeklyGroceryList.emptyState.button', 'Generate Meal Plan')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
