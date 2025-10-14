import { Card } from "@/components/ui/card";
import { Wallet, PiggyBank } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainAccount {
  id: string;
  name: string;
  balance: number;
  type: string;
  currency: string;
}

interface SavingsAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

export const AccountBalance = () => {
  
  const [mainAccount, setMainAccount] = useState<MainAccount | null>(null);
  const [savingsAccount, setSavingsAccount] = useState<SavingsAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (user) {
      fetchAccountData();
    }
  }, [user]);

  // Function to refresh balances (can be called from outside)
  const refreshBalances = () => {
    fetchAccountData();
  };

  // Listen for balance updates
  useEffect(() => {
    const handleRefresh = () => refreshBalances();
    window.addEventListener('refreshBalances', handleRefresh);
    return () => window.removeEventListener('refreshBalances', handleRefresh);
  }, []);

  const fetchAccountData = async () => {
    try {
      if (!user?.id) return;

      // Use the new database function to get accurate balances
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_account_balances', { user_id_param: user.id });

      if (balanceError) throw balanceError;

      if (balanceData && balanceData.length > 0) {
        const { main_account_id, main_balance, savings_account_id, savings_balance } = balanceData[0];
        
        // Set main account with correct balance
        setMainAccount({
          id: main_account_id,
          name: 'Main Account',
          balance: main_balance,
          type: 'checking',
          currency: 'ILS'
        });

        // Set savings account with correct balance
        setSavingsAccount({
          id: savings_account_id,
          name: 'Savings Account',
          balance: savings_balance,
          currency: 'ILS'
        });
      } else {
        // If no data returned, accounts will be created on next call
        setMainAccount(null);
        setSavingsAccount(null);
        
        // Try again to create accounts
        setTimeout(() => {
          fetchAccountData();
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
      toast({
        title: "Error",
        description: "Failed to load account data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="p-4 sm:p-6 bg-gradient-primary text-white shadow-primary">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="h-6 sm:h-8 bg-white/20 rounded w-1/2 mb-4 sm:mb-6"></div>
          <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-2 gap-4'}`}>
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                <div className="h-3 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const totalBalance = (mainAccount?.balance || 0) + (savingsAccount?.balance || 0);
  
  return (
    <>
      <Card className="relative overflow-hidden bg-gradient-primary text-primary-foreground shadow-primary border-0">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-primary-light rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-success-light rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative p-4 sm:p-6">
          <div className="mb-6 sm:mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary-foreground/70">
                <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                <span className="text-xs sm:text-sm font-medium uppercase tracking-wide">Total Balance</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className={`${isMobile ? 'text-2xl' : 'text-4xl md:text-5xl'} font-bold tracking-tight`}>
                  ₪{totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
          
          <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-2 gap-4'}`}>
            {/* Main Account */}
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-primary-foreground/20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-primary-foreground/90">Main Account</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-primary-foreground`}>
                  ₪{(mainAccount?.balance || 0).toLocaleString('he-IL', { minimumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-primary-foreground/60 capitalize font-medium">
                  Checking • ILS
                </div>
              </div>
            </div>

            {/* Savings Account */}
            <div className="bg-success/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-success/20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-success/20 rounded-full flex items-center justify-center">
                    <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-primary-foreground/90">Savings Account</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-primary-foreground`}>
                  ₪{(savingsAccount?.balance || 0).toLocaleString('he-IL', { minimumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-primary-foreground/60 capitalize font-medium">
                  Savings • ILS
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};