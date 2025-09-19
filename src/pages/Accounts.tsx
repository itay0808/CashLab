import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, Eye, EyeOff, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddAccountDialog } from "@/components/account/AddAccountDialog";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

const Accounts = () => {
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast({
        title: "Error",
        description: "Failed to load accounts.",
        variant: "destructive",
      });
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleAccountAdded = () => {
    fetchAccounts();
  };

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return 'bg-blue-100 text-blue-800';
      case 'savings':
        return 'bg-green-100 text-green-800';
      case 'credit':
        return 'bg-red-100 text-red-800';
      case 'investment':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-primary">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-success-light rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-primary-light rounded-full blur-2xl"></div>
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Financial Accounts</h1>
              <p className="text-primary-foreground/80">Manage and monitor all your financial accounts</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBalances(!showBalances)}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
              >
                {showBalances ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showBalances ? 'Hide' : 'Show'}
              </Button>
              <Button 
                onClick={() => setShowAddAccount(true)} 
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-elevated"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>
        </div>

        {/* Total Balance Overview */}
        <Card className="bg-gradient-card shadow-elevated border-border/50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Portfolio Overview</h3>
                  <p className="text-muted-foreground">Total across all accounts</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 md:col-span-2">
                <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                  {showBalances ? `₪${totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '••••••••'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Across {accounts.length} active {accounts.length !== 1 ? 'accounts' : 'account'}</span>
                  <div className="w-1 h-1 bg-muted-foreground/50 rounded-full"></div>
                  <span>ILS Currency</span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center p-4 bg-gradient-subtle rounded-xl border border-border/50">
                  <div className="text-2xl font-bold text-success mb-1">+12.5%</div>
                  <div className="text-sm text-muted-foreground">This month</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Accounts Grid */}
        {accountsLoading ? (
          <Card className="bg-gradient-card shadow-elevated">
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/4 mx-auto"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-muted rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="bg-gradient-card shadow-elevated">
            <div className="p-16 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-muted/30 rounded-2xl flex items-center justify-center">
                <CreditCard className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Start Your Financial Journey</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Connect your first account to begin tracking your finances and building wealth.
              </p>
              <Button onClick={() => setShowAddAccount(true)} className="bg-gradient-primary shadow-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Account
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="group bg-gradient-card shadow-elevated border-border/50 hover:shadow-primary/20 transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">{account.name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`mt-1 capitalize ${getAccountTypeColor(account.type)}`}
                        >
                          {account.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                      <p className="text-3xl font-bold">
                        {showBalances 
                          ? `₪${Number(account.balance).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
                          : '••••••••'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.currency} • Updated today
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-3">
                        Added {new Date(account.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit className="h-3 w-3 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-danger hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AddAccountDialog
        open={showAddAccount}
        onOpenChange={setShowAddAccount}
        onAccountAdded={handleAccountAdded}
      />
    </div>
  );
};

export default Accounts;