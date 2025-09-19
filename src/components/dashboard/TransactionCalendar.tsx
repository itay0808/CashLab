import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, DollarSign, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, setYear, getYear, setMonth, getMonth, startOfDay, endOfDay } from "date-fns";

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

export const TransactionCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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

      console.log('Fetching data for:', format(monthStart, 'yyyy-MM-dd'), 'to', format(monthEnd, 'yyyy-MM-dd'));

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
        console.error('Transactions error:', transactionsError);
        throw transactionsError;
      }

      // Fetch ALL recurring transactions (we'll filter them in the calendar generation)
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
        console.error('Recurring error:', recurringError);
        throw recurringError;
      }

      console.log('Fetched transactions:', transactionsData?.length || 0);
      console.log('Fetched recurring:', recurringData?.length || 0);

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
    
    // Get all days in the current month view (including previous/next month days to fill the grid)
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - monthStart.getDay()); // Start from Sunday
    
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay())); // End on Saturday
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    const calendarData: CalendarDay[] = days.map(date => {
      // Get transactions for this day
      const dayTransactions = transactions.filter(t => 
        isSameDay(new Date(t.transaction_date), date)
      );

      // Get recurring transactions that fall on this day
      const dayRecurring = recurringTransactions.filter(rt => {
        const dueDate = new Date(rt.next_due_date);
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
    
    // Go back a year from the current month to catch any recurring transactions that should show
    const searchStart = new Date(monthStart);
    searchStart.setFullYear(searchStart.getFullYear() - 1);
    
    // Start from the recurring transaction's original due date and work forward
    while (currentDate <= monthEnd) {
      if (currentDate >= monthStart && currentDate <= monthEnd) {
        dates.push(new Date(currentDate));
      }
      
      // Move to next occurrence based on frequency
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
          return dates; // Stop if unknown frequency
      }
      
      // Prevent infinite loops
      if (dates.length > 100) break;
    }
    
    return dates;
  };

  const getTransactionTypeColor = (type: string) => {
    return type === 'income' 
      ? 'bg-success/10 text-success border-success/20' 
      : 'bg-danger/10 text-danger border-danger/20';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const navigateToYear = (year: number) => {
    setCurrentDate(prev => setYear(prev, year));
    setShowYearPicker(false);
  };

  const navigateToMonth = (month: number) => {
    setCurrentDate(prev => setMonth(prev, month));
    setShowMonthPicker(false);
  };

  const generateYearOptions = () => {
    const currentYear = getYear(new Date());
    const years = [];
    // Show 10 years before and 10 years after current year
    for (let year = currentYear - 10; year <= currentYear + 10; year++) {
      if (year >= 2000 && year <= 9999) {
        years.push(year);
      }
    }
    return years;
  };

  const generateMonthOptions = () => {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  };

  const formatCurrency = (amount: number) => {
    return `₪${Math.abs(amount).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-elevated border-border/50">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-elevated border-border/50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Transaction Calendar</h3>
              <p className="text-sm text-muted-foreground">View your financial activity by date</p>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="min-w-[120px] font-semibold"
                onClick={() => {
                  setShowMonthPicker(!showMonthPicker);
                  setShowYearPicker(false);
                }}
              >
                {format(currentDate, 'MMMM')}
              </Button>
              <Button
                variant="outline"
                className="min-w-[80px] font-semibold"
                onClick={() => {
                  setShowYearPicker(!showYearPicker);
                  setShowMonthPicker(false);
                }}
              >
                {format(currentDate, 'yyyy')}
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Month Picker */}
        {showMonthPicker && (
          <div className="absolute z-10 bg-card border rounded-lg shadow-lg p-4 max-h-48 overflow-y-auto right-0 top-16">
            <div className="grid grid-cols-3 gap-2">
              {generateMonthOptions().map((month, index) => (
                <Button
                  key={month}
                  variant={getMonth(currentDate) === index ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigateToMonth(index)}
                  className="text-sm"
                >
                  {month.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Year Picker */}
        {showYearPicker && (
          <div className="absolute z-10 bg-card border rounded-lg shadow-lg p-4 max-h-48 overflow-y-auto right-0 top-16">
            <div className="grid grid-cols-4 gap-2">
              {generateYearOptions().map(year => (
                <Button
                  key={year}
                  variant={getYear(currentDate) === year ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigateToYear(year)}
                  className="text-sm"
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="space-y-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarData.map((day, index) => (
              <div
                key={index}
                className={`min-h-[100px] p-2 rounded-lg border transition-all hover:shadow-sm ${
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
                <div className={`text-sm font-medium mb-2 ${
                  day.isCurrentMonth 
                    ? day.isToday 
                      ? 'text-primary font-bold' 
                      : 'text-foreground'
                    : 'text-muted-foreground'
                }`}>
                  {format(day.date, 'd')}
                </div>

                {/* Transactions */}
                <div className="space-y-1">
                  {day.transactions.slice(0, 2).map(transaction => (
                    <div
                      key={transaction.id}
                      className={`text-xs px-2 py-1 rounded border ${getTransactionTypeColor(transaction.type)}`}
                      title={`${transaction.description} - ${formatCurrency(transaction.amount)} at ${format(new Date(transaction.transaction_date), 'HH:mm')}`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <DollarSign className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{transaction.description}</span>
                      </div>
                      <div className="font-semibold">
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}

                  {/* Recurring Transactions */}
                  {day.recurringTransactions.slice(0, 1).map(recurring => (
                    <div
                      key={`recurring-${recurring.id}`}
                      className="text-xs px-2 py-1 rounded border bg-warning/10 text-warning border-warning/20"
                      title={`${recurring.name} - ${formatCurrency(recurring.amount)} (${recurring.frequency})`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Repeat className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{recurring.name}</span>
                      </div>
                      <div className="font-semibold">
                        {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                      </div>
                    </div>
                  ))}

                  {/* Show count if more transactions */}
                  {(day.transactions.length + day.recurringTransactions.length > 3) && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      +{day.transactions.length + day.recurringTransactions.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success/20 border border-success/30"></div>
            <span className="text-sm text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-danger/20 border border-danger/30"></div>
            <span className="text-sm text-muted-foreground">Expense</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-warning/20 border border-warning/30"></div>
            <span className="text-sm text-muted-foreground">Recurring</span>
          </div>
        </div>
      </div>
    </Card>
  );
};