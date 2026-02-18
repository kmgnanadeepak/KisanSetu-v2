-- ====================================
-- CUSTOMER DASHBOARD ENHANCEMENTS
-- ====================================

-- Farmer ratings and reviews (post-delivery only)
CREATE TABLE public.farmer_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  order_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (order_id) -- One review per order
);

ALTER TABLE public.farmer_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create ratings for delivered orders"
ON public.farmer_ratings FOR INSERT
WITH CHECK (
  auth.uid() = customer_id AND
  EXISTS (
    SELECT 1 FROM customer_orders 
    WHERE id = order_id 
    AND customer_id = auth.uid() 
    AND status = 'delivered'
  )
);

CREATE POLICY "Anyone can view ratings"
ON public.farmer_ratings FOR SELECT
USING (true);

-- Farmer public stats view (aggregated data)
CREATE OR REPLACE VIEW public.farmer_public_profiles AS
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

-- Add farmer contact visibility for order-based calling
ALTER TABLE public.customer_orders 
ADD COLUMN IF NOT EXISTS farmer_contact_visible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_disabled_at TIMESTAMP WITH TIME ZONE;

-- Add pickup option to delivery preference
ALTER TABLE public.customer_orders 
DROP CONSTRAINT IF EXISTS customer_orders_delivery_preference_check;

-- Smart crop recommendations table (for AI suggestions)
CREATE TABLE public.customer_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_farmers UUID[] DEFAULT '{}',
  last_recommendations JSONB,
  recommendations_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their preferences"
ON public.customer_preferences FOR ALL
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Availability alerts table
CREATE TABLE public.availability_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  category TEXT,
  farmer_id UUID,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.availability_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their alerts"
ON public.availability_alerts FOR ALL
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- ====================================
-- FARMER DASHBOARD ENHANCEMENTS
-- ====================================

-- Smart farming calendar enhancements (reminders, weather-based suggestions)
ALTER TABLE public.farmer_calendar 
ADD COLUMN IF NOT EXISTS crop_type TEXT,
ADD COLUMN IF NOT EXISTS weather_dependent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggested_by_ai BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

-- Farmer order management enhancements
ALTER TABLE public.customer_orders
ADD COLUMN IF NOT EXISTS farmer_notes TEXT,
ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Price comparison helper - Add location coordinates for distance calculation
ALTER TABLE public.marketplace_listings
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Customer location for distance-based sorting
ALTER TABLE public.customer_addresses
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add profiles location for farmers
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Invoices table for PDF generation tracking
CREATE TABLE public.order_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT,
  UNIQUE (order_id)
);

ALTER TABLE public.order_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own invoices"
ON public.order_invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_orders 
    WHERE id = order_id AND customer_id = auth.uid()
  )
);

CREATE POLICY "Farmers can view invoices for their orders"
ON public.order_invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_orders 
    WHERE id = order_id AND farmer_id = auth.uid()
  )
);

-- Function to enable farmer contact after order confirmation
CREATE OR REPLACE FUNCTION public.enable_farmer_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    NEW.farmer_contact_visible = true;
  ELSIF NEW.status = 'delivered' THEN
    NEW.contact_disabled_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enable_farmer_contact_trigger ON customer_orders;
CREATE TRIGGER enable_farmer_contact_trigger
BEFORE UPDATE ON customer_orders
FOR EACH ROW
EXECUTE FUNCTION public.enable_farmer_contact();

-- Update timestamps trigger for new tables
CREATE TRIGGER update_customer_preferences_updated_at
BEFORE UPDATE ON customer_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for farmer calendar updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.farmer_calendar;