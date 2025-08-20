import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Plus, Calendar, AlertTriangle, Play, Pause } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  next_due_date: string;
  type: string;
  is_active: boolean;
  notes?: string;
}

const Recurring = () => {
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRecurringTransactions();
    }
  }, [user]);

  const fetchRecurringTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load recurring transactions",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-green-100 text-green-800',
      biweekly: 'bg-yellow-100 text-yellow-800',
      monthly: 'bg-purple-100 text-purple-800',
      quarterly: 'bg-orange-100 text-orange-800',
      yearly: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge variant="secondary" className={colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {frequency}
      </Badge>
    );
  };

  const isUpcoming = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

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

  const activeTransactions = transactions.filter(t => t.is_active);
  const inactiveTransactions = transactions.filter(t => !t.is_active);
  const upcomingTransactions = activeTransactions.filter(t => isUpcoming(t.next_due_date));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Repeat className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Recurring Transactions</h1>
              <p className="text-muted-foreground">Manage your automatic income and expenses</p>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Recurring
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{activeTransactions.length}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-warning">{upcomingTransactions.length}</div>
              <div className="text-sm text-muted-foreground">Due Soon</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-success">
                ${activeTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Income</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-danger">
                ${activeTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Expenses</div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Transactions Alert */}
        {upcomingTransactions.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle className="text-warning">Upcoming Transactions</CardTitle>
              </div>
              <CardDescription>
                {upcomingTransactions.length} transaction{upcomingTransactions.length > 1 ? 's' : ''} due in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-2 bg-background rounded">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{transaction.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(transaction.next_due_date)}
                      </span>
                    </div>
                    <span className={`font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Active Recurring Transactions</CardTitle>
            <CardDescription>Your scheduled income and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : activeTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Repeat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No recurring transactions</h3>
                <p className="text-muted-foreground mb-4">
                  Set up automatic tracking for your regular income and expenses
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Recurring Transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'income' ? 'bg-success/10 text-success' : 'bg-muted'
                      }`}>
                        <Repeat className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{transaction.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Next: {formatDate(transaction.next_due_date)}
                          {getFrequencyBadge(transaction.frequency)}
                          {isUpcoming(transaction.next_due_date) && (
                            <Badge variant="outline" className="text-warning border-warning">
                              Due Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${
                        transaction.type === 'income' ? 'text-success' : 'text-foreground'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive Transactions */}
        {inactiveTransactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Paused Transactions</CardTitle>
              <CardDescription>Temporarily disabled recurring transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inactiveTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        <Repeat className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{transaction.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Paused • {getFrequencyBadge(transaction.frequency)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-muted-foreground">
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Recurring;