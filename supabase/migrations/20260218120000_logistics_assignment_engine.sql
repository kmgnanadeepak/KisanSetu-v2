-- ====================================
-- LOGISTICS DELIVERY ASSIGNMENT ENGINE
-- ====================================

-- Extend app_role enum for logistics partners (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'logistics';

-- Delivery-related fields on customer_orders
ALTER TABLE public.customer_orders
ADD COLUMN IF NOT EXISTS delivery_partner_id UUID,
ADD COLUMN IF NOT EXISTS delivery_status TEXT,
ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_time TIMESTAMPTZ;

-- Delivery partner availability / metadata
CREATE TABLE IF NOT EXISTS public.delivery_partner_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline',
  last_assigned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_partner_status ENABLE ROW LEVEL SECURITY;

-- Partners manage their own availability
CREATE POLICY "Partners can view their own logistics status"
ON public.delivery_partner_status FOR SELECT
USING (auth.uid() = partner_id);

CREATE POLICY "Partners can insert their own logistics status"
ON public.delivery_partner_status FOR INSERT
WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Partners can update their own logistics status"
ON public.delivery_partner_status FOR UPDATE
USING (auth.uid() = partner_id)
WITH CHECK (auth.uid() = partner_id);

-- Keep updated_at fresh
CREATE TRIGGER update_delivery_partner_status_updated_at
BEFORE UPDATE ON public.delivery_partner_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

