import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";

interface FoodLog {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
  loggedAt: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPlan {
  id: number;
  name?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  date?: string;
  totalCalories?: number;
  status?: string;
  meals?: Array<{
    id: number;
    name: string;
    mealType: string;
    order: number;
    servingSize: number;
    isFrozen: boolean;
    isCompleted: boolean;
    nutritionInfo?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    instructions?: string | string[];
    ingredients?: string | string[];
    imageUrl?: string;
  }>;
}

interface GroceryItem {
  id: number;
  name: string;
  quantity: number | string;
  unit: string;
  category: string;
  isPurchased?: boolean;
  purchased?: boolean; // Fallback for older format
}

// Helper function to get all days from the last 3 months + next 7 days
function getLast3MonthsPlus7Days() {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];
  
  // Generate days for the last 90 days (approximately 3 months)
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

export default function DashboardNew() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [allDays] = useState(getLast3MonthsPlus7Days());
  const [currentMacroIndex, setCurrentMacroIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [groceryDisplayCount, setGroceryDisplayCount] = useState(5);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Fetch food logs for selected date
  const { data: foodLogs = [], isLoading: logsLoading } = useQuery<FoodLog[]>({
    queryKey: ['food-logs', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/food-logs?date=${selectedDate}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch food logs');
      const data = await response.json();
      return data.logs || [];
    }
  });

  // Fetch daily totals for selected date
  const { data: dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 } } = useQuery<DailyTotals>({
    queryKey: ['daily-totals', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/food-logs?date=${selectedDate}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch totals');
      const data = await response.json();
      return data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  });

  // Fetch all meal plans to match the calendar approach used in Recipes page
  const { data: allMealPlans } = useQuery({
    queryKey: ['all-meal-plans'],
    queryFn: async () => {
      console.log('[ALL MEAL PLANS] Fetching all meal plans');
      const response = await fetch('/api/meal-plans/all', {
        credentials: 'include'
      });
      if (!response.ok) {
        console.log('[ALL MEAL PLANS] Failed to fetch');
        return null;
      }
      const data = await response.json();
      console.log('[ALL MEAL PLANS] Received data:', data);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get the meal plan for the selected date from all plans
  const mealPlan = useMemo(() => {
    if (!allMealPlans?.plans || !selectedDate) {
      console.log('[MEAL PLAN] No plans available or no date selected');
      return null;
    }
    const plan = allMealPlans.plans.find((p: any) => p.date === selectedDate);
    console.log('[MEAL PLAN] Found plan for', selectedDate, ':', plan);
    return plan || null;
  }, [allMealPlans, selectedDate]);

  // Fetch daily totals for selected date
  const { data: groceryList = [], refetch: refetchGroceries } = useQuery<GroceryItem[]>({
    queryKey: ['grocery-list', selectedDate, mealPlan?.id],
    queryFn: async () => {
      console.log('[GROCERY LIST] Starting fetch for date:', selectedDate);
      console.log('[GROCERY LIST] mealPlan:', mealPlan);
      console.log('[GROCERY LIST] mealPlan?.id:', mealPlan?.id);
      
      try {
        // If we have a meal plan, fetch its shopping list
        if (mealPlan && mealPlan.id) {
          console.log('[GROCERY LIST] Fetching for meal plan ID:', mealPlan.id);
          const url = `/api/meal-plans/${mealPlan.id}/shopping-list`;
          console.log('[GROCERY LIST] URL:', url);
          
          const response = await fetch(url, {
            credentials: 'include'
          });
          
          console.log('[GROCERY LIST] Response status:', response.status);
          console.log('[GROCERY LIST] Response ok:', response.ok);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[GROCERY LIST] Raw data received:', data);
            
            // Transform the response to match our GroceryItem interface
            if (Array.isArray(data)) {
              console.log('[GROCERY LIST] Data is array, length:', data.length);
              const mapped = data.map((item: any) => {
                console.log('[GROCERY LIST] Mapping item:', item);
                return {
                  id: item.id,
                  name: item.name || item.ingredient || 'Unknown',
                  quantity: item.quantity || 1,
                  unit: item.unit || 'unit',
                  category: item.category || 'Other',
                  isPurchased: item.isPurchased ?? item.is_purchased ?? item.purchased ?? false
                };
              });
              console.log('[GROCERY LIST] Final mapped items:', mapped);
              return mapped;
            } else if (data.items && Array.isArray(data.items)) {
              console.log('[GROCERY LIST] Data has items property, length:', data.items.length);
              const mapped = data.items.map((item: any) => ({
                id: item.id,
                name: item.name || item.ingredient || 'Unknown',
                quantity: item.quantity || 1,
                unit: item.unit || 'unit',  
                category: item.category || 'Other',
                isPurchased: item.isPurchased ?? item.is_purchased ?? item.purchased ?? false
              }));
              console.log('[GROCERY LIST] Final mapped items from data.items:', mapped);
              return mapped;
            } else {
              console.log('[GROCERY LIST] Unexpected data format:', data);
              return [];
            }
          } else {
            const errorText = await response.text();
            console.error('[GROCERY LIST] Failed to fetch meal plan shopping list:', response.status, errorText);
          }
        } else {
          console.log('[GROCERY LIST] No meal plan available yet');
        }
        
        // Fallback to general shopping list
        console.log('[GROCERY LIST] Trying fallback to general shopping list');
        const response = await fetch('/api/shopping-list', {
          credentials: 'include'
        });
        console.log('[GROCERY LIST] General list response status:', response.status);
        
        if (!response.ok) {
          console.log('[GROCERY LIST] General list failed, returning empty array');
          return [];
        }
        
        const data = await response.json();
        console.log('[GROCERY LIST] General list data:', data);
        
        // Ensure we return an array
        if (Array.isArray(data)) {
          console.log('[GROCERY LIST] Returning general list array, length:', data.length);
          return data;
        } else if (data.items && Array.isArray(data.items)) {
          console.log('[GROCERY LIST] Returning general list items array, length:', data.items.length);
          return data.items;
        }
        
        console.log('[GROCERY LIST] No valid data format in general list, returning empty array');
        return [];
      } catch (error) {
        console.error('[GROCERY LIST] Error in queryFn:', error);
        return [];
      }
    },
    enabled: true // Always enabled now
  });

  // Calculate macro percentages based on targets
  const macroData = [
    {
      id: 'calories',
      title: 'Eaten Calories',
      current: Math.round(dailyTotals.calories),
      target: mealPlan?.targetCalories || 2500,
      unit: 'cal',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.calories / (mealPlan?.targetCalories || 2500)) * 100))
    },
    {
      id: 'carbs',
      title: 'Carbohydrates',
      current: Math.round(dailyTotals.carbs),
      target: mealPlan?.targetCarbs || 300,
      unit: 'g',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.carbs / (mealPlan?.targetCarbs || 300)) * 100))
    },
    {
      id: 'protein',
      title: 'Protein',
      current: Math.round(dailyTotals.protein),
      target: mealPlan?.targetProtein || 150,
      unit: 'g',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.protein / (mealPlan?.targetProtein || 150)) * 100))
    },
    {
      id: 'fat',
      title: 'Fat',
      current: Math.round(dailyTotals.fat),
      target: mealPlan?.targetFat || 80,
      unit: 'g',
      color: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.fat / (mealPlan?.targetFat || 80)) * 100))
    }
  ];

  // Debug log for grocery list
  useEffect(() => {
    console.log('[DASHBOARD] Grocery list state changed:', {
      hasData: !!groceryList,
      isArray: Array.isArray(groceryList),
      length: groceryList?.length,
      items: groceryList,
      mealPlanId: mealPlan?.id,
      selectedDate
    });
  }, [groceryList, mealPlan?.id, selectedDate]);

  // Debug log for selected date changes
  useEffect(() => {
    console.log('[DASHBOARD] Selected date changed to:', selectedDate);
    console.log('[DASHBOARD] Current meal plan:', mealPlan);
  }, [selectedDate, mealPlan]);

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    const autoScrollInterval = setInterval(() => {
      setCurrentMacroIndex((prev) => (prev === macroData.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(autoScrollInterval);
  }, [isPaused, macroData.length]);

  // Scroll to today's date on mount
  useEffect(() => {
    const todayIndex = allDays.findIndex(day => day.isToday);
    if (todayIndex !== -1) {
      const scrollContainer = document.querySelector('.day-selector-scroll');
      if (scrollContainer) {
        const dayButton = scrollContainer.children[todayIndex] as HTMLElement;
        if (dayButton) {
          // Center the today button
          const containerWidth = scrollContainer.clientWidth;
          const buttonOffset = dayButton.offsetLeft;
          const buttonWidth = dayButton.offsetWidth;
          scrollContainer.scrollLeft = buttonOffset - (containerWidth / 2) + (buttonWidth / 2);
        }
      }
    }
  }, [allDays]);

  const handleDayClick = (formattedDate: string) => {
    setSelectedDate(formattedDate);
  };

  const handlePreviousMacro = () => {
    setIsPaused(true);
    setCurrentMacroIndex((prev) => (prev === 0 ? macroData.length - 1 : prev - 1));
  };

  const handleNextMacro = () => {
    setIsPaused(true);
    setCurrentMacroIndex((prev) => (prev === macroData.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number) => {
    setIsPaused(true);
    setCurrentMacroIndex(index);
  };

  const handleCloseMenu = () => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsMenuClosing(false);
    }, 300); // Increased to match animation duration
  };

  const toggleGroceryItem = async (itemId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/shopping-list/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ purchased: !currentStatus })
      });

      if (response.ok) {
        refetchGroceries();
      }
    } catch (error) {
      // If API fails, just update locally for now
      refetchGroceries();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      setIsPaused(true);
      if (isLeftSwipe) {
        setCurrentMacroIndex((prev) => (prev === macroData.length - 1 ? 0 : prev + 1));
      } else {
        setCurrentMacroIndex((prev) => (prev === 0 ? macroData.length - 1 : prev - 1));
      }
    }
  };

  const currentMacro = macroData[currentMacroIndex];
  const remaining = currentMacro.target - currentMacro.current;
  const circumference = 2 * Math.PI * 38;
  const strokeDasharray = `${(currentMacro.percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="gradient-bg min-h-screen pb-24">
      <div className="max-w-md mx-auto px-5">
      <header className="header">
        <div 
          className="profile-avatar cursor-pointer" 
          onClick={() => window.location.href = '/profile'}
          role="button"
          aria-label="Go to profile"
        >
          {user?.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.email} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span>
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </span>
          )}
        </div>
        <div className="profile-info">
          <p className="profile-greeting">Welcome back</p>
          <p className="profile-name">{user?.email?.split("@")[0] || "User"}</p>
        </div>
        <button 
          className="notification-button" 
          aria-label="More options"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </header>

      {/* Mobile Bottom Sheet Menu */}
      {(isMenuOpen || isMenuClosing) && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              animation: isMenuClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
            }}
            onClick={handleCloseMenu}
          />
          <div 
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 32px',
              zIndex: 9999,
              maxWidth: '430px',
              margin: '0 auto',
              animation: isMenuClosing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ 
              width: '40px', 
              height: '4px', 
              backgroundColor: '#E2E8F0', 
              borderRadius: '2px',
              margin: '0 auto 24px'
            }} />

            <div style={{ marginBottom: '8px' }}>
              <button
                onClick={() => {
                  handleCloseMenu();
                  setTimeout(() => window.location.href = '/profile', 300);
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '16px',
                  color: '#1E293B',
                  borderRadius: '12px',
                  transition: 'background-color 0.2s'
                }}
                onTouchStart={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onTouchEnd={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: '#E8F5FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg className="w-5 h-5" style={{ color: '#26A8FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span style={{ fontWeight: 500 }}>Profile</span>
              </button>

              <button
                onClick={() => {
                  handleCloseMenu();
                  setTimeout(() => window.location.href = '/settings', 300);
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '16px',
                  color: '#1E293B',
                  borderRadius: '12px',
                  transition: 'background-color 0.2s'
                }}
                onTouchStart={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onTouchEnd={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: '#E8F5FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg className="w-5 h-5" style={{ color: '#26A8FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span style={{ fontWeight: 500 }}>Settings</span>
              </button>

              <button
                onClick={() => {
                  handleCloseMenu();
                  setTimeout(() => window.location.href = '/meal-planning-quiz', 300);
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '16px',
                  color: '#1E293B',
                  borderRadius: '12px',
                  transition: 'background-color 0.2s'
                }}
                onTouchStart={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onTouchEnd={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: '#E8F5FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg className="w-5 h-5" style={{ color: '#26A8FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <span style={{ fontWeight: 500 }}>Meal Planning</span>
              </button>

              <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '16px 0' }} />

              <button
                onClick={() => {
                  handleCloseMenu();
                  setTimeout(() => window.location.href = '/logout', 300);
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '16px',
                  color: '#EF4444',
                  borderRadius: '12px',
                  transition: 'background-color 0.2s'
                }}
                onTouchStart={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                onTouchEnd={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg className="w-5 h-5" style={{ color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span style={{ fontWeight: 500 }}>Logout</span>
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes slideDown {
              from { transform: translateY(0); }
              to { transform: translateY(100%); }
            }
          `}</style>
        </>
      )}

      <div className="day-selector">
        <div className="day-selector-container">
          <div className="day-selector-scroll">
            {allDays.map((day) => (
              <button 
                key={day.formattedDate}
                className={`day-button ${day.formattedDate === selectedDate ? 'active' : ''} ${day.isToday ? 'is-today' : ''}`}
                onClick={() => handleDayClick(day.formattedDate)}
                aria-label={`${day.dayName} ${day.dayNumber}`}
              >
                <span style={{ fontSize: '11px', opacity: 0.7 }}>
                  {day.dayName}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>
                  {day.dayNumber}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5">
        <div 
          className="card" 
          style={{ marginBottom: '20px' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {currentMacro.title}
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold" style={{ color: currentMacro.color }}>
                    {currentMacro.current} {currentMacro.unit}
                  </span>
                  <span className="text-sm text-gray-500">of {currentMacro.target} {currentMacro.unit}</span>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full mt-2" style={{ backgroundColor: 'rgba(38, 168, 255, 0.1)' }}>
                  <span className="text-xs font-medium" style={{ color: currentMacro.color }}>
                    {remaining > 0 ? `${remaining} ${currentMacro.unit} left` : 'Target reached!'}
                  </span>
                </div>
              </div>

              <div className="progress-circle-container">
                <svg className="progress-circle-svg">
                  <circle className="progress-circle-bg" cx="40" cy="40" r="34" />
                  <circle 
                    className="progress-circle-fg" 
                    cx="40" 
                    cy="40" 
                    r="34" 
                    strokeDasharray={strokeDasharray}
                    style={{ stroke: currentMacro.color }}
                  />
                </svg>
                <div className="progress-circle-text">{currentMacro.percentage}%</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-4">
            {macroData.map((macro, index) => (
              <button
                key={macro.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentMacroIndex 
                    ? 'w-6 bg-[#26A8FF]' 
                    : 'bg-gray-300'
                }`}
                onClick={() => handleDotClick(index)}
                aria-label={`View ${macro.title}`}
              />
            ))}
          </div>
        </div>

        {/* Today's Meals Section or Generate Meal Plan */}
        <div style={{ marginBottom: '20px' }}>
          {!mealPlan && foodLogs.length === 0 && !logsLoading ? (
            // Show Generate Meal Plan card when no meal plan and no food logs
            <div className="card text-center py-12">
              <div className="mb-4">
                <svg className="w-20 h-20 mx-auto text-[#26A8FF] opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Meal Plan Yet</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                Create a personalized meal plan tailored to your goals and preferences
              </p>
              <button 
                className="inline-flex items-center px-6 py-3 rounded-full text-white font-medium transition-all hover:shadow-lg"
                style={{ backgroundColor: '#26A8FF' }}
                onClick={() => window.location.href = '/meal-planning-quiz'}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Generate Meal Plan
              </button>
            </div>
          ) : (
            // Show meals from meal plan or food logs
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {(mealPlan?.meals && mealPlan.meals.length > 0 ? mealPlan.meals : foodLogs).slice(0, 3).map((meal: any) => (
                <div 
                  key={meal.id} 
                  className="meal-card"
                  onClick={() => window.location.href = `/recipes/${meal.id}`}
                >
                  <div className="h-[160px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-[16px] flex items-center justify-center overflow-hidden">
                    {meal.imageUrl ? (
                      <img 
                        src={meal.imageUrl} 
                        alt={meal.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-3 bg-white">
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
          )}
        </div>

        {/* Groceries List Section - Updated */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#26A8FF] mb-4">
            {mealPlan ? "Today's Groceries" : "Groceries List"}
          </h2>
          <div>
            {Array.isArray(groceryList) && groceryList.length > 0 ? (
              <>
                {groceryList.slice(0, groceryDisplayCount).map((item, index) => {
                  const isPurchased = item.isPurchased ?? item.purchased ?? false;
                  const isNewlyRevealed = index >= groceryDisplayCount - 5 && index >= 5;
                  return (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    style={{
                      animation: isNewlyRevealed ? 'slideInFromBottom 0.3s ease-out' : 'none',
                      animationFillMode: 'backwards',
                      animationDelay: `${(index % 5) * 0.05}s`
                    }}
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
                      onClick={() => toggleGroceryItem(item.id, isPurchased)}
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
                {groceryList.length > groceryDisplayCount && (
                  <button
                    onClick={() => setGroceryDisplayCount(prev => prev + 5)}
                    className="w-full mt-3 py-2 text-sm font-medium text-[#26A8FF] hover:text-[#1A8FE6] transition-colors"
                  >
                    View more ({groceryList.length - groceryDisplayCount} remaining)
                  </button>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 py-4 text-center">
                {mealPlan ? "Generating grocery list..." : "No items in your grocery list"}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes slideInFromBottom {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>

      <Navbar />
      </div>
    </div>
  );
}