import { createClient } from "@/lib/supabase/server";
import { stripe, PRO_PLAN } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: profile?.stripe_customer_id || undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id,
    line_items: [
      {
        price_data: {
          currency: PRO_PLAN.currency,
          product_data: {
            name: PRO_PLAN.name,
            description: PRO_PLAN.description,
          },
          unit_amount: PRO_PLAN.amountCents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=cancelled`,
    metadata: { user_id: user.id },
  });

  return NextResponse.redirect(session.url!);
}
