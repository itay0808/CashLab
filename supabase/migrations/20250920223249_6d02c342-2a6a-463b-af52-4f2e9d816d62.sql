-- Check and update the process_savings_transfer function to ensure proper balance updates
CREATE OR REPLACE FUNCTION public.process_savings_transfer(
  user_id_param uuid, 
  amount_param numeric, 
  transfer_type_param text, 
  description_param text DEFAULT NULL::text
)
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
  
  -- Process the transfer with proper balance updates
  IF transfer_type_param = 'to_savings' THEN
    -- Transfer from main to savings
    -- First update main account (subtract amount)
    UPDATE accounts 
    SET balance = balance - amount_param, updated_at = now()
    WHERE id = main_account_id;
    
    -- Then update savings account (add amount)
    UPDATE savings_accounts 
    SET balance = balance + amount_param, updated_at = now()
    WHERE id = savings_account_id;
    
  ELSE
    -- Transfer from savings to main
    -- First update savings account (subtract amount)
    UPDATE savings_accounts 
    SET balance = balance - amount_param, updated_at = now()
    WHERE id = savings_account_id;
    
    -- Then update main account (add amount)
    UPDATE accounts 
    SET balance = balance + amount_param, updated_at = now()
    WHERE id = main_account_id;
  END IF;
  
  -- Record the transfer
  INSERT INTO savings_transfers (user_id, amount, transfer_type, description)
  VALUES (user_id_param, amount_param, transfer_type_param, description_param);
  
  -- Log the activity for tracking
  PERFORM log_financial_activity(
    user_id_param,
    'TRANSFER',
    'SAVINGS_TRANSFER',
    NULL,
    CASE 
      WHEN transfer_type_param = 'to_savings' THEN 'Transfer to savings: ₪' || amount_param
      ELSE 'Transfer from savings: ₪' || amount_param
    END,
    CASE 
      WHEN transfer_type_param = 'to_savings' THEN -amount_param
      ELSE amount_param
    END,
    jsonb_build_object(
      'main_balance_before', current_main_balance,
      'savings_balance_before', current_savings_balance
    ),
    jsonb_build_object(
      'main_balance_after', CASE 
        WHEN transfer_type_param = 'to_savings' THEN current_main_balance - amount_param
        ELSE current_main_balance + amount_param
      END,
      'savings_balance_after', CASE 
        WHEN transfer_type_param = 'to_savings' THEN current_savings_balance + amount_param
        ELSE current_savings_balance - amount_param
      END
    ),
    jsonb_build_object(
      'transfer_type', transfer_type_param,
      'amount', amount_param,
      'description', description_param
    )
  );
END;
$function$;