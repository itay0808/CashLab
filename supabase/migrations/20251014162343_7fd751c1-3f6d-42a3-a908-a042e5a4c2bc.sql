-- Drop investments table and related objects
DROP TABLE IF EXISTS investments CASCADE;

-- Simplify budget_periods RLS policies to avoid potential recursion issues
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own budget periods" ON budget_periods;
DROP POLICY IF EXISTS "Users can create their own budget periods" ON budget_periods;
DROP POLICY IF EXISTS "Users can update their own budget periods" ON budget_periods;
DROP POLICY IF EXISTS "Users can delete their own budget periods" ON budget_periods;

-- Create simpler RLS policies using a security definer function
CREATE OR REPLACE FUNCTION public.get_budget_user_id(budget_id_param uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM budgets WHERE id = budget_id_param LIMIT 1;
$$;

-- Recreate policies with the function
CREATE POLICY "Users can view their own budget periods" ON budget_periods
FOR SELECT USING (
  auth.uid() = get_budget_user_id(budget_id)
);

CREATE POLICY "Users can create their own budget periods" ON budget_periods
FOR INSERT WITH CHECK (
  auth.uid() = get_budget_user_id(budget_id)
);

CREATE POLICY "Users can update their own budget periods" ON budget_periods
FOR UPDATE USING (
  auth.uid() = get_budget_user_id(budget_id)
);

CREATE POLICY "Users can delete their own budget periods" ON budget_periods
FOR DELETE USING (
  auth.uid() = get_budget_user_id(budget_id)
);