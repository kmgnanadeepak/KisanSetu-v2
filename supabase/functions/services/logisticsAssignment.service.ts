import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

interface OrderWithAddress {
  id: string;
  status: string;
  delivery_status: string | null;
  delivery_partner_id: string | null;
  delivery_address_id: string | null;
  total_price: number;
  address: {
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

interface PartnerStatusRow {
  partner_id: string;
  status: string;
  last_assigned_at: string | null;
}

interface PartnerProfile {
  user_id: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CandidatePartner {
  partnerId: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  activeDeliveries: number;
  lastAssignedAt: string | null;
  distanceScore: number;
  rankGroup: number;
}

function toLower(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function haversineKm(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null,
): number {
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    Number.isNaN(lat1) || Number.isNaN(lon1) || Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getOrder(
  supabase: SupabaseClient,
  orderId: string,
): Promise<OrderWithAddress | null> {
  const { data, error } = await supabase
    .from("customer_orders")
    .select(
      `
      id,
      status,
      delivery_status,
      delivery_partner_id,
      delivery_address_id,
      total_price,
      address:customer_addresses (
        city,
        state,
        latitude,
        longitude
      )
    `,
    )
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("logistics-assignment:getOrder error", error);
    return null;
  }

  return data as unknown as OrderWithAddress;
}

async function getAvailablePartners(
  supabase: SupabaseClient,
): Promise<{
  statuses: PartnerStatusRow[];
  profiles: PartnerProfile[];
  activeCounts: Record<string, number>;
}> {
  const { data: statusRows, error: statusError } = await supabase
    .from("delivery_partner_status")
    .select("partner_id, status, last_assigned_at")
    .eq("status", "available");

  if (statusError || !statusRows || statusRows.length === 0) {
    return { statuses: [], profiles: [], activeCounts: {} };
  }

  const partnerIds = statusRows.map((r) => r.partner_id);

  const [{ data: profiles, error: profileError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, city, state, latitude, longitude")
        .in("user_id", partnerIds),
      supabase
        .from("customer_orders")
        .select("delivery_partner_id, delivery_status")
        .in("delivery_partner_id", partnerIds),
    ]);

  if (profileError) {
    console.error("logistics-assignment:getAvailablePartners profileError", profileError);
  }
  if (ordersError) {
    console.error("logistics-assignment:getAvailablePartners ordersError", ordersError);
  }

  const activeCounts: Record<string, number> = {};
  (orders || []).forEach((o) => {
    const pid = (o as any).delivery_partner_id as string | null;
    if (!pid) return;
    const dStatus = toLower((o as any).delivery_status || "");
    const isCompleted = dStatus === "delivered" || dStatus === "completed";
    if (isCompleted) return;
    activeCounts[pid] = (activeCounts[pid] || 0) + 1;
  });

  return {
    statuses: statusRows as unknown as PartnerStatusRow[],
    profiles: (profiles || []) as unknown as PartnerProfile[],
    activeCounts,
  };
}

function buildCandidates(
  order: OrderWithAddress,
  statuses: PartnerStatusRow[],
  profiles: PartnerProfile[],
  activeCounts: Record<string, number>,
): CandidatePartner[] {
  const addrCity = toLower(order.address?.city);
  const addrState = toLower(order.address?.state);

  const candidates: CandidatePartner[] = [];

  for (const s of statuses) {
    const profile = profiles.find((p) => p.user_id === s.partner_id);
    if (!profile) continue;

    const pCity = toLower(profile.city);
    const pState = toLower(profile.state);

    let rankGroup = 3;
    if (addrCity && pCity && addrCity === pCity) {
      rankGroup = 1;
    } else if (addrState && pState && addrState === pState) {
      rankGroup = 2;
    }

    const distanceScore = haversineKm(
      order.address?.latitude ?? null,
      order.address?.longitude ?? null,
      profile.latitude,
      profile.longitude,
    );

    candidates.push({
      partnerId: s.partner_id,
      city: profile.city,
      state: profile.state,
      latitude: profile.latitude,
      longitude: profile.longitude,
      activeDeliveries: activeCounts[s.partner_id] || 0,
      lastAssignedAt: s.last_assigned_at,
      distanceScore,
      rankGroup,
    });
  }

  candidates.sort((a, b) => {
    if (a.rankGroup !== b.rankGroup) return a.rankGroup - b.rankGroup;
    if (a.activeDeliveries !== b.activeDeliveries) {
      return a.activeDeliveries - b.activeDeliveries;
    }
    const aTime = a.lastAssignedAt ? Date.parse(a.lastAssignedAt) || 0 : 0;
    const bTime = b.lastAssignedAt ? Date.parse(b.lastAssignedAt) || 0 : 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.distanceScore - b.distanceScore;
  });

  return candidates;
}

export async function assignDeliveryPartner(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ assignedPartnerId: string | null; status: string }> {
  const order = await getOrder(supabase, orderId);
  if (!order) {
    return { assignedPartnerId: null, status: "order_not_found" };
  }

  if (order.delivery_partner_id) {
    return { assignedPartnerId: order.delivery_partner_id, status: "already_assigned" };
  }

  const { statuses, profiles, activeCounts } = await getAvailablePartners(supabase);
  if (statuses.length === 0) {
    await supabase
      .from("customer_orders")
      .update({ delivery_status: "pending_assignment" })
      .eq("id", orderId)
      .is("delivery_partner_id", null);

    return { assignedPartnerId: null, status: "no_available_partners" };
  }

  const candidates = buildCandidates(order, statuses, profiles, activeCounts);
  if (candidates.length === 0) {
    await supabase
      .from("customer_orders")
      .update({ delivery_status: "pending_assignment" })
      .eq("id", orderId)
      .is("delivery_partner_id", null);

    return { assignedPartnerId: null, status: "no_candidates" };
  }

  const selected = candidates[0];
  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("customer_orders")
    .update({
      delivery_partner_id: selected.partnerId,
      delivery_status: "assigned",
      updated_at: nowIso,
    })
    .eq("id", orderId)
    .is("delivery_partner_id", null)
    .select("id, delivery_partner_id")
    .maybeSingle();

  if (updateError) {
    console.error("logistics-assignment:assignDeliveryPartner updateError", updateError);
    return { assignedPartnerId: null, status: "update_failed" };
  }

  if (!updated || !(updated as any).delivery_partner_id) {
    return { assignedPartnerId: null, status: "race_lost_or_already_assigned" };
  }

  await supabase
    .from("delivery_partner_status")
    .update({
      last_assigned_at: nowIso,
      updated_at: nowIso,
    })
    .eq("partner_id", selected.partnerId);

  return {
    assignedPartnerId: (updated as any).delivery_partner_id as string,
    status: "assigned",
  };
}

export async function reassignIfRejected(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ assignedPartnerId: string | null; status: string }> {
  const order = await getOrder(supabase, orderId);
  if (!order) {
    return { assignedPartnerId: null, status: "order_not_found" };
  }

  if (order.delivery_partner_id) {
    return { assignedPartnerId: order.delivery_partner_id, status: "still_assigned" };
  }

  const dStatus = toLower(order.delivery_status);
  if (dStatus !== "rejected" && dStatus !== "pending_assignment" && dStatus !== "") {
    return { assignedPartnerId: null, status: "no_reassignment_needed" };
  }

  return await assignDeliveryPartner(supabase, orderId);
}

export async function assignForNewOrders(
  supabase: SupabaseClient,
): Promise<{ processed: number }> {
  const { data: orders, error } = await supabase
    .from("customer_orders")
    .select(
      `
      id,
      status,
      delivery_status,
      delivery_partner_id,
      delivery_address_id,
      total_price,
      address:customer_addresses (
        city,
        state,
        latitude,
        longitude
      )
    `,
    )
    .is("delivery_partner_id", null)
    .in("status", ["pending", "confirmed", "dispatched"])
    .or("delivery_status.is.null,delivery_status.eq.pending_assignment");

  if (error || !orders || orders.length === 0) {
    if (error) {
      console.error("logistics-assignment:assignForNewOrders error", error);
    }
    return { processed: 0 };
  }

  let processed = 0;
  for (const o of orders as unknown as OrderWithAddress[]) {
    await assignDeliveryPartner(supabase, o.id);
    processed += 1;
  }
  return { processed };
}

