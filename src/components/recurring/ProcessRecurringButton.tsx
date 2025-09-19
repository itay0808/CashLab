import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ProcessRecurringButton = () => {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const processRecurringTransactions = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('process-recurring-transactions');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring transactions processed successfully",
      });

      // Trigger balance and transaction refresh
      window.dispatchEvent(new CustomEvent('refreshBalances'));
      window.dispatchEvent(new CustomEvent('refreshTransactions'));
      
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      toast({
        title: "Error",
        description: "Failed to process recurring transactions",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Button
      onClick={processRecurringTransactions}
      disabled={processing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
      {processing ? 'Processing...' : 'Process Due'}
    </Button>
  );
};