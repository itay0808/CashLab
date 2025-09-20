import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Plus, Edit, TrendingDown, Calendar, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { startOfMonth, endOfMonth, addMonths } from "date-fns";
import { EditBudgetDialog } from "./EditBudgetDialog";

interface BudgetPeriod {
  id: string;
  budgeted_amount: number;
  spent_amount: number;
  period_start: string;
  period_end: string;
  budget: {
    id: string;
    name: string;
    period: string;
    alert_threshold: number;
    category: {
      name: string;
      icon: string;
    };
  };
}

interface SpendingData {
  category: string;
  budgeted: number;
  spent: number;
  icon: string;
  alertThreshold: number;
}

interface BudgetOverviewProps {
  onCreateBudget: () => void;
}

export const BudgetOverview = ({ onCreateBudget, refreshTrigger }: BudgetOverviewProps & { refreshTrigger?: number }) => {
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [projectedEndBalance, setProjectedEndBalance] = useState(0);
  const [showProjectedBalance, setShowProjectedBalance] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchBudgetPeriods();
    fetchSpendingAnalytics();
    fetchBalanceProjections();
  }, [refreshTrigger]);

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
        .eq('type', 'checking')
        .eq('is_active', true)
        .single();

      if (accountError) throw accountError;

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
    }
  };

  const fetchBudgetPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select(`
          id,
          budgeted_amount,
          spent_amount,
          period_start,
          period_end,
          budget:budgets(
            id,
            name,
            period,
            alert_threshold,
            category:categories(name, icon)
          )
        `)
        .eq('is_current', true)
        .order('spent_amount', { ascending: false });

      if (error) throw error;
      setBudgetPeriods(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load budget overview",
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

  const getProgressPercentage = (spent: number, budgeted: number) => {
    return Math.min((spent / budgeted) * 100, 100);
  };

  const getStatusColor = (spent: number, budgeted: number, alertThreshold: number) => {
    const percentage = (spent / budgeted) * 100;
    if (percentage >= 100) return 'text-danger';
    if (percentage >= alertThreshold) return 'text-warning';
    return 'text-success';
  };

  const getStatusBadge = (spent: number, budgeted: number, alertThreshold: number) => {
    const percentage = (spent / budgeted) * 100;
    if (percentage >= 100) return <Badge variant="destructive">Over Budget</Badge>;
    if (percentage >= alertThreshold) return <Badge variant="secondary" className="bg-warning/10 text-warning">Alert</Badge>;
    return <Badge variant="secondary" className="bg-success/10 text-success">On Track</Badge>;
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
            <TrendingUp className="h-5 w-5" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading budgets...</div>
        </CardContent>
      </Card>
    );
  }

  const totalBudgeted = budgetPeriods.reduce((sum, bp) => sum + bp.budgeted_amount, 0);
  const totalSpent = budgetPeriods.reduce((sum, bp) => sum + bp.spent_amount, 0);
  const overBudgetCount = budgetPeriods.filter(bp => bp.spent_amount >= bp.budgeted_amount).length;
  const alertCount = budgetPeriods.filter(bp => {
    const percentage = (bp.spent_amount / bp.budgeted_amount) * 100;
    return percentage >= bp.budget.alert_threshold && percentage < 100;
  }).length;

  const balanceDifference = projectedEndBalance - currentBalance;
  const isPositiveProjection = balanceDifference >= 0;
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Budget Overview
            </CardTitle>
            <CardDescription>Current budget periods and spending</CardDescription>
          </div>
          <Button onClick={onCreateBudget} size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Budget
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {budgetPeriods.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No budgets created yet</h3>
            <p className="text-muted-foreground mb-4">
              Start managing your finances by creating your first budget
            </p>
            <Button onClick={onCreateBudget}>Create Your First Budget</Button>
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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Projected End-of-Month</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowProjectedBalance(!showProjectedBalance)}
                      className="h-6 w-6 p-0"
                    >
                      {showProjectedBalance ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">
                      {showProjectedBalance ? formatCurrency(projectedEndBalance) : "••••••"}
                    </p>
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      isPositiveProjection ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isPositiveProjection ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {showProjectedBalance && formatCurrency(Math.abs(balanceDifference))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-card p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
                <p className="text-lg font-semibold">{formatCurrency(totalBudgeted)}</p>
              </div>
              <div className="bg-gradient-card p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-lg font-semibold">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-gradient-card p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Over Budget</p>
                <p className={`text-lg font-semibold ${overBudgetCount > 0 ? 'text-danger' : 'text-success'}`}>
                  {overBudgetCount} categories
                </p>
              </div>
            </div>

            {/* Spending Chart */}
            {spendingData.length > 0 && (
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
            )}

            {/* Individual Budget Progress */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Current Budgets</h4>
              {budgetPeriods.map((budgetPeriod) => {
                const progressPercentage = getProgressPercentage(budgetPeriod.spent_amount, budgetPeriod.budgeted_amount);
                const remaining = budgetPeriod.budgeted_amount - budgetPeriod.spent_amount;
                
                return (
                  <div
                    key={budgetPeriod.id}
                    className="p-4 rounded-lg bg-card-subtle space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{budgetPeriod.budget.category?.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{budgetPeriod.budget.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {budgetPeriod.budget.category?.name} • {budgetPeriod.budget.period}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBudget(budgetPeriod.budget);
                            setShowEditDialog(true);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {getStatusBadge(budgetPeriod.spent_amount, budgetPeriod.budgeted_amount, budgetPeriod.budget.alert_threshold)}
                        {progressPercentage >= budgetPeriod.budget.alert_threshold && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress value={progressPercentage} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className={getStatusColor(budgetPeriod.spent_amount, budgetPeriod.budgeted_amount, budgetPeriod.budget.alert_threshold)}>
                          Spent: {formatCurrency(budgetPeriod.spent_amount)}
                        </span>
                        <span className="text-muted-foreground">
                          Budget: {formatCurrency(budgetPeriod.budgeted_amount)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over budget`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
      
      <EditBudgetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        budget={editingBudget}
        onBudgetUpdated={() => {
          fetchBudgetPeriods();
        }}
      />
    </Card>
  );
};