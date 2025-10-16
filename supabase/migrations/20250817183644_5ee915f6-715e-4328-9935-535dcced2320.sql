-- Phase 4: Advanced Analytics & Investment Tracking

-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT,
  investment_type TEXT NOT NULL CHECK (investment_type IN ('stock', 'bond', 'mutual_fund', 'etf', 'crypto', 'real_estate', 'other')),
  purchase_price NUMERIC(15,2) NOT NULL,
  purchase_date DATE NOT NULL,
  quantity NUMERIC(15,6) NOT NULL DEFAULT 1,
  current_price NUMERIC(15,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Create policies for investments
CREATE POLICY "Users can view their own investments" 
ON public.investments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments" 
ON public.investments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" 
ON public.investments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments" 
ON public.investments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create recurring_transactions table for bills and scheduled payments
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  category_id UUID,
  name TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for recurring_transactions
CREATE POLICY "Users can view their own recurring transactions" 
ON public.recurring_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring transactions" 
ON public.recurring_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions" 
ON public.recurring_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions" 
ON public.recurring_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create financial_insights table for AI-generated insights
CREATE TABLE public.financial_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('spending_pattern', 'budget_alert', 'savings_opportunity', 'investment_suggestion', 'bill_reminder')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_required BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for financial_insights
CREATE POLICY "Users can view their own insights" 
ON public.financial_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insights" 
ON public.financial_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" 
ON public.financial_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate investment performance
CREATE OR REPLACE FUNCTION public.calculate_investment_performance(investment_id_param UUID)
RETURNS TABLE (
  total_value NUMERIC,
  total_gain_loss NUMERIC,
  percentage_change NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  investment_record RECORD;
BEGIN
  SELECT * INTO investment_record 
  FROM public.investments 
  WHERE id = investment_id_param 
  AND user_id = auth.uid();
  
  IF investment_record IS NULL THEN
    RETURN;
  END IF;
  
  total_value := investment_record.quantity * COALESCE(investment_record.current_price, investment_record.purchase_price);
  total_gain_loss := total_value - (investment_record.quantity * investment_record.purchase_price);
  
  IF investment_record.purchase_price > 0 THEN
    percentage_change := (total_gain_loss / (investment_record.quantity * investment_record.purchase_price)) * 100;
  ELSE
    percentage_change := 0;
  END IF;
  
  RETURN QUERY SELECT total_value, total_gain_loss, percentage_change;
END;
$$;

-- Function to generate next due date for recurring transactions
CREATE OR REPLACE FUNCTION public.update_next_due_date()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  CASE NEW.frequency
    WHEN 'daily' THEN
      NEW.next_due_date := NEW.next_due_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      NEW.next_due_date := NEW.next_due_date + INTERVAL '1 week';
    WHEN 'biweekly' THEN
      NEW.next_due_date := NEW.next_due_date + INTERVAL '2 weeks';
    WHEN 'monthly' THEN
      NEW.next_due_date := NEW.next_due_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      NEW.next_due_date := NEW.next_due_date + INTERVAL '3 months';
    WHEN 'yearly' THEN
      NEW.next_due_date := NEW.next_due_date + INTERVAL '1 year';
  END CASE;
  
  RETURN NEW;
END;
$$;