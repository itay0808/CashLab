-- Create default categories for better user experience
INSERT INTO public.categories (name, icon, color, is_system) VALUES
  ('Food & Dining', '🍽️', '#FF6B6B', true),
  ('Transportation', '🚗', '#4ECDC4', true),
  ('Shopping', '🛍️', '#45B7D1', true),
  ('Entertainment', '🎬', '#96CEB4', true),
  ('Bills & Utilities', '💡', '#FFEAA7', true),
  ('Healthcare', '🏥', '#DDA0DD', true),
  ('Education', '📚', '#74B9FF', true),
  ('Travel', '✈️', '#00B894', true),
  ('Income', '💰', '#00B894', true),
  ('Investments', '📈', '#6C5CE7', true)
ON CONFLICT (name) DO NOTHING;