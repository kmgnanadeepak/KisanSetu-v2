import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error("order_id is required");
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("customer_orders")
      .select(`
        *,
        listing:marketplace_listings (
          title,
          unit,
          price,
          category,
          farming_method
        ),
        address:customer_addresses (
          address_line,
          city,
          state,
          pincode,
          phone
        )
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Fetch customer profile
    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", order.customer_id)
      .single();

    // Fetch farmer profile
    const { data: farmerProfile } = await supabase
      .from("profiles")
      .select("full_name, phone, address, city, state")
      .eq("user_id", order.farmer_id)
      .single();

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${order_id.slice(0, 4).toUpperCase()}`;

    // Create invoice HTML
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const deliveryDate = order.delivered_at 
      ? new Date(order.delivered_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })
      : 'Pending';

    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #fff; color: #333; }
    .invoice { max-width: 800px; margin: 0 auto; border: 1px solid #e5e5e5; padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #22c55e; }
    .logo span { color: #166534; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #333; }
    .invoice-date { color: #666; margin-top: 5px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party-title { font-weight: bold; color: #22c55e; margin-bottom: 10px; border-bottom: 1px solid #e5e5e5; padding-bottom: 5px; }
    .party-details { color: #666; line-height: 1.6; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #f0fdf4; color: #166534; padding: 12px; text-align: left; border-bottom: 2px solid #22c55e; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e5e5e5; }
    .items-table .amount { text-align: right; }
    .total-section { text-align: right; border-top: 2px solid #22c55e; padding-top: 20px; }
    .total-row { display: flex; justify-content: flex-end; margin-bottom: 10px; }
    .total-label { width: 150px; color: #666; }
    .total-value { width: 100px; text-align: right; }
    .grand-total { font-size: 20px; font-weight: bold; color: #22c55e; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e5e5e5; padding-top: 20px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge-organic { background: #dcfce7; color: #166534; }
    .badge-delivered { background: #22c55e; color: white; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">Kisan<span>Setu</span></div>
      <div class="invoice-info">
        <div class="invoice-number">${invoiceNumber}</div>
        <div class="invoice-date">Date: ${invoiceDate}</div>
        <div class="invoice-date">Delivery: ${deliveryDate}</div>
      </div>
    </div>
    
    <div class="parties">
      <div class="party">
        <div class="party-title">Bill To</div>
        <div class="party-details">
          <strong>${customerProfile?.full_name || 'Customer'}</strong><br>
          ${order.address?.address_line || ''}<br>
          ${order.address?.city || ''}, ${order.address?.state || ''} - ${order.address?.pincode || ''}<br>
          ${order.address?.phone ? `Phone: ${order.address.phone}` : ''}
        </div>
      </div>
      <div class="party">
        <div class="party-title">Sold By</div>
        <div class="party-details">
          <strong>${farmerProfile?.full_name || 'Farmer'}</strong><br>
          ${farmerProfile?.address || ''}<br>
          ${farmerProfile?.city || ''}, ${farmerProfile?.state || ''}<br>
          ${farmerProfile?.phone ? `Phone: ${farmerProfile.phone}` : ''}
        </div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Category</th>
          <th>Method</th>
          <th>Qty</th>
          <th>Rate</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${order.listing?.title || 'Product'}</strong></td>
          <td>${order.listing?.category || '-'}</td>
          <td>
            ${order.listing?.farming_method === 'organic' 
              ? '<span class="badge badge-organic">Organic</span>' 
              : (order.listing?.farming_method || 'Conventional')}
          </td>
          <td>${order.quantity} ${order.listing?.unit || 'kg'}</td>
          <td>₹${order.listing?.price || 0}/${order.listing?.unit || 'kg'}</td>
          <td class="amount">₹${order.total_price.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="total-section">
      <div class="total-row">
        <div class="total-label">Subtotal:</div>
        <div class="total-value">₹${order.total_price.toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div class="total-label">Delivery:</div>
        <div class="total-value">₹0.00</div>
      </div>
      <div class="total-row grand-total">
        <div class="total-label">Grand Total:</div>
        <div class="total-value">₹${order.total_price.toFixed(2)}</div>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for supporting local farmers!</p>
      <p>KisanSetu - Connecting Farmers to Customers</p>
      <p style="margin-top: 10px;">This is a computer-generated invoice and does not require a signature.</p>
    </div>
  </div>
</body>
</html>`;

    // Store invoice record
    await supabase
      .from("order_invoices")
      .upsert({
        order_id,
        invoice_number: invoiceNumber,
      }, { onConflict: 'order_id' });

    return new Response(invoiceHtml, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
