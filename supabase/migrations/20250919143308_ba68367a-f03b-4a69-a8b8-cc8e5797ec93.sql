-- Drop existing account-related foreign keys and references in other tables
-- We'll need to create a function to ensure each user has exactly one main account

-- First, let's ensure each user has exactly one main account
-- Drop the foreign key constraint from recurring_transactions temporarily
ALTER TABLE recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_account_id_fkey;

-- Create a function to get or create user's main account
CREATE OR REPLACE FUNCTION get_or_create_main_account(user_id_param UUID)
RETURNS UUID AS $$
DECLARE
  main_account_id UUID;
BEGIN
  -- Try to find existing main account
  SELECT id INTO main_account_id 
  FROM accounts 
  WHERE user_id = user_id_param 
    AND type = 'checking' 
    AND is_active = true
  LIMIT 1;
  
  -- If no main account exists, create one
  IF main_account_id IS NULL THEN
    INSERT INTO accounts (user_id, name, type, balance, currency, is_active)
    VALUES (user_id_param, 'Main Account', 'checking', 0.00, 'ILS', true)
    RETURNING id INTO main_account_id;
  END IF;
  
  -- Disable all other accounts for this user
  UPDATE accounts 
  SET is_active = false 
  WHERE user_id = user_id_param 
    AND id != main_account_id;
  
  RETURN main_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create savings accounts table
CREATE TABLE IF NOT EXISTS public.savings_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Savings Account',
  balance NUMERIC NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'ILS',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- Each user can only have one savings account
);

-- Enable RLS on savings_accounts
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for savings_accounts
CREATE POLICY "Users can view their own savings account" 
ON public.savings_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings account" 
ON public.savings_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings account" 
ON public.savings_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create savings transfers table for tracking movements between main and savings
CREATE TABLE IF NOT EXISTS public.savings_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('to_savings', 'from_savings')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on savings_transfers
ALTER TABLE public.savings_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for savings_transfers
CREATE POLICY "Users can view their own savings transfers" 
ON public.savings_transfers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings transfers" 
ON public.savings_transfers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to get or create user's savings account
CREATE OR REPLACE FUNCTION get_or_create_savings_account(user_id_param UUID)
RETURNS UUID AS $$
DECLARE
  savings_account_id UUID;
BEGIN
  -- Try to find existing savings account
  SELECT id INTO savings_account_id 
  FROM savings_accounts 
  WHERE user_id = user_id_param;
  
  -- If no savings account exists, create one
  IF savings_account_id IS NULL THEN
    INSERT INTO savings_accounts (user_id, name, balance, currency)
    VALUES (user_id_param, 'Savings Account', 0.00, 'ILS')
    RETURNING id INTO savings_account_id;
  END IF;
  
  RETURN savings_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle savings transfers
CREATE OR REPLACE FUNCTION process_savings_transfer(
  user_id_param UUID,
  amount_param NUMERIC,
  transfer_type_param TEXT,
  description_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  main_account_id UUID;
  savings_account_id UUID;
BEGIN
  -- Get or create accounts
  main_account_id := get_or_create_main_account(user_id_param);
  savings_account_id := get_or_create_savings_account(user_id_param);
  
  -- Validate transfer type
  IF transfer_type_param NOT IN ('to_savings', 'from_savings') THEN
    RAISE EXCEPTION 'Invalid transfer type. Must be to_savings or from_savings';
  END IF;
  
  -- Validate amount
  IF amount_param <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;
  
  -- Process the transfer
  IF transfer_type_param = 'to_savings' THEN
    -- Check if main account has sufficient funds
    IF (SELECT balance FROM accounts WHERE id = main_account_id) < amount_param THEN
      RAISE EXCEPTION 'Insufficient funds in main account';
    END IF;
    
    -- Transfer from main to savings
    UPDATE accounts SET balance = balance - amount_param WHERE id = main_account_id;
    UPDATE savings_accounts SET balance = balance + amount_param WHERE id = savings_account_id;
  ELSE
    -- from_savings
    -- Check if savings account has sufficient funds
    IF (SELECT balance FROM savings_accounts WHERE id = savings_account_id) < amount_param THEN
      RAISE EXCEPTION 'Insufficient funds in savings account';
    END IF;
    
    -- Transfer from savings to main
    UPDATE savings_accounts SET balance = balance - amount_param WHERE id = savings_account_id;
    UPDATE accounts SET balance = balance + amount_param WHERE id = main_account_id;
  END IF;
  
  -- Record the transfer
  INSERT INTO savings_transfers (user_id, amount, transfer_type, description)
  VALUES (user_id_param, amount_param, transfer_type_param, description_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update savings account timestamps
CREATE TRIGGER update_savings_accounts_updated_at
  BEFORE UPDATE ON public.savings_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing users to have main accounts (this ensures no data loss)
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  FOR current_user_id IN 
    SELECT DISTINCT user_id FROM accounts WHERE is_active = true
  LOOP
    PERFORM get_or_create_main_account(current_user_id);
    PERFORM get_or_create_savings_account(current_user_id);
  END LOOP;
END $$;

-- Update all transactions to use the main account for their user
UPDATE transactions 
SET account_id = (
  SELECT get_or_create_main_account(transactions.user_id)
);

-- Update all recurring transactions to use the main account for their user  
UPDATE recurring_transactions 
SET account_id = (
  SELECT get_or_create_main_account(recurring_transactions.user_id)
);

-- Add the foreign key constraint back to recurring_transactions
ALTER TABLE recurring_transactions 
ADD CONSTRAINT recurring_transactions_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES accounts(id);