-- Update the process_savings_transfer function to allow transfers even with negative balances
-- but still respect maximum available amounts on the frontend

CREATE OR REPLACE FUNCTION public.process_savings_transfer(user_id_param uuid, amount_param numeric, transfer_type_param text, description_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  main_account_id UUID;
  savings_account_id UUID;
  current_main_balance NUMERIC;
  current_savings_balance NUMERIC;
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
  
  -- Get current balances
  SELECT balance INTO current_main_balance FROM accounts WHERE id = main_account_id;
  SELECT balance INTO current_savings_balance FROM savings_accounts WHERE id = savings_account_id;
  
  -- Process the transfer (allow negative balances but frontend should limit amounts)
  IF transfer_type_param = 'to_savings' THEN
    -- Transfer from main to savings
    UPDATE accounts SET balance = balance - amount_param WHERE id = main_account_id;
    UPDATE savings_accounts SET balance = balance + amount_param WHERE id = savings_account_id;
  ELSE
    -- from_savings
    -- Transfer from savings to main
    UPDATE savings_accounts SET balance = balance - amount_param WHERE id = savings_account_id;
    UPDATE accounts SET balance = balance + amount_param WHERE id = main_account_id;
  END IF;
  
  -- Record the transfer
  INSERT INTO savings_transfers (user_id, amount, transfer_type, description)
  VALUES (user_id_param, amount_param, transfer_type_param, description_param);
END;
$function$;