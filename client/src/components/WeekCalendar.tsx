import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";

interface WeekCalendarProps {
  onSelectDate?: (date: Date) => void;
}

export default function WeekCalendar({ onSelectDate }: WeekCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getDaysOfWeek = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + mondayOffset + index);
      return date;
    });
  };

  const days = getDaysOfWeek();

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((date, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleDateSelect(date)}
          className={`
            p-2 rounded-xl text-center cursor-pointer relative
            ${isToday(date) ? 'bg-[#0CC5BA]/10' : 'bg-gray-50/50'}
            ${isSelected(date) ? 'ring-2 ring-[#0CC5BA]' : ''}
            hover:bg-[#0CC5BA]/5 transition-colors
          `}
        >
          <div className="text-xs font-medium text-gray-500 mb-0.5">
            {format(date, 'EEE')}
          </div>
          <div className={`text-base font-bold ${isToday(date) ? 'text-[#0CC5BA]' : 'text-gray-900'}`}>
            {format(date, 'd')}
          </div>
        </motion.button>
      ))}
    </div>
  );
}