import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify Razorpay signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing Razorpay secret" }, { status: 500 });
    }
    const signature = request.headers.get("x-razorpay-signature");

    const hash = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Get user and plan from webhook data
    const { user_id, plan_id, order_id } = body.notes;

    // Update user subscription in database
    await supabase.from("subscription").insert([
      {
        user_id,
        plan_id,
        status: "active",
        order_id,
        started_at: new Date().toISOString(),
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
