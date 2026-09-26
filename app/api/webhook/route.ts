import { stripe, PRO_PLAN } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `signature_verification_failed: ${err}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.client_reference_id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            plan: "pro",
            asin_limit: PRO_PLAN.asinLimit,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = sub.status === "active" || sub.status === "trialing";
      await supabase
        .from("profiles")
        .update({
          plan: isActive ? "pro" : "free",
          asin_limit: isActive ? PRO_PLAN.asinLimit : 3,
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("profiles")
        .update({ plan: "free", asin_limit: 3 })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
