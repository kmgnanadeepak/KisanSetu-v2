-- ====================================
-- LOGISTICS DEFAULT AVAILABILITY + AUTO ASSIGNMENT
-- ====================================

-- PART 1: DEFAULT AVAILABILITY

-- Ensure new delivery partner status rows default to 'available'
ALTER TABLE public.delivery_partner_status
ALTER COLUMN status SET DEFAULT 'available';

-- When a user gains the 'logistics' role, ensure they have an
-- availability row defaulting to 'available'.
CREATE OR REPLACE FUNCTION public.ensure_logistics_partner_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'logistics' THEN
    INSERT INTO public.delivery_partner_status (partner_id, status)
    VALUES (NEW.user_id, 'available')
    ON CONFLICT (partner_id) DO UPDATE
      SET status = COALESCE(public.delivery_partner_status.status, 'available'),
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS ensure_logistics_partner_status_trigger ON public.user_roles;

CREATE TRIGGER ensure_logistics_partner_status_trigger
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_logistics_partner_status();


-- PART 2/3/4: AUTO ASSIGNMENT AFTER FARMER APPROVAL + REASSIGNMENT

-- Helper function that encapsulates assignment logic for a single order.
CREATE OR REPLACE FUNCTION public.assign_logistics_for_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  -- Choose the best available partner based on:
  -- 1) same city, 2) same state, 3) others
  -- then fewest active deliveries, then earliest last_assigned_at.
  WITH addr AS (
    SELECT a.city, a.state
    FROM public.customer_orders o
    JOIN public.customer_addresses a ON a.id = o.delivery_address_id
    WHERE o.id = p_order_id
  ),
  available AS (
    SELECT
      dps.partner_id,
      dps.last_assigned_at,
      p.city,
      p.state
    FROM public.delivery_partner_status dps
    JOIN public.profiles p ON p.user_id = dps.partner_id
    WHERE dps.status = 'available'
  ),
  active_counts AS (
    SELECT
      delivery_partner_id,
      COUNT(*) AS active_count
    FROM public.customer_orders
    WHERE delivery_partner_id IS NOT NULL
      AND (delivery_status IS NULL OR delivery_status NOT IN ('delivered','completed'))
    GROUP BY delivery_partner_id
  ),
  ranked AS (
    SELECT
      a.partner_id,
      COALESCE(ac.active_count, 0) AS active_deliveries,
      a.last_assigned_at,
      CASE 
        WHEN addr.city IS NOT NULL
             AND a.city IS NOT NULL
             AND lower(a.city) = lower(addr.city) THEN 1
        WHEN addr.state IS NOT NULL
             AND a.state IS NOT NULL
             AND lower(a.state) = lower(addr.state) THEN 2
        ELSE 3
      END AS rank_group
    FROM available a
    CROSS JOIN addr
    LEFT JOIN active_counts ac ON ac.delivery_partner_id = a.partner_id
  ),
  chosen AS (
    SELECT partner_id
    FROM ranked
    ORDER BY
      rank_group,
      active_deliveries,
      COALESCE(last_assigned_at, 'epoch'::timestamptz)
    LIMIT 1
  ),
  updated AS (
    UPDATE public.customer_orders o
    SET delivery_partner_id = c.partner_id,
        delivery_status = 'assigned',
        updated_at = now()
    FROM chosen c
    WHERE o.id = p_order_id
      AND o.delivery_partner_id IS NULL
    RETURNING c.partner_id
  )
  SELECT partner_id INTO v_partner_id FROM updated;

  IF v_partner_id IS NOT NULL THEN
    -- Update last_assigned_at for tie-breaking fairness
    UPDATE public.delivery_partner_status
    SET last_assigned_at = now(),
        updated_at = now()
    WHERE partner_id = v_partner_id;
  ELSE
    -- No available partner found; mark as pending assignment
    UPDATE public.customer_orders
    SET delivery_status = 'pending_assignment',
        updated_at = now()
    WHERE id = p_order_id
      AND delivery_partner_id IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- Trigger wrapper that reacts to order status changes.
CREATE OR REPLACE FUNCTION public.auto_assign_logistics_on_order_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When farmer accepts (order becomes 'accepted'), run assignment.
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'accepted'
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.assign_logistics_for_order(NEW.id);
  END IF;

  -- When a partner rejects and delivery_partner_id is cleared, re-run assignment.
  IF TG_OP = 'UPDATE'
     AND NEW.delivery_partner_id IS NULL
     AND (OLD.delivery_partner_id IS DISTINCT FROM NEW.delivery_partner_id)
     AND NEW.delivery_status = 'rejected' THEN
    PERFORM public.assign_logistics_for_order(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS auto_assign_logistics_on_order_update_trigger ON public.customer_orders;

CREATE TRIGGER auto_assign_logistics_on_order_update_trigger
AFTER UPDATE ON public.customer_orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_logistics_on_order_update();

