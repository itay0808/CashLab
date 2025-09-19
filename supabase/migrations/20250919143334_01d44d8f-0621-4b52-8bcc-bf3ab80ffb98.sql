-- Fix security warnings by updating functions to set search_path properly

-- Update get_or_create_main_account function
CREATE OR REPLACE FUNCTION get_or_create_main_account(user_id_param UUID)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Update get_or_create_savings_account function
CREATE OR REPLACE FUNCTION get_or_create_savings_account(user_id_param UUID)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Update process_savings_transfer function
CREATE OR REPLACE FUNCTION process_savings_transfer(
  user_id_param UUID,
  amount_param NUMERIC,
  transfer_type_param TEXT,
  description_param TEXT DEFAULT NULL
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;