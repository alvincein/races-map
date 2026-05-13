"use client";

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './RangeCalendar.css';

interface RangeCalendarProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

export function RangeCalendar({ startDate, endDate, onChange }: RangeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    
    // Adjust firstDay for Monday start (0 = Monday, 6 = Sunday)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    return { year, month, startOffset, days };
  }, [currentMonth]);

  const monthName = currentMonth.toLocaleString('el-GR', { month: 'long', year: 'numeric' });

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(daysInMonth.year, daysInMonth.month, day);
    const dateStr = clickedDate.toISOString().split('T')[0];

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onChange(dateStr, null);
    } else {
      // Completing selection
      if (dateStr < startDate) {
        onChange(dateStr, startDate);
      } else {
        onChange(startDate, dateStr);
      }
    }
  };

  const isSelected = (day: number) => {
    const dateStr = new Date(daysInMonth.year, daysInMonth.month, day).toISOString().split('T')[0];
    return dateStr === startDate || dateStr === endDate;
  };

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const dateStr = new Date(daysInMonth.year, daysInMonth.month, day).toISOString().split('T')[0];
    return dateStr > startDate && dateStr < endDate;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === daysInMonth.month && 
           today.getFullYear() === daysInMonth.year;
  };

  const nextMonth = () => setCurrentMonth(new Date(daysInMonth.year, daysInMonth.month + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(daysInMonth.year, daysInMonth.month - 1, 1));

  const weekDays = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];

  return (
    <div className="range-calendar">
      <div className="calendar-header">
        <button onClick={prevMonth} type="button" className="nav-btn"><ChevronLeft size={18} /></button>
        <span className="month-label">{monthName}</span>
        <button onClick={nextMonth} type="button" className="nav-btn"><ChevronRight size={18} /></button>
      </div>

      <div className="calendar-grid">
        {weekDays.map(d => <div key={d} className="weekday-label">{d}</div>)}
        
        {Array.from({ length: daysInMonth.startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty" />
        ))}
        
        {Array.from({ length: daysInMonth.days }).map((_, i) => {
          const day = i + 1;
          const selected = isSelected(day);
          const range = isInRange(day);
          const today = isToday(day);
          const isStart = startDate === new Date(daysInMonth.year, daysInMonth.month, day).toISOString().split('T')[0];
          const isEnd = endDate === new Date(daysInMonth.year, daysInMonth.month, day).toISOString().split('T')[0];

          return (
            <div
              key={day}
              className={`calendar-day ${selected ? 'selected' : ''} ${range ? 'in-range' : ''} ${today ? 'today' : ''} ${isStart ? 'range-start' : ''} ${isEnd ? 'range-end' : ''}`}
              onClick={() => handleDateClick(day)}
            >
              <span className="day-number">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
