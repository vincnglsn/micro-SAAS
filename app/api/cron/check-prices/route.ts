import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tâche quotidienne : relève prix / stock / avis de chaque ASIN suivi
// et enregistre un "instantané" dans la table price_snapshots.

const RAINFOREST_URL = "https://api.rainforestapi.com/request";

type Snapshot = {
  price: number | null;
  currency: string | null;
  in_stock: boolean | null;
  rating: number | null;
  review_count: number | null;
  title: string | null;
  image: string | null;
};

async function fetchProduct(asin: string, marketplace: string): Promise<Snapshot | null> {
  const params = new URLSearchParams({
    api_key: process.env.RAINFOREST_API_KEY!,
    type: "product",
    amazon_domain: marketplace || "amazon.fr",
    asin,
  });

  const res = await fetch(`${RAINFOREST_URL}?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return null;

  const json = await res.json();
  const p = json.product;
  if (!p) return null;

  const offer = p.buybox_winner;
  return {
    price: offer?.price?.value ?? null,
    currency: offer?.price?.currency ?? "EUR",
    in_stock: offer ? offer.availability?.type !== "out_of_stock" : false,
    rating: p.rating ?? null,
    review_count: p.ratings_total ?? null,
    title: p.title ?? null,
    image: p.main_image?.link ?? null,
  };
}

export async function GET(request: Request) {
  // Sécurité : seul Vercel Cron (ou toi, avec le secret) peut déclencher la tâche.
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: asins, error } = await supabase
    .from("tracked_asins")
    .select("id, asin, marketplace, product_title, product_image")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let ok = 0;
  let failed = 0;

  for (const row of asins ?? []) {
    try {
      const snap = await fetchProduct(row.asin, row.marketplace);
      if (!snap) {
        failed++;
        continue;
      }

      const { error: insertError } = await supabase.from("price_snapshots").insert({
        tracked_asin_id: row.id,
        price: snap.price,
        currency: snap.currency,
        in_stock: snap.in_stock,
        rating: snap.rating,
        review_count: snap.review_count,
      });
      if (insertError) throw insertError;

      // Complète le titre et l'image du produit s'ils manquent
      if (!row.product_title && snap.title) {
        await supabase
          .from("tracked_asins")
          .update({ product_title: snap.title, product_image: snap.image })
          .eq("id", row.id);
      }
      ok++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ checked: asins?.length ?? 0, ok, failed });
}
