import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded: () => void;
}

export const AddTransactionDialog = ({ open, onOpenChange, onTransactionAdded }: AddTransactionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchAccounts();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
      return;
    }
    
    setCategories(data || []);
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
      return;
    }
    
    setAccounts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const notes = formData.get('notes') as string;
    const categoryId = formData.get('category') as string;
    const accountId = formData.get('account') as string;
    const type = formData.get('type') as string;
    const transactionDate = formData.get('date') as string;

    const { error } = await supabase
      .from('transactions')
      .insert([{
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        description,
        notes: notes || null,
        category_id: categoryId || null,
        account_id: accountId,
        type,
        transaction_date: transactionDate,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      onTransactionAdded();
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="expense" required>
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            <Select name="account" required>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
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
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};