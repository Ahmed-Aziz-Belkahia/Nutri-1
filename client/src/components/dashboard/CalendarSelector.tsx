import { format } from "date-fns";

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
  return (
    <div className="day-selector">
      <div className="day-selector-container">
        <div className="day-selector-scroll">
          {allDays.map((day) => (
            <button 
              key={day.formattedDate}
              className={`day-button ${day.formattedDate === selectedDate ? 'active' : ''} ${day.isToday ? 'is-today' : ''}`}
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
          ))}
        </div>
      </div>
    </div>
  );
}
