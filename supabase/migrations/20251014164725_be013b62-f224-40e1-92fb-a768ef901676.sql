-- ============================================
-- CLEAN DATABASE RECREATION
-- ============================================

-- Drop all existing tables and functions
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
DROP FUNCTION IF EXISTS process_due_recurring_transactions() CASCADE;

-- ============================================
-- CREATE TABLES WITH CONSTRAINTS
-- ============================================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text,
  email text,
  currency text DEFAULT 'ILS' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'ILS', 'JPY'))
);

-- 2. ACCOUNTS TABLE
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  balance numeric DEFAULT 0.00 NOT NULL,
  currency text DEFAULT 'ILS' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_account_type CHECK (type IN ('main', 'savings', 'credit', 'investment')),
  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'ILS', 'JPY')),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- 3. CATEGORIES TABLE
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  icon text,
  color text,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_name CHECK (length(name) > 0 AND length(name) <= 100)
);

-- 4. BUDGETS TABLE
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  period text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  alert_threshold integer DEFAULT 80 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_name CHECK (length(name) > 0 AND length(name) <= 200),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_period CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  CONSTRAINT valid_threshold CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
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
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT positive_budgeted_amount CHECK (budgeted_amount > 0),
  CONSTRAINT non_negative_spent CHECK (spent_amount >= 0),
  CONSTRAINT valid_period_range CHECK (period_end >= period_start)
);

-- 6. TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  transaction_date date DEFAULT CURRENT_DATE NOT NULL,
  notes text,
  tags text[] DEFAULT '{}',
  is_recurring boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_description CHECK (length(description) > 0 AND length(description) <= 500),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_type CHECK (type IN ('income', 'expense', 'transfer'))
);

-- 7. RECURRING_TRANSACTIONS TABLE
CREATE TABLE public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  frequency text NOT NULL,
  next_due_date date NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_name CHECK (length(name) > 0 AND length(name) <= 200),
  CONSTRAINT valid_description CHECK (length(description) > 0 AND length(description) <= 500),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_type CHECK (type IN ('income', 'expense')),
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'))
);

-- 8. SYSTEM_LOGS TABLE (IMMUTABLE)
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
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_description CHECK (length(description) > 0 AND length(description) <= 1000)
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(type) WHERE is_active = true;
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budget_periods_budget ON budget_periods(budget_id);
CREATE INDEX idx_budget_periods_current ON budget_periods(is_current) WHERE is_current = true;
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_recurring_user_active ON recurring_transactions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_recurring_next_due ON recurring_transactions(next_due_date) WHERE is_active = true;
CREATE INDEX idx_system_logs_user_date ON system_logs(user_id, created_at DESC);
CREATE INDEX idx_system_logs_entity ON system_logs(entity_type, entity_id);

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
-- CREATE FUNCTIONS
-- ============================================

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
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

-- Function: Get budget user ID (for RLS)
CREATE OR REPLACE FUNCTION get_budget_user_id(budget_id_param uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM budgets WHERE id = budget_id_param LIMIT 1;
$$;

-- Function: Get or create account balances
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

-- Function: Log financial activity
CREATE OR REPLACE FUNCTION log_financial_activity(
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

-- Function: Handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  RETURN new;
END;
$$;

-- Function: Process due recurring transactions
CREATE OR REPLACE FUNCTION process_due_recurring_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  new_due_date date;
BEGIN
  FOR rec IN 
    SELECT * FROM recurring_transactions 
    WHERE is_active = true 
      AND next_due_date <= CURRENT_DATE
  LOOP
    -- Create transaction
    INSERT INTO transactions (
      user_id, account_id, category_id, description, 
      amount, type, transaction_date, is_recurring
    ) VALUES (
      rec.user_id, rec.account_id, rec.category_id, rec.description,
      rec.amount, rec.type, CURRENT_DATE, true
    );
    
    -- Calculate next due date
    new_due_date := CASE rec.frequency
      WHEN 'daily' THEN rec.next_due_date + INTERVAL '1 day'
      WHEN 'weekly' THEN rec.next_due_date + INTERVAL '1 week'
      WHEN 'biweekly' THEN rec.next_due_date + INTERVAL '2 weeks'
      WHEN 'monthly' THEN rec.next_due_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN rec.next_due_date + INTERVAL '3 months'
      WHEN 'yearly' THEN rec.next_due_date + INTERVAL '1 year'
      ELSE rec.next_due_date + INTERVAL '1 month'
    END;
    
    -- Update recurring transaction
    UPDATE recurring_transactions 
    SET next_due_date = new_due_date 
    WHERE id = rec.id;
  END LOOP;
END;
$$;

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
  FOR SELECT USING (is_system = true OR auth.uid() = user_id);
CREATE POLICY "Users can create their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Budgets policies
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Budget periods policies
CREATE POLICY "Users can view their own budget periods" ON budget_periods
  FOR SELECT USING (auth.uid() = get_budget_user_id(budget_id));
CREATE POLICY "Users can create their own budget periods" ON budget_periods
  FOR INSERT WITH CHECK (auth.uid() = get_budget_user_id(budget_id));
CREATE POLICY "Users can update their own budget periods" ON budget_periods
  FOR UPDATE USING (auth.uid() = get_budget_user_id(budget_id));
CREATE POLICY "Users can delete their own budget periods" ON budget_periods
  FOR DELETE USING (auth.uid() = get_budget_user_id(budget_id));

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