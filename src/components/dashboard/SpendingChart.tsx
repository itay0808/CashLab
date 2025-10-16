import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  alertCount: number;
  overBudgetCount: number;
  topCategory: string;
  topCategoryIcon: string;
  topCategorySpending: number;
}

export const SpendingChart = () => {
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBudgetSummary();
  }, []);

  // Listen for transaction changes to refresh budget data
  useEffect(() => {
    const handleRefresh = () => fetchBudgetSummary();
    window.addEventListener('refreshTransactions', handleRefresh);
    window.addEventListener('refreshBalances', handleRefresh);
    return () => {
      window.removeEventListener('refreshTransactions', handleRefresh);
      window.removeEventListener('refreshBalances', handleRefresh);
    };
  }, []);

  const fetchBudgetSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select(`
          budgeted_amount,
          spent_amount,
          budget:budgets(
            alert_threshold,
            category:categories(name, icon)
          )
        `)
        .eq('is_current', true);

      if (error) throw error;

      if (!data || data.length === 0) {
        setBudgetSummary(null);
        return;
      }

      const totalBudgeted = data.reduce((sum, period) => sum + period.budgeted_amount, 0);
      const totalSpent = data.reduce((sum, period) => sum + period.spent_amount, 0);

      const alertCount = data.filter(period => {
        const percentage = (period.spent_amount / period.budgeted_amount) * 100;
        return percentage >= (period.budget?.alert_threshold || 80) && percentage < 100;
      }).length;

      const overBudgetCount = data.filter(period => 
        period.spent_amount >= period.budgeted_amount
      ).length;

      // Find category with highest spending
      const topSpending = data.reduce((max, period) => {
        return period.spent_amount > max.spent_amount ? period : max;
      }, data[0]);

      setBudgetSummary({
        totalBudgeted,
        totalSpent,
        alertCount,
        overBudgetCount,
        topCategory: topSpending.budget?.category?.name || 'Unknown',
        topCategoryIcon: topSpending.budget?.category?.icon || '📊',
        topCategorySpending: topSpending.spent_amount,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load budget summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Budget Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading budget data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!budgetSummary) {
    return (
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Budget Summary
          </CardTitle>
          <CardDescription>Your monthly spending vs budget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No active budgets</h3>
            <p className="text-muted-foreground">
              Create budgets to track your spending goals
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallPercentage = (budgetSummary.totalSpent / budgetSummary.totalBudgeted) * 100;
  const remaining = budgetSummary.totalBudgeted - budgetSummary.totalSpent;

  return (
    <Card className="bg-gradient-card shadow-elevated border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Budget Analytics
            </CardTitle>
            <CardDescription className="text-base">Monthly spending performance</CardDescription>
          </div>
          {(budgetSummary.alertCount > 0 || budgetSummary.overBudgetCount > 0) && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1 bg-warning/10 rounded-full border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {budgetSummary.alertCount + budgetSummary.overBudgetCount} alerts
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Progress Ring */}
        <div className="relative">
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={overallPercentage >= 100 ? "hsl(var(--danger))" : 
                         overallPercentage >= 80 ? "hsl(var(--warning))" : "hsl(var(--success))"}
                  strokeWidth="8"
                  strokeDasharray={`${Math.min(overallPercentage * 3.14, 314)} 314`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    overallPercentage >= 100 ? 'text-danger' : 
                    overallPercentage >= 80 ? 'text-warning' : 'text-success'
                  }`}>
                    {overallPercentage.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">Used</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between mt-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-foreground">{formatCurrency(budgetSummary.totalSpent)}</div>
              <div className="text-muted-foreground">Spent</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground">{formatCurrency(budgetSummary.totalBudgeted)}</div>
              <div className="text-muted-foreground">Budget</div>
            </div>
          </div>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-subtle rounded-xl border border-border/50">
            <div className={`text-xl font-bold mb-1 ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(Math.abs(remaining))}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {remaining >= 0 ? 'Available to spend' : 'Over budget'}
            </p>
          </div>
          <div className="p-4 bg-gradient-subtle rounded-xl border border-border/50">
            <div className="text-xl font-bold mb-1 flex items-center gap-2">
              <span className="text-lg">{budgetSummary.topCategoryIcon}</span>
              {formatCurrency(budgetSummary.topCategorySpending)}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Highest: {budgetSummary.topCategory}
            </p>
          </div>
        </div>

        {/* Alert Section */}
        {(budgetSummary.alertCount > 0 || budgetSummary.overBudgetCount > 0) && (
          <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-semibold text-warning">Budget Alerts</span>
            </div>
            <div className="space-y-2 text-sm">
              {budgetSummary.overBudgetCount > 0 && (
                <div className="flex items-center gap-2 text-danger">
                  <div className="w-2 h-2 bg-danger rounded-full"></div>
                  <span>{budgetSummary.overBudgetCount} budget{budgetSummary.overBudgetCount > 1 ? 's' : ''} exceeded limit</span>
                </div>
              )}
              {budgetSummary.alertCount > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <span>{budgetSummary.alertCount} budget{budgetSummary.alertCount > 1 ? 's' : ''} approaching threshold</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};