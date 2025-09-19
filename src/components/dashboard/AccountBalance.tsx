import { Card } from "@/components/ui/card";
import { Eye, EyeOff, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Account {
  id: string;
  name: string;
  balance: number;
  type: string;
  currency: string;
}

export const AccountBalance = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="p-6 bg-gradient-primary text-white shadow-primary">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-white/20 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="h-3 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  return (
    <Card className="relative overflow-hidden bg-gradient-primary text-primary-foreground shadow-primary border-0">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-light rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-success-light rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
              <span className="text-sm font-medium uppercase tracking-wide">Total Balance</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-4xl md:text-5xl font-bold tracking-tight">
                {showBalance ? `₪${totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "••••••••"}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowBalance(!showBalance)}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
              >
                {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">{accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}</span>
            </div>
          </div>
        </div>
        
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-primary-foreground/60" />
            </div>
            <p className="text-primary-foreground/80 text-lg mb-2">No accounts connected</p>
            <p className="text-primary-foreground/60">Add your first account to start tracking</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.slice(0, 3).map((account) => (
              <div key={account.id} className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-5 border border-primary-foreground/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                      {account.balance >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success-light" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-danger" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-primary-foreground/90">{account.name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-bold text-primary-foreground">
                    {showBalance ? `₪${Math.abs(account.balance).toLocaleString('he-IL', { minimumFractionDigits: 0 })}` : "••••••"}
                    {account.balance < 0 && <span className="text-sm ml-1 text-danger">debt</span>}
                  </div>
                  <div className="text-xs text-primary-foreground/60 capitalize font-medium">
                    {account.type.replace('_', ' ')} • {account.currency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};