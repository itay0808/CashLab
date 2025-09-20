import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Repeat, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { startOfMonth, endOfMonth } from "date-fns";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  type: string;
  notes?: string;
  account?: {
    name: string;
  } | null;
  category?: {
    id: string;
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
}

const getTransactionColor = (type: string, isRecurring = false) => {
  if (isRecurring) {
    if (type === 'income') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 relative overflow-hidden';
    } else {
      return 'bg-red-100 text-red-800 border-red-300 relative overflow-hidden';
    }
  } else {
    if (type === 'income') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else {
      return 'bg-red-100 text-red-800 border-red-300';
    }
  }
};

export const MergedActivityBox = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Function to refresh data (can be called from parent)
  const refreshData = () => {
    fetchData();
  };

  // Expose refresh function to parent component
  useEffect(() => {
    const handleRefresh = () => refreshData();
    window.addEventListener('refreshTransactions', handleRefresh);
    window.addEventListener('refreshBalances', handleRefresh);
    return () => {
      window.removeEventListener('refreshTransactions', handleRefresh);
      window.removeEventListener('refreshBalances', handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          transaction_date,
          type,
          notes,
          account:accounts(name),
          category:categories(id, name, icon)
        `)
        .gte('transaction_date', monthStart.toISOString())
        .lte('transaction_date', monthEnd.toISOString())
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (transactionsError) throw transactionsError;

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
        .eq('is_active', true)
        .order('next_due_date', { ascending: true })
        .limit(3);

      if (recurringError) throw recurringError;

      setTransactions(transactionsData || []);
      setRecurringTransactions(recurringData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load activity data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-card shadow-card">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div>
                    <div className="h-3 bg-muted rounded w-24 mb-1"></div>
                    <div className="h-2 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-card shadow-elevated border-border/50">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Recent Activity & Recurring</h3>
                <p className="text-sm text-muted-foreground">Latest transactions and upcoming recurring payments</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Recent Transactions */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Transactions</h4>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions this month</div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="group p-3 rounded-lg border border-border/50 bg-gradient-subtle hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getTransactionColor(transaction.type)}`}>
                            <span className="text-lg">{transaction.category?.icon || '💰'}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{transaction.description}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDate(transaction.transaction_date)}</span>
                              <Badge variant="secondary" className="text-xs">
                                {transaction.category?.name || 'Uncategorized'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                      <div className="flex items-center gap-2">
                        <div className={`text-right ${transaction.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          <div className="text-sm font-bold">
                            {transaction.amount > 0 ? '+' : ''}₪{Math.abs(transaction.amount).toFixed(0)}
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring Transactions */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Recurring</h4>
              {recurringTransactions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">No recurring transactions</div>
              ) : (
                <div className="space-y-2">
                  {recurringTransactions.map((recurring) => (
                    <div key={recurring.id} className="group p-3 rounded-lg border border-border/50 bg-gradient-subtle hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getTransactionColor(recurring.type, true)}`}>
                            {/* Split background for recurring */}
                            <div className="absolute inset-0 flex rounded-lg overflow-hidden">
                              <div className={`w-1/2 ${recurring.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}></div>
                              <div className="w-1/2 bg-blue-100"></div>
                            </div>
                            <div className="relative z-10">
                              <Repeat className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{recurring.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Next: {formatDate(recurring.next_due_date)}</span>
                              <Badge variant="secondary" className="text-xs">
                                {recurring.frequency}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`text-right ${recurring.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <div className="text-sm font-bold">
                              {recurring.amount > 0 ? '+' : ''}₪{Math.abs(recurring.amount).toFixed(0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};