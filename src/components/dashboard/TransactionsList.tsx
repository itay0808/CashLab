import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, Coffee, Car, Home, ShoppingBag, MoreHorizontal } from "lucide-react";

const iconMap = {
  coffee: Coffee,
  car: Car,
  home: Home,
  shopping: ShoppingBag,
};

export const TransactionsList = () => {
  const transactions = [
    { 
      id: 1, 
      merchant: "Starbucks", 
      amount: -5.47, 
      date: "Today", 
      category: "Food & Drink",
      icon: "coffee",
      type: "expense"
    },
    { 
      id: 2, 
      merchant: "Payroll Deposit", 
      amount: 2847.23, 
      date: "Yesterday", 
      category: "Income",
      icon: "home",
      type: "income"
    },
    { 
      id: 3, 
      merchant: "Shell Gas Station", 
      amount: -42.18, 
      date: "Dec 15", 
      category: "Transportation",
      icon: "car",
      type: "expense"
    },
    { 
      id: 4, 
      merchant: "Amazon", 
      amount: -89.99, 
      date: "Dec 14", 
      category: "Shopping",
      icon: "shopping",
      type: "expense"
    },
    { 
      id: 5, 
      merchant: "Netflix", 
      amount: -15.99, 
      date: "Dec 14", 
      category: "Subscriptions",
      icon: "home",
      type: "subscription"
    },
  ];

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          View All
        </Button>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => {
          const IconComponent = iconMap[transaction.icon as keyof typeof iconMap];
          
          return (
            <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'income' ? 'bg-success/10' :
                  transaction.type === 'subscription' ? 'bg-warning/10' : 'bg-muted'
                }`}>
                  <IconComponent className={`h-4 w-4 ${
                    transaction.type === 'income' ? 'text-success' :
                    transaction.type === 'subscription' ? 'text-warning' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <div className="font-medium">{transaction.merchant}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {transaction.date}
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`text-right ${
                  transaction.amount > 0 ? 'text-success' : 'text-foreground'
                }`}>
                  <div className="font-semibold">
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </div>
                </div>
                {transaction.amount > 0 ? (
                  <ArrowDownLeft className="h-4 w-4 text-success" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};