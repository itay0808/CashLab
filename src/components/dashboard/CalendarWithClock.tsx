import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar, Clock, DollarSign, Repeat, CalendarIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  type: string;
  category?: {
    name: string;
    icon: string;
  } | null;
}

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  next_due_date: string;
  frequency: string;
  type: string;
  category?: {
    name: string;
    icon: string;
  } | null;
}

interface CalendarDay {
  date: Date;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const CalendarWithClock = ({ onAddTransaction }: { onAddTransaction?: () => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Fetch transactions for the selected month/year
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          transaction_date,
          type,
          category:categories(name, icon)
        `)
        .eq('user_id', user?.id)
        .gte('transaction_date', monthStart.toISOString())
        .lte('transaction_date', monthEnd.toISOString())
        .order('transaction_date', { ascending: true });

      if (transactionsError) {
        throw transactionsError;
      }

      // Fetch recurring transactions
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_transactions')
        .select(`
          id,
          name,
          amount,
          next_due_date,
          frequency,
          type
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (recurringError) {
        throw recurringError;
      }

      setTransactions(transactionsData || []);
      setRecurringTransactions(recurringData || []);
      generateCalendarData(transactionsData || [], recurringData || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarData = (transactions: Transaction[], recurringTransactions: RecurringTransaction[]) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
    
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    const calendarData: CalendarDay[] = days.map(date => {
      const dayTransactions = transactions.filter(t => 
        isSameDay(new Date(t.transaction_date), date)
      );

      const dayRecurring = recurringTransactions.filter(rt => {
        return getRecurringDatesForMonth(rt, monthStart, monthEnd).some(recDate => 
          isSameDay(recDate, date)
        );
      });

      return {
        date,
        transactions: dayTransactions,
        recurringTransactions: dayRecurring,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isSameDay(date, new Date()),
      };
    });

    setCalendarData(calendarData);
  };

  const getRecurringDatesForMonth = (recurring: RecurringTransaction, monthStart: Date, monthEnd: Date): Date[] => {
    const dates: Date[] = [];
    let currentDate = new Date(recurring.next_due_date);
    
    while (currentDate <= monthEnd) {
      if (currentDate >= monthStart && currentDate <= monthEnd) {
        dates.push(new Date(currentDate));
      }
      
      switch (recurring.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          return dates;
      }
      
      if (dates.length > 100) break;
    }
    
    return dates;
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm ring-1 ring-emerald-200';
      case 'recurring_income':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-md ring-2 ring-emerald-300 relative overflow-hidden';
      case 'expense':
        return 'bg-red-100 text-red-800 border-red-300 shadow-sm ring-1 ring-red-200';
      case 'recurring_expense':
        return 'bg-red-100 text-red-800 border-red-300 shadow-md ring-2 ring-red-300 relative overflow-hidden';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 shadow-sm';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const handleDateSelect = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    setCurrentDate(newDate);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: isMobile ? 'short' : 'long',
      year: 'numeric',
      month: isMobile ? 'short' : 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₪${Math.abs(amount).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-elevated border-border/50">
        <div className="p-4 sm:p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className={`grid ${isMobile ? 'grid-cols-7 gap-1' : 'grid-cols-7 gap-2'}`}>
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className={`${isMobile ? 'h-12' : 'h-20'} bg-muted rounded`}></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Year selector component
  const YearSelector = ({ currentYear, onYearChange }: { currentYear: number, onYearChange: (year: number) => void }) => {
    const [yearRange, setYearRange] = useState({ start: 2010, end: 2019 });

    const navigateYears = (direction: 'prev' | 'next') => {
      setYearRange(prev => ({
        start: direction === 'prev' ? prev.start - 10 : prev.start + 10,
        end: direction === 'prev' ? prev.end - 10 : prev.end + 10
      }));
    };

    // Ensure current year is in visible range
    useEffect(() => {
      if (currentYear < yearRange.start || currentYear > yearRange.end) {
        const startYear = Math.floor(currentYear / 10) * 10;
        setYearRange({ start: startYear, end: startYear + 9 });
      }
    }, [currentYear, yearRange]);

    const years = Array.from({ length: 10 }, (_, i) => yearRange.start + i);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Year</label>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigateYears('prev')} className="h-6 w-6 p-0">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">{yearRange.start}-{yearRange.end}</span>
            <Button variant="ghost" size="sm" onClick={() => navigateYears('next')} className="h-6 w-6 p-0">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {years.map(year => (
            <Button
              key={year}
              variant={year === currentYear ? "default" : "outline"}
              size="sm"
              onClick={() => onYearChange(year)}
              className="h-8 text-xs"
              disabled={year > 2099}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Month grid component
  const MonthGrid = ({ currentMonth, onMonthChange }: { currentMonth: number, onMonthChange: (month: number) => void }) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Month</label>
        <div className="grid grid-cols-4 gap-1">
          {months.map((month, index) => (
            <Button
              key={index}
              variant={index === currentMonth ? "default" : "outline"}
              size="sm"
              onClick={() => onMonthChange(index)}
              className="h-8 text-xs"
            >
              {month}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gradient-card shadow-elevated border-border/50">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header with Clock */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold">Calendar & Clock</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">View your financial activity by date</p>
              </div>
            </div>
            
            {/* Live Clock */}
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
              <Clock className="h-4 w-4 text-primary" />
              <div className="text-center">
                <div className="text-lg sm:text-xl font-mono font-bold text-primary">
                  {formatTime(currentTime)}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {formatDate(currentTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="default" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="text-base sm:text-lg font-semibold border-dashed">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(currentDate, 'MMMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="center">
                <div className="space-y-4">
                  <YearSelector 
                    currentYear={currentDate.getFullYear()}
                    onYearChange={(year) => handleDateSelect(year, currentDate.getMonth())}
                  />
                  <MonthGrid 
                    currentMonth={currentDate.getMonth()}
                    onMonthChange={(month) => handleDateSelect(currentDate.getFullYear(), month)}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentDate(new Date())}
                    className="w-full"
                  >
                    Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="default" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {onAddTransaction && (
                <Button 
                  onClick={onAddTransaction}
                  size="default"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2 sm:space-y-4">
          {/* Day Headers */}
          <div className={`grid grid-cols-7 ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {(isMobile ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(day => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className={`grid grid-cols-7 ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {calendarData.map((day, index) => (
              <div
                key={index}
                className={`${isMobile ? 'min-h-[60px] p-1' : 'min-h-[100px] p-2'} rounded-lg border transition-all hover:shadow-sm ${
                  day.isCurrentMonth 
                    ? 'bg-background border-border/50' 
                    : 'bg-muted/30 border-muted/50'
                } ${
                  day.isToday 
                    ? 'ring-2 ring-primary ring-opacity-50' 
                    : ''
                }`}
              >
                {/* Date Number */}
                <div className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                  day.isCurrentMonth 
                    ? day.isToday 
                      ? 'text-primary font-bold' 
                      : 'text-foreground'
                    : 'text-muted-foreground'
                }`}>
                  {format(day.date, 'd')}
                </div>

                {/* Transactions - Mobile optimized */}
                <div className="space-y-1">
                  {day.transactions.slice(0, isMobile ? 1 : 2).map(transaction => (
                    <div
                      key={transaction.id}
                      className={`text-xs px-1 sm:px-2 py-1 rounded border ${getTransactionTypeColor(transaction.type)}`}
                      title={`${transaction.description} - ${formatCurrency(transaction.amount)}`}
                    >
                      {/* Add split background for recurring transactions */}
                      {(transaction.type === 'recurring_income' || transaction.type === 'recurring_expense') && (
                        <div className="absolute inset-0 flex">
                          <div className={`w-1/2 ${transaction.type === 'recurring_income' ? 'bg-emerald-100' : 'bg-red-100'}`}></div>
                          <div className="w-1/2 bg-blue-100"></div>
                        </div>
                      )}
                      <div className="relative z-10">
                        {isMobile ? (
                          <div className="flex items-center justify-center">
                            <span className="text-xs">{transaction.category?.icon || '💰'}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-xs">{transaction.category?.icon || '💰'}</span>
                              <span className="truncate">{transaction.description}</span>
                            </div>
                            <div className="font-semibold">
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {transaction.category?.name || 'Uncategorized'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Recurring Transactions */}
                  {day.recurringTransactions.slice(0, 1).map(recurring => (
                    <div
                      key={`recurring-${recurring.id}`}
                      className="text-xs px-1 sm:px-2 py-1 rounded border bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-200 relative overflow-hidden"
                      title={`${recurring.name} - ${formatCurrency(recurring.amount)} (${recurring.frequency})`}
                    >
                      {/* Split background for recurring */}
                      <div className="absolute inset-0 flex">
                        <div className={`w-1/2 ${recurring.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}></div>
                        <div className="w-1/2 bg-blue-100"></div>
                      </div>
                      <div className="relative z-10">
                        {isMobile ? (
                          <div className="flex items-center justify-center">
                            <Repeat className="h-2 w-2" />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 truncate">
                              <Repeat className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{recurring.name}</span>
                            </div>
                            <div className="font-semibold">
                              {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {recurring.frequency}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Show count if more transactions */}
                  {(day.transactions.length + day.recurringTransactions.length > (isMobile ? 2 : 3)) && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      +{day.transactions.length + day.recurringTransactions.length - (isMobile ? 2 : 3)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></div>
            <span className="text-xs sm:text-sm text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
            <span className="text-xs sm:text-sm text-muted-foreground">Expense</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border border-emerald-300 flex overflow-hidden">
              <div className="w-1/2 bg-emerald-100"></div>
              <div className="w-1/2 bg-blue-100"></div>
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Recurring Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border border-red-300 flex overflow-hidden">
              <div className="w-1/2 bg-red-100"></div>
              <div className="w-1/2 bg-blue-100"></div>
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Recurring Expense</span>
          </div>
        </div>
      </div>
    </Card>
  );
};