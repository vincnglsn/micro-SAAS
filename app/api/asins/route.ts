import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ASIN_REGEX = /^[A-Z0-9]{10}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { asin, marketplace } = await request.json();
  const cleanAsin = (asin || "").trim().toUpperCase();

  if (!ASIN_REGEX.test(cleanAsin)) {
    return NextResponse.json({ error: "ASIN invalide (10 caractères alphanumériques)" }, { status: 400 });
  }

  // Vérifie le quota selon le plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("asin_limit")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("tracked_asins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (profile && count !== null && count >= profile.asin_limit) {
    return NextResponse.json(
      { error: `Limite atteinte (${profile.asin_limit} ASIN). Passez en Pro pour en suivre plus.` },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("tracked_asins")
    .insert({
      user_id: user.id,
      asin: cleanAsin,
      marketplace: marketplace || "amazon.fr",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Cet ASIN est déjà suivi" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  const { error } = await supabase
    .from("tracked_asins")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
