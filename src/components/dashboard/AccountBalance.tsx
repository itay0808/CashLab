import { Card } from "@/components/ui/card";
import { Eye, EyeOff, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const AccountBalance = () => {
  const [showBalance, setShowBalance] = useState(true);
  
  const accounts = [
    { name: "Checking", balance: 2847.92, change: 156.23, type: "up" },
    { name: "Savings", balance: 12453.87, change: 234.56, type: "up" },
    { name: "Credit Card", balance: -892.45, change: -45.67, type: "down" },
  ];
  
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  return (
    <Card className="p-6 bg-gradient-primary text-white shadow-primary">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-white/80">Total Balance</h3>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">
              {showBalance ? `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "••••••"}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowBalance(!showBalance)}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-white/80">
            <TrendingUp className="h-4 w-4" />
            +2.3% this month
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((account, index) => (
          <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">{account.name}</span>
              {account.type === "up" ? (
                <TrendingUp className="h-3 w-3 text-success-light" />
              ) : (
                <TrendingDown className="h-3 w-3 text-danger" />
              )}
            </div>
            <div className="mt-2">
              <div className="text-lg font-semibold">
                ${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                {account.balance < 0 && <span className="text-xs ml-1">owed</span>}
              </div>
              <div className={`text-xs ${account.type === "up" ? "text-success-light" : "text-danger"}`}>
                {account.type === "up" ? "+" : ""}${account.change.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};