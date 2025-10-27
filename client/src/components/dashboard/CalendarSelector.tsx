import { format } from "date-fns";
import { useEffect, useRef } from "react";

interface Day {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  formattedDate: string;
}

interface CalendarSelectorProps {
  allDays: Day[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export default function CalendarSelector({ allDays, selectedDate, onDateSelect }: CalendarSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll to selected date (centered) on mount and when date changes
  useEffect(() => {
    if (scrollContainerRef.current && selectedButtonRef.current) {
      const container = scrollContainerRef.current;
      const button = selectedButtonRef.current;
      
      // Calculate the scroll position to center the selected button
      const scrollLeft = button.offsetLeft - (container.clientWidth / 2) + (button.clientWidth / 2);
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [selectedDate]);

  return (
    <div className="day-selector">
      <div className="day-selector-container">
        <div className="day-selector-scroll" ref={scrollContainerRef}>
          {allDays.map((day) => {
            const isSelected = day.formattedDate === selectedDate;
            return (
              <button 
                key={day.formattedDate}
                ref={isSelected ? selectedButtonRef : null}
                className={`day-button ${isSelected ? 'active' : ''} ${day.isToday ? 'is-today' : ''}`}
                onClick={() => onDateSelect(day.formattedDate)}
                aria-label={`${day.dayName} ${day.dayNumber}`}
              >
                <span style={{ fontSize: '11px', opacity: 0.7 }}>
                  {day.dayName}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
