import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, X, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ProcessRecurringButton } from "./ProcessRecurringButton";

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  next_due_date: string;
  frequency: string;
  is_active: boolean;
  type: string;
  category?: {
    name: string;
    icon: string;
  };
}

export const RecurringTransactionsList = () => {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
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
        .select(`
          id,
          name,
          amount,
          next_due_date,
          frequency,
          is_active,
          type
        `)
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      setRecurringTransactions(data || []);
    } catch (error) {
      console.error('Recurring transactions error:', error);
      toast({
        title: "Error",
        description: "Failed to load recurring transactions",
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

  const handleDeleteRecurring = async (id: string) => {
    try {
      // First mark as inactive to stop future processing
      const { error: updateError } = await supabase
        .from('recurring_transactions')
        .update({ is_active: false })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Recurring transaction cancelled successfully",
      });
      
      fetchRecurringTransactions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel recurring transaction",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
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
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Recurring Transactions</h3>
            <p className="text-sm text-muted-foreground">Automatic payments and income</p>
          </div>
        </div>
        <ProcessRecurringButton />
      </div>
      
      {recurringTransactions.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No recurring transactions found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create a transaction with recurring enabled to see it here
          </p>
        </Card>
      ) : (
        recurringTransactions.map((transaction) => (
          <Card key={transaction.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  transaction.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {transaction.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {transaction.name}
                    <Badge variant="outline" className="text-xs">
                      {transaction.frequency}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Next: {formatDate(transaction.next_due_date)}
                    <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'} className="text-xs">
                      {transaction.type}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`font-semibold ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                  {transaction.type === 'expense' ? '-' : '+'}₪{transaction.amount}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-danger"
                  onClick={() => handleDeleteRecurring(transaction.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};