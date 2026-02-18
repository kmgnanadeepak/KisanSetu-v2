-- Add 'customer' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- Create customer_addresses table for saved addresses
CREATE TABLE public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    label TEXT NOT NULL DEFAULT 'Home',
    address_line TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on customer_addresses
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_addresses
CREATE POLICY "Customers can view their own addresses" 
ON public.customer_addresses FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert their own addresses" 
ON public.customer_addresses FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own addresses" 
ON public.customer_addresses FOR UPDATE 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete their own addresses" 
ON public.customer_addresses FOR DELETE 
USING (auth.uid() = customer_id);

-- Create customer_cart table
CREATE TABLE public.customer_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, listing_id)
);

-- Enable RLS on customer_cart
ALTER TABLE public.customer_cart ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_cart
CREATE POLICY "Customers can view their own cart" 
ON public.customer_cart FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can add to their own cart" 
ON public.customer_cart FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own cart" 
ON public.customer_cart FOR UPDATE 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can remove from their own cart" 
ON public.customer_cart FOR DELETE 
USING (auth.uid() = customer_id);

-- Create customer_orders table for order tracking with delivery details
CREATE TABLE public.customer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    farmer_id UUID NOT NULL,
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id),
    quantity NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    delivery_address_id UUID REFERENCES public.customer_addresses(id),
    delivery_preference TEXT DEFAULT 'any',
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on customer_orders
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_orders
CREATE POLICY "Customers can view their own orders" 
ON public.customer_orders FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create their own orders" 
ON public.customer_orders FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Farmers can view orders for their produce" 
ON public.customer_orders FOR SELECT 
USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update orders for their produce" 
ON public.customer_orders FOR UPDATE 
USING (auth.uid() = farmer_id);

-- Create wishlist table
CREATE TABLE public.customer_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    farmer_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, listing_id),
    UNIQUE(customer_id, farmer_id)
);

-- Enable RLS on customer_wishlist
ALTER TABLE public.customer_wishlist ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_wishlist
CREATE POLICY "Customers can view their own wishlist" 
ON public.customer_wishlist FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can add to their own wishlist" 
ON public.customer_wishlist FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can remove from their own wishlist" 
ON public.customer_wishlist FOR DELETE 
USING (auth.uid() = customer_id);

-- Create farmer_calendar table for smart farming calendar
CREATE TABLE public.farmer_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    reminder_enabled BOOLEAN DEFAULT true,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on farmer_calendar
ALTER TABLE public.farmer_calendar ENABLE ROW LEVEL SECURITY;

-- RLS policies for farmer_calendar
CREATE POLICY "Farmers can view their own calendar" 
ON public.farmer_calendar FOR SELECT 
USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can create their own events" 
ON public.farmer_calendar FOR INSERT 
WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update their own events" 
ON public.farmer_calendar FOR UPDATE 
USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete their own events" 
ON public.farmer_calendar FOR DELETE 
USING (auth.uid() = farmer_id);

-- Add variety, farming_method, harvest_date to marketplace_listings
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS variety TEXT,
ADD COLUMN IF NOT EXISTS farming_method TEXT DEFAULT 'conventional',
ADD COLUMN IF NOT EXISTS harvest_date DATE;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_cart;

-- Create updated_at triggers
CREATE TRIGGER update_customer_addresses_updated_at
BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_cart_updated_at
BEFORE UPDATE ON public.customer_cart
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_orders_updated_at
BEFORE UPDATE ON public.customer_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farmer_calendar_updated_at
BEFORE UPDATE ON public.farmer_calendar
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();