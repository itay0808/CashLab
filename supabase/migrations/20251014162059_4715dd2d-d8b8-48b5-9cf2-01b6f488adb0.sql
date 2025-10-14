-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol text,
  investment_type text NOT NULL,
  purchase_price numeric NOT NULL,
  quantity numeric NOT NULL,
  purchase_date date NOT NULL,
  current_price numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investments
CREATE POLICY "Users can view their own investments" ON investments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments" ON investments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" ON investments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments" ON investments
FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on investments
CREATE TRIGGER update_investments_updated_at
BEFORE UPDATE ON investments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create log_financial_activity function
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
    user_id,
    action_type,
    entity_type,
    entity_id,
    description,
    amount,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    p_amount,
    p_old_value,
    p_new_value,
    p_metadata
  );
END;
$$;

COMMENT ON FUNCTION log_financial_activity IS 'Logs financial activities to system_logs with protected search_path';