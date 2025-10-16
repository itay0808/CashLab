-- Create system logs table to track all financial activities
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  amount NUMERIC,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for system logs
CREATE POLICY "Users can view their own logs" 
ON public.system_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert logs" 
ON public.system_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to log financial activities
CREATE OR REPLACE FUNCTION public.log_financial_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.system_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    description,
    amount,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    p_amount,
    p_old_value,
    p_new_value,
    p_metadata
  );
END;
$$;

-- Update account balance function to include logging
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_balance NUMERIC;
  new_balance NUMERIC;
  account_name TEXT;
BEGIN
  -- Get account name for logging
  SELECT name INTO account_name FROM public.accounts WHERE id = COALESCE(NEW.account_id, OLD.account_id);
  
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- Get old balance
    SELECT balance INTO old_balance FROM public.accounts WHERE id = NEW.account_id;
    
    -- Update balance
    UPDATE public.accounts 
    SET balance = balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.account_id;
    
    -- Get new balance
    SELECT balance INTO new_balance FROM public.accounts WHERE id = NEW.account_id;
    
    -- Log the activity
    PERFORM log_financial_activity(
      NEW.user_id,
      'CREATE',
      'TRANSACTION',
      NEW.id,
      'Transaction created: ' || NEW.description || ' - Account: ' || account_name,
      NEW.amount,
      jsonb_build_object('balance', old_balance),
      jsonb_build_object('balance', new_balance),
      jsonb_build_object('transaction_type', NEW.type, 'account_name', account_name)
    );
    
    RETURN NEW;
  
  -- Handle UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Get old balance
    SELECT balance INTO old_balance FROM public.accounts WHERE id = NEW.account_id;
    
    -- Update balance (remove old amount and add new amount)
    UPDATE public.accounts 
    SET balance = balance - OLD.amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.account_id;
    
    -- Get new balance
    SELECT balance INTO new_balance FROM public.accounts WHERE id = NEW.account_id;
    
    -- Log the activity
    PERFORM log_financial_activity(
      NEW.user_id,
      'UPDATE',
      'TRANSACTION',
      NEW.id,
      'Transaction updated: ' || NEW.description || ' - Account: ' || account_name,
      NEW.amount,
      jsonb_build_object('balance', old_balance, 'old_amount', OLD.amount),
      jsonb_build_object('balance', new_balance, 'new_amount', NEW.amount),
      jsonb_build_object('transaction_type', NEW.type, 'account_name', account_name)
    );
    
    RETURN NEW;
  
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    -- Get old balance
    SELECT balance INTO old_balance FROM public.accounts WHERE id = OLD.account_id;
    
    -- Update balance
    UPDATE public.accounts 
    SET balance = balance - OLD.amount,
        updated_at = now()
    WHERE id = OLD.account_id;
    
    -- Get new balance
    SELECT balance INTO new_balance FROM public.accounts WHERE id = OLD.account_id;
    
    -- Log the activity
    PERFORM log_financial_activity(
      OLD.user_id,
      'DELETE',
      'TRANSACTION',
      OLD.id,
      'Transaction deleted: ' || OLD.description || ' - Account: ' || account_name,
      OLD.amount,
      jsonb_build_object('balance', old_balance),
      jsonb_build_object('balance', new_balance),
      jsonb_build_object('transaction_type', OLD.type, 'account_name', account_name)
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;