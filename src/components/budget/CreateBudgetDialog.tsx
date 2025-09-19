import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBudgetCreated: () => void;
}

export const CreateBudgetDialog = ({ open, onOpenChange, onBudgetCreated }: CreateBudgetDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alertThreshold, setAlertThreshold] = useState([80]);
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
      .select('id, name, icon')
      .eq('is_system', true)
      .neq('name', 'Income')
      .neq('name', 'Salary')
      .neq('name', 'Freelance')
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

  const getDateRange = (period: string, startDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(startDate);
    
    switch (period) {
      case 'weekly':
        end.setDate(start.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(start.getMonth() + 1);
        break;
      case 'yearly':
        end.setFullYear(start.getFullYear() + 1);
        break;
    }
    
    return { start, end };
  };

  const createBudgetPeriod = async (budgetId: string, period: string, amount: number, startDate: Date) => {
    const { start, end } = getDateRange(period, startDate);
    
    const { error } = await supabase
      .from('budget_periods')
      .insert({
        budget_id: budgetId,
        period_start: start.toISOString().split('T')[0],
        period_end: end.toISOString().split('T')[0],
        budgeted_amount: amount,
        is_current: true,
      });

    return { error };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const categoryId = formData.get('category') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const period = formData.get('period') as string;
    const startDate = new Date(formData.get('startDate') as string);

    try {
      // Create the budget
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          name,
          category_id: categoryId,
          amount,
          period,
          start_date: startDate.toISOString().split('T')[0],
          end_date: '2099-12-31', // Far future date for ongoing budgets
          alert_threshold: alertThreshold[0],
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Create the first budget period
      const { error: periodError } = await createBudgetPeriod(budget.id, period, amount, startDate);
      
      if (periodError) throw periodError;

      toast({
        title: "Success",
        description: "Budget created successfully",
      });
      
      onBudgetCreated();
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();
      setAlertThreshold([80]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create budget",
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
          <SheetTitle>Create Budget</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Budget Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Monthly Groceries"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select name="category" required>
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
            <Label htmlFor="amount">Budget Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="500.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Budget Period</Label>
            <Select name="period" defaultValue="monthly" required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Alert Threshold: {alertThreshold[0]}%</Label>
            <Slider
              value={alertThreshold}
              onValueChange={setAlertThreshold}
              max={100}
              min={50}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Get notified when you've spent this percentage of your budget
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? 'Creating...' : 'Create Budget'}
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