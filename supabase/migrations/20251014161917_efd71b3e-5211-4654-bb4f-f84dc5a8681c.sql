-- Fix database schema mismatches to match the application code

-- 1. Rename next_date to next_due_date in recurring_transactions
ALTER TABLE recurring_transactions 
RENAME COLUMN next_date TO next_due_date;

-- 2. Add name column to recurring_transactions (use description as default)
ALTER TABLE recurring_transactions 
ADD COLUMN name text;

UPDATE recurring_transactions 
SET name = description 
WHERE name IS NULL;

ALTER TABLE recurring_transactions 
ALTER COLUMN name SET NOT NULL;

-- 3. Create budget_periods table
CREATE TABLE IF NOT EXISTS budget_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  budgeted_amount numeric NOT NULL,
  spent_amount numeric DEFAULT 0 NOT NULL,
  is_current boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on budget_periods
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget_periods
CREATE POLICY "Users can view their own budget periods" ON budget_periods
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_periods.budget_id 
    AND budgets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own budget periods" ON budget_periods
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_periods.budget_id 
    AND budgets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own budget periods" ON budget_periods
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_periods.budget_id 
    AND budgets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own budget periods" ON budget_periods
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_periods.budget_id 
    AND budgets.user_id = auth.uid()
  )
);

-- Create trigger for updated_at on budget_periods
CREATE TRIGGER update_budget_periods_updated_at
BEFORE UPDATE ON budget_periods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Create or replace get_account_balances function
CREATE OR REPLACE FUNCTION get_account_balances(user_id_param uuid)
RETURNS TABLE (
  main_account_id uuid,
  main_account_balance numeric,
  main_account_name text,
  main_account_currency text,
  savings_account_id uuid,
  savings_account_balance numeric,
  savings_account_name text,
  savings_account_currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    main.id as main_account_id,
    main.balance as main_account_balance,
    main.name as main_account_name,
    main.currency as main_account_currency,
    savings.id as savings_account_id,
    savings.balance as savings_account_balance,
    savings.name as savings_account_name,
    savings.currency as savings_account_currency
  FROM (
    SELECT * FROM accounts 
    WHERE user_id = user_id_param 
    AND type = 'main' 
    AND is_active = true
    LIMIT 1
  ) main
  FULL OUTER JOIN (
    SELECT * FROM accounts 
    WHERE user_id = user_id_param 
    AND type = 'savings' 
    AND is_active = true
    LIMIT 1
  ) savings ON true;
  
  -- If no accounts exist, create them
  IF NOT FOUND THEN
    -- Create main account
    INSERT INTO accounts (user_id, name, type, balance, currency, is_active)
    VALUES (user_id_param, 'Main Account', 'main', 0, 'USD', true)
    RETURNING id, balance, name, currency INTO main_account_id, main_account_balance, main_account_name, main_account_currency;
    
    -- Create savings account
    INSERT INTO accounts (user_id, name, type, balance, currency, is_active)
    VALUES (user_id_param, 'Savings Account', 'savings', 0, 'USD', true)
    RETURNING id, balance, name, currency INTO savings_account_id, savings_account_balance, savings_account_name, savings_account_currency;
    
    RETURN NEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_account_balances(uuid) IS 'Gets or creates user account balances with protected search_path';