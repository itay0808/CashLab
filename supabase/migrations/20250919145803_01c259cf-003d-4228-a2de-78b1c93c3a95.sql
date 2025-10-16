-- Create function to update account balance when transactions change
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    UPDATE public.accounts 
    SET balance = balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.account_id;
    RETURN NEW;
  
  -- Handle UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Remove old amount and add new amount
    UPDATE public.accounts 
    SET balance = balance - OLD.amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.account_id;
    RETURN NEW;
  
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.accounts 
    SET balance = balance - OLD.amount,
        updated_at = now()
    WHERE id = OLD.account_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger to automatically update account balance
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- Create function to process recurring transactions
CREATE OR REPLACE FUNCTION public.process_due_recurring_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recurring_record RECORD;
BEGIN
  -- Find all active recurring transactions that are due
  FOR recurring_record IN
    SELECT * FROM public.recurring_transactions
    WHERE is_active = true
      AND next_due_date::date <= CURRENT_DATE
      AND (end_date IS NULL OR CURRENT_DATE <= end_date)
  LOOP
    -- Create the actual transaction
    INSERT INTO public.transactions (
      user_id,
      account_id,
      category_id,
      amount,
      description,
      notes,
      type,
      transaction_date,
      is_recurring
    ) VALUES (
      recurring_record.user_id,
      recurring_record.account_id,
      recurring_record.category_id,
      recurring_record.amount,
      recurring_record.name,
      recurring_record.notes,
      recurring_record.type,
      CURRENT_TIMESTAMP,
      true
    );
    
    -- Update next due date
    UPDATE public.recurring_transactions
    SET next_due_date = CASE
      WHEN frequency = 'daily' THEN next_due_date + INTERVAL '1 day'
      WHEN frequency = 'weekly' THEN next_due_date + INTERVAL '1 week'
      WHEN frequency = 'biweekly' THEN next_due_date + INTERVAL '2 weeks'
      WHEN frequency = 'monthly' THEN next_due_date + INTERVAL '1 month'
      WHEN frequency = 'quarterly' THEN next_due_date + INTERVAL '3 months'
      WHEN frequency = 'yearly' THEN next_due_date + INTERVAL '1 year'
      ELSE next_due_date + INTERVAL '1 month'
    END,
    updated_at = now()
    WHERE id = recurring_record.id;
    
  END LOOP;
END;
$$;