-- Create savings_goals table
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(15,2) NOT NULL,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  monthly_contribution NUMERIC(15,2) DEFAULT 0.00,
  target_date DATE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for savings_goals
CREATE POLICY "Users can view their own savings goals" 
ON public.savings_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings goals" 
ON public.savings_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" 
ON public.savings_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" 
ON public.savings_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create savings_goal_transactions table to track contributions
CREATE TABLE public.savings_goal_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('contribution', 'withdrawal', 'adjustment')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_goal_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for savings_goal_transactions
CREATE POLICY "Users can view their goal transactions" 
ON public.savings_goal_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.savings_goals sg 
  WHERE sg.id = savings_goal_transactions.goal_id 
  AND sg.user_id = auth.uid()
));

CREATE POLICY "Users can create their goal transactions" 
ON public.savings_goal_transactions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.savings_goals sg 
  WHERE sg.id = savings_goal_transactions.goal_id 
  AND sg.user_id = auth.uid()
));

-- Create cash_flow_projections table
CREATE TABLE public.cash_flow_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  projection_date DATE NOT NULL,
  projected_income NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  projected_expenses NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  projected_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  actual_income NUMERIC(15,2) DEFAULT NULL,
  actual_expenses NUMERIC(15,2) DEFAULT NULL,
  actual_balance NUMERIC(15,2) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, projection_date)
);

-- Enable RLS
ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;

-- Create policies for cash_flow_projections
CREATE POLICY "Users can view their own cash flow projections" 
ON public.cash_flow_projections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cash flow projections" 
ON public.cash_flow_projections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flow projections" 
ON public.cash_flow_projections 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at columns
CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_flow_projections_updated_at
  BEFORE UPDATE ON public.cash_flow_projections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update savings goal current_amount when transactions are added
CREATE OR REPLACE FUNCTION public.update_savings_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.goal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount - OLD.amount,
        updated_at = now()
    WHERE id = OLD.goal_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount - OLD.amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.goal_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;