-- Update all existing data to use ILS currency
UPDATE public.accounts SET currency = 'ILS' WHERE currency != 'ILS';
UPDATE public.profiles SET currency = 'ILS' WHERE currency != 'ILS' OR currency IS NULL;

-- Set default currency for new records
ALTER TABLE public.accounts ALTER COLUMN currency SET DEFAULT 'ILS';
ALTER TABLE public.profiles ALTER COLUMN currency SET DEFAULT 'ILS';