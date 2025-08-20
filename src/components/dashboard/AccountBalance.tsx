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
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </div>
        </div>
      </div>
      
      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/80 mb-4">No accounts found. Add your first account to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">{account.name}</span>
                {account.balance >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success-light" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-danger" />
                )}
              </div>
              <div className="mt-2">
                <div className="text-lg font-semibold">
                  {showBalance ? `$${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "••••"}
                  {account.balance < 0 && <span className="text-xs ml-1">owed</span>}
                </div>
                <div className="text-xs text-white/60 capitalize">
                  {account.type.replace('_', ' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};