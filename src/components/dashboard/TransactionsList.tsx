import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, Coffee, Car, Home, ShoppingBag, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  type: string;
  account: {
    name: string;
  };
  category?: {
    name: string;
    icon: string;
  };
}

const iconMap: { [key: string]: any } = {
  coffee: Coffee,
  car: Car,
  home: Home,
  shopping: ShoppingBag,
  default: DollarSign,
};

export const TransactionsList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          transaction_date,
          type,
          account:accounts(name),
          category:categories(name, icon)
        `)
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load transactions",
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

  const getIcon = (iconName?: string) => {
    if (!iconName) return iconMap.default;
    return iconMap[iconName] || iconMap.default;
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
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          View All
        </Button>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No transactions found. Add your first transaction to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const IconComponent = getIcon(transaction.category?.icon);
            
            return (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'income' ? 'bg-success/10' : 'bg-muted'
                  }`}>
                    <IconComponent className={`h-4 w-4 ${
                      transaction.type === 'income' ? 'text-success' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      {formatDate(transaction.transaction_date)}
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category?.name || 'Uncategorized'}
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
      )}
    </Card>
  );
};