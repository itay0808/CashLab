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
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Subscriptions</h3>
          <p className="text-sm text-muted-foreground">
            ₪{totalMonthly.toFixed(2)}/month • {subscriptions.length} active
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/10">
          <Plus className="h-4 w-4 mr-1" />
          Add New
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No active subscriptions found</p>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Subscription
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isExpiringSoon(sub.next_due_date) ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                  }`}>
                     {sub.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {sub.name}
                      {isExpiringSoon(sub.next_due_date) && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Next: {formatDate(sub.next_due_date)}
                       <Badge variant="outline" className="text-xs">
                         Subscription
                       </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold">₪{sub.amount}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-danger"
                    onClick={() => handleDeleteSubscription(sub.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {expiringSoonCount > 0 && (
            <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="font-medium text-warning">
                  {expiringSoonCount} subscription{expiringSoonCount > 1 ? 's' : ''} due soon
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};