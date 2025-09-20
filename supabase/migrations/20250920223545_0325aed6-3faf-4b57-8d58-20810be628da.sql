-- Fix the transfer system by ensuring proper account creation and balance tracking
-- First, let's update the main account creation function to ensure it works properly
CREATE OR REPLACE FUNCTION public.get_or_create_main_account(user_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Log account creation
    PERFORM log_financial_activity(
      user_id_param,
      'CREATE',
      'ACCOUNT',
      main_account_id,
      'Main account created',
      0.00,
      NULL,
      jsonb_build_object('account_type', 'checking', 'balance', 0.00),
      jsonb_build_object('account_name', 'Main Account')
    );
  END IF;
  
  -- Ensure this is the only active main account
  UPDATE accounts 
  SET is_active = false 
  WHERE user_id = user_id_param 
    AND type = 'checking'
    AND id != main_account_id;
  
  RETURN main_account_id;
END;
$function$;

-- Update the savings account creation function
CREATE OR REPLACE FUNCTION public.get_or_create_savings_account(user_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Log savings account creation
    PERFORM log_financial_activity(
      user_id_param,
      'CREATE',
      'SAVINGS_ACCOUNT',
      savings_account_id,
      'Savings account created',
      0.00,
      NULL,
      jsonb_build_object('account_type', 'savings', 'balance', 0.00),
      jsonb_build_object('account_name', 'Savings Account')
    );
  END IF;
  
  RETURN savings_account_id;
END;
$function$;

-- Create a function to get current account balances
CREATE OR REPLACE FUNCTION public.get_account_balances(user_id_param uuid)
RETURNS TABLE(
  main_account_id uuid,
  main_balance numeric,
  savings_account_id uuid,
  savings_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  main_id UUID;
  savings_id UUID;
  calculated_main_balance NUMERIC := 0;
  stored_main_balance NUMERIC := 0;
  stored_savings_balance NUMERIC := 0;
BEGIN
  -- Get or create accounts
  main_id := get_or_create_main_account(user_id_param);
  savings_id := get_or_create_savings_account(user_id_param);
  
  -- Calculate main account balance from transactions
  SELECT COALESCE(SUM(t.amount), 0) INTO calculated_main_balance
  FROM transactions t
  WHERE t.user_id = user_id_param 
    AND t.account_id = main_id;
  
  -- Get stored balances
  SELECT balance INTO stored_main_balance 
  FROM accounts 
  WHERE id = main_id;
  
  SELECT balance INTO stored_savings_balance 
  FROM savings_accounts 
  WHERE id = savings_id;
  
  -- If there's a discrepancy, use the calculated balance and update the stored balance
  IF ABS(calculated_main_balance - stored_main_balance) > 0.01 THEN
    UPDATE accounts 
    SET balance = calculated_main_balance, updated_at = now()
    WHERE id = main_id;
    stored_main_balance := calculated_main_balance;
  END IF;
  
  -- Return the balances
  RETURN QUERY SELECT 
    main_id as main_account_id,
    stored_main_balance as main_balance,
    savings_id as savings_account_id,
    stored_savings_balance as savings_balance;
END;
$function$;