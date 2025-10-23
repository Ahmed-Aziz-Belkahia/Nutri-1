import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";

// Macro data for carousel
const macroData = [
  {
    id: 'calories',
    title: 'Eaten Calories',
    current: 2000,
    target: 3200,
    unit: 'cal',
    color: '#00a9a5',
    percentage: 70
  },
  {
    id: 'carbs',
    title: 'Carbohydrates',
    current: 180,
    target: 250,
    unit: 'g',
    color: '#00a9a5',
    percentage: 72
  },
  {
    id: 'protein',
    title: 'Protein',
    current: 95,
    target: 120,
    unit: 'g',
    color: '#00a9a5',
    percentage: 79
  },
  {
    id: 'fat',
    title: 'Fat',
    current: 45,
    target: 70,
    unit: 'g',
    color: '#00a9a5',
    percentage: 64
  }
];

// Helper function to get week days starting from today
function getWeekDays() {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + idx); // Start from Sunday
    
    return {
      date,
      dayName: dayNames[idx],
      dayNumber: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      formattedDate: format(date, 'yyyy-MM-dd')
    };
  });
}

export default function DashboardNew() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [weekDays, setWeekDays] = useState(getWeekDays());
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentMacroIndex, setCurrentMacroIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Update week days when offset changes
  useEffect(() => {
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const newWeekDays = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + idx + (weekOffset * 7));
      
      return {
        date,
        dayName: dayNames[idx],
        dayNumber: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        formattedDate: format(date, 'yyyy-MM-dd')
      };
    });
    
    setWeekDays(newWeekDays);
  }, [weekOffset]);

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    const autoScrollInterval = setInterval(() => {
      setCurrentMacroIndex((prev) => (prev === macroData.length - 1 ? 0 : prev + 1));
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(autoScrollInterval);
  }, [isPaused]);

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleDayClick = (formattedDate: string) => {
    setSelectedDate(formattedDate);
    // TODO: Fetch data for selected date
    console.log('Selected date:', formattedDate);
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
    <div className="gradient-bg min-h-screen pb-32">
      <div className="max-w-md mx-auto px-5">
      <header className="header">
        <div className="profile-avatar">
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
        <button className="notification-button" aria-label="Notifications">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </header>

      <div className="day-selector">
        <div className="day-selector-container">
          <button 
            className="day-arrow day-arrow-left" 
            onClick={handlePreviousWeek}
            aria-label="Previous week"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="day-selector-scroll">
            {weekDays.map((day) => (
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
          
          <button 
            className="day-arrow day-arrow-right" 
            onClick={handleNextWeek}
            aria-label="Next week"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5">
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="flex items-center justify-between gap-2">
            <button 
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" 
              onClick={handlePreviousMacro}
              aria-label="Previous macro"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

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
                <div className="inline-flex items-center px-3 py-1 rounded-full mt-2" style={{ backgroundColor: 'rgba(0, 191, 166, 0.1)' }}>
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

            <button 
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" 
              onClick={handleNextMacro}
              aria-label="Next macro"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-4">
            {macroData.map((macro, index) => (
              <button
                key={macro.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentMacroIndex 
                    ? 'w-6 bg-[#00BFA6]' 
                    : 'bg-gray-300'
                }`}
                onClick={() => handleDotClick(index)}
                aria-label={`View ${macro.title}`}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 1, name: "Big Mac meal", calories: 900 },
              { id: 2, name: "Beef Steak", calories: 1500 },
            ].map((meal) => (
              <div key={meal.id} className="meal-card">
                <div className="h-[160px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-[16px] flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="p-3 bg-white">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{meal.name}</h3>
                  <p className="text-xs text-gray-500">{meal.calories}kcal</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#00BFA6] mb-4">Meal Plan</h2>
          <div>
            {[
              { id: 1, name: "Eggs", calories: 500, completed: false },
              { id: 2, name: "Beef Steak", calories: 1500, completed: true },
              { id: 3, name: "Fruit Salad", calories: 250, completed: false },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <h3 className="text-base font-medium text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.calories}kcal</p>
                </div>
                <button className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  item.completed 
                    ? 'bg-[#00BFA6] border-[#00BFA6]' 
                    : 'border-gray-300 bg-white'
                }`}>
                  {item.completed && (
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Navbar />
      </div>
    </div>
  );
}