import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { transactionSchema } from '@/lib/validation';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded: () => void;
}

export const AddTransactionDialog = ({ open, onOpenChange, onTransactionAdded }: AddTransactionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionType, setTransactionType] = useState('expense');
  const [recurring, setRecurring] = useState('no');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Category fetch error:', error);
      toast({
        title: "Error",
        description: `Failed to load categories: ${error.message}`,
        variant: "destructive",
      });
      return;
    }
    
    console.log('Fetched categories:', data);
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const notes = formData.get('notes') as string;
    const categoryId = formData.get('category') as string;
    const type = formData.get('type') as string;
    const transactionDate = formData.get('date') as string;
    const recurring = formData.get('recurring') as string;
    const recurringEnd = formData.get('recurringEnd') as string;

    // Validate input
    const validation = transactionSchema.safeParse({
      amount,
      description,
      notes: notes || undefined,
      type,
      date: transactionDate,
      categoryId: categoryId || undefined,
      recurring: recurring as any,
      recurringEnd,
    });

    if (!validation.success) {
      const errorMessage = validation.error.errors.map(err => err.message).join(', ');
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get or create main account using the new function
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_account_balances', { user_id_param: user.user.id });

      if (balanceError) throw balanceError;

      const mainAccountId = balanceData?.[0]?.main_account_id;
      if (!mainAccountId) throw new Error('Failed to create main account');

      // Insert transaction (balance will be updated automatically by trigger)
      const { error } = await supabase
        .from('transactions')
        .insert([{
          amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
          description,
          notes: notes || null,
          category_id: categoryId || null,
          account_id: mainAccountId,
          type,
          transaction_date: transactionDate,
          user_id: user.user.id,
          is_recurring: recurring !== 'no',
        }]);

      // If recurring, also create recurring transaction
      if (recurring !== 'no' && !error) {
        const nextDueDate = new Date(transactionDate);
        switch (recurring) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case 'weekly':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'biweekly':
            nextDueDate.setDate(nextDueDate.getDate() + 14);
            break;
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
        }

        await supabase
          .from('recurring_transactions')
          .insert([{
            description,
            name: description,
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            type,
            frequency: recurring,
            next_due_date: nextDueDate.toISOString().split('T')[0],
            account_id: mainAccountId,
            category_id: categoryId || null,
            user_id: user.user.id,
          }]);
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      
      // Trigger balance and transaction refresh
      window.dispatchEvent(new CustomEvent('refreshBalances'));
      window.dispatchEvent(new CustomEvent('refreshTransactions'));
      
      onTransactionAdded();
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();

    } catch (error: any) {
      console.error('Transaction error:', error);
      const errorMessage = error?.message || 'Failed to add transaction';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Transaction</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" value={transactionType} onValueChange={setTransactionType} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              max="1000000000"
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="What was this for?"
              maxLength={500}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select name="category">
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      {category.icon} {category.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes"
              maxLength={1000}
              rows={2}
            />
          </div>

          {/* Recurring options for expense/income */}
          <div className="space-y-2">
            <Label htmlFor="recurring">Make Recurring</Label>
            <Select name="recurring" value={recurring} onValueChange={setRecurring}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurring !== 'no' && (
            <div className="space-y-2">
              <Label htmlFor="recurringEnd">Recurring End Date</Label>
              <Input
                id="recurringEnd"
                name="recurringEnd"
                type="date"
                placeholder="Leave empty for endless"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? 'Adding...' : 'Add Transaction'}
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