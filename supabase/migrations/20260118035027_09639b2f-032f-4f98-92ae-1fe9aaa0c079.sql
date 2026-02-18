-- Create marketplace_listings table for farmers to sell produce
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price > 0),
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  image_url TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace_orders table for buyers to purchase produce
CREATE TABLE public.marketplace_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  farmer_id UUID NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for push notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order_received', 'order_accepted', 'order_rejected', 'order_completed', 'marketplace_order', 'disease_result')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketplace_listings
CREATE POLICY "Anyone can view active listings" 
ON public.marketplace_listings 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Farmers can view all their own listings" 
ON public.marketplace_listings 
FOR SELECT 
USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can create their own listings" 
ON public.marketplace_listings 
FOR INSERT 
WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update their own listings" 
ON public.marketplace_listings 
FOR UPDATE 
USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete their own listings" 
ON public.marketplace_listings 
FOR DELETE 
USING (auth.uid() = farmer_id);

-- RLS policies for marketplace_orders
CREATE POLICY "Buyers can view their own marketplace orders" 
ON public.marketplace_orders 
FOR SELECT 
USING (auth.uid() = buyer_id);

CREATE POLICY "Farmers can view orders for their listings" 
ON public.marketplace_orders 
FOR SELECT 
USING (auth.uid() = farmer_id);

CREATE POLICY "Buyers can create marketplace orders" 
ON public.marketplace_orders 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Farmers can update orders for their listings" 
ON public.marketplace_orders 
FOR UPDATE 
USING (auth.uid() = farmer_id);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_marketplace_listings_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_orders_updated_at
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;