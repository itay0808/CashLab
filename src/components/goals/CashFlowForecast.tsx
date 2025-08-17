import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight, Calendar, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";

interface CashFlowData {
  month: string;
  projected_income: number;
  projected_expenses: number;
  projected_balance: number;
  actual_income?: number;
  actual_expenses?: number;
  actual_balance?: number;
}

interface MonthlyStats {
  income: number;
  expenses: number;
  balance: number;
}

export const CashFlowForecast = () => {
  const [forecastData, setForecastData] = useState<CashFlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      generateCashFlowForecast();
    }
  }, [user]);

  const generateCashFlowForecast = async () => {
    try {
      // Get current account balances
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("user_id", user?.id);

      if (accountsError) throw accountsError;

      const totalBalance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;
      setCurrentBalance(totalBalance);

      // Get historical transaction data for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("amount, type, transaction_date")
        .eq("user_id", user?.id)
        .gte("transaction_date", sixMonthsAgo.toISOString().split('T')[0]);

      if (transactionsError) throw transactionsError;

      // Calculate monthly averages from historical data
      const monthlyStats = calculateMonthlyAverages(transactions || []);

      // Generate forecast for next 6 months
      const forecast: CashFlowData[] = [];
      let runningBalance = totalBalance;

      for (let i = 0; i < 6; i++) {
        const forecastDate = addMonths(new Date(), i);
        const monthKey = format(forecastDate, "MMM yyyy");

        const projectedIncome = monthlyStats.income;
        const projectedExpenses = monthlyStats.expenses;
        const projectedNetFlow = projectedIncome - projectedExpenses;
        runningBalance += projectedNetFlow;

        forecast.push({
          month: monthKey,
          projected_income: projectedIncome,
          projected_expenses: projectedExpenses,
          projected_balance: runningBalance,
        });
      }

      setForecastData(forecast);
    } catch (error) {
      console.error("Error generating cash flow forecast:", error);
      toast({
        title: "Error",
        description: "Failed to generate cash flow forecast.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyAverages = (transactions: any[]): MonthlyStats => {
    const monthlyTotals: { [key: string]: { income: number; expenses: number } } = {};

    transactions.forEach((transaction) => {
      const monthKey = format(new Date(transaction.transaction_date), "yyyy-MM");
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
      }

      if (transaction.type === "income") {
        monthlyTotals[monthKey].income += Number(transaction.amount);
      } else if (transaction.type === "expense") {
        monthlyTotals[monthKey].expenses += Number(transaction.amount);
      }
    });

    const months = Object.keys(monthlyTotals);
    if (months.length === 0) {
      return { income: 0, expenses: 0, balance: 0 };
    }

    const avgIncome = months.reduce((sum, month) => sum + monthlyTotals[month].income, 0) / months.length;
    const avgExpenses = months.reduce((sum, month) => sum + monthlyTotals[month].expenses, 0) / months.length;

    return {
      income: avgIncome,
      expenses: avgExpenses,
      balance: avgIncome - avgExpenses,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  const avgMonthlyIncome = forecastData.reduce((sum, month) => sum + month.projected_income, 0) / forecastData.length;
  const avgMonthlyExpenses = forecastData.reduce((sum, month) => sum + month.projected_expenses, 0) / forecastData.length;
  const netCashFlow = avgMonthlyIncome - avgMonthlyExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Cash Flow Forecast</h2>
            <p className="text-muted-foreground">6-month projection based on your transaction history</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Current Balance</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(currentBalance)}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">Avg Monthly Income</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(avgMonthlyIncome)}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-muted-foreground">Avg Monthly Expenses</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(avgMonthlyExpenses)}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Net Cash Flow</span>
          </div>
          <div className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(netCashFlow)}
          </div>
          <Badge variant={netCashFlow >= 0 ? "default" : "destructive"} className="mt-2">
            {netCashFlow >= 0 ? "Positive" : "Negative"}
          </Badge>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">6-Month Cash Flow Projection</h3>
          <p className="text-sm text-muted-foreground">
            Based on your average income and expenses over the last 6 months
          </p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                ]}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="projected_income" name="projected_income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected_expenses" name="projected_expenses" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Line 
                type="monotone" 
                dataKey="projected_balance" 
                name="projected_balance"
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Monthly Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
        <div className="space-y-4">
          {forecastData.map((month, index) => (
            <div key={month.month} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{month.month}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-green-600">
                  +{formatCurrency(month.projected_income)}
                </div>
                <div className="text-red-600">
                  -{formatCurrency(month.projected_expenses)}
                </div>
                <div className="font-semibold">
                  Balance: {formatCurrency(month.projected_balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};