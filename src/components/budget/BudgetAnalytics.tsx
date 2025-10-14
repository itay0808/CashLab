import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, Calendar, AlertCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { startOfMonth, endOfMonth, addMonths } from "date-fns";

interface SpendingData {
  category: string;
  budgeted: number;
  spent: number;
  icon: string;
  alertThreshold: number;
}

interface BudgetAnalyticsProps {
  refreshTrigger?: number;
}

export const BudgetAnalytics = ({ refreshTrigger = 0 }: BudgetAnalyticsProps) => {
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  const [currentBalance, setCurrentBalance] = useState(0);
  const [projectedEndBalance, setProjectedEndBalance] = useState(0);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchSpendingAnalytics();
    fetchBalanceProjections();
  }, [refreshTrigger]);

  // Listen for transaction changes to refresh analytics
  useEffect(() => {
    const handleRefresh = () => {
      fetchSpendingAnalytics();
      fetchBalanceProjections();
    };
    window.addEventListener('refreshTransactions', handleRefresh);
    window.addEventListener('refreshBalances', handleRefresh);
    return () => {
      window.removeEventListener('refreshTransactions', handleRefresh);
      window.removeEventListener('refreshBalances', handleRefresh);
    };
  }, []);

  const fetchBalanceProjections = async () => {
    try {
      if (!user) return;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Get main account
      const { data: mainAccount, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'main')
        .eq('is_active', true)
        .maybeSingle();

      if (accountError) throw accountError;

      if (!mainAccount) {
        return;
      }

      // Calculate current balance from past transactions only
      const { data: pastTransactions, error: pastError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', mainAccount.id)
        .lte('transaction_date', now.toISOString());

      if (pastError) throw pastError;

      const currentBalance = (pastTransactions || []).reduce((sum, transaction) => {
        return sum + transaction.amount;
      }, 0);

      // Get future transactions until end of month
      const { data: futureTransactions, error: futureError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', mainAccount.id)
        .gt('transaction_date', now.toISOString())
        .lte('transaction_date', monthEnd.toISOString());

      if (futureError) throw futureError;

      // Get recurring transactions for rest of month
      const { data: recurringTransactions, error: recurringError } = await supabase
        .from('recurring_transactions')
        .select('amount, next_due_date, frequency')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .lte('next_due_date', monthEnd.toISOString());

      if (recurringError) throw recurringError;

      // Calculate projected recurring transactions for rest of month
      let projectedRecurringAmount = 0;
      (recurringTransactions || []).forEach(recurring => {
        const nextDue = new Date(recurring.next_due_date);
        if (nextDue > now && nextDue <= monthEnd) {
          projectedRecurringAmount += recurring.amount;
        }
      });

      const futureAmount = (futureTransactions || []).reduce((sum, transaction) => {
        return sum + transaction.amount;
      }, 0);

      const projectedBalance = currentBalance + futureAmount + projectedRecurringAmount;

      setCurrentBalance(currentBalance);
      setProjectedEndBalance(projectedBalance);

    } catch (error) {
      console.error('Error fetching balance projections:', error);
    }
  };

  const fetchSpendingAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select(`
          budgeted_amount,
          spent_amount,
          budget:budgets(
            name,
            alert_threshold,
            category:categories(name, icon)
          )
        `)
        .eq('is_current', true);

      if (error) throw error;

      const analytics = (data || []).map(period => ({
        category: period.budget?.category?.name || period.budget?.name || 'Unknown',
        budgeted: period.budgeted_amount,
        spent: period.spent_amount,
        icon: period.budget?.category?.icon || '📊',
        alertThreshold: period.budget?.alert_threshold || 80
      }));

      setSpendingData(analytics);
    } catch (error) {
      console.error('Error fetching spending analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load spending analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const getBarColor = (spent: number, budgeted: number, alertThreshold: number) => {
    const percentage = (spent / budgeted) * 100;
    if (percentage >= 100) return '#ef4444';
    if (percentage >= alertThreshold) return '#f59e0b';
    return '#10b981';
  };

  const getTotalBudgeted = () => spendingData.reduce((sum, item) => sum + item.budgeted, 0);
  const getTotalSpent = () => spendingData.reduce((sum, item) => sum + item.spent, 0);
  const getOverBudgetCount = () => spendingData.filter(item => item.spent >= item.budgeted).length;

  if (loading) {
    return (
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Budget Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  const balanceDifference = projectedEndBalance - currentBalance;
  const isPositiveProjection = balanceDifference >= 0;

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Budget Analytics
            </CardTitle>
            <CardDescription>Spending analysis for {currentMonth}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {spendingData.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No budgets to analyze</h3>
            <p className="text-muted-foreground">
              Create budgets to see detailed spending analytics
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Balance Projections */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Balance Projections</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-card p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-lg font-semibold">{formatCurrency(currentBalance)}</p>
                </div>
                <div className="bg-gradient-card p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Projected End-of-Month</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">
                      {formatCurrency(projectedEndBalance)}
                    </p>
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      isPositiveProjection ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isPositiveProjection ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatCurrency(Math.abs(balanceDifference))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-card p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
                <p className="text-lg font-semibold">{formatCurrency(getTotalBudgeted())}</p>
              </div>
              <div className="bg-gradient-card p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-lg font-semibold">{formatCurrency(getTotalSpent())}</p>
              </div>
              <div className="bg-gradient-card p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Over Budget</p>
                <p className={`text-lg font-semibold ${getOverBudgetCount() > 0 ? 'text-danger' : 'text-success'}`}>
                  {getOverBudgetCount()} categories
                </p>
              </div>
            </div>

            {/* Spending Chart */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Category Spending</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                    {spendingData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getBarColor(entry.spent, entry.budgeted, entry.alertThreshold)} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Detailed Breakdown</h4>
              {spendingData.map((item, index) => {
                const percentage = (item.spent / item.budgeted) * 100;
                const isOverBudget = percentage >= 100;
                const isNearLimit = percentage >= item.alertThreshold;
                
                return (
                  <div key={index} className="space-y-2 p-4 rounded-lg bg-card-subtle border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverBudget && <AlertCircle className="h-4 w-4 text-danger" />}
                        {!isOverBudget && isNearLimit && (
                          <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                            Near Limit
                          </Badge>
                        )}
                        {!isNearLimit && (
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                            On Track
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-2"
                    />
                    
                    <div className="flex justify-between text-sm">
                      <span className={isOverBudget ? 'text-danger' : 'text-muted-foreground'}>
                        Spent: {formatCurrency(item.spent)}
                      </span>
                      <span className="text-muted-foreground">
                        Budget: {formatCurrency(item.budgeted)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {isOverBudget 
                        ? `Over budget by ${formatCurrency(item.spent - item.budgeted)}`
                        : `${formatCurrency(item.budgeted - item.spent)} remaining`
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};