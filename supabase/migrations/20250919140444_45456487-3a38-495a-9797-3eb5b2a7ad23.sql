-- Update transactions table to include time information
ALTER TABLE public.transactions 
ALTER COLUMN transaction_date TYPE timestamp with time zone 
USING transaction_date::timestamp with time zone;

-- Update recurring_transactions table to include time information  
ALTER TABLE public.recurring_transactions
ALTER COLUMN next_due_date TYPE timestamp with time zone
USING next_due_date::timestamp with time zone;

-- Update the trigger function to handle the new timestamp format
CREATE OR REPLACE FUNCTION public.update_next_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update cash_flow_projections table to use timestamp
ALTER TABLE public.cash_flow_projections
ALTER COLUMN projection_date TYPE timestamp with time zone
USING projection_date::timestamp with time zone;