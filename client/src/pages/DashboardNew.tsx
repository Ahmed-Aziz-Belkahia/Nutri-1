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
      <header className="header">
        <div className="profile-avatar">
          {user?.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.email} 
              className="profile-avatar-image" 
            />
          ) : (
            <div className="profile-avatar-initial">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>
        <div className="profile-info">
          <p className="profile-greeting">Welcome back</p>
          <p className="profile-name">{user?.email?.split("@")[0] || "User"}</p>
        </div>
        <button className="notification-button" aria-label="Notifications">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {weekDays.map((day, index) => (
              <div key={day.formattedDate} className="flex items-center">
                {index > 0 && <div className="day-divider" />}
                <button 
                  className={`day-button ${day.formattedDate === selectedDate ? 'active' : ''} ${day.isToday ? 'is-today' : ''}`}
                  onClick={() => handleDayClick(day.formattedDate)}
                  aria-label={`${day.dayName} ${day.dayNumber}`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium" style={{ fontSize: '10px', marginBottom: '2px' }}>
                      {day.dayName}
                    </span>
                    <span className="text-sm font-bold">
                      {day.dayNumber}
                    </span>
                  </div>
                </button>
              </div>
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

      <div className="container">
        <div className="card section">
          <div className="macro-carousel-wrapper">
            <button 
              className="macro-arrow macro-arrow-left" 
              onClick={handlePreviousMacro}
              aria-label="Previous macro"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div 
              className="macro-carousel-scroll"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div 
                className="macro-carousel-track"
                style={{ 
                  transform: `translateX(-${currentMacroIndex * 100}%)`,
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {macroData.map((macro) => {
                  const remaining = macro.target - macro.current;
                  const circumference = 2 * Math.PI * 38;
                  const strokeDasharray = `${(macro.percentage / 100) * circumference} ${circumference}`;
                  
                  return (
                    <div key={macro.id} className="macro-slide">
                      <div className="macro-slide-content">
                        <div className="macro-info">
                          <h2 className="macro-title" style={{ color: macro.color }}>
                            {macro.title}
                          </h2>
                          <p className="macro-values">
                            <span className="macro-current" style={{ color: macro.color }}>
                              {macro.current} {macro.unit}
                            </span>
                            <span className="macro-target"> of {macro.target} {macro.unit}</span>
                          </p>
                          <div className="stats-badge">
                            <span className="stats-badge-text">
                              {remaining > 0 ? `${remaining} ${macro.unit} left` : 'Target reached!'}
                            </span>
                          </div>
                        </div>
                        <div className="progress-circle-container">
                          <svg className="progress-circle-svg">
                            <circle className="progress-circle-bg" cx="45" cy="45" r="38" />
                            <circle 
                              className="progress-circle-fg" 
                              cx="45" 
                              cy="45" 
                              r="38" 
                              strokeDasharray={strokeDasharray}
                            />
                          </svg>
                          <div className="progress-circle-text">{macro.percentage}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              className="macro-arrow macro-arrow-right" 
              onClick={handleNextMacro}
              aria-label="Next macro"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="pagination-dots">
            {macroData.map((macro, index) => (
              <button
                key={macro.id}
                className={`pagination-dot ${index === currentMacroIndex ? 'active' : ''}`}
                onClick={() => handleDotClick(index)}
                aria-label={`View ${macro.title}`}
              />
            ))}
          </div>
        </div>

        <div className="section">
          <div className="carousel scrollbar-hide">
            {[
              { id: 1, name: "Big Mac meal", calories: 900 },
              { id: 2, name: "Beef Steak", calories: 1500 },
            ].map((meal) => (
              <div key={meal.id} className="meal-card">
                <div className="h-[204px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-[20px] flex items-center justify-center">
                  <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="meal-card-content">
                  <h3 className="meal-card-title">{meal.name}</h3>
                  <p className="meal-card-calories">{meal.calories}kcal</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card section">
          <h2 className="section-heading" style={{ marginBottom: '24px' }}>Meal Plan</h2>
          <div>
            {[
              { id: 1, name: "Eggs", calories: 500, completed: false },
              { id: 2, name: "Beef Steak", calories: 1500, completed: true },
              { id: 3, name: "Fruit Salad", calories: 250, completed: false },
            ].map((item, index) => (
              <div key={item.id} className="meal-plan-item" style={{ marginTop: index > 0 ? '24px' : '0' }}>
                <div className="meal-plan-info">
                  <h3 className="meal-plan-name">{item.name}</h3>
                  <p className="meal-plan-calories">{item.calories}kcal</p>
                </div>
                <button className={`meal-plan-checkbox ${item.completed ? 'checked' : ''}`} aria-label={`Mark ${item.name} as ${item.completed ? 'incomplete' : 'complete'}`}>
                  {item.completed && (
                    <svg className="meal-plan-checkbox-icon" viewBox="0 0 20 20" fill="currentColor">
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
  );
}