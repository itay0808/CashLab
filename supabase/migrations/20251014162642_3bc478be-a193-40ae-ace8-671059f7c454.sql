-- Fix get_account_balances to properly handle account creation
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
DECLARE
  v_main_account_id uuid;
  v_savings_account_id uuid;
BEGIN
  -- Get or create main account
  SELECT id INTO v_main_account_id
  FROM accounts 
  WHERE user_id = user_id_param 
  AND type = 'main' 
  AND is_active = true
  LIMIT 1;
  
  IF v_main_account_id IS NULL THEN
    INSERT INTO accounts (user_id, name, type, balance, currency, is_active)
    VALUES (user_id_param, 'Main Account', 'main', 0, 'ILS', true)
    RETURNING id INTO v_main_account_id;
  END IF;
  
  -- Get or create savings account
  SELECT id INTO v_savings_account_id
  FROM accounts 
  WHERE user_id = user_id_param 
  AND type = 'savings' 
  AND is_active = true
  LIMIT 1;
  
  IF v_savings_account_id IS NULL THEN
    INSERT INTO accounts (user_id, name, type, balance, currency, is_active)
    VALUES (user_id_param, 'Savings Account', 'savings', 0, 'ILS', true)
    RETURNING id INTO v_savings_account_id;
  END IF;
  
  -- Return account data
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
    SELECT * FROM accounts WHERE id = v_main_account_id
  ) main
  CROSS JOIN (
    SELECT * FROM accounts WHERE id = v_savings_account_id
  ) savings;
END;
$$;