-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  alert_threshold DECIMAL(5,2) DEFAULT 80.0 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create budget_periods table for recurring budget periods
CREATE TABLE public.budget_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budgeted_amount DECIMAL(15,2) NOT NULL,
  spent_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure period_end is after period_start
  CONSTRAINT valid_period_range CHECK (period_end > period_start),
  -- Only one current period per budget
  UNIQUE(budget_id, is_current) DEFERRABLE INITIALLY DEFERRED
);

-- Create budget_transactions table to track which transactions count toward which budgets
CREATE TABLE public.budget_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_period_id UUID NOT NULL REFERENCES public.budget_periods(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate entries
  UNIQUE(budget_period_id, transaction_id)
);

-- Enable RLS on budget tables
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budgets
CREATE POLICY "Users can view their own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for budget_periods
CREATE POLICY "Users can view their budget periods" ON public.budget_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = budget_periods.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budget periods for their budgets" ON public.budget_periods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = budget_periods.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their budget periods" ON public.budget_periods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = budget_periods.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their budget periods" ON public.budget_periods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = budget_periods.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- RLS Policies for budget_transactions
CREATE POLICY "Users can view their budget transactions" ON public.budget_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budget_periods bp
      JOIN public.budgets b ON bp.budget_id = b.id
      WHERE bp.id = budget_transactions.budget_period_id 
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budget transactions for their budgets" ON public.budget_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_periods bp
      JOIN public.budgets b ON bp.budget_id = b.id
      WHERE bp.id = budget_transactions.budget_period_id 
      AND b.user_id = auth.uid()
    )
  );

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate budget spending
CREATE OR REPLACE FUNCTION public.update_budget_spending()
RETURNS TRIGGER AS $$
BEGIN
  -- Update spent_amount in budget_periods when transactions change
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.budget_periods 
    SET spent_amount = COALESCE((
      SELECT SUM(ABS(bt.amount))
      FROM public.budget_transactions bt
      WHERE bt.budget_period_id = NEW.budget_period_id
    ), 0)
    WHERE id = NEW.budget_period_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.budget_periods 
    SET spent_amount = COALESCE((
      SELECT SUM(ABS(bt.amount))
      FROM public.budget_transactions bt
      WHERE bt.budget_period_id = OLD.budget_period_id
    ), 0)
    WHERE id = OLD.budget_period_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update budget spending
CREATE TRIGGER update_budget_spending_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_spending();

-- Create function to automatically assign transactions to budgets
CREATE OR REPLACE FUNCTION public.assign_transaction_to_budgets()
RETURNS TRIGGER AS $$
DECLARE
  budget_period_record RECORD;
BEGIN
  -- Only process expense transactions
  IF NEW.type = 'expense' AND NEW.category_id IS NOT NULL THEN
    -- Find current budget periods that match this transaction's category and date
    FOR budget_period_record IN
      SELECT bp.id, bp.budgeted_amount
      FROM public.budget_periods bp
      JOIN public.budgets b ON bp.budget_id = b.id
      WHERE b.category_id = NEW.category_id
        AND b.user_id = NEW.user_id
        AND b.is_active = true
        AND bp.is_current = true
        AND NEW.transaction_date BETWEEN bp.period_start AND bp.period_end
    LOOP
      -- Insert into budget_transactions (ignore if already exists)
      INSERT INTO public.budget_transactions (budget_period_id, transaction_id, amount)
      VALUES (budget_period_record.id, NEW.id, ABS(NEW.amount))
      ON CONFLICT (budget_period_id, transaction_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically assign transactions to budgets
CREATE TRIGGER assign_transaction_to_budgets_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_transaction_to_budgets();

-- Create indexes for better performance
CREATE INDEX idx_budgets_user_active ON public.budgets(user_id, is_active);
CREATE INDEX idx_budget_periods_budget_current ON public.budget_periods(budget_id, is_current);
CREATE INDEX idx_budget_periods_dates ON public.budget_periods(period_start, period_end);
CREATE INDEX idx_budget_transactions_period ON public.budget_transactions(budget_period_id);