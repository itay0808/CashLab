import { useState } from 'react';
import * as React from 'react';
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
  const [transferType, setTransferType] = useState<'to_savings' | 'from_savings'>(() => {
    // Set default to the direction that has sufficient funds, or 'to_savings' if both are insufficient
    if (mainBalance >= 1) return 'to_savings';
    if (savingsBalance >= 1) return 'from_savings';
    return 'to_savings';
  });
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Define which transfer directions are available (minimum 1 ILS required)
  const canTransferToSavings = mainBalance >= 1;
  const canTransferFromSavings = savingsBalance >= 1;

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

    // Strict validation: Check if source account has minimum 1 ILS and amount doesn't exceed balance
    const sourceBalance = transferType === 'to_savings' ? mainBalance : savingsBalance;
    
    if (sourceBalance < 1) {
      toast({
        title: "Error",
        description: "Source account must have at least ₪1 to transfer",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (transferAmount > sourceBalance) {
      toast({
        title: "Error",
        description: `Cannot transfer ₪${transferAmount.toLocaleString('he-IL')}. Maximum available: ₪${sourceBalance.toLocaleString('he-IL')}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Call the transfer function
      const { error } = await supabase.rpc('process_savings_transfer', {
        user_id_param: user.user.id,
        amount_param: transferAmount,
        transfer_type_param: transferType,
        description_param: description || null
      });

      if (error) {
        console.error('Transfer error:', error);
        throw error;
      }

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
      
      // Trigger refresh events for balance and transactions
      window.dispatchEvent(new CustomEvent('refreshBalances'));
      window.dispatchEvent(new CustomEvent('refreshTransactions'));
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
  const currentSourceBalance = transferType === 'to_savings' ? mainBalance : savingsBalance;
  const canCurrentlyTransfer = currentSourceBalance >= 1;

  // Reset transfer type if current selection becomes invalid
  React.useEffect(() => {
    if (transferType === 'to_savings' && !canTransferToSavings && canTransferFromSavings) {
      setTransferType('from_savings');
    } else if (transferType === 'from_savings' && !canTransferFromSavings && canTransferToSavings) {
      setTransferType('to_savings');
    }
  }, [transferType, canTransferToSavings, canTransferFromSavings]);

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
              onValueChange={(value: 'to_savings' | 'from_savings') => {
                setTransferType(value);
                setAmount(''); // Reset amount when direction changes
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                <SelectItem 
                  value="to_savings" 
                  disabled={!canTransferToSavings}
                  className={!canTransferToSavings ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Main → Savings</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (₪{mainBalance.toLocaleString('he-IL')})
                      {!canTransferToSavings && " - Insufficient funds"}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem 
                  value="from_savings"
                  disabled={!canTransferFromSavings}
                  className={!canTransferFromSavings ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Savings → Main</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (₪{savingsBalance.toLocaleString('he-IL')})
                      {!canTransferFromSavings && " - Insufficient funds"}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {!canTransferToSavings && !canTransferFromSavings && (
              <p className="text-xs text-destructive">
                ⚠️ Both accounts need at least ₪1 to enable transfers
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={Math.max(0, maxAmount)}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!canCurrentlyTransfer}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₪
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Available to transfer: ₪{Math.max(0, maxAmount).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              {!canCurrentlyTransfer && (
                <p className="text-xs text-destructive">
                  ⚠️ Selected account needs at least ₪1 to transfer
                </p>
              )}
              {maxAmount > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount((maxAmount * 0.25).toFixed(2))}
                    disabled={!canCurrentlyTransfer}
                    className="text-xs h-6"
                  >
                    25%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount((maxAmount * 0.5).toFixed(2))}
                    disabled={!canCurrentlyTransfer}
                    className="text-xs h-6"
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(maxAmount.toFixed(2))}
                    disabled={!canCurrentlyTransfer}
                    className="text-xs h-6"
                  >
                    Max
                  </Button>
                </div>
              )}
            </div>
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
            <Button 
              type="submit" 
              disabled={loading || !canCurrentlyTransfer || !amount || parseFloat(amount) <= 0} 
              size="lg"
            >
              {loading ? 'Processing...' : !canCurrentlyTransfer ? 'Insufficient Funds' : 'Transfer'}
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