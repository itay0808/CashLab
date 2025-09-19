import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SavingsTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferCompleted: () => void;
  mainBalance: number;
  savingsBalance: number;
}

export const SavingsTransferDialog = ({ 
  open, 
  onOpenChange, 
  onTransferCompleted,
  mainBalance,
  savingsBalance 
}: SavingsTransferDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [transferType, setTransferType] = useState<'to_savings' | 'from_savings'>('to_savings');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const transferAmount = parseFloat(amount);
    
    if (transferAmount <= 0) {
      toast({
        title: "Error",
        description: "Transfer amount must be positive",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check sufficient funds
    if (transferType === 'to_savings' && transferAmount > mainBalance) {
      toast({
        title: "Error",
        description: "Insufficient funds in main account",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (transferType === 'from_savings' && transferAmount > savingsBalance) {
      toast({
        title: "Error",
        description: "Insufficient funds in savings account",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('process_savings_transfer', {
        user_id_param: user.user.id,
        amount_param: transferAmount,
        transfer_type_param: transferType,
        description_param: description || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Transfer completed successfully`,
      });

      // Log the transfer activity
      await supabase.rpc('log_financial_activity', {
        p_user_id: user.user.id,
        p_action_type: 'TRANSFER',
        p_entity_type: 'SAVINGS_TRANSFER',
        p_description: `${transferType === 'to_savings' ? 'Transfer to savings' : 'Transfer from savings'}: ₪${transferAmount}`,
        p_amount: transferType === 'to_savings' ? -transferAmount : transferAmount,
        p_metadata: {
          transfer_type: transferType,
          amount: transferAmount,
          description: description || null
        }
      });

      onTransferCompleted();
      onOpenChange(false);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: "Error",
        description: "Failed to complete transfer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const maxAmount = transferType === 'to_savings' ? mainBalance : savingsBalance;
  const canTransfer = maxAmount > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Transfer Funds
          </SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="transferType">Transfer Direction</Label>
            <Select 
              value={transferType} 
              onValueChange={(value: 'to_savings' | 'from_savings') => setTransferType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  value="to_savings" 
                  disabled={mainBalance <= 0}
                >
                  Main → Savings
                  {mainBalance <= 0 && <span className="text-muted-foreground ml-2">(No funds)</span>}
                </SelectItem>
                <SelectItem 
                  value="from_savings"
                  disabled={savingsBalance <= 0}
                >
                  Savings → Main
                  {savingsBalance <= 0 && <span className="text-muted-foreground ml-2">(No funds)</span>}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={maxAmount}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₪
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: ₪{maxAmount.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              {!canTransfer && <span className="text-destructive ml-2">• No funds available</span>}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What is this transfer for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" disabled={loading || !canTransfer} size="lg">
              {loading ? 'Processing...' : !canTransfer ? 'No Funds Available' : 'Transfer'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="lg">
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};