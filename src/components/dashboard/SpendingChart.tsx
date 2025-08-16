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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Budget Summary
            </CardTitle>
            <CardDescription>Your monthly spending vs budget</CardDescription>
          </div>
          {(budgetSummary.alertCount > 0 || budgetSummary.overBudgetCount > 0) && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                {budgetSummary.alertCount + budgetSummary.overBudgetCount} alerts
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className={`text-lg font-bold ${
                overallPercentage >= 100 ? 'text-danger' : 
                overallPercentage >= 80 ? 'text-warning' : 'text-success'
              }`}>
                {overallPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(overallPercentage, 100)} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Spent: {formatCurrency(budgetSummary.totalSpent)}
              </span>
              <span className="text-muted-foreground">
                Budget: {formatCurrency(budgetSummary.totalBudgeted)}
              </span>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-card rounded-lg">
              <div className={`text-lg font-bold ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(Math.abs(remaining))}
              </div>
              <p className="text-sm text-muted-foreground">
                {remaining >= 0 ? 'Remaining' : 'Over Budget'}
              </p>
            </div>
            <div className="p-4 bg-gradient-card rounded-lg">
              <div className="text-lg font-bold flex items-center gap-2">
                <span>{budgetSummary.topCategoryIcon}</span>
                {formatCurrency(budgetSummary.topCategorySpending)}
              </div>
              <p className="text-sm text-muted-foreground">
                Top: {budgetSummary.topCategory}
              </p>
            </div>
          </div>

          {/* Alerts Summary */}
          {(budgetSummary.alertCount > 0 || budgetSummary.overBudgetCount > 0) && (
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Budget Alerts</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {budgetSummary.overBudgetCount > 0 && (
                  <p>• {budgetSummary.overBudgetCount} budget{budgetSummary.overBudgetCount > 1 ? 's' : ''} exceeded</p>
                )}
                {budgetSummary.alertCount > 0 && (
                  <p>• {budgetSummary.alertCount} budget{budgetSummary.alertCount > 1 ? 's' : ''} approaching limit</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};