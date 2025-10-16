-- Recreate backend with proper setup

-- First, ensure all necessary extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can create their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view system and own categories" ON categories;
DROP POLICY IF EXISTS "Users can create their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

DROP POLICY IF EXISTS "Users can view their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON budgets;

-- Recreate RLS policies with proper permissions
CREATE POLICY "Users can view their own accounts"
ON accounts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON accounts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
ON accounts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
ON transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON transactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON transactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Categories policies (allow viewing system categories)
CREATE POLICY "Users can view system and own categories"
ON categories FOR SELECT
TO authenticated
USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own categories"
ON categories FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own categories"
ON categories FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND is_system = false);

-- Budgets policies
CREATE POLICY "Users can view their own budgets"
ON budgets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
ON budgets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
ON budgets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
ON budgets FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure system categories exist
INSERT INTO categories (name, icon, color, is_system) VALUES
('Food & Dining', '🍔', '#FF6B6B', true),
('Transportation', '🚗', '#4ECDC4', true),
('Shopping', '🛍️', '#95E1D3', true),
('Entertainment', '🎬', '#F38181', true),
('Bills & Utilities', '📄', '#AA96DA', true),
('Health & Fitness', '💪', '#FCBAD3', true),
('Travel', '✈️', '#A8D8EA', true),
('Education', '📚', '#FFD93D', true),
('Personal Care', '💅', '#FFA69E', true),
('Gifts & Donations', '🎁', '#B4E4FF', true),
('Income', '💰', '#4CAF50', true),
('Salary', '💼', '#2E7D32', true),
('Business', '💼', '#1976D2', true),
('Investments', '📈', '#7B1FA2', true),
('Other Income', '💵', '#66BB6A', true),
('Savings', '🏦', '#0288D1', true),
('Debt Payment', '💳', '#D32F2F', true),
('Insurance', '🛡️', '#F57C00', true),
('Taxes', '📊', '#5D4037', true),
('Other Expense', '📌', '#757575', true),
('Housing', '🏠', '#E91E63', true)
ON CONFLICT DO NOTHING;

-- Update handle_new_user function to create accounts automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  
  -- Create main account
  INSERT INTO public.accounts (user_id, name, type, balance, currency, is_active)
  VALUES (NEW.id, 'Main Account', 'main', 0, 'ILS', true);
  
  -- Create savings account
  INSERT INTO public.accounts (user_id, name, type, balance, currency, is_active)
  VALUES (NEW.id, 'Savings Account', 'savings', 0, 'ILS', true);
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create accounts for existing users who don't have them
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users 
    WHERE id NOT IN (SELECT DISTINCT user_id FROM accounts WHERE type = 'main')
  LOOP
    INSERT INTO accounts (user_id, name, type, balance, currency, is_active)
    VALUES (user_record.id, 'Main Account', 'main', 0, 'ILS', true);
    
    INSERT INTO accounts (user_id, name, type, balance, currency, is_active)
    VALUES (user_record.id, 'Savings Account', 'savings', 0, 'ILS', true);
  END LOOP;
END $$;