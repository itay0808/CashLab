-- Add missing alert_threshold column to budgets table
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS alert_threshold integer DEFAULT 80 NOT NULL;

-- Remove start_date and end_date columns from recurring_transactions if they exist
-- (these should not be in recurring_transactions based on the code usage)
ALTER TABLE recurring_transactions 
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;