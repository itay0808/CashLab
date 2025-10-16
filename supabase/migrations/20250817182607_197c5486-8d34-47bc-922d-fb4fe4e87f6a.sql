-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.update_savings_goal_amount()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.goal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount - OLD.amount,
        updated_at = now()
    WHERE id = OLD.goal_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount - OLD.amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.goal_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for savings goal transactions
CREATE TRIGGER update_savings_goal_amount_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.savings_goal_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goal_amount();