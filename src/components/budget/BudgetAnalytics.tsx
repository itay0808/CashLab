import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchSpendingAnalytics();
  }, [refreshTrigger]);

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
        category: period.budget?.category?.name || 'Unknown',
        budgeted: period.budgeted_amount,
        spent: period.spent_amount,
        icon: period.budget?.category?.icon || '📊',
        alertThreshold: period.budget?.alert_threshold || 80,
      }));

      setSpendingData(analytics);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load budget analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBarColor = (spent: number, budgeted: number, alertThreshold: number) => {
    const percentage = (spent / budgeted) * 100;
    if (percentage >= 100) return '#ef4444'; // red-500
    if (percentage >= alertThreshold) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  const totalBudgeted = spendingData.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = spendingData.reduce((sum, item) => sum + item.spent, 0);
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  if (loading) {
    return (
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Budget vs Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Budget vs Spending
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {currentMonth}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${
              overallPercentage >= 100 ? 'text-danger' : 
              overallPercentage >= 80 ? 'text-warning' : 'text-success'
            }`}>
              {overallPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">of budget used</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {spendingData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No budget data available. Create some budgets to see analytics.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}
                </span>
              </div>
              <Progress 
                value={Math.min(overallPercentage, 100)} 
                className="h-3" 
              />
              {overallPercentage >= 80 && (
                <div className="flex items-center gap-2 text-sm text-warning">
                  <AlertCircle className="h-4 w-4" />
                  <span>High spending detected across budgets</span>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                  <Bar dataKey="budgeted" fill="#e5e7eb" name="Budgeted" />
                  <Bar dataKey="spent" name="Spent">
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

            {/* Category Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Category Details</h4>
              {spendingData.map((item, index) => {
                const percentage = (item.spent / item.budgeted) * 100;
                const remaining = item.budgeted - item.spent;
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card-subtle">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{item.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.spent)} of {formatCurrency(item.budgeted)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="text-xs">
                        {percentage >= 100 ? (
                          <Badge variant="destructive" className="text-xs">
                            {formatCurrency(Math.abs(remaining))} over
                          </Badge>
                        ) : percentage >= item.alertThreshold ? (
                          <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                            {formatCurrency(remaining)} left
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                            {formatCurrency(remaining)} left
                          </Badge>
                        )}
                      </div>
                      <div className={`font-semibold text-sm ${
                        percentage >= 100 ? 'text-danger' : 
                        percentage >= item.alertThreshold ? 'text-warning' : 'text-success'
                      }`}>
                        {percentage.toFixed(0)}%
                      </div>
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