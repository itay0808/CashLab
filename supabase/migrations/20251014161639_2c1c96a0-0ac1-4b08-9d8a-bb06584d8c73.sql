-- Fix security issue: Add immutability protection to audit logs
-- This prevents tampering with audit trails

CREATE POLICY "system_logs_no_update" ON system_logs
FOR UPDATE USING (false);

CREATE POLICY "system_logs_no_delete" ON system_logs
FOR DELETE USING (false);

COMMENT ON POLICY "system_logs_no_update" ON system_logs IS 'Prevents modification of audit logs to maintain accountability';
COMMENT ON POLICY "system_logs_no_delete" ON system_logs IS 'Prevents deletion of audit logs to maintain compliance';

-- Fix security issue: Add search_path protection to SECURITY DEFINER function
-- This prevents privilege escalation attacks

CREATE OR REPLACE FUNCTION public.handle_new_user()
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup with protected search_path';

-- Enable pg_cron for scheduled execution of recurring transactions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule recurring transactions processing to run daily at 2 AM
SELECT cron.schedule(
  'process-recurring-transactions-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://suujjmwrisxcrkcqovbt.supabase.co/functions/v1/process-recurring-transactions',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dWpqbXdyaXN4Y3JrY3FvdmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDQ4MTQsImV4cCI6MjA3NjAyMDgxNH0.Kfyv91HG-koOKGXQ4dm7y-OCqfq23mOgBeougmZ_hqU"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);