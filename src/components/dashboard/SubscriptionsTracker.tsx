import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  next_due_date: string;
  frequency: string;
  is_active: boolean;
  category?: {
    name: string;
    icon: string;
  };
}

export const SubscriptionsTracker = () => {
  const [subscriptions, setSubscriptions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    console.log('Fetching subscriptions...');
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
          id,
          name,
          amount,
          next_due_date,
          frequency,
          is_active
        `)
        .eq('is_active', true)
        .eq('type', 'expense')
        .order('next_due_date', { ascending: true })
        .limit(4);

      console.log('Subscriptions query result:', { data, error });
      if (error) throw error;
      console.log('Setting subscriptions:', data);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Subscriptions error:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isExpiringSoon = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    // Convert all amounts to monthly equivalent
    const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : 
                         sub.frequency === 'quarterly' ? sub.amount / 3 :
                         sub.frequency === 'weekly' ? sub.amount * 4 : 
                         sub.amount;
    return sum + monthlyAmount;
  }, 0);

  const expiringSoonCount = subscriptions.filter(sub => isExpiringSoon(sub.next_due_date)).length;

  const handleDeleteSubscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription cancelled successfully",
      });
      
      fetchSubscriptions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-card shadow-card">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div>
                    <div className="h-3 bg-muted rounded w-20 mb-1"></div>
                    <div className="h-2 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-muted rounded w-12"></div>
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
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Active Subscriptions</h3>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="font-semibold text-success">₪{totalMonthly.toFixed(0)}</span>
                <span className="text-muted-foreground">monthly</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>{subscriptions.length} active</span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
            onClick={() => window.location.href = '/transactions'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-2xl flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-semibold text-lg mb-2">No subscriptions yet</h4>
            <p className="text-muted-foreground mb-6">Track recurring payments to better manage your budget</p>
            <Button 
              onClick={() => window.location.href = '/transactions'}
              className="bg-gradient-primary shadow-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Subscription
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="group p-4 rounded-xl border border-border/50 bg-gradient-subtle hover:shadow-card transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                      isExpiringSoon(sub.next_due_date) 
                        ? 'bg-warning/10 text-warning border-2 border-warning/20' 
                        : 'bg-primary/10 text-primary border-2 border-primary/20'
                    }`}>
                      {sub.name.charAt(0).toUpperCase()}
                      {isExpiringSoon(sub.next_due_date) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-base">{sub.name}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due {formatDate(sub.next_due_date)}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-muted/50">
                          {sub.frequency}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold">₪{sub.amount}</div>
                      <div className="text-xs text-muted-foreground">per {sub.frequency.slice(0, -2)}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all"
                      onClick={() => handleDeleteSubscription(sub.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {expiringSoonCount > 0 && (
              <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-warning/20 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <div className="font-medium text-warning">
                      {expiringSoonCount} subscription{expiringSoonCount > 1 ? 's' : ''} due within 7 days
                    </div>
                    <div className="text-sm text-muted-foreground">Review and prepare for upcoming payments</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};