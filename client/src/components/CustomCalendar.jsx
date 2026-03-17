import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CustomCalendar = ({ selectedRange, onRangeChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = selectedDate.toISOString().split('T')[0];

    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      onRangeChange({ start: dateStr, end: '' });
    } else {
      const start = new Date(selectedRange.start);
      if (selectedDate < start) {
        onRangeChange({ start: dateStr, end: selectedRange.start });
      } else {
        onRangeChange({ ...selectedRange, end: dateStr });
      }
    }
  };

  const isSelected = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === selectedRange.start || dateStr === selectedRange.end;
  };

  const isInRange = (day) => {
    if (!selectedRange.start || !selectedRange.end) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const start = new Date(selectedRange.start);
    const end = new Date(selectedRange.end);
    return date > start && date < end;
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const selected = isSelected(d);
    const inRange = isInRange(d);
    days.push(
      <button
        key={d}
        onClick={() => handleDateClick(d)}
        className={`h-10 w-10 flex items-center justify-center rounded-lg text-sm transition-all duration-200
          ${selected ? 'bg-primary text-white shadow-lg shadow-primary/30 z-10' : ''}
          ${inRange ? 'bg-primary/10 text-primary-light' : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'}
          ${!selected && !inRange ? 'relative' : ''}
        `}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="p-4 bg-bg-elevated/50 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl w-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <h4 className="text-sm font-bold text-text-primary capitalize">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h4>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 hover:bg-bg-surface rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-bg-surface rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="h-10 w-10 flex items-center justify-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  );
};

export default CustomCalendar;
