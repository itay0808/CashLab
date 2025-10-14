-- ============================================
-- DROP ALL EXISTING TABLES AND FUNCTIONS
-- ============================================

DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS budget_periods CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_budget_user_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_account_balances(uuid) CASCADE;
DROP FUNCTION IF EXISTS log_financial_activity(uuid, text, text, uuid, text, numeric, jsonb, jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text,
  email text,
  currency text DEFAULT 'USD',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. ACCOUNTS TABLE
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  balance numeric DEFAULT 0.00 NOT NULL,
  currency text DEFAULT 'USD' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. CATEGORIES TABLE
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  icon text,
  color text,
  parent_id uuid,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. BUDGETS TABLE
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid,
  name text NOT NULL,
  amount numeric NOT NULL,
  period text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  alert_threshold integer DEFAULT 80 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. BUDGET_PERIODS TABLE
CREATE TABLE public.budget_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  budgeted_amount numeric NOT NULL,
  spent_amount numeric DEFAULT 0 NOT NULL,
  is_current boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  category_id uuid,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  transaction_date date DEFAULT CURRENT_DATE NOT NULL,
  notes text,
  tags text[] DEFAULT '{}',
  is_recurring boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. RECURRING_TRANSACTIONS TABLE
CREATE TABLE public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  frequency text NOT NULL,
  next_due_date date NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. SYSTEM_LOGS TABLE
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  description text NOT NULL,
  amount numeric,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_recurring_transactions_user ON recurring_transactions(user_id);
CREATE INDEX idx_system_logs_user ON system_logs(user_id, created_at DESC);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Accounts policies
CREATE POLICY "Users can view their own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view system and own categories" ON categories
  FOR SELECT USING ((is_system = true) OR (auth.uid() = user_id));
CREATE POLICY "Users can create their own categories" ON categories
  FOR INSERT WITH CHECK ((auth.uid() = user_id) AND (is_system = false));
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING ((auth.uid() = user_id) AND (is_system = false));
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING ((auth.uid() = user_id) AND (is_system = false));

-- Budgets policies
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Recurring transactions policies
CREATE POLICY "Users can view their own recurring transactions" ON recurring_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recurring transactions" ON recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recurring transactions" ON recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recurring transactions" ON recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- System logs policies (IMMUTABLE)
CREATE POLICY "Users can view their own logs" ON system_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own logs" ON system_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "system_logs_no_update" ON system_logs
  FOR UPDATE USING (false);
CREATE POLICY "system_logs_no_delete" ON system_logs
  FOR DELETE USING (false);

-- ============================================
-- CREATE FUNCTIONS
-- ============================================

-- Trigger function for updated_at
CREATE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to get budget user ID (for RLS)
CREATE FUNCTION get_budget_user_id(budget_id_param uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM budgets WHERE id = budget_id_param LIMIT 1;
$$;

-- Budget periods policies (using security definer function)
CREATE POLICY "Users can view their own budget periods" ON budget_periods
  FOR SELECT USING (auth.uid() = get_budget_user_id(budget_id));
CREATE POLICY "Users can create their own budget periods" ON budget_periods
  FOR INSERT WITH CHECK (auth.uid() = get_budget_user_id(budget_id));
CREATE POLICY "Users can update their own budget periods" ON budget_periods
  FOR UPDATE USING (auth.uid() = get_budget_user_id(budget_id));
CREATE POLICY "Users can delete their own budget periods" ON budget_periods
  FOR DELETE USING (auth.uid() = get_budget_user_id(budget_id));

-- Function to get/create account balances
CREATE FUNCTION get_account_balances(user_id_param uuid)
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
  
  RETURN QUERY
  SELECT 
    main.id, main.balance, main.name, main.currency,
    savings.id, savings.balance, savings.name, savings.currency
  FROM (SELECT * FROM accounts WHERE id = v_main_account_id) main
  CROSS JOIN (SELECT * FROM accounts WHERE id = v_savings_account_id) savings;
END;
$$;

-- Function to log financial activity
CREATE FUNCTION log_financial_activity(
  p_user_id uuid,
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_description text,
  p_amount numeric DEFAULT NULL,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_logs (
    user_id, action_type, entity_type, entity_id, description,
    amount, old_value, new_value, metadata
  ) VALUES (
    p_user_id, p_action_type, p_entity_type, p_entity_id, p_description,
    p_amount, p_old_value, p_new_value, p_metadata
  );
END;
$$;

-- Function to handle new user signup
CREATE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  RETURN new;
END;
$$;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_periods_updated_at
  BEFORE UPDATE ON budget_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();