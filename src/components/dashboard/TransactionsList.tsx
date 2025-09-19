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
    <Card className="bg-gradient-card shadow-elevated border-border/50">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">Latest financial transactions</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">
            View All
          </Button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-muted/30 rounded-2xl flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-semibold mb-2">No transactions yet</h4>
            <p className="text-muted-foreground mb-6">Start by adding your first financial transaction</p>
            <Button className="bg-gradient-primary shadow-primary">
              Add Transaction
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const IconComponent = getIcon(transaction.category?.icon);
              
              return (
                <div key={transaction.id} className="group p-4 rounded-xl border border-border/50 bg-gradient-subtle hover:shadow-card transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${
                        transaction.type === 'income' 
                          ? 'bg-success/10 border-2 border-success/20' 
                          : 'bg-muted/50 border-2 border-border/50'
                      }`}>
                        <IconComponent className={`h-5 w-5 ${
                          transaction.type === 'income' ? 'text-success' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-base">{transaction.description}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{formatDate(transaction.transaction_date)}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-muted-foreground/50 rounded-full"></div>
                            <span>{transaction.account.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs bg-muted/50">
                            {transaction.category?.name || 'Uncategorized'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`text-right ${
                        transaction.amount > 0 ? 'text-success' : 'text-foreground'
                      }`}>
                        <div className="text-lg font-bold">
                          {transaction.amount > 0 ? '+' : ''}₪{Math.abs(transaction.amount).toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          {transaction.type}
                        </div>
                      </div>
                      <div className={`p-2 rounded-full ${
                        transaction.amount > 0 ? 'bg-success/10' : 'bg-muted/50'
                      }`}>
                        {transaction.amount > 0 ? (
                          <ArrowDownLeft className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};