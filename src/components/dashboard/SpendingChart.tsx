import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";

export const SpendingChart = () => {
  const monthlyData = [
    { month: "Oct", amount: 2450, change: -12 },
    { month: "Nov", amount: 2890, change: 18 },
    { month: "Dec", amount: 2340, change: -19 },
  ];

  const categories = [
    { name: "Food & Dining", amount: 420, percentage: 18, color: "bg-primary" },
    { name: "Shopping", amount: 380, percentage: 16, color: "bg-accent" },
    { name: "Transportation", amount: 290, percentage: 12, color: "bg-success" },
    { name: "Bills & Utilities", amount: 650, percentage: 28, color: "bg-warning" },
    { name: "Entertainment", amount: 180, percentage: 8, color: "bg-danger" },
    { name: "Other", amount: 420, percentage: 18, color: "bg-muted" },
  ];

  const currentMonth = monthlyData[monthlyData.length - 1];
  const maxAmount = Math.max(...monthlyData.map(d => d.amount));

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Monthly Spending</h3>
          <p className="text-sm text-muted-foreground">December overview</p>
        </div>
        <Badge variant={currentMonth.change < 0 ? "default" : "destructive"} className="flex items-center gap-1">
          {currentMonth.change < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <TrendingUp className="h-3 w-3" />
          )}
          {Math.abs(currentMonth.change)}%
        </Badge>
      </div>

      {/* Simple Bar Chart */}
      <div className="mb-6">
        <div className="flex items-end justify-between h-32 gap-4">
          {monthlyData.map((data, index) => (
            <div key={data.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-primary rounded-t-md relative"
                style={{ height: `${(data.amount / maxAmount) * 100}%` }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                  ${(data.amount / 1000).toFixed(1)}k
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">{data.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h4 className="font-medium mb-4">Spending by Category</h4>
        <div className="space-y-3">
          {categories.map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                <span className="text-sm">{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${category.color}`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  ${category.amount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};