-- Fix security definer view by replacing with SECURITY INVOKER
DROP VIEW IF EXISTS public.farmer_public_profiles;

CREATE VIEW public.farmer_public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  p.user_id as farmer_id,
  p.full_name,
  p.city,
  p.state,
  COALESCE(
    (SELECT COUNT(*) FROM customer_orders WHERE farmer_id = p.user_id AND status = 'delivered'),
    0
  ) as total_sales,
  COALESCE(
    (SELECT ROUND(AVG(rating)::numeric, 1) FROM farmer_ratings WHERE farmer_id = p.user_id),
    0
  ) as avg_rating,
  COALESCE(
    (SELECT COUNT(*) FROM farmer_ratings WHERE farmer_id = p.user_id),
    0
  ) as total_reviews,
  (SELECT ARRAY_AGG(DISTINCT category) FROM marketplace_listings WHERE farmer_id = p.user_id AND status = 'active' LIMIT 5) as crops_grown
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'farmer';

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.farmer_public_profiles TO authenticated;