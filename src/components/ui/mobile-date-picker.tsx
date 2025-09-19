import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MobileDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export const MobileDatePicker = ({ date, onDateChange }: MobileDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [viewDate, setViewDate] = useState(date);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(viewDate.getFullYear(), monthIndex, 1);
    setViewDate(newDate);
    onDateChange(newDate);
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(year, viewDate.getMonth(), 1);
    setViewDate(newDate);
    onDateChange(newDate);
    setViewMode('month');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setViewDate(newDate);
    onDateChange(newDate);
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setViewDate(newDate);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(date, 'MMMM yyyy')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateYear('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-2">
              {viewMode === 'month' ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setViewMode('year')}
                    className="font-semibold"
                  >
                    {format(viewDate, 'yyyy')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setViewMode('month')}
                  className="font-semibold"
                >
                  {format(viewDate, 'yyyy')}
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => viewMode === 'month' ? navigateMonth('next') : navigateYear('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          {viewMode === 'month' ? (
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => (
                <Button
                  key={month}
                  variant={viewDate.getMonth() === index ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleMonthSelect(index)}
                  className="text-sm"
                >
                  {month.slice(0, 3)}
                </Button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {years.map(year => (
                <Button
                  key={year}
                  variant={viewDate.getFullYear() === year ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleYearSelect(year)}
                  className="text-sm"
                >
                  {year}
                </Button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};