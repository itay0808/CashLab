-- Add missing foreign key constraints for table relationships

ALTER TABLE budgets
  ADD CONSTRAINT budgets_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_account_id_fkey 
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE recurring_transactions
  ADD CONSTRAINT recurring_transactions_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE recurring_transactions
  ADD CONSTRAINT recurring_transactions_account_id_fkey 
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;