import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import CalendarSelector from '@/components/dashboard/CalendarSelector';
import MealPlanSection from '@/components/dashboard/MealPlanSection';

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
}

// Generate days for calendar (last 90 days + next 7 days)
function getLast3MonthsPlus7Days(): Day[] {
  const today = new Date();
  const days: Day[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate days for the last 90 days
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      formattedDate: format(date, 'yyyy-MM-dd')
    });
  }
  
  // Add next 7 days after today
  for (let i = 1; i <= 7; i++) {
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
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [allDays] = useState(getLast3MonthsPlus7Days());

  // Fetch all meal plans
  const { data: allMealPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['all-meal-plans'],
    queryFn: async () => {
      const response = await fetch('/api/meal-plans/all', {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get the meal plan for the selected date
  const mealPlan = useMemo(() => {
    if (!allMealPlans?.plans || !selectedDate) return null;
    const plan = allMealPlans.plans.find((p: any) => p.date === selectedDate);
    return plan || null;
  }, [allMealPlans, selectedDate]);

  // Fetch grocery list for the selected date's meal plan
  const { data: groceryList = [], isLoading: groceryLoading } = useQuery<GroceryItem[]>({
    queryKey: ['grocery-list', selectedDate, mealPlan?.id],
    queryFn: async () => {
      if (!mealPlan?.id) return [];
      
      const response = await fetch(`/api/meal-plans/${mealPlan.id}/shopping-list`, {
        credentials: 'include'
      });
      
      if (!response.ok) return [];
      const data = await response.json();
      
      // Transform the response to match our GroceryItem interface
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id,
          name: item.name || item.ingredient || 'Unknown',
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          category: item.category || 'Other',
          isPurchased: item.isPurchased ?? item.is_purchased ?? item.purchased ?? false
        }));
      } else if (data.items && Array.isArray(data.items)) {
        return data.items.map((item: any) => ({
          id: item.id,
          name: item.name || item.ingredient || 'Unknown',
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          category: item.category || 'Other',
          isPurchased: item.isPurchased ?? item.is_purchased ?? item.purchased ?? false
        }));
      }
      return [];
    },
    enabled: !!mealPlan?.id,
  });

  // Get weekly grocery list (all items from the current week)
  const { data: weeklyGroceryList = [], isLoading: weeklyGroceryLoading } = useQuery<GroceryItem[]>({
    queryKey: ['weekly-grocery-list', selectedDate],
    queryFn: async () => {
      // Get the start of the week (Sunday) for the selected date
      const date = new Date(selectedDate);
      const dayOfWeek = date.getDay();
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - dayOfWeek);
      const startDate = format(startOfWeek, 'yyyy-MM-dd');
      
      // Get the end of the week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const endDate = format(endOfWeek, 'yyyy-MM-dd');
      
      // Fetch all meal plans for the week
      if (!allMealPlans?.plans) return [];
      
      const weekPlans = allMealPlans.plans.filter((p: any) => 
        p.date >= startDate && p.date <= endDate
      );
      
      // Collect all grocery items from the week's meal plans
      const allItems: GroceryItem[] = [];
      const itemMap = new Map<string, GroceryItem>();
      
      for (const plan of weekPlans) {
        if (!plan.id) continue;
        
        try {
          const response = await fetch(`/api/meal-plans/${plan.id}/shopping-list`, {
            credentials: 'include'
          });
          
          if (!response.ok) continue;
          const data = await response.json();
          
          const items = Array.isArray(data) ? data : (data.items || []);
          
          // Merge items with same name
          items.forEach((item: any) => {
            const name = item.name || item.ingredient || 'Unknown';
            const key = name.toLowerCase();
            
            if (itemMap.has(key)) {
              const existing = itemMap.get(key)!;
              // Add quantities if they're numbers
              const existingQty = parseFloat(existing.quantity?.toString() || '0');
              const newQty = parseFloat(item.quantity?.toString() || '0');
              existing.quantity = existingQty + newQty;
            } else {
              itemMap.set(key, {
                id: item.id,
                name,
                quantity: item.quantity || 1,
                unit: item.unit || 'unit',
                category: item.category || 'Other',
                isPurchased: item.isPurchased ?? item.is_purchased ?? item.purchased ?? false
              });
            }
          });
        } catch (error) {
          console.error(`Failed to fetch shopping list for plan ${plan.id}:`, error);
        }
      }
      
      return Array.from(itemMap.values());
    },
    enabled: !!allMealPlans?.plans,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle toggling grocery item purchased status
  const handleToggleItem = async (itemId: number, currentStatus: boolean) => {
    if (!mealPlan?.id) return;
    
    try {
      const response = await fetch(`/api/meal-plans/${mealPlan.id}/shopping-list/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          isPurchased: !currentStatus
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      
      // Refetch both grocery lists
      // Note: React Query will handle the refetch automatically with invalidation
    } catch (error) {
      console.error('Error toggling grocery item:', error);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Calendar Section */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Date</h2>
        <CalendarSelector
          allDays={allDays}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>

      {/* Meal Plan Section */}
      <MealPlanSection mealPlan={mealPlan} />

      {/* Weekly Grocery List Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#26A8FF]">Weekly Grocery List</h2>
          <span className="text-sm text-gray-500">
            {weeklyGroceryList.length} items
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
                    onClick={() => handleToggleItem(item.id, isPurchased)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isPurchased
                        ? 'bg-[#26A8FF] border-[#26A8FF]'
                        : 'border-gray-300 bg-white hover:border-[#26A8FF]'
                    }`}
                    aria-label={isPurchased ? 'Mark as not purchased' : 'Mark as purchased'}
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
            <p className="text-gray-500 text-sm mb-4">No grocery items for this week</p>
            <button
              onClick={() => window.location.href = '/meal-planning-quiz'}
              className="px-4 py-2 bg-[#26A8FF] text-white rounded-lg text-sm font-medium hover:bg-[#1A8FE6] transition-colors"
            >
              Generate Meal Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
