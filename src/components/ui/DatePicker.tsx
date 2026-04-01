"use client";

import { useState, useRef, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, startOfDay, addYears, subYears } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

type PickerMode = "single" | "range" | "month";

interface Props {
  mode: PickerMode;
  value: any; // Date | { start: Date, end: Date } | string (for Month mode)
  onChange: (val: any) => void;
  placeholder?: string;
  thai?: boolean;
  className?: string;
}

export default function MarkTechDatePicker({ mode, value, onChange, placeholder, thai = true, className = "" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = thai ? th : enUS;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = () => setIsOpen(!isOpen);

  const renderSingle = () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const startIdx = startOfMonth(currentMonth).getDay();
    const blanks = Array(startIdx).fill(null);

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-navy-800 rounded-full transition-colors">
            <ChevronLeft size={18} className="text-gold-400" />
          </button>
          <span className="text-sm font-bold text-foreground">
            {format(currentMonth, "MMMM yyyy", { locale })}
          </span>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-navy-800 rounded-full transition-colors">
            <ChevronRight size={18} className="text-gold-400" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-foreground-muted">{d}</div>
          ))}
          {blanks.map((_, i) => <div key={`b-${i}`} />)}
          {days.map(day => {
            const isSelected = value && isSameDay(day, value);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  onChange(day);
                  setIsOpen(false);
                }}
                className={`w-8 h-8 rounded-lg text-xs transition-all flex items-center justify-center ${
                  isSelected ? 'bg-gold-500 text-navy-950 font-bold shadow-lg shadow-gold-500/20' : 'text-foreground hover:bg-gold-500/10'
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRange = () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
    const startIdx = startOfMonth(currentMonth).getDay();
    const blanks = Array(startIdx).fill(null);
    const range = value as { start?: Date, end?: Date };

    const handleRangeSelect = (day: Date) => {
      if (!range?.start || (range.start && range.end)) {
        onChange({ start: day, end: undefined });
      } else {
        if (day < range.start) {
          onChange({ start: day, end: range.start });
        } else {
          onChange({ ...range, end: day });
          setIsOpen(false);
        }
      }
    };

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
           <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-navy-800 rounded-full transition-colors">
            <ChevronLeft size={18} className="text-gold-400" />
          </button>
          <span className="text-sm font-bold text-foreground">
            {format(currentMonth, "MMMM yyyy", { locale })}
          </span>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-navy-800 rounded-full transition-colors">
            <ChevronRight size={18} className="text-gold-400" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-foreground-muted">{d}</div>
          ))}
          {blanks.map((_, i) => <div key={`b-${i}`} />)}
          {days.map(day => {
            const isStart = range?.start && isSameDay(day, range.start);
            const isEnd = range?.end && isSameDay(day, range.end);
            const inRange = range?.start && range?.end && isWithinInterval(day, { start: range.start, end: range.end });
            
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleRangeSelect(day)}
                className={`w-8 h-8 text-xs transition-all flex items-center justify-center ${
                  isStart || isEnd ? 'bg-gold-500 text-navy-950 font-bold rounded-lg z-10' : 
                  inRange ? 'bg-gold-500/20 text-gold-400 rounded-none' : 'text-foreground hover:bg-gold-500/10 rounded-lg'
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonth = () => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(currentMonth.getFullYear(), i, 1));
    return (
      <div className="p-4 space-y-4 w-64">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setCurrentMonth(subYears(currentMonth, 1))} className="p-1 hover:bg-navy-800 rounded-full transition-colors">
            <ChevronLeft size={18} className="text-gold-400" />
          </button>
          <span className="text-sm font-bold text-foreground">
            {thai ? (parseInt(format(currentMonth, "yyyy")) + 543) : format(currentMonth, "yyyy")}
          </span>
          <button type="button" onClick={() => setCurrentMonth(addYears(currentMonth, 1))} className="p-1 hover:bg-navy-800 rounded-full transition-colors">
            <ChevronRight size={18} className="text-gold-400" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {months.map(m => {
            const isSelected = value && isSameMonth(m, new Date(value));
            return (
              <button
                key={m.toISOString()}
                type="button"
                onClick={() => {
                  onChange(m);
                  setIsOpen(false);
                }}
                className={`py-2 rounded-lg text-xs transition-all text-center ${
                  isSelected ? 'bg-gold-500 text-navy-950 font-bold' : 'text-foreground hover:bg-gold-500/10'
                }`}
              >
                {format(m, "MMM", { locale })}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const getDisplayValue = () => {
    if (!value) return placeholder || "เลือกวันที่...";
    if (mode === "single") return format(new Date(value), `d MMM ${thai ? 'yyyy' : 'yyyy'}`, { locale }).replace(/\d{4}/, (y) => thai ? (parseInt(y) + 543).toString() : y);
    if (mode === "month") return format(new Date(value), "MMMM", { locale }) + " " + (thai ? (parseInt(format(new Date(value), "yyyy")) + 543) : format(new Date(value), "yyyy"));
    if (mode === "range") {
      const r = value as { start?: Date, end?: Date };
      if (!r.start) return placeholder || "เลือกช่วงวันที่...";
      if (!r.end) return `${format(r.start, "d MMM", { locale })} - ...`;
      return `${format(r.start, "d MMM", { locale })} - ${format(r.end, "d MMM yyyy", { locale })}`;
    }
    return "";
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground flex items-center justify-between hover:border-gold-500/50 transition-all group"
      >
        <span className={`text-sm ${!value ? 'text-foreground-muted italic' : ''}`}>
          {getDisplayValue()}
        </span>
        <CalendarIcon size={16} className="text-foreground-muted group-hover:text-gold-400 transition-colors" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-[999] bg-surface border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
          {mode === "single" && renderSingle()}
          {mode === "range" && renderRange()}
          {mode === "month" && renderMonth()}
        </div>
      )}
    </div>
  );
}
